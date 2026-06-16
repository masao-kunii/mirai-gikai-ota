import type { FactionStanceWithFaction, StanceType } from "../../shared/types";

type Props = {
  stances: FactionStanceWithFaction[];
};

const STANCE_LABEL: Record<StanceType, string> = {
  for: "賛成",
  conditional_for: "条件付き賛成",
  neutral: "中立",
  considering: "検討中",
  continued_deliberation: "継続審議",
  conditional_against: "条件付き反対",
  against: "反対",
};

const STANCE_BADGE_CLASS: Record<StanceType, string> = {
  for: "bg-emerald-100 text-emerald-800 border-emerald-200",
  conditional_for: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  considering: "bg-amber-50 text-amber-800 border-amber-200",
  continued_deliberation: "bg-amber-100 text-amber-800 border-amber-200",
  conditional_against: "bg-rose-50 text-rose-700 border-rose-200",
  against: "bg-rose-100 text-rose-800 border-rose-200",
};

// 表示順: 賛成 → 条件付き賛成 → 中立 → 検討中 → 継続審議 → 条件付き反対 → 反対
const STANCE_ORDER: Record<StanceType, number> = {
  for: 0,
  conditional_for: 1,
  neutral: 2,
  considering: 3,
  continued_deliberation: 4,
  conditional_against: 5,
  against: 6,
};

export function FactionStancesSection({ stances }: Props) {
  if (stances.length === 0) {
    return null;
  }

  // 賛成 → 中立 → 反対 の順で表示
  const sorted = [...stances].sort((a, b) => {
    const typeDiff = STANCE_ORDER[a.type] - STANCE_ORDER[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.faction.sort_order - b.faction.sort_order;
  });

  return (
    <section>
      <h2 className="text-[22px] font-bold mb-4">🗳️ 各会派の見解</h2>
      <p className="text-sm text-mirai-text-secondary mb-4">
        本議案に対する各会派の賛否と、表明された見解です。議事録など公開情報をもとに整理しています。
      </p>
      <ul className="flex flex-col gap-3">
        {sorted.map((stance) => (
          <li
            key={stance.id}
            className="rounded-lg border border-mirai-border-light bg-white p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-bold ${STANCE_BADGE_CLASS[stance.type]}`}
              >
                {STANCE_LABEL[stance.type]}
              </span>
              <span className="text-sm font-bold text-mirai-text">
                {stance.faction.display_name}
              </span>
            </div>
            {stance.comment && (
              <p className="text-sm leading-relaxed text-mirai-text whitespace-pre-wrap">
                {stance.comment}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
