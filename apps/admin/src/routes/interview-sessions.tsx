import {
  createFileRoute,
  type SearchSchemaInput,
  stripSearchParams,
} from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useInterviewConfigs } from "../features/interview-configs/interview-configs-queries";
import { BulkActionsPanel } from "../features/interview-sessions/bulk-actions-panel";
import {
  useInterviewSessionStats,
  useInterviewSessions,
} from "../features/interview-sessions/interview-sessions-queries";
import { SessionFilterBar } from "../features/interview-sessions/session-filter-bar";
import {
  DEFAULT_SESSION_SEARCH,
  parseSessionSearch,
  type SessionSearch,
} from "../features/interview-sessions/session-search";
import { SessionStats } from "../features/interview-sessions/session-stats";
import { SessionTable } from "../features/interview-sessions/session-table";
import { iconButtonClass } from "../lib/ui";

export const Route = createFileRoute("/interview-sessions")({
  // 入力は省略可（リンク側は必要な条件だけ渡す）。省略した項目は既定値で埋まる。
  validateSearch: (input: Partial<SessionSearch> & SearchSchemaInput) =>
    parseSessionSearch(input),
  // 既定値のままの条件は URL に出さない。
  search: { middlewares: [stripSearchParams(DEFAULT_SESSION_SEARCH)] },
  component: InterviewSessionsPage,
});

function InterviewSessionsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const configs = useInterviewConfigs("all");
  const stats = useInterviewSessionStats(search.configId);
  const list = useInterviewSessions(search);

  const update = (next: Partial<SessionSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) });

  const total = list.data?.total ?? 0;
  const pageSize = list.data?.pageSize ?? 30;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">インタビュー回答</h1>
        <p className="text-slate-500 text-sm">
          住民のインタビューを回答ごとに確認します。行の日時から、会話ログとレポートの詳細を開けます。
        </p>
      </header>

      <SessionFilterBar
        search={search}
        configs={configs.data ?? []}
        onChange={update}
      />

      <BulkActionsPanel configId={search.configId} />

      {stats.isError ? (
        <p className="text-red-600 text-sm">{stats.error.message}</p>
      ) : stats.data ? (
        <SessionStats stats={stats.data} />
      ) : null}

      <div className="flex items-center justify-between text-slate-600 text-sm">
        <span>
          {total} 件中 {total === 0 ? 0 : (search.page - 1) * pageSize + 1}〜
          {Math.min(search.page * pageSize, total)} 件
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => update({ page: search.page - 1 })}
            disabled={search.page <= 1}
            className={iconButtonClass}
            aria-label="前のページ"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs">
            {search.page} / {lastPage}
          </span>
          <button
            type="button"
            onClick={() => update({ page: search.page + 1 })}
            disabled={search.page >= lastPage}
            className={iconButtonClass}
            aria-label="次のページ"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <SessionTable
        sessions={list.data?.sessions}
        loading={list.isPending}
        error={list.isError ? list.error.message : null}
      />
    </div>
  );
}
