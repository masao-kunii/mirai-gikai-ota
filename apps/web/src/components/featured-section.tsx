import type { BillListItem } from "../lib/bill-display";
import { CompactBillCard } from "./compact-bill-card";

/** 注目の議案セクション（is_featured=true。現行 FeaturedBillSection と一致） */
export function FeaturedSection({ bills }: { bills: BillListItem[] }) {
  if (bills.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold leading-snug text-mirai-text">
          注目の議案🔥
        </h2>
        <p className="text-xs font-medium leading-relaxed text-mirai-text-secondary">
          区議会に提出された注目議案
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
