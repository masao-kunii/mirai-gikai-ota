import type {
  BillStatusEnum,
  BillWithContent,
} from "@/features/bills/shared/types";

export const allBillStatuses: BillStatusEnum[] = [
  "preparing",
  "submitted",
  "in_committee",
  "plenary_session",
  "approved",
  "rejected",
];

const baseBill: BillWithContent = {
  id: "mock-bill-001",
  name: "サンプル議案（大田区議会）",
  bill_number: "サンプル第1号",
  proposal_type: "mayor_bill",
  status: "in_committee",
  is_featured: false,
  is_review_completed: true,
  thumbnail_url: null,
  share_thumbnail_url: null,
  published_at: "2026-02-15",
  submitted_date: "2026-02-15",
  publish_status: "published",
  slug: null,
  status_note: null,
  status_order: 3,
  publish_status_order: 2,
  council_session_id: "mock-session",
  committee_id: null,
  knowledge_source: null,
  use_knowledge_source_in_chat: false,
  created_at: "2026-02-15T00:00:00Z",
  updated_at: "2026-02-15T00:00:00Z",
  bill_content: {
    id: "mock-content-001",
    bill_id: "mock-bill-001",
    title: "サンプル法案のタイトル",
    summary:
      "この法案は開発プレビュー用のサンプルデータです。法案の要約文がここに表示されます。実際のデータではありません。",
    content: "# サンプルコンテンツ\n\n本文がここに入ります。",
    difficulty_level: "normal",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  tags: [
    { id: "tag-1", label: "経済" },
    { id: "tag-2", label: "環境" },
  ],
};

export function createMockBill(
  overrides: Partial<BillWithContent> = {}
): BillWithContent {
  return {
    ...baseBill,
    ...overrides,
  };
}
