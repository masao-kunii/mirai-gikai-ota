import { schema, withAppAdmin } from "@mirai-gikai/db";
import { extractReportFromMessage } from "@mirai-gikai/shared/interview-schemas/report-extraction";
import { isReportAutoPublishEligible } from "@mirai-gikai/shared/report-publication/auto-publish";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { evaluateModerationScore } from "./moderation";

const { interviewMessages, interviewReport, interviewSessions } = schema;

export type CompleteResult =
  | { ok: true; published: boolean }
  | { ok: false; reason: "no_report" };

/**
 * インタビューを完了する（管理系接続 = withAppAdmin。ルートに生 admin は書かない）。
 *
 * 事前同意モデルのため is_public_by_user は常に true。auto-publish 判定
 * （moderation<=29 かつ richness>=50）で is_public_by_admin を決める。
 */
export async function completeInterview(
  sessionId: string,
  model: string
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

  // moderation は時系列昇順で渡す
  const chrono = [...messages].reverse();
  const moderation = await evaluateModerationScore({
    summary: report.summary,
    opinions: report.opinions.map((o) => ({
      title: o.title,
      content: o.content,
    })),
    roleDescription: report.role_description,
    messages: chrono.map((m) => ({ role: m.role, content: m.content })),
    model,
  });

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

  const shouldAutoPublish = isReportAutoPublishEligible({
    isPublicByUser: true,
    moderationScore: moderation.score,
    totalContentRichness: report.content_richness.total,
  });

  const values = {
    summary: report.summary,
    stance: report.stance,
    role: report.role,
    roleDescription: report.role_description,
    roleTitle: report.role_title,
    opinions: enrichedOpinions,
    contentRichness: report.content_richness,
    moderationScore: moderation.score,
    moderationReasoning: moderation.reasoning,
    isPublicByUser: true,
    isPublicByAdmin: shouldAutoPublish,
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

  return { ok: true, published: shouldAutoPublish };
}
