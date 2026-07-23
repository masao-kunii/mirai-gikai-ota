// 議案の enum 表示ラベルと選択肢（apps/web の表示ラベルに合わせる）。
// 値は DB の pgEnum と一致させること。

export const BILL_STATUS_LABELS = {
  preparing: "準備中",
  submitted: "上程済み",
  in_committee: "委員会審査中",
  plenary_session: "本会議審議中",
  approved: "可決",
  rejected: "否決",
  adopted: "採択",
  partially_adopted: "趣旨採択",
} as const;

export const PUBLISH_STATUS_LABELS = {
  draft: "下書き",
  coming_soon: "近日公開",
  published: "公開中",
} as const;

export const PROPOSAL_TYPE_LABELS = {
  mayor_bill: "区長提出議案",
  committee_bill: "委員会提出議案",
  member_bill: "議員提出議案",
  report: "報告",
  petition: "請願・陳情",
  other: "その他",
} as const;

// 公開状態のバッジ色。
export const PUBLISH_STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-600",
  coming_soon: "bg-amber-100 text-amber-700",
  published: "bg-green-100 text-green-700",
} as const;

export type BillStatus = keyof typeof BILL_STATUS_LABELS;
export type PublishStatus = keyof typeof PUBLISH_STATUS_LABELS;
export type ProposalType = keyof typeof PROPOSAL_TYPE_LABELS;

export const BILL_STATUS_OPTIONS = Object.entries(BILL_STATUS_LABELS) as [
  BillStatus,
  string,
][];
export const PUBLISH_STATUS_OPTIONS = Object.entries(PUBLISH_STATUS_LABELS) as [
  PublishStatus,
  string,
][];
export const PROPOSAL_TYPE_OPTIONS = Object.entries(PROPOSAL_TYPE_LABELS) as [
  ProposalType,
  string,
][];
