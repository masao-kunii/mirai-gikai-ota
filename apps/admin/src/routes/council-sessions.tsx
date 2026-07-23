import { createFileRoute } from "@tanstack/react-router";
import { CouncilSessionRow } from "../features/council-sessions/council-session-row";
import { useCouncilSessions } from "../features/council-sessions/council-sessions-queries";
import { CreateCouncilSessionForm } from "../features/council-sessions/create-council-session-form";

export const Route = createFileRoute("/council-sessions")({
  component: CouncilSessionsPage,
});

const COLSPAN = 5;

function CouncilSessionsPage() {
  const { data: sessions, isPending, isError, error } = useCouncilSessions();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">議会会期管理</h1>
        <p className="text-slate-500 text-sm">
          定例会・臨時会などの会期を管理します。「アクティブ」は公開画面で現在の会期として扱われ、常に1件のみ設定できます。
        </p>
      </header>

      <CreateCouncilSessionForm />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">会期名</th>
              <th className="px-3 py-2 font-medium">期間</th>
              <th className="w-32 px-3 py-2 text-center font-medium">状態</th>
              <th className="w-20 px-3 py-2 text-center font-medium">議案数</th>
              <th className="w-32 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <StatusRow>読み込み中…</StatusRow>
            ) : isError ? (
              <StatusRow className="text-red-600">{error.message}</StatusRow>
            ) : sessions.length === 0 ? (
              <StatusRow>
                会期がありません。上のフォームから追加してください。
              </StatusRow>
            ) : (
              sessions.map((session) => (
                <CouncilSessionRow key={session.id} session={session} />
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
