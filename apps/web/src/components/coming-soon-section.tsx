import type { BillListItem } from "../lib/bill-display";

/**
 * これから掲載される議案（publish_status=coming_soon。現行 ComingSoonSection と一致）。
 * まだ解説を公開していないため詳細へはリンクせず、名称のみ提示する。
 */
export function ComingSoonSection({ bills }: { bills: BillListItem[] }) {
  if (bills.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold leading-snug text-mirai-text">
          これから掲載される議案
        </h2>
        <p className="text-xs font-medium leading-relaxed text-mirai-text-secondary">
          みらい議会＠大田区は、順次更新されていきます
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {bills.map((bill) => (
          <div
            key={bill.id}
            className="rounded-2xl border border-mirai-border-muted bg-card p-4"
          >
            <p className="text-[15px] font-bold leading-relaxed text-mirai-text">
              {bill.name}
            </p>
            <span className="mt-1 inline-block text-xs font-medium text-mirai-text-muted">
              近日公開
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
