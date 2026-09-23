import {
  formatDurationJa,
  formatJstDateTime,
} from "@mirai-gikai/shared/time/format-for-display";
import { Link } from "@tanstack/react-router";
import {
  MODERATION_STATUS_BADGE,
  MODERATION_STATUS_LABELS,
  REVIEW_STATUS_BADGE,
  REVIEW_STATUS_LABELS,
  type ReviewStatus,
  STANCE_LABELS,
  TARGET_TYPE_LABELS,
} from "../interview-reports/moderation-labels";
import type { AdminInterviewSessionRow } from "./interview-sessions-queries";

const COLSPAN = 7;

/** 回答一覧の表。行を押すと会話ログとレポートの詳細へ移る。 */
export function SessionTable({
  sessions,
  loading,
  error,
}: {
  sessions: AdminInterviewSessionRow[] | undefined;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
          <tr>
            <th className="w-36 px-3 py-2 font-medium">開始</th>
            <th className="w-44 px-3 py-2 font-medium">対象</th>
            <th className="px-3 py-2 font-medium">回答者／要約</th>
            <th className="w-24 whitespace-nowrap px-3 py-2 text-center font-medium">
              メッセージ
            </th>
            <th className="w-20 px-3 py-2 text-center font-medium">所要時間</th>
            <th className="w-16 px-3 py-2 text-center font-medium">充実度</th>
            <th className="w-40 px-3 py-2 font-medium">審査</th>
          </tr>
        </thead>
        <tbody>
          {error ? (
            <StatusRow className="text-red-600">{error}</StatusRow>
          ) : loading && !sessions ? (
            <StatusRow>読み込み中…</StatusRow>
          ) : !sessions || sessions.length === 0 ? (
            <StatusRow>条件に合う回答はありません。</StatusRow>
          ) : (
            sessions.map((s) => <SessionRow key={s.id} session={s} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function SessionRow({ session }: { session: AdminInterviewSessionRow }) {
  const r = session.report;
  return (
    <tr className="border-slate-100 border-b align-top hover:bg-slate-50">
      <td className="px-3 py-2 text-slate-700 text-xs">
        <Link
          to="/interview-session/$sessionId"
          params={{ sessionId: session.id }}
          className="text-slate-800 underline decoration-slate-300 hover:decoration-slate-600"
        >
          {formatJstDateTime(session.startedAt)}
        </Link>
        <div className="mt-0.5 text-slate-400">
          {session.archivedAt
            ? "アーカイブ"
            : session.completedAt
              ? "完了"
              : "回答中"}
        </div>
      </td>
      <td className="px-3 py-2 text-xs">
        {session.target ? (
          <>
            <div className="text-slate-400">
              {TARGET_TYPE_LABELS[session.target.type]}
            </div>
            <div className="text-slate-700">{session.target.name}</div>
          </>
        ) : (
          <span className="text-slate-400">対象不明</span>
        )}
      </td>
      <td className="px-3 py-2">
        {r ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {r.stance ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                  {STANCE_LABELS[r.stance] ?? r.stance}
                </span>
              ) : null}
              {r.roleTitle ? (
                <span className="text-slate-600">{r.roleTitle}</span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-slate-600 text-xs">
              {r.summary ?? "（要約なし）"}
            </p>
          </>
        ) : (
          <span className="text-slate-400 text-xs">レポートなし</span>
        )}
      </td>
      <td className="px-3 py-2 text-center text-slate-600">
        {session.messageCount}
      </td>
      <td className="px-3 py-2 text-center text-slate-600 text-xs">
        {formatDurationJa(session.durationSeconds)}
      </td>
      <td className="px-3 py-2 text-center text-slate-600">
        {r?.totalContentRichness ?? "—"}
      </td>
      <td className="px-3 py-2">{r ? <ReviewCell report={r} /> : null}</td>
    </tr>
  );
}

function ReviewCell({
  report,
}: {
  report: NonNullable<AdminInterviewSessionRow["report"]>;
}) {
  const isPublic = report.isPublicByAdmin && report.isPublicByUser;
  return (
    <div className="flex flex-wrap gap-1 text-xs">
      {report.reviewStatus ? (
        <span
          className={`rounded px-1.5 py-0.5 ${REVIEW_STATUS_BADGE[report.reviewStatus] ?? ""}`}
        >
          {REVIEW_STATUS_LABELS[report.reviewStatus as ReviewStatus] ??
            report.reviewStatus}
        </span>
      ) : null}
      {report.moderationStatus ? (
        <span
          className={`rounded px-1.5 py-0.5 ${MODERATION_STATUS_BADGE[report.moderationStatus] ?? ""}`}
        >
          {MODERATION_STATUS_LABELS[report.moderationStatus]}
        </span>
      ) : (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
          未評価
        </span>
      )}
      <span
        className={`rounded px-1.5 py-0.5 ${isPublic ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
      >
        {isPublic ? "公開中" : "非公開"}
      </span>
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
