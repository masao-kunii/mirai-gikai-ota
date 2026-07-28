import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import {
  type AdminExpert,
  STANCE_LABELS,
  TARGET_TYPE_LABELS,
  useExperts,
} from "../features/experts/experts-queries";

export const Route = createFileRoute("/experts")({
  component: ExpertsPage,
});

function ExpertsPage() {
  const { data: experts, isPending, isError, error } = useExperts();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">専門家</h1>
        <p className="text-slate-500 text-sm">
          公開サイトで登録された専門家の一覧です。各専門家が意見（インタビュー）を寄せた対象も表示します。登録は本人が行います。
        </p>
      </header>

      {isPending ? (
        <p className="text-slate-500 text-sm">読み込み中…</p>
      ) : isError ? (
        <p className="text-red-600 text-sm">{error.message}</p>
      ) : experts.length === 0 ? (
        <p className="rounded-lg border border-slate-200 border-dashed bg-white px-3 py-8 text-center text-slate-500 text-sm">
          専門家の登録はありません。
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-400 text-xs">{experts.length}名</p>
          {experts.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpertCard({ expert }: { expert: AdminExpert }) {
  return (
    <article className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium text-slate-900">{expert.name}</span>
          <span className="ml-2 text-slate-500 text-sm">
            {expert.affiliation}
          </span>
        </div>
        <span className="text-slate-400 text-xs">
          登録 {expert.createdAt.slice(0, 10)}
        </span>
      </div>
      <a
        href={`mailto:${expert.email}`}
        className="inline-flex items-center gap-1 text-slate-500 text-xs hover:text-slate-800"
      >
        <Mail className="size-3.5" />
        {expert.email}
      </a>
      {expert.reports.length > 0 ? (
        <div className="border-slate-100 border-t pt-2">
          <div className="mb-1 text-slate-400 text-xs">
            寄せた意見 {expert.reports.length}件
          </div>
          <ul className="space-y-1">
            {expert.reports.map((r, i) => (
              <li
                key={`${r.target?.name ?? "unknown"}-${i}`}
                className="flex items-center gap-2 text-sm"
              >
                {r.target ? (
                  <span className="text-slate-400 text-xs">
                    {TARGET_TYPE_LABELS[r.target.type]}
                  </span>
                ) : null}
                <span className="text-slate-700">
                  {r.target?.name ?? "（対象不明）"}
                </span>
                {r.stance ? (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 text-xs">
                    {STANCE_LABELS[r.stance] ?? r.stance}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-slate-400 text-xs">寄せた意見はありません</div>
      )}
    </article>
  );
}
