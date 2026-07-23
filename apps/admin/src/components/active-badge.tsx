/** is_active の状態バッジ（有効/無効）。マスタ系の一覧で共通利用する。 */
export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700 text-xs">
      有効
    </span>
  ) : (
    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-500 text-xs">
      無効
    </span>
  );
}
