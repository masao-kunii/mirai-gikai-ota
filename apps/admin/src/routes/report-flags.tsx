import { createFileRoute } from "@tanstack/react-router";
import { EyeOff, Flag } from "lucide-react";
import {
  FLAG_REASON_LABELS,
  type FlaggedReport,
  TARGET_TYPE_LABELS,
  useFlaggedReports,
  useUnpublishReport,
} from "../features/report-flags/report-flags-queries";

export const Route = createFileRoute("/report-flags")({
  component: ReportFlagsPage,
});

function ReportFlagsPage() {
  const { data: flagged, isPending, isError, error } = useFlaggedReports();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">通報</h1>
        <p className="text-slate-500 text-sm">
          公開中の意見に対して住民から寄せられた通報です。内容を確認し、必要なら非公開にしてください。
        </p>
      </header>

      {isPending ? (
        <p className="text-slate-500 text-sm">読み込み中…</p>
      ) : isError ? (
        <p className="text-red-600 text-sm">{error.message}</p>
      ) : flagged.length === 0 ? (
        <p className="rounded-lg border border-slate-200 border-dashed bg-white px-3 py-8 text-center text-slate-500 text-sm">
          通報はありません。
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-slate-400 text-xs">{flagged.length}件</p>
          {flagged.map((item) => (
            <FlaggedCard key={item.reportId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function FlaggedCard({ item }: { item: FlaggedReport }) {
  const unpublish = useUnpublishReport();

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 font-medium text-red-700 text-xs">
          <Flag className="size-3" />
          通報 {item.flagCount}件
        </span>
        {item.reasons.map((r) => (
          <span
            key={r}
            className="rounded border border-slate-200 px-2 py-0.5 text-slate-600 text-xs"
          >
            {FLAG_REASON_LABELS[r] ?? r}
          </span>
        ))}
        {item.target ? (
          <span className="text-slate-500 text-xs">
            {TARGET_TYPE_LABELS[item.target.type]}：{item.target.name}
          </span>
        ) : null}
        {item.roleTitle ? (
          <span className="text-slate-400 text-xs">{item.roleTitle}</span>
        ) : null}
        {!item.isPublicByAdmin ? (
          <span className="text-slate-400 text-xs">（非公開）</span>
        ) : null}
      </div>

      <div>
        <div className="mb-1 font-medium text-slate-400 text-xs">
          対象の意見（要約）
        </div>
        <p className="text-slate-800 text-sm">
          {item.summary ?? "（要約なし）"}
        </p>
      </div>

      {item.details.length > 0 ? (
        <div className="space-y-1 rounded-md bg-slate-50 p-3">
          <div className="font-medium text-slate-500 text-xs">通報者の補足</div>
          {item.details.map((d, i) => (
            <p
              key={`${item.reportId}-detail-${i}`}
              className="text-slate-700 text-xs"
            >
              ・{d}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-slate-100 border-t pt-3">
        {unpublish.isError ? (
          <span className="text-red-600 text-sm">
            {unpublish.error.message}
          </span>
        ) : null}
        {item.isPublicByAdmin ? (
          <button
            type="button"
            onClick={() => unpublish.mutate(item.reportId)}
            disabled={unpublish.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            <EyeOff className="size-4" />
            非公開にする
          </button>
        ) : (
          <span className="text-slate-400 text-sm">非公開済み</span>
        )}
      </div>
    </article>
  );
}
