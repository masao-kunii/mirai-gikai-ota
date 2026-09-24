import { schema } from "@mirai-gikai/db";
import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import { buildContentRichnessPrompt } from "@mirai-gikai/shared/content-richness/build-prompt";
import { contentRichnessResultSchema } from "@mirai-gikai/shared/content-richness/schemas";
import { decideReportReview } from "@mirai-gikai/shared/report-publication/auto-publish";
import { asc, eq, sql } from "drizzle-orm";
import { adminQuery } from "../db";
import { resolveInterviewModel } from "./model";
import { evaluateModerationScore } from "./moderation";

const { interviewReport, interviewMessages } = schema;

const CONTENT_RICHNESS_TIMEOUT_MS = 30_000;

/** 再判定の対象。 */
export type RescoreKind = "moderation" | "richness" | "both";

export type RescoreResult = {
  moderationScore: number | null;
  totalContentRichness: number | null;
  reviewStatus: string;
  isPublicByAdmin: boolean;
  /** 実行したが結果を得られなかった評価（AI 呼び出しの失敗・タイムアウト）。 */
  failed: RescoreKind[];
};

/**
 * 保存済みレポートの判定をやり直す。
 *
 * モデレーション（安全性）と内容充実度は、回答完了時に自動で付く。失敗して未評価の
 * まま残ったものや、基準を変えたあとに付け直したいものを、管理画面から再判定する
 * ための処理。評価は完了時と同じプロンプト・同じ関数を使う。
 *
 * 承認状態は、まだ人が判断していない（pending / auto_approved）ときだけ、新しい
 * 数値で付け直す。人が承認・却下したものは判断を尊重して変えない。
 */
export async function rescoreReport(
  reportId: string,
  kind: RescoreKind
): Promise<RescoreResult | null> {
  const loaded = await adminQuery(async (tx) => {
    const rows = await tx
      .select({
        id: interviewReport.id,
        sessionId: interviewReport.interviewSessionId,
        summary: interviewReport.summary,
        opinions: interviewReport.opinions,
        roleDescription: interviewReport.roleDescription,
        contentRichness: interviewReport.contentRichness,
        totalContentRichness: interviewReport.totalContentRichness,
        moderationScore: interviewReport.moderationScore,
        moderationCategories: interviewReport.moderationCategories,
        faithfulnessOk: interviewReport.faithfulnessOk,
        reviewStatus: interviewReport.reviewStatus,
        isPublicByUser: interviewReport.isPublicByUser,
        isPublicByAdmin: interviewReport.isPublicByAdmin,
      })
      .from(interviewReport)
      .where(eq(interviewReport.id, reportId));
    const report = rows[0];
    if (!report) return null;

    const messages = await tx
      .select({
        role: interviewMessages.role,
        content: interviewMessages.content,
      })
      .from(interviewMessages)
      .where(eq(interviewMessages.interviewSessionId, report.sessionId))
      .orderBy(asc(interviewMessages.createdAt), asc(interviewMessages.id));
    return { report, messages };
  });
  if (!loaded) return null;

  const { report, messages } = loaded;
  const opinions = toOpinions(report.opinions);
  const model = resolveInterviewModel();

  const [moderation, richness] = await Promise.all([
    kind === "richness"
      ? null
      : evaluateModerationScore({
          summary: report.summary,
          opinions,
          roleDescription: report.roleDescription,
          messages,
          model,
        }),
    kind === "moderation"
      ? null
      : evaluateContentRichness({
          summary: report.summary,
          opinions,
          roleDescription: report.roleDescription,
          messages,
          model,
        }),
  ]);

  const moderationScore = moderation
    ? moderation.score
    : report.moderationScore;
  const moderationCategories = moderation
    ? moderation.flaggedCategories
    : toStrings(report.moderationCategories);
  const totalContentRichness = richness
    ? richness.total
    : report.totalContentRichness;

  // 人が承認・却下したものは判断を尊重し、数値だけ更新する。
  const humanDecided =
    report.reviewStatus === "approved" || report.reviewStatus === "rejected";
  const decision = humanDecided
    ? {
        reviewStatus: report.reviewStatus,
        isPublicByAdmin: report.isPublicByAdmin,
      }
    : decideReportReview({
        isPublicByUser: report.isPublicByUser,
        moderationScore,
        moderationCategories,
        faithful: report.faithfulnessOk,
        totalContentRichness,
      });

  await adminQuery((tx) =>
    tx
      .update(interviewReport)
      .set({
        ...(moderation
          ? {
              moderationScore: moderation.score,
              moderationReasoning: moderation.reasoning,
              moderationCategories: moderation.flaggedCategories ?? undefined,
            }
          : {}),
        // total_content_richness は content_richness から作られる生成列なので
        // ここでは更新しない（更新しようとすると Postgres がエラーを返す）。
        ...(richness ? { contentRichness: richness } : {}),
        reviewStatus: decision.reviewStatus,
        isPublicByAdmin: decision.isPublicByAdmin,
        updatedAt: sql`now()`,
      })
      .where(eq(interviewReport.id, reportId))
  );

  const failed: RescoreKind[] = [];
  if (moderation && moderation.score === null) failed.push("moderation");
  if (kind !== "moderation" && richness === null) failed.push("richness");

  return {
    moderationScore,
    totalContentRichness,
    reviewStatus: decision.reviewStatus,
    isPublicByAdmin: decision.isPublicByAdmin,
    failed,
  };
}

/**
 * 内容充実度を評価し直す。完了時は要約の構造化出力に含まれて returned されるが、
 * ここでは対話ログから単体で評価する（旧 admin の再計算と同じ組み立て）。
 * 失敗・タイムアウトは null（呼び出し側で「変更しない」扱い）。
 */
async function evaluateContentRichness(params: {
  summary: string | null;
  opinions: Array<{ title: string; content: string }>;
  roleDescription: string | null;
  messages: Array<{ role: string; content: string }>;
  model: string;
}) {
  try {
    const prompt = buildContentRichnessPrompt({
      summary: params.summary,
      opinions: params.opinions,
      roleDescription: params.roleDescription,
      messages: params.messages,
    });
    const result = await Promise.race([
      generateObject({
        model: params.model,
        schema: contentRichnessResultSchema,
        prompt,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("content richness timeout")),
          CONTENT_RICHNESS_TIMEOUT_MS
        )
      ),
    ]);
    return result.object;
  } catch (error) {
    console.error("Content richness evaluation failed:", error);
    return null;
  }
}

function toOpinions(value: unknown): Array<{ title: string; content: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) =>
    v &&
    typeof v === "object" &&
    "title" in v &&
    "content" in v &&
    typeof v.title === "string" &&
    typeof v.content === "string"
      ? [{ title: v.title, content: v.content }]
      : []
  );
}

function toStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is string => typeof v === "string");
}
