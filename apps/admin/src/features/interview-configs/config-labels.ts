// インタビュー設定の表示ラベル。値は DB の enum と一致させる。

export const CONFIG_STATUS_LABELS = {
  public: "受付中",
  closed: "終了",
} as const;

export type ConfigStatus = keyof typeof CONFIG_STATUS_LABELS;

export const CONFIG_STATUS_BADGE: Record<string, string> = {
  public: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-500",
};

export const CONFIG_STATUS_TABS: {
  value: ConfigStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "すべて" },
  { value: "public", label: "受付中" },
  { value: "closed", label: "終了" },
];

export const MODE_LABELS = {
  loop: "対話式（loop）",
  bulk: "一括（bulk）",
} as const;

export type InterviewMode = keyof typeof MODE_LABELS;

export const MODE_OPTIONS = Object.entries(MODE_LABELS) as [
  InterviewMode,
  string,
][];

export const TARGET_TYPE_LABELS: Record<string, string> = {
  bill: "議案",
  theme: "テーマ",
  initiative: "取り組み",
};
