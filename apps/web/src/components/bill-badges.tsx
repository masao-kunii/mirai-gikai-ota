import {
  billStatusBadgeClass,
  billStatusLabel,
  PROPOSAL_TYPE_BADGE_CLASS,
  PROPOSAL_TYPE_LABELS,
} from "../lib/bill-display";

/** 提案タイプのバッジ（区長提出議案 など） */
export function ProposalTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${
        PROPOSAL_TYPE_BADGE_CLASS[type] ?? PROPOSAL_TYPE_BADGE_CLASS.other
      }`}
    >
      {PROPOSAL_TYPE_LABELS[type] ?? type}
    </span>
  );
}

/** 審議ステータスのバッジ（議会審議中 / 可決 など） */
export function BillStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${billStatusBadgeClass(
        status
      )}`}
    >
      {billStatusLabel(status)}
    </span>
  );
}
