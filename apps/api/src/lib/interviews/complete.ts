import { schema, withAppAdmin } from "@mirai-gikai/db";
import { extractReportFromMessage } from "@mirai-gikai/shared/interview-schemas/report-extraction";
import { decideReportReview } from "@mirai-gikai/shared/report-publication/auto-publish";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { evaluateFaithfulness } from "./faithfulness";
import { evaluateModerationScore } from "./moderation";

const { interviewMessages, interviewReport, interviewSessions } = schema;

export type CompleteResult =
  | { ok: true; published: boolean; reviewStatus: "auto_approved" | "pending" }
  | { ok: false; reason: "no_report" };

/**
 * インタビューを完了する（管理系接続 = withAppAdmin。ルートに生 admin は書かない）。
 *
 * 事前同意モデルのため is_public_by_user は常に true。auto-publish 判定
 * （moderation<=29 かつ richness>=50）で is_public_by_admin を決める。
 */
export async function completeInterview(
  sessionId: string,
  model: string,
  options?: {
    /** 回答者が申告した立場（テーマ側で選択）。あれば roleTitle を上書きする。 */
    respondentRole?: string | null;
  }
): Promise<CompleteResult> {
  const db = getDb();

  // メッセージを新しい順で取得（最新 assistant からレポート抽出するため）
  const messages = await withAppAdmin(db, (tx) =>
    tx
      .select({
        id: interviewMessages.id,
        role: interviewMessages.role,
        content: interviewMessages.content,
      })
      .from(interviewMessages)
      .where(eq(interviewMessages.interviewSessionId, sessionId))
      .orderBy(desc(interviewMessages.createdAt))
  );

  const latestAssistant = messages.find((m) => m.role === "assistant");
  const report = latestAssistant
    ? extractReportFromMessage(latestAssistant.content)
    : null;
  if (!report) return { ok: false, reason: "no_report" };

  // moderation / faithfulness は時系列昇順のログを渡す
  const chrono = [...messages].reverse();
  const opinionsForEval = report.opinions.map((o) => ({
    title: o.title,
    content: o.content,
  }));
  const chronoForEval = chrono.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 安全性（モデレーション基準）と忠実性（要約が対話ログに忠実か）を並行評価。
  const [moderation, faithfulness] = await Promise.all([
    evaluateModerationScore({
      summary: report.summary,
      opinions: opinionsForEval,
      roleDescription: report.role_description,
      messages: chronoForEval,
      model,
    }),
    evaluateFaithfulness({
      summary: report.summary,
      opinions: opinionsForEval,
      messages: chronoForEval,
      model,
    }),
  ]);

  // opinions に根拠ユーザー発言を付与
  const enrichedOpinions = report.opinions.map((o) => {
    if (!o.source_message_id) {
      return { ...o, source_message_content: null };
    }
    const src = messages.find(
      (m) => m.id === o.source_message_id && m.role === "user"
    );
    if (!src) {
      return { ...o, source_message_id: null, source_message_content: null };
    }
    return { ...o, source_message_content: src.content };
  });

  // 安全性・忠実性・充実度をすべてクリアしたものだけ自動公開。1つでも
  // 引っ掛かった/未確認は承認待ち（pending）にして人手レビューへ回す。
  const decision = decideReportReview({
    isPublicByUser: true,
    moderationScore: moderation.score,
    moderationCategories: moderation.flaggedCategories,
    faithful: faithfulness.faithful,
    totalContentRichness: report.content_richness.total,
  });

  // 回答者が立場を選んでいれば、その申告ラベルを表示用 roleTitle にする
  // （テーマ/取り組みの集約はこの roleTitle で立場を分布集計する）。
  const respondentRole = options?.respondentRole?.trim();
  const values = {
    summary: report.summary,
    stance: report.stance,
    role: report.role,
    roleDescription: report.role_description,
    roleTitle: respondentRole || report.role_title,
    opinions: enrichedOpinions,
    contentRichness: report.content_richness,
    moderationScore: moderation.score,
    moderationReasoning: moderation.reasoning,
    moderationCategories: moderation.flaggedCategories ?? undefined,
    faithfulnessOk: faithfulness.faithful ?? undefined,
    faithfulnessReasoning: faithfulness.reasoning,
    reviewStatus: decision.reviewStatus,
    isPublicByUser: true,
    isPublicByAdmin: decision.isPublicByAdmin,
  };

  await withAppAdmin(db, async (tx) => {
    await tx
      .insert(interviewReport)
      .values({ interviewSessionId: sessionId, ...values })
      .onConflictDoUpdate({
        target: interviewReport.interviewSessionId,
        set: { ...values, updatedAt: sql`now()` },
      });
    await tx
      .update(interviewSessions)
      .set({ completedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(interviewSessions.id, sessionId));
  });

  return {
    ok: true,
    published: decision.isPublicByAdmin,
    reviewStatus: decision.reviewStatus,
  };
}
