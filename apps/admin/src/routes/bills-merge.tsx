import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, GitMerge } from "lucide-react";
import { useState } from "react";
import { type AdminBill, useBills } from "../features/bills/bills-queries";
import { useMergeBills } from "../features/bills-merge/bills-merge-queries";

export const Route = createFileRoute("/bills-merge")({
  component: BillsMergePage,
});

function BillsMergePage() {
  const { data: bills, isPending, isError, error } = useBills();
  const [keepId, setKeepId] = useState<string | null>(null);
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const mergeBills = useMergeBills();

  const selectKeep = (id: string) => {
    setResult(null);
    setKeepId(id);
    setMergeIds((prev) => prev.filter((x) => x !== id));
  };
  const toggleMerge = (id: string) => {
    setResult(null);
    setMergeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const keepBill = bills?.find((b) => b.id === keepId) ?? null;
  const canMerge = keepId !== null && mergeIds.length > 0;

  const doMerge = () => {
    if (!keepId) return;
    mergeBills.mutate(
      { keepBillId: keepId, mergeBillIds: mergeIds },
      {
        onSuccess: (data) => {
          setResult(
            `統合しました（${data.mergedCount}件を削除・タグ+${data.tagsAdded}・本文+${data.contentsMoved}・会派見解+${data.stancesMoved}）。`
          );
          setKeepId(null);
          setMergeIds([]);
          setConfirming(false);
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to="/bills"
          className="inline-flex items-center gap-1 text-slate-500 text-sm hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          議案一覧へ戻る
        </Link>
      </div>
      <header>
        <h1 className="font-bold text-slate-900 text-xl">議案マージ</h1>
        <p className="text-slate-500 text-sm">
          重複した議案を1件（残す議案）に統合します。マージ対象のタグ・本文・会派見解のうち、残す議案に無いものが移されます。
        </p>
      </header>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>
          マージ対象の議案は<strong>削除</strong>
          されます。対象議案に紐づくインタビュー設定・回答（レポート）も併せて削除され、元に戻せません。
        </p>
      </div>

      {result ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 text-sm">
          {result}
        </p>
      ) : null}

      {isPending ? (
        <p className="text-slate-500 text-sm">読み込み中…</p>
      ) : isError ? (
        <p className="text-red-600 text-sm">{error.message}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="w-16 px-3 py-2 text-center font-medium">残す</th>
                <th className="w-20 px-3 py-2 text-center font-medium">
                  マージ
                </th>
                <th className="px-3 py-2 font-medium">議案</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <BillSelectRow
                  key={bill.id}
                  bill={bill}
                  isKeep={keepId === bill.id}
                  isMerge={mergeIds.includes(bill.id)}
                  onSelectKeep={() => selectKeep(bill.id)}
                  onToggleMerge={() => toggleMerge(bill.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {mergeBills.isError ? (
          <span className="text-red-600 text-sm">
            {mergeBills.error.message}
          </span>
        ) : null}
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-sm">
              「{keepBill?.name}」に {mergeIds.length}
              件を統合します。よろしいですか？
            </span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100"
            >
              やめる
            </button>
            <button
              type="button"
              onClick={doMerge}
              disabled={mergeBills.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-red-500 disabled:opacity-50"
            >
              <GitMerge className="size-4" />
              統合する
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!canMerge}
            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-4 py-2 font-medium text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GitMerge className="size-4" />
            マージする
          </button>
        )}
      </div>
    </div>
  );
}

function BillSelectRow({
  bill,
  isKeep,
  isMerge,
  onSelectKeep,
  onToggleMerge,
}: {
  bill: AdminBill;
  isKeep: boolean;
  isMerge: boolean;
  onSelectKeep: () => void;
  onToggleMerge: () => void;
}) {
  return (
    <tr className="border-slate-100 border-b">
      <td className="px-3 py-2 text-center">
        <input
          type="radio"
          name="keep-bill"
          checked={isKeep}
          onChange={onSelectKeep}
          className="size-4"
          aria-label="残す議案にする"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={isMerge}
          disabled={isKeep}
          onChange={onToggleMerge}
          className="size-4 disabled:opacity-30"
          aria-label="マージ対象にする"
        />
      </td>
      <td className="px-3 py-2">
        <div className="text-slate-800">{bill.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-slate-400 text-xs">
          {bill.billNumber ? <span>{bill.billNumber}</span> : null}
          {bill.councilSessionName ? (
            <span>／{bill.councilSessionName}</span>
          ) : null}
          {bill.tags.length > 0 ? (
            <span>／タグ {bill.tags.map((t) => t.label).join("・")}</span>
          ) : null}
          {bill.stances.length > 0 ? (
            <span>／会派見解 {bill.stances.length}</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
