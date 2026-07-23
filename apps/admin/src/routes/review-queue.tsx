import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useInterviewReports } from "../features/interview-reports/interview-reports-queries";
import {
  REVIEW_STATUS_TABS,
  type ReviewStatus,
} from "../features/interview-reports/moderation-labels";
import { ReportReviewCard } from "../features/interview-reports/report-review-card";

export const Route = createFileRoute("/review-queue")({
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const [status, setStatus] = useState<ReviewStatus | "all">("pending");
  const {
    data: reports,
    isPending,
    isError,
    error,
  } = useInterviewReports(status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">審査キュー</h1>
        <p className="text-slate-500 text-sm">
          匿名インタビューのレポートを審査します。承認すると公開（住民の同意済みのもの）、却下すると非公開になります。
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {REVIEW_STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === tab.value
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <p className="text-slate-500 text-sm">読み込み中…</p>
      ) : isError ? (
        <p className="text-red-600 text-sm">{error.message}</p>
      ) : reports.length === 0 ? (
        <p className="rounded-lg border border-slate-200 border-dashed bg-white px-3 py-8 text-center text-slate-500 text-sm">
          該当するレポートはありません。
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-slate-400 text-xs">{reports.length}件</p>
          {reports.map((report) => (
            <ReportReviewCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
