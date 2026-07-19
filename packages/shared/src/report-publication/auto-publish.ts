import { MODERATION_THRESHOLDS } from "../moderation/moderation";

export const AUTO_PUBLISH_MAX_MODERATION_SCORE =
  MODERATION_THRESHOLDS.WARNING - 1;
export const AUTO_PUBLISH_MIN_CONTENT_RICHNESS = 50;
// 集約を「住民の声」として表示してよい最小の公開件数（少数バイアス・再識別の抑止）。
// フロントの MIN_PUBLIC_OPINIONS と一致させること。
export const MIN_PUBLIC_REPORTS_FOR_DISPLAY = 10;

export type AutoPublishReportInput = {
  isPublicByUser: boolean;
  moderationScore: number | null;
  totalContentRichness: number | null;
};

export function isReportAutoPublishEligible({
  isPublicByUser,
  moderationScore,
  totalContentRichness,
}: AutoPublishReportInput): boolean {
  return (
    isPublicByUser &&
    moderationScore !== null &&
    moderationScore <= AUTO_PUBLISH_MAX_MODERATION_SCORE &&
    totalContentRichness !== null &&
    totalContentRichness >= AUTO_PUBLISH_MIN_CONTENT_RICHNESS
  );
}

/** 承認ワークフローの状態（DB enum report_review_status_enum と同期）。 */
export type ReportReviewStatus =
  | "auto_approved"
  | "pending"
  | "approved"
  | "rejected";

export type ReviewDecisionInput = {
  isPublicByUser: boolean;
  moderationScore: number | null;
  /** モデレーションで該当したカテゴリのキー配列。空/なしは問題なし。 */
  moderationCategories: string[] | null;
  /** 要約忠実性チェックの結果（null は未確認＝安全側で承認待ち）。 */
  faithful: boolean | null;
  totalContentRichness: number | null;
};

/**
 * 完了レポートの公開可否を決める。
 *
 * 事前同意（isPublicByUser=true）を前提に、モデレーション（スコア＋カテゴリ）
 * と忠実性チェック、情報充実度を**すべて**クリアしたものだけ自動公開
 * （auto_approved）。1つでも引っ掛かった・確認できなかったものは承認待ち
 * （pending）にして人手レビューへ回す（＝黙って落とさない）。
 */
export function decideReportReview(input: ReviewDecisionInput): {
  reviewStatus: "auto_approved" | "pending";
  isPublicByAdmin: boolean;
} {
  const clean =
    input.isPublicByUser &&
    input.moderationScore !== null &&
    input.moderationScore <= AUTO_PUBLISH_MAX_MODERATION_SCORE &&
    (input.moderationCategories?.length ?? 0) === 0 &&
    input.faithful === true &&
    input.totalContentRichness !== null &&
    input.totalContentRichness >= AUTO_PUBLISH_MIN_CONTENT_RICHNESS;
  return clean
    ? { reviewStatus: "auto_approved", isPublicByAdmin: true }
    : { reviewStatus: "pending", isPublicByAdmin: false };
}

export function shouldDisplayPublicReports(publicReportCount: number): boolean {
  return publicReportCount >= MIN_PUBLIC_REPORTS_FOR_DISPLAY;
}

export type PublicReportVisibilityInput = {
  isPublicByAdmin: boolean;
  isPublicByUser: boolean;
  publicReportCount: number;
};

export function isPublicReportVisible({
  isPublicByAdmin,
  isPublicByUser,
  publicReportCount,
}: PublicReportVisibilityInput): boolean {
  return (
    isPublicByAdmin &&
    isPublicByUser &&
    shouldDisplayPublicReports(publicReportCount)
  );
}
