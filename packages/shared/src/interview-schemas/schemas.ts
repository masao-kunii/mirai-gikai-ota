import {
  type ContentRichnessResult,
  contentRichnessResultSchema,
} from "../content-richness/schemas";
import { z } from "zod";

/**
 * インタビュー（対話→要約）の LLM 入出力スキーマ。
 *
 * 旧 web/ の interview-session/shared/schemas.ts を移植し、対象を「議案」だけで
 * なく「区政テーマ・取り組み」にも使えるよう describe の文言を一般化した。
 * OpenAI/Gemini の structured output は optional を許容しないため nullable を使う。
 */

const opinionSchema = z
  .object({
    title: z.string().describe("意見のタイトル（40文字以内）"),
    content: z.string().describe("意見の説明（120文字以内）"),
    source_message_id: z
      .string()
      .nullable()
      .describe("この意見の根拠となるユーザー発言のメッセージID"),
  })
  .strict();

export type InterviewContentRichness = ContentRichnessResult;

// レポート生成結果のバリデーション
export const interviewReportSchema = z
  .object({
    summary: z
      .string()
      .nullable()
      .describe(
        "ユーザーの主張を100文字程度でまとめたもの。「」書きで書けるようなテキスト（ただし「」は記載しない）"
      ),
    stance: z
      .enum(["for", "against", "neutral"])
      .nullable()
      .describe(
        "対象（区政テーマ・取り組み・議案）に対するユーザーのスタンス。for=賛成・肯定的、against=反対・否定的、neutral=期待と懸念の両方がある"
      ),
    role: z
      .enum([
        "subject_expert",
        "work_related",
        "daily_life_affected",
        "general_citizen",
      ])
      .nullable()
      .describe(
        "インタビュイーの立場タイプ（subject_expert:専門的な有識者, work_related:業務に関係, daily_life_affected:暮らしに影響, general_citizen:一般的な関心）"
      ),
    role_description: z
      .string()
      .nullable()
      .describe("ユーザーの役割や背景についての詳細な説明"),
    role_title: z
      .string()
      .max(10)
      .nullable()
      .describe(
        "ユーザーの役割を10文字以内で端的に表現したタイトル（例: 子育て中の親、商店主、教師）"
      ),
    opinions: z
      .array(opinionSchema)
      .max(3)
      .describe(
        "ユーザーの具体的な主張（最大3件）。メインの主張を補強する内容を最低1つは含める。元の対話ログにないことは記載しない"
      ),
    content_richness: contentRichnessResultSchema.describe(
      "インタビューの情報充実度評価"
    ),
  })
  .strict();

export type InterviewReportData = z.infer<typeof interviewReportSchema>;

// クライアント表示用の型（content_richness はユーザーには表示しない）
export type InterviewReportViewData = Omit<
  InterviewReportData,
  "content_richness"
>;

// ステージ遷移の型
export const interviewStageSchema = z.enum([
  "chat",
  "summary",
  "summary_complete",
]);
export type InterviewStage = z.infer<typeof interviewStageSchema>;

// 通常チャット用スキーマ（LLM出力用 - next_stage を含む）
export const interviewChatTextSchema = z.object({
  text: z.string(),
  quick_replies: z.array(z.string()).nullable(),
  question_id: z.string().nullable(),
  topic_title: z.string().nullable(),
  next_stage: interviewStageSchema.describe(
    "インタビューのステージ遷移判定。chat=インタビュー継続、summary=要約フェーズへ移行"
  ),
});

export type InterviewChatText = z.infer<typeof interviewChatTextSchema>;

// summary フェーズ用スキーマ（LLM出力用 - next_stage を含む）
// chat 遷移時は report を null にする（structured output は optional 不可のため nullable）
export const interviewChatWithReportSchema = z.object({
  text: z.string(),
  report: interviewReportSchema
    .nullable()
    .describe(
      "インタビュー内容をまとめたレポート。next_stage が chat の場合は null にすること"
    ),
  next_stage: interviewStageSchema.describe(
    "ステージ遷移判定。summary=レポート修正継続、summary_complete=レポート完了、chat=インタビュー再開"
  ),
});

export type InterviewChatWithReport = z.infer<
  typeof interviewChatWithReportSchema
>;

// クライアント側で使う統一スキーマ（両方のレスポンスを受け取れる）
export const interviewChatResponseSchema = z.object({
  text: z.string(),
  report: interviewReportSchema.optional().nullable(),
  quick_replies: z.array(z.string()).optional().nullable(),
  question_id: z.string().optional().nullable(),
  topic_title: z.string().optional().nullable(),
  next_stage: interviewStageSchema.optional(),
});

export type InterviewChatResponse = z.infer<typeof interviewChatResponseSchema>;
