// 審査キューの表示ラベル。値は DB の enum / 共有モデレーション定義と一致させる。

export const REVIEW_STATUS_LABELS = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
  auto_approved: "自動承認",
} as const;

export type ReviewStatus = keyof typeof REVIEW_STATUS_LABELS;

// タブ表示順（承認待ちを先頭に）。「all」は全件。
export const REVIEW_STATUS_TABS: {
  value: ReviewStatus | "all";
  label: string;
}[] = [
  { value: "pending", label: "承認待ち" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "却下" },
  { value: "auto_approved", label: "自動承認" },
  { value: "all", label: "すべて" },
];

// moderation_score から導かれる状態（generated column）。
export const MODERATION_STATUS_LABELS: Record<string, string> = {
  ok: "問題なし",
  warning: "注意",
  ng: "要確認",
};

export const MODERATION_STATUS_BADGE: Record<string, string> = {
  ok: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  ng: "bg-red-100 text-red-700",
};

// モデレーション評価カテゴリ（@mirai-gikai/shared の MODERATION_CATEGORY_LABELS と一致）。
export const MODERATION_CATEGORY_LABELS: Record<string, string> = {
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

// 住民からの通報理由。
export const FLAG_REASON_LABELS: Record<string, string> = {
  personal_info: "個人情報が含まれている",
  inappropriate: "不適切・攻撃的な表現",
  inaccurate: "事実と異なる",
  spam: "スパム",
  other: "その他",
};

// レポートの立場（stance_type_enum）。
export const STANCE_LABELS: Record<string, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
  conditional_for: "条件付き賛成",
  conditional_against: "条件付き反対",
  considering: "検討中",
  continued_deliberation: "継続審査中",
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  bill: "議案",
  theme: "テーマ",
  initiative: "取り組み",
};

export function categoryLabel(key: string): string {
  return MODERATION_CATEGORY_LABELS[key] ?? key;
}
