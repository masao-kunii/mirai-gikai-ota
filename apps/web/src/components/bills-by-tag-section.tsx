import type { BillListItem, TagItem } from "../lib/bill-display";
import { CompactBillCard } from "./compact-bill-card";

export type TagGroup = { tag: TagItem; bills: BillListItem[] };

/** 注目タグ別の議案セクション（featured_priority 順。現行 BillsByTagSection と一致） */
export function BillsByTagSection({ groups }: { groups: TagGroup[] }) {
  const visible = groups.filter((g) => g.bills.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-12">
      {visible.map(({ tag, bills }) => (
        <section key={tag.id} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[22px] font-bold leading-snug text-mirai-text">
              {tag.label}
            </h2>
            {tag.description && (
              <p className="text-xs font-medium leading-relaxed text-mirai-text-secondary">
                {tag.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {bills.map((bill) => (
              <CompactBillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
