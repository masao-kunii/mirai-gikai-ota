import { z } from "zod";

// モデレーション用スコア値（0-100、LLMが小数点を返す可能性があるため丸める）
const moderationScoreValueSchema = z
  .number()
  .transform((v) => Math.round(v))
  .pipe(z.number().int().min(0).max(100));

/**
 * モデレーションの評価カテゴリ（基準）。LLM はこのキーで該当項目を返す。
 * DB の interview_report.moderation_categories（jsonb 配列）に保存し、
 * 1つでも該当があれば自動公開せず承認待ち（pending）に回す。
 */
export const MODERATION_CATEGORIES = [
  "personal_info", // 個人情報の開示
  "illegal", // 違法行為の助長
  "ip_infringement", // 知的財産権の侵害
  "self_harm_threat", // 自傷・脅迫
  "obscene_violent", // わいせつ・暴力的表現
  "defamation", // 名誉毀損・過度な個人攻撃
  "discrimination_hate", // 差別・ヘイトスピーチ
  "inappropriate", // 不謹慎な内容
  "irrelevant", // 無関係な内容
  "misinformation", // 虚偽情報
  "spam", // スパム・妨害行為
  "advertising", // 商業的宣伝
  "impersonation", // なりすまし
] as const;

export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

/** 表示用ラベル（admin の承認キュー等で使う）。 */
export const MODERATION_CATEGORY_LABELS: Record<ModerationCategory, string> = {
  personal_info: "個人情報の開示",
  illegal: "違法行為の助長",
  ip_infringement: "知的財産権の侵害",
  self_harm_threat: "自傷・脅迫",
  obscene_violent: "わいせつ・暴力的表現",
  defamation: "名誉毀損・過度な個人攻撃",
  discrimination_hate: "差別・ヘイトスピーチ",
  inappropriate: "不謹慎な内容",
  irrelevant: "無関係な内容",
  misinformation: "虚偽情報",
  spam: "スパム・妨害行為",
  advertising: "商業的宣伝",
  impersonation: "なりすまし",
};

// モデレーション結果スキーマ（generateObject用）
export const moderationResultSchema = z.object({
  score: moderationScoreValueSchema.describe(
    "モデレーションスコア（0-100の整数）: 0が最も適切、100が最も不適切"
  ),
  reasoning: z.string().describe("スコアの根拠を簡潔に説明（200文字以内）"),
  flagged_categories: z
    .array(z.enum(MODERATION_CATEGORIES))
    .describe(
      "公開に適さない可能性がある該当カテゴリのキー配列。該当が無ければ空配列 []"
    ),
});

export type ModerationResult = z.infer<typeof moderationResultSchema>;
