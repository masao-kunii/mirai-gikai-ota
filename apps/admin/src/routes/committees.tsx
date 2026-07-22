import { createFileRoute } from "@tanstack/react-router";
import { CommitteeRow } from "../features/committees/committee-row";
import { useCommittees } from "../features/committees/committees-queries";
import { CreateCommitteeForm } from "../features/committees/create-committee-form";

export const Route = createFileRoute("/committees")({
  component: CommitteesPage,
});

const COLSPAN = 6;

function CommitteesPage() {
  const { data: committees, isPending, isError, error } = useCommittees();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">委員会管理</h1>
        <p className="text-slate-500 text-sm">
          議案が付託される委員会を管理します。議案が紐づく委員会は削除できません。
        </p>
      </header>

      <CreateCommitteeForm />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">委員会名</th>
              <th className="px-3 py-2 font-medium">説明</th>
              <th className="w-20 px-3 py-2 text-center font-medium">並び順</th>
              <th className="w-20 px-3 py-2 text-center font-medium">状態</th>
              <th className="w-20 px-3 py-2 text-center font-medium">議案数</th>
              <th className="w-32 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <StatusRow>読み込み中…</StatusRow>
            ) : isError ? (
              <StatusRow className="text-red-600">{error.message}</StatusRow>
            ) : committees.length === 0 ? (
              <StatusRow>
                委員会がありません。上のフォームから追加してください。
              </StatusRow>
            ) : (
              committees.map((committee) => (
                <CommitteeRow key={committee.id} committee={committee} />
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
