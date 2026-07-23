import { createFileRoute } from "@tanstack/react-router";
import { CreateFactionForm } from "../features/factions/create-faction-form";
import { FactionRow } from "../features/factions/faction-row";
import { useFactions } from "../features/factions/factions-queries";

export const Route = createFileRoute("/factions")({
  component: FactionsPage,
});

const COLSPAN = 6;

function FactionsPage() {
  const { data: factions, isPending, isError, error } = useFactions();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">会派管理</h1>
        <p className="text-slate-500 text-sm">
          議案のスタンス表示に使う会派を管理します。並び順は公開画面での表示順です。
        </p>
      </header>

      <CreateFactionForm />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">会派</th>
              <th className="px-3 py-2 font-medium">別名</th>
              <th className="w-20 px-3 py-2 text-center font-medium">並び順</th>
              <th className="w-20 px-3 py-2 text-center font-medium">状態</th>
              <th className="w-24 px-3 py-2 text-center font-medium">
                スタンス
              </th>
              <th className="w-32 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <StatusRow>読み込み中…</StatusRow>
            ) : isError ? (
              <StatusRow className="text-red-600">{error.message}</StatusRow>
            ) : factions.length === 0 ? (
              <StatusRow>
                会派がありません。上のフォームから追加してください。
              </StatusRow>
            ) : (
              factions.map((faction) => (
                <FactionRow key={faction.id} faction={faction} />
              ))
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
