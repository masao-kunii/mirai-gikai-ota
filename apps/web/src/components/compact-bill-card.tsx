import { Link } from "@tanstack/react-router";
import { type BillListItem, formatDateDots } from "../lib/bill-display";
import { BillStatusBadge, ProposalTypeBadge } from "./bill-badges";
import { ReviewCompleteBadge } from "./review-status";

/** 水平レイアウトのコンパクトな議案カード（現行 CompactBillCard 相当・薄い枠線） */
export function CompactBillCard({ bill }: { bill: BillListItem }) {
  const date = formatDateDots(bill.submittedDate);
  const statusLabel = bill.status === "approved" ? "成立" : "提出";

  return (
    <Link
      to="/bills/$id"
      params={{ id: bill.id }}
      className="flex overflow-hidden rounded-2xl border-[0.5px] border-mirai-text-placeholder bg-card transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-relaxed text-mirai-text">
          {bill.name}
          {bill.isReviewCompleted && <ReviewCompleteBadge size={14} />}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <ProposalTypeBadge type={bill.proposalType} />
          <BillStatusBadge status={bill.status} />
          {date && (
            <span className="text-xs text-mirai-text-muted">
              {date} {statusLabel}
            </span>
          )}
        </div>
      </div>
      {bill.thumbnailUrl && (
        <div className="mr-4 h-16 w-24 flex-shrink-0 self-center overflow-hidden rounded-lg">
          <img
            src={bill.thumbnailUrl}
            alt={bill.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
    </Link>
  );
}
