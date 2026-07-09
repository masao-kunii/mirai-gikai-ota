import {
  STANCE_BADGE_CLASS,
  STANCE_LABELS,
  STANCE_ORDER,
} from "../lib/bill-display";

export type Stance = {
  factionName: string;
  type: string;
  comment: string | null;
};

/** 各会派の見解セクション（現行 faction-stances-section と同等のリスト表示） */
export function FactionStances({ stances }: { stances: Stance[] }) {
  if (stances.length === 0) return null;

  const sorted = [...stances].sort(
    (a, b) => (STANCE_ORDER[a.type] ?? 99) - (STANCE_ORDER[b.type] ?? 99)
  );

  return (
    <section>
      <h2 className="mb-3 text-[22px] font-bold">🗳️ 各会派の見解</h2>
      <p className="mb-4 text-sm text-mirai-text-secondary">
        本議案に対する各会派の賛否と、表明された見解です。議事録など公開情報をもとに整理しています。
      </p>
      <ul className="flex flex-col gap-3">
        {sorted.map((stance) => (
          <li
            key={stance.factionName}
            className="rounded-lg border border-mirai-border-light bg-card p-4"
          >
            <div className="mb-2 flex items-center gap-3">
              <span
                className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-bold ${
                  STANCE_BADGE_CLASS[stance.type] ?? STANCE_BADGE_CLASS.neutral
                }`}
              >
                {STANCE_LABELS[stance.type] ?? stance.type}
              </span>
              <span className="text-sm font-bold text-mirai-text">
                {stance.factionName}
              </span>
            </div>
            {stance.comment && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-mirai-text">
                {stance.comment}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
