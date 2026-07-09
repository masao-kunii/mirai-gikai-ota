import {
  type BillListItem,
  PROPOSAL_TYPE_DESCRIPTION,
  PROPOSAL_TYPE_EMOJI,
  PROPOSAL_TYPE_LABELS,
} from "../lib/bill-display";
import { CompactBillCard } from "./compact-bill-card";

/** 提案タイプ別の議案セクション（絵文字＋説明＋コンパクトカード。現行と一致） */
export function ProposalTypeSection({
  proposalType,
  bills,
}: {
  proposalType: string;
  bills: BillListItem[];
}) {
  if (bills.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold leading-snug text-mirai-text">
          {PROPOSAL_TYPE_EMOJI[proposalType] ?? "🗂️"}{" "}
          {PROPOSAL_TYPE_LABELS[proposalType] ?? proposalType}
        </h2>
        <p className="text-xs font-medium leading-relaxed text-mirai-text-secondary">
          {PROPOSAL_TYPE_DESCRIPTION[proposalType] ?? ""}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {bills.map((bill) => (
          <CompactBillCard key={bill.id} bill={bill} />
        ))}
      </div>
    </section>
  );
}
