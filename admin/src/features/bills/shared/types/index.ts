import type { Database } from "@mirai-gikai/supabase";
import type { SortConfig } from "@/lib/sort";

export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
export type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];

export type BillStatus = Database["public"]["Enums"]["bill_status_enum"];
export type BillPublishStatus =
  Database["public"]["Enums"]["bill_publish_status"];

export type BillWithContent = Bill & {
  bill_content?: Database["public"]["Tables"]["bill_contents"]["Row"];
};

export type BillWithCouncilSession = Bill & {
  council_sessions: { name: string } | null;
};

// ソート関連の型定義
export type BillSortField =
  | "bill_number"
  | "name"
  | "council_session"
  | "publish_status_order"
  | "status_order"
  | "published_at";

export const BILL_SORT_FIELDS: readonly BillSortField[] = [
  "bill_number",
  "name",
  "council_session",
  "publish_status_order",
  "status_order",
  "published_at",
] as const;

export type BillSortConfig = SortConfig<BillSortField>;

export const DEFAULT_BILL_SORT: BillSortConfig = {
  field: "published_at",
  order: "desc",
};

// ステータスのソート順（DBのstatus_order generated columnと一致させる）
export const BILL_STATUS_ORDER: Record<BillStatus, number> = {
  approved: 0,
  adopted: 0,
  partially_adopted: 1,
  rejected: 2,
  plenary_session: 3,
  in_committee: 4,
  submitted: 5,
  preparing: 6,
};

// ステータスを日本語ラベルに変換する関数（地方議会版: 一院制）
export function getBillStatusLabel(status: BillStatus): string {
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
