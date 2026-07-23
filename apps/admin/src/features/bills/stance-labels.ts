// 会派スタンス（faction_stances.type）の表示ラベルと選択肢。値は DB の
// stance_type_enum と一致させること。
export const STANCE_TYPE_LABELS = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
  conditional_for: "条件付き賛成",
  conditional_against: "条件付き反対",
  considering: "検討中",
  continued_deliberation: "継続審査中",
} as const;

export type StanceType = keyof typeof STANCE_TYPE_LABELS;

export const STANCE_TYPE_OPTIONS = Object.entries(STANCE_TYPE_LABELS) as [
  StanceType,
  string,
][];

// スタンスのバッジ色（一覧のサマリ表示用）。
export const STANCE_BADGE: Record<StanceType, string> = {
  for: "bg-green-100 text-green-700",
  against: "bg-red-100 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
  conditional_for: "bg-emerald-100 text-emerald-700",
  conditional_against: "bg-rose-100 text-rose-700",
  considering: "bg-amber-100 text-amber-700",
  continued_deliberation: "bg-blue-100 text-blue-700",
};
