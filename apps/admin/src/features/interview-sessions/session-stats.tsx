import { formatDurationJa } from "@mirai-gikai/shared/time/format-for-display";
import type { InterviewSessionStats } from "./interview-sessions-queries";

/** 回答全体の統計（アーカイブ済みを除く）。絞り込み条件ではなく、選んだ設定全体の値。 */
export function SessionStats({ stats }: { stats: InterviewSessionStats }) {
  const completionRate =
    stats.totalSessions === 0
      ? null
      : Math.round((stats.completedSessions / stats.totalSessions) * 100);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="回答数" value={stats.totalSessions} />
        <Tile
          label="完了"
          value={stats.completedSessions}
          note={
            completionRate === null ? undefined : `完了率 ${completionRate}%`
          }
        />
        <Tile label="レポート" value={stats.reports} />
        <Tile
          label="公開中"
          value={stats.publicReports}
          note="管理者と本人の両方が公開"
        />
        <Tile
          label="平均メッセージ数"
          value={stats.avgMessageCount ?? "—"}
          note="完了した回答"
        />
        <Tile
          label="所要時間（中央値）"
          value={formatDurationJa(stats.medianDurationSeconds)}
          note="完了した回答"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Distribution
          title="スタンス"
          total={stats.reports}
          items={[
            { label: "賛成", count: stats.stanceFor },
            { label: "反対", count: stats.stanceAgainst },
            { label: "中立", count: stats.stanceNeutral },
          ]}
        />
        <Distribution
          title="立場"
          total={stats.reports}
          items={[
            { label: "専門的な有識者", count: stats.roleSubjectExpert },
            { label: "業務に関係", count: stats.roleWorkRelated },
            { label: "暮らしに影響", count: stats.roleDailyLifeAffected },
            { label: "一般的な関心", count: stats.roleGeneralCitizen },
          ]}
        />
        <Distribution
          title="審査状態"
          total={stats.reports}
          items={[
            { label: "承認待ち", count: stats.reviewPending },
            { label: "自動承認", count: stats.reviewAutoApproved },
            { label: "承認済み", count: stats.reviewApproved },
            { label: "却下", count: stats.reviewRejected },
          ]}
          footer={
            stats.avgTotalContentRichness === null
              ? undefined
              : `平均の内容充実度 ${stats.avgTotalContentRichness} / 100`
          }
        />
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-slate-500 text-xs">{label}</div>
      <div className="font-semibold text-lg text-slate-900">{value}</div>
      {note ? <div className="text-slate-400 text-xs">{note}</div> : null}
    </div>
  );
}

function Distribution({
  title,
  total,
  items,
  footer,
}: {
  title: string;
  total: number;
  items: { label: string; count: number }[];
  footer?: string;
}) {
  return (
    <div>
      <h3 className="mb-1.5 font-medium text-slate-700 text-xs">{title}</h3>
      {total === 0 ? (
        <p className="text-slate-400 text-xs">レポートがありません</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const percent = Math.round((item.count / total) * 100);
            return (
              <li key={item.label} className="text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{item.label}</span>
                  <span>
                    {item.count}（{percent}%）
                  </span>
                </div>
                <div className="h-1.5 rounded bg-slate-100">
                  <div
                    className="h-1.5 rounded bg-slate-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {footer ? <p className="mt-2 text-slate-500 text-xs">{footer}</p> : null}
    </div>
  );
}
