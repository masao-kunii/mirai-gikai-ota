import type { Database } from "@mirai-gikai/supabase";

// Database types
export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
export type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];

export type BillContent = Database["public"]["Tables"]["bill_contents"]["Row"];
export type BillContentInsert =
  Database["public"]["Tables"]["bill_contents"]["Insert"];
export type BillContentUpdate =
  Database["public"]["Tables"]["bill_contents"]["Update"];

// 地方議会版では mirai_stances テーブルは存在しないが、互換性のため
// stance-styles.ts などで使われる型はローカル定義する
export type MiraiStance = {
  id: string;
  bill_id: string;
  type: StanceTypeEnum;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

// Enums
export type BillStatusEnum = Database["public"]["Enums"]["bill_status_enum"];
export type StanceTypeEnum = Database["public"]["Enums"]["stance_type_enum"];
export type ProposalTypeEnum =
  Database["public"]["Enums"]["proposal_type_enum"];

// 議題種別の日本語ラベル
export const PROPOSAL_TYPE_LABELS: Record<ProposalTypeEnum, string> = {
  mayor_bill: "区長提出議案",
  committee_bill: "委員会提出議案",
  report: "報告",
  petition: "請願・陳情",
};

// 議題種別ごとに賛否（faction_stances）を表示するか
// report は賛否を取らない、petition は議会としての採択/不採択 が中心で
// 会派ごとの賛否は後段で対応（今は非表示）
export function shouldShowFactionStances(type: ProposalTypeEnum): boolean {
  return type === "mayor_bill" || type === "committee_bill";
}

// 公開ステータス型（議案の公開/非公開を管理）
export type BillPublishStatus = "draft" | "published" | "coming_soon";

// Coming Soon議案の型（最小限の情報のみ）
export type ComingSoonBill = {
  id: string;
  name: string;
  title: string | null;
  council_url: string | null;
};

// Combined types for UI
export type BillWithStance = Bill & {
  mirai_stance?: MiraiStance;
};

export type BillTag = {
  id: string;
  label: string;
};

export type FeaturedTag = {
  id: string;
  label: string;
  priority: number;
};

export type BillWithContent = Bill & {
  bill_content?: BillContent;
  mirai_stance?: MiraiStance;
  tags: BillTag[];
  featured_tag?: FeaturedTag;
  hasPublicInterview?: boolean;
};

// タグごとにグループ化された議案
export type BillsByTag = {
  tag: BillTag & { description?: string; priority: number };
  bills: BillWithContent[];
};

// ステータスのソート順（DBのstatus_order generated columnと一致させる）
export const BILL_STATUS_ORDER: Record<BillStatusEnum, number> = {
  approved: 0,
  adopted: 0,
  partially_adopted: 1,
  rejected: 2,
  plenary_session: 3,
  in_committee: 4,
  submitted: 5,
  preparing: 6,
};

// ステータスを日本語ラベルに変換する関数
export function getBillStatusLabel(status: BillStatusEnum): string {
  switch (status) {
    case "preparing":
      return "準備中";
    case "submitted":
      return "上程済み";
    case "in_committee":
      return "委員会審査中";
    case "plenary_session":
      return "本会議審議中";
    case "approved":
      return "可決";
    case "rejected":
      return "否決";
    case "adopted":
      return "採択";
    case "partially_adopted":
      return "趣旨採択";
    default:
      return status;
  }
}

export const STANCE_LABELS: Record<StanceTypeEnum, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
  conditional_for: "条件付き賛成",
  conditional_against: "条件付き反対",
  considering: "検討中",
  continued_deliberation: "継続審査中",
};
