import { Check, Flag, X } from "lucide-react";
import type { AdminInterviewReport } from "./interview-reports-queries";
import { useApproveReport, useRejectReport } from "./interview-reports-queries";
import {
  categoryLabel,
  FLAG_REASON_LABELS,
  MODERATION_STATUS_BADGE,
  MODERATION_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
  type ReviewStatus,
  STANCE_LABELS,
  TARGET_TYPE_LABELS,
} from "./moderation-labels";

const REVIEW_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  auto_approved: "bg-slate-100 text-slate-600",
};

/** 審査キューの1レポート。内容・モデレーション・通報を示し、承認/却下する。 */
export function ReportReviewCard({ report }: { report: AdminInterviewReport }) {
  const approve = useApproveReport();
  const reject = useRejectReport();
  const pending = approve.isPending || reject.isPending;
  const errorMessage = approve.error?.message ?? reject.error?.message ?? null;

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {report.target ? (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 text-xs">
            {TARGET_TYPE_LABELS[report.target.type]}：{report.target.name}
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-400 text-xs">
            対象不明
          </span>
        )}
        <span
          className={`rounded px-2 py-0.5 font-medium text-xs ${REVIEW_STATUS_BADGE[report.reviewStatus]}`}
        >
          {REVIEW_STATUS_LABELS[report.reviewStatus as ReviewStatus]}
        </span>
        {report.flags.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 font-medium text-red-600 text-xs">
            <Flag className="size-3" />
            通報 {report.flags.length}
          </span>
        ) : null}
      </div>

      <div>
        <div className="text-slate-500 text-xs">
          {report.roleTitle ?? "立場未設定"}
          {report.stance
            ? ` ・ ${STANCE_LABELS[report.stance] ?? report.stance}`
            : ""}
        </div>
        {report.summary ? (
          <p className="mt-1 text-slate-800 text-sm">{report.summary}</p>
        ) : null}
      </div>

      {report.opinions.length > 0 ? (
        <ul className="space-y-1">
          {report.opinions.map((o) => (
            <li key={`${o.title}-${o.content}`} className="text-sm">
              <span className="font-medium text-slate-700">{o.title}</span>
              <span className="text-slate-500">：{o.content}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <ModerationInfo report={report} />

      {report.flags.length > 0 ? (
        <div className="rounded border border-red-100 bg-red-50 p-2">
          <div className="font-medium text-red-700 text-xs">住民からの通報</div>
          <ul className="mt-1 space-y-0.5">
            {report.flags.map((f) => (
              <li
                key={`${f.reason}-${f.detail}`}
                className="text-red-600 text-xs"
              >
                {FLAG_REASON_LABELS[f.reason] ?? f.reason}
                {f.detail ? `：${f.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-slate-100 border-t pt-3">
        {errorMessage ? (
          <span className="text-red-600 text-sm">{errorMessage}</span>
        ) : null}
        <button
          type="button"
          onClick={() => reject.mutate(report.id)}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-600 text-sm hover:bg-slate-100 disabled:opacity-50"
        >
          <X className="size-4" />
          却下（非公開）
        </button>
        <button
          type="button"
          onClick={() => approve.mutate(report.id)}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 font-medium text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <Check className="size-4" />
          承認（公開）
        </button>
      </div>
    </article>
  );
}

function ModerationInfo({ report }: { report: AdminInterviewReport }) {
  return (
    <div className="space-y-1.5 rounded border border-slate-100 bg-slate-50 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-500">モデレーション</span>
        {report.moderationStatus ? (
          <span
            className={`rounded px-1.5 py-0.5 font-medium ${MODERATION_STATUS_BADGE[report.moderationStatus] ?? "bg-slate-100 text-slate-600"}`}
          >
            {MODERATION_STATUS_LABELS[report.moderationStatus] ??
              report.moderationStatus}
          </span>
        ) : null}
        {report.moderationScore !== null ? (
          <span className="text-slate-500">
            スコア {report.moderationScore}
          </span>
        ) : null}
        {report.totalContentRichness !== null ? (
          <span className="text-slate-400">
            充実度 {report.totalContentRichness}
          </span>
        ) : null}
      </div>
      {report.moderationCategories.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {report.moderationCategories.map((cat) => (
            <span
              key={cat}
              className="rounded bg-red-100 px-1.5 py-0.5 text-red-700"
            >
              {categoryLabel(cat)}
            </span>
          ))}
        </div>
      ) : null}
      {report.moderationReasoning ? (
        <p className="text-slate-500">{report.moderationReasoning}</p>
      ) : null}
      {report.faithfulnessOk === false ? (
        <p className="text-amber-700">
          忠実性の懸念：{report.faithfulnessReasoning ?? "（理由なし）"}
        </p>
      ) : null}
    </div>
  );
}
