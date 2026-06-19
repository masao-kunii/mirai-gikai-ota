import {
  PROPOSAL_TYPE_LABELS,
  type ProposalTypeEnum,
} from "../../shared/types";

const TYPE_BADGE_CLASS: Record<ProposalTypeEnum, string> = {
  mayor_bill: "bg-blue-50 text-blue-800 border-blue-200",
  committee_bill: "bg-indigo-50 text-indigo-800 border-indigo-200",
  member_bill: "bg-violet-50 text-violet-800 border-violet-200",
  report: "bg-slate-100 text-slate-700 border-slate-200",
  petition: "bg-amber-50 text-amber-800 border-amber-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

type Props = {
  type: ProposalTypeEnum;
  className?: string;
};

export function ProposalTypeBadge({ type, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${TYPE_BADGE_CLASS[type]} ${className}`}
    >
      {PROPOSAL_TYPE_LABELS[type]}
    </span>
  );
}
