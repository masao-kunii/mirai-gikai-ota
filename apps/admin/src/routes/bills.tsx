import { createFileRoute, Link } from "@tanstack/react-router";
import { GitMerge, Sparkles } from "lucide-react";
import { BillRow } from "../features/bills/bill-row";
import { useBills } from "../features/bills/bills-queries";
import { CreateBillForm } from "../features/bills/create-bill-form";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

const COLSPAN = 6;

function BillsPage() {
  const { data: bills, isPending, isError, error } = useBills();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-slate-900 text-xl">議案管理</h1>
          <p className="text-slate-500 text-sm">
            議案の基本情報（審議状況・公開状態・会期・委員会など）を管理します。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/bills-extract"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100"
          >
            <Sparkles className="size-4" />
            議事録から抽出
          </Link>
          <Link
            to="/bills-merge"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100"
          >
            <GitMerge className="size-4" />
            議案をマージ
          </Link>
        </div>
      </header>

      <CreateBillForm />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">議案</th>
              <th className="w-24 px-3 py-2 text-center font-medium">公開</th>
              <th className="w-28 px-3 py-2 font-medium">審議状況</th>
              <th className="w-32 px-3 py-2 font-medium">提出区分</th>
              <th className="w-40 px-3 py-2 font-medium">会期／委員会</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <StatusRow>読み込み中…</StatusRow>
            ) : isError ? (
              <StatusRow className="text-red-600">{error.message}</StatusRow>
            ) : bills.length === 0 ? (
              <StatusRow>
                議案がありません。上のフォームから追加してください。
              </StatusRow>
            ) : (
              bills.map((bill) => <BillRow key={bill.id} bill={bill} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr>
      <td
        colSpan={COLSPAN}
        className={`px-3 py-8 text-center text-slate-500 ${className ?? ""}`}
      >
        {children}
      </td>
    </tr>
  );
}
