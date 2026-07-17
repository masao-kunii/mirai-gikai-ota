/**
 * インタビュー対話ストリーム（/api/interviews/messages）をクライアントの
 * `useObject` で受けるための「統一レスポンススキーマ」。
 *
 * サーバは chat フェーズ（text のみ）と summary フェーズ（text＋report）で
 * 別スキーマを出力するため、両方を受けられるよう optional/nullable で緩く定義する。
 * 真実は packages/shared の interviewChatResponseSchema（同名・同形）。ここは
 * クライアントバンドルに shared 実行時依存を持ち込まないための最小ミラー。
 */
import { z } from "zod";

export const interviewStages = ["chat", "summary", "summary_complete"] as const;

const opinionViewSchema = z.object({
  title: z.string(),
  content: z.string(),
  source_message_id: z.string().nullable().optional(),
});

/** レポート（表示用）。content_richness はユーザーに見せないため any で受ける。 */
export const interviewReportViewSchema = z
  .object({
    summary: z.string().nullable().optional(),
    stance: z.enum(["for", "against", "neutral"]).nullable().optional(),
    role: z.string().nullable().optional(),
    role_title: z.string().nullable().optional(),
    role_description: z.string().nullable().optional(),
    opinions: z.array(opinionViewSchema).nullable().optional(),
  })
  .loose();

export type InterviewReportView = z.infer<typeof interviewReportViewSchema>;

/** クライアントが useObject に渡す統一スキーマ。 */
export const interviewChatResponseSchema = z
  .object({
    text: z.string(),
    report: interviewReportViewSchema.nullable().optional(),
    quick_replies: z.array(z.string()).nullable().optional(),
    question_id: z.string().nullable().optional(),
    topic_title: z.string().nullable().optional(),
    next_stage: z.enum(interviewStages).optional(),
  })
  .loose();

export type InterviewChatResponse = z.infer<typeof interviewChatResponseSchema>;

/** インタビュー対象（テーマ or 取り組み）。 */
export type InterviewTargetInput =
  | { type: "theme"; slug: string }
  | { type: "initiative"; initiativeId: string };

/** 対象を /api/interviews/* のリクエストボディ（対象部分）へ変換する。 */
export function interviewTargetBody(target: InterviewTargetInput):
  | { targetType: "theme"; slug: string }
  | {
      targetType: "initiative";
      initiativeId: string;
    } {
  return target.type === "theme"
    ? { targetType: "theme", slug: target.slug }
    : { targetType: "initiative", initiativeId: target.initiativeId };
}
