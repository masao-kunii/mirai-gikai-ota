import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { BillListItem, CouncilSessionItem } from "../lib/bill-display";
import { CompactBillCard } from "./compact-bill-card";

export type ArchiveGroup = {
  session: CouncilSessionItem;
  bills: BillListItem[];
};

/** 過去の議会の議案（Archive）。会期ごとに束ねて表示する。 */
export function ArchiveSection({ groups }: { groups: ArchiveGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-lexend text-xl font-extrabold tracking-tight text-mirai-text">
          Archive
        </h2>
        <p className="text-xs font-medium text-mirai-text-secondary">
          過去の議会で議論された議案
        </p>
      </div>
      {groups.map(({ session, bills }) => (
        <div key={session.id} className="flex flex-col gap-4">
          {session.slug ? (
            <Link
              to="/sessions/$slug/bills"
              params={{ slug: session.slug }}
              className="group inline-flex items-center gap-1 text-lg font-bold text-mirai-text transition-colors hover:text-primary-accent"
            >
              {session.name}
              <ChevronRight className="h-4 w-4 text-mirai-text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <h3 className="text-lg font-bold text-mirai-text">
              {session.name}
            </h3>
          )}
          <div className="flex flex-col gap-3">
            {bills.map((bill) => (
              <CompactBillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
