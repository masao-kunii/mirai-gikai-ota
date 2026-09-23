import {
  formatDurationJa,
  formatJstDateTime,
} from "@mirai-gikai/shared/time/format-for-display";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, EyeOff, Flag } from "lucide-react";
import {
  useApproveReport,
  useRejectReport,
} from "../interview-reports/interview-reports-queries";
import {
  categoryLabel,
  FLAG_REASON_LABELS,
  MODERATION_STATUS_BADGE,
  MODERATION_STATUS_LABELS,
  REVIEW_STATUS_BADGE,
  REVIEW_STATUS_LABELS,
  type ReviewStatus,
  ROLE_LABELS,
  STANCE_LABELS,
  TARGET_TYPE_LABELS,
} from "../interview-reports/moderation-labels";
import {
  type AdminInterviewSessionDetail,
  useInterviewSession,
} from "./interview-sessions-queries";

type Report = NonNullable<AdminInterviewSessionDetail["report"]>;

/** 1件の回答の詳細。左にレポートと判定、右に会話ログ。 */
export function SessionDetailPage({ sessionId }: { sessionId: string }) {
  const { data, isPending, isError, error } = useInterviewSession(sessionId);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link
        to="/interview-sessions"
        className="inline-flex items-center gap-1 text-slate-500 text-sm hover:text-slate-800"
      >
        <ArrowLeft className="size-4" />
        回答一覧へ戻る
      </Link>

      {isPending ? (
        <p className="text-slate-500 text-sm">読み込み中…</p>
      ) : isError ? (
        <p className="text-red-600 text-sm">{error.message}</p>
      ) : (
        <>
          <SessionHeader session={data.session} />
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-2">
              {data.report ? (
                <ReportPanel report={data.report} flags={data.flags} />
              ) : (
                <section className="rounded-lg border border-slate-200 bg-white p-4 text-slate-500 text-sm">
                  レポートはまだありません（回答が完了していないか、要約の生成に失敗しています）。
                </section>
              )}
            </div>
            <div className="lg:col-span-3">
              <ChatLog messages={data.messages} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SessionHeader({
  session,
}: {
  session: AdminInterviewSessionDetail["session"];
}) {
  return (
    <header className="space-y-1">
      <h1 className="font-bold text-slate-900 text-xl">
        {session.target
          ? `${TARGET_TYPE_LABELS[session.target.type]}：${session.target.name}`
          : "対象不明"}
      </h1>
      <p className="text-slate-500 text-sm">
        設定「{session.configName}」 ／ 開始{" "}
        {formatJstDateTime(session.startedAt)}
        {session.completedAt
          ? ` ／ 完了 ${formatJstDateTime(session.completedAt)}（${formatDurationJa(session.durationSeconds)}）`
          : " ／ 回答中"}
        {session.archivedAt ? " ／ アーカイブ済み" : ""}
      </p>
    </header>
  );
}

function ReportPanel({
  report,
  flags,
}: {
  report: Report;
  flags: AdminInterviewSessionDetail["flags"];
}) {
  const opinions = asOpinions(report.opinions);
  const richness = asRichness(report.contentRichness);

  return (
    <>
      <PublishPanel report={report} />

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-800 text-sm">レポート</h2>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {report.stance ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
              {STANCE_LABELS[report.stance] ?? report.stance}
            </span>
          ) : null}
          {report.role ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
              {ROLE_LABELS[report.role] ?? report.role}
            </span>
          ) : null}
          {report.roleTitle ? (
            <span className="text-slate-600">{report.roleTitle}</span>
          ) : null}
        </div>
        {report.roleDescription ? (
          <p className="text-slate-500 text-xs">{report.roleDescription}</p>
        ) : null}
        <p className="whitespace-pre-wrap text-slate-800 text-sm">
          {report.summary ?? "（要約なし）"}
        </p>
        {opinions.length > 0 ? (
          <ul className="space-y-2">
            {opinions.map((o) => (
              <li key={o.title} className="rounded-md bg-slate-50 p-2">
                <div className="font-medium text-slate-800 text-xs">
                  {o.title}
                </div>
                <div className="text-slate-600 text-xs">{o.content}</div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-medium text-slate-800">判定</h2>
        <Judgement
          title="モデレーション"
          badge={
            report.moderationStatus ? (
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${MODERATION_STATUS_BADGE[report.moderationStatus] ?? ""}`}
              >
                {MODERATION_STATUS_LABELS[report.moderationStatus]}（
                {report.moderationScore}）
              </span>
            ) : (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 text-xs">
                未評価
              </span>
            )
          }
          detail={report.moderationReasoning}
          tags={asStrings(report.moderationCategories).map(categoryLabel)}
        />
        <Judgement
          title="対話ログへの忠実性"
          badge={
            report.faithfulnessOk === null ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 text-xs">
                未評価
              </span>
            ) : report.faithfulnessOk ? (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 text-xs">
                問題なし
              </span>
            ) : (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 text-xs">
                ずれあり
              </span>
            )
          }
          detail={report.faithfulnessReasoning}
        />
        <Judgement
          title="内容充実度"
          badge={
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 text-xs">
              {report.totalContentRichness ?? "—"} / 100
            </span>
          }
          detail={richness?.reasoning ?? null}
          tags={richness?.tags ?? []}
        />
      </section>

      {flags.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <h2 className="flex items-center gap-1 font-medium text-red-700">
            <Flag className="size-4" />
            住民からの通報（{flags.length} 件）
          </h2>
          <ul className="space-y-1 text-xs">
            {flags.map((f) => (
              <li key={`${f.createdAt}-${f.reason}`} className="text-red-700">
                {FLAG_REASON_LABELS[f.reason] ?? f.reason}
                {f.detail ? `：${f.detail}` : ""}
                <span className="ml-1 text-red-400">
                  {formatJstDateTime(f.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/**
 * 公開状態と切り替え。サイトに載るのは「管理者の公開」と「本人の公開同意」の両方が
 * そろったときだけ。管理者側の公開は審査キューと同じ承認・却下で切り替える。
 */
function PublishPanel({ report }: { report: Report }) {
  const approve = useApproveReport();
  const reject = useRejectReport();
  const pending = approve.isPending || reject.isPending;
  const errorMessage = approve.error?.message ?? reject.error?.message ?? null;
  const isPublic = report.isPublicByAdmin && report.isPublicByUser;

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 font-medium text-xs ${isPublic ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}
        >
          {isPublic ? "サイトに公開中" : "非公開"}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${REVIEW_STATUS_BADGE[report.reviewStatus] ?? ""}`}
        >
          {REVIEW_STATUS_LABELS[report.reviewStatus as ReviewStatus] ??
            report.reviewStatus}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-1 text-slate-600 text-xs">
        <dt>管理者の公開</dt>
        <dd>{report.isPublicByAdmin ? "公開" : "非公開"}</dd>
        <dt>本人の公開同意</dt>
        <dd>{report.isPublicByUser ? "あり" : "なし"}</dd>
      </dl>
      {!report.isPublicByUser ? (
        <p className="text-slate-500 text-xs">
          本人が公開に同意していないため、承認してもサイトには載りません。
        </p>
      ) : null}
      <div className="flex gap-2">
        {report.isPublicByAdmin ? (
          <button
            type="button"
            onClick={() => reject.mutate(report.id)}
            disabled={pending}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 text-xs hover:bg-slate-100 disabled:opacity-50"
          >
            <EyeOff className="size-3.5" />
            非公開にする（却下）
          </button>
        ) : (
          <button
            type="button"
            onClick={() => approve.mutate(report.id)}
            disabled={pending}
            className="flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 font-medium text-white text-xs hover:bg-slate-700 disabled:opacity-50"
          >
            <Check className="size-3.5" />
            公開する（承認）
          </button>
        )}
      </div>
      {errorMessage ? (
        <p className="text-red-600 text-xs">{errorMessage}</p>
      ) : null}
    </section>
  );
}

function Judgement({
  title,
  badge,
  detail,
  tags = [],
}: {
  title: string;
  badge: React.ReactNode;
  detail: string | null;
  tags?: string[];
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-slate-600 text-xs">{title}</span>
        {badge}
      </div>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded bg-slate-50 px-1.5 py-0.5 text-slate-500 text-xs"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {detail ? <p className="text-slate-500 text-xs">{detail}</p> : null}
    </div>
  );
}

function ChatLog({
  messages,
}: {
  messages: AdminInterviewSessionDetail["messages"];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-medium text-slate-800 text-sm">
        会話ログ（{messages.length} 件）
      </h2>
      {messages.length === 0 ? (
        <p className="text-slate-400 text-sm">メッセージはありません。</p>
      ) : (
        <ol className="space-y-3">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <li
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isUser ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-800"}`}
                >
                  <div
                    className={`mb-0.5 text-xs ${isUser ? "text-slate-300" : "text-slate-500"}`}
                  >
                    {isUser ? "回答者" : "AI"}・{formatJstDateTime(m.createdAt)}
                  </div>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// レポートの JSON 列は型が付かないので、表示に使う形だけを取り出す。
function asOpinions(value: unknown): { title: string; content: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) =>
    v &&
    typeof v === "object" &&
    typeof v.title === "string" &&
    typeof v.content === "string"
      ? [{ title: v.title, content: v.content }]
      : []
  );
}

/** 内容充実度の内訳。値が無い項目は出さない（0 と区別できなくなるため）。 */
function asRichness(value: unknown): {
  tags: string[];
  reasoning: string | null;
} | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const tags = RICHNESS_ITEMS.flatMap(([key, label]) =>
    typeof v[key] === "number" ? [`${label} ${v[key]}`] : []
  );
  const reasoning = typeof v.reasoning === "string" ? v.reasoning : null;
  return tags.length === 0 && reasoning === null ? null : { tags, reasoning };
}

const RICHNESS_ITEMS = [
  ["clarity", "明確さ"],
  ["specificity", "具体性"],
  ["impact", "影響"],
  ["constructiveness", "建設性"],
] as const;

function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}
