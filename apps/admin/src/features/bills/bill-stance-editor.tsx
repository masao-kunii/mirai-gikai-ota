import { STANCE_TYPE_OPTIONS } from "./stance-labels";

// cellInputClass は w-full を含むため、横並びの select/コメントには使わず、
// 幅を flex で制御する専用クラスを持つ。
const controlClass =
  "rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none";

export type StanceDraft = { type: string; comment: string };

/**
 * 会派ごとのスタンス編集。各会派に「（未設定）＋7種」の select と、
 * スタンスを設定したときだけコメント入力を出す。状態は親（編集行）が持つ。
 */
export function BillStanceEditor({
  factions,
  stances,
  onTypeChange,
  onCommentChange,
}: {
  factions: { id: string; displayName: string }[];
  stances: Record<string, StanceDraft>;
  onTypeChange: (factionId: string, type: string) => void;
  onCommentChange: (factionId: string, comment: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {factions.map((f) => {
        const draft = stances[f.id];
        const type = draft?.type ?? "";
        return (
          <div key={f.id} className="flex items-center gap-2">
            <span className="w-44 shrink-0 truncate text-slate-600 text-xs">
              {f.displayName}
            </span>
            <select
              className={`${controlClass} w-36 shrink-0`}
              value={type}
              onChange={(e) => onTypeChange(f.id, e.target.value)}
            >
              <option value="">（未設定）</option>
              {STANCE_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {type ? (
              <input
                className={`${controlClass} flex-1`}
                placeholder="コメント（任意）"
                value={draft?.comment ?? ""}
                onChange={(e) => onCommentChange(f.id, e.target.value)}
                maxLength={2000}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
