import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { CompactBillCard } from "../../client/components/bill-list/compact-bill-card";
import {
  type BillWithContent,
  PROPOSAL_TYPE_LABELS,
  type ProposalTypeEnum,
} from "../../shared/types";

const TYPE_DESCRIPTION: Record<ProposalTypeEnum, string> = {
  mayor_bill: "区長から議会に提出された議案",
  committee_bill: "委員会から議会に提出された議案",
  member_bill: "議員から議会に提出された議案",
  report: "区から議会への報告事項",
  petition: "区民から議会へ提出された請願・陳情",
  other: "議員派遣など、その他の議決事項",
};

const TYPE_EMOJI: Record<ProposalTypeEnum, string> = {
  mayor_bill: "📝",
  committee_bill: "📋",
  member_bill: "🙋",
  report: "📣",
  petition: "📬",
  other: "🗂️",
};

type Props = {
  proposalType: ProposalTypeEnum;
  bills: BillWithContent[];
};

export function ProposalTypeSection({ proposalType, bills }: Props) {
  if (bills.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold text-mirai-text leading-[1.48]">
          {TYPE_EMOJI[proposalType]} {PROPOSAL_TYPE_LABELS[proposalType]}
        </h2>
        <p className="text-xs font-medium text-mirai-text-secondary leading-[1.67]">
          {TYPE_DESCRIPTION[proposalType]}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {bills.map((bill) => (
          <Link key={bill.id} href={routes.billDetail(bill.id) as Route}>
            <CompactBillCard bill={bill} />
          </Link>
        ))}
      </div>
    </section>
  );
}
