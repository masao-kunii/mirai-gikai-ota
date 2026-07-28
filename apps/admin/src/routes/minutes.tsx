import { createFileRoute } from "@tanstack/react-router";
import { CreateMinuteForm } from "../features/minutes/create-minute-form";
import { MinuteRow } from "../features/minutes/minute-row";
import { useMinutes } from "../features/minutes/minutes-queries";

export const Route = createFileRoute("/minutes")({
  component: MinutesPage,
});

const COLSPAN = 6;

function MinutesPage() {
  const { data: minutes, isPending, isError, error } = useMinutes();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">議事録</h1>
        <p className="text-slate-500 text-sm">
          会期に紐づく議事録を管理します。PDF の URL
          と本文（Markdown）を保持します。
        </p>
      </header>

      <CreateMinuteForm />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="w-32 px-3 py-2 font-medium">会議日</th>
              <th className="w-16 px-3 py-2 text-center font-medium">日目</th>
              <th className="px-3 py-2 font-medium">タイトル／会期</th>
              <th className="w-16 px-3 py-2 text-center font-medium">本文</th>
              <th className="w-16 px-3 py-2 text-center font-medium">PDF</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <StatusRow>読み込み中…</StatusRow>
            ) : isError ? (
              <StatusRow className="text-red-600">{error.message}</StatusRow>
            ) : minutes.length === 0 ? (
              <StatusRow>
                議事録がありません。上のフォームから追加してください。
              </StatusRow>
            ) : (
              minutes.map((minute) => (
                <MinuteRow key={minute.id} minute={minute} />
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
