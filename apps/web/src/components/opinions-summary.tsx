import {
  type OpinionsSummary,
  ROLE_LABELS,
  STANCE_BADGE_CLASS,
  STANCE_BAR_CLASS,
  STANCE_LABELS,
  STANCE_ORDER,
} from "../lib/bill-display";
import { ReportOpinionButton } from "./report-opinion-button";

/** ラベル＋バー＋件数の1行 */
function DistBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-mirai-text">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-mirai-surface-grouped">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-sm text-mirai-text-secondary">
        {count}件
      </span>
    </div>
  );
}

/**
 * 対象（議案／区政テーマ・取り組み）に寄せられた住民意見（公開インタビュー
 * レポート）の集約。立場の分布・回答者の分布・代表的な意見を見せる。
 *
 * 賛否（賛成/反対）は議案の賛否判断向けの軸なので、テーマ/取り組みでは
 * showStance=false にして賛否の分布・バッジを表示しない（住民は賛否でなく
 * 「必要・要望」を語るため、誤って「反対」等に見えるのを避ける）。
 */
export function OpinionsSummarySection({
  summary,
  heading = "🗣️ この議案に寄せられた住民の意見",
  showStance = true,
}: {
  summary: OpinionsSummary;
  heading?: string;
  showStance?: boolean;
}) {
  const { total, stances, roles, reports } = summary;

  const stanceRows = Object.keys(STANCE_ORDER)
    .sort((a, b) => (STANCE_ORDER[a] ?? 0) - (STANCE_ORDER[b] ?? 0))
    .filter((s) => (stances[s] ?? 0) > 0)
    .map((s) => ({
      key: s,
      label: STANCE_LABELS[s] ?? s,
      count: stances[s] ?? 0,
    }));

  // 立場は議案（enum）とテーマ（回答者が選んだラベル）の両方があり得るため、
  // roles に現れたキーをそのまま件数の多い順に見せる（既知の enum はラベル化）。
  const roleRows = Object.entries(roles)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, label: ROLE_LABELS[key] ?? key, count }));

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-bold text-[22px] text-mirai-text">{heading}</h2>
      <div className="flex flex-col gap-6 rounded-2xl border border-mirai-border-light bg-card p-6">
        <p className="text-sm leading-relaxed text-mirai-text-secondary">
          AIインタビューで集めた意見のうち、公開に同意いただいた
          <span className="font-bold text-mirai-text">{total}件</span>
          を集計しています。
        </p>

        {showStance && stanceRows.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-sm text-mirai-text">立場の分布</h3>
            {stanceRows.map((row) => (
              <DistBar
                key={row.key}
                label={row.label}
                count={row.count}
                total={total}
                colorClass={
                  STANCE_BAR_CLASS[row.key] ?? "bg-mirai-progress-fill"
                }
              />
            ))}
          </div>
        )}

        {roleRows.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-sm text-mirai-text">回答者の立場</h3>
            {roleRows.map((row) => (
              <DistBar
                key={row.key}
                label={row.label}
                count={row.count}
                total={total}
                colorClass="bg-mirai-info-blue"
              />
            ))}
          </div>
        )}

        {reports.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-sm text-mirai-text">代表的な意見</h3>
            <div className="flex flex-col gap-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-xl border border-mirai-border-muted bg-mirai-surface-grouped p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {showStance && r.stance && (
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                          STANCE_BADGE_CLASS[r.stance] ?? ""
                        }`}
                      >
                        {STANCE_LABELS[r.stance] ?? r.stance}
                      </span>
                    )}
                    {r.role && (
                      <span className="text-xs text-mirai-text-muted">
                        {r.roleTitle || ROLE_LABELS[r.role] || r.role}
                      </span>
                    )}
                    <span className="ml-auto">
                      <ReportOpinionButton reportId={r.id} />
                    </span>
                  </div>
                  {r.summary && (
                    <p className="text-sm leading-relaxed text-mirai-text">
                      {r.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-mirai-text-muted">
          ※
          この集計は住民の任意の回答に基づくもので、区民全体の意見を代表するものではありません。
        </p>
      </div>
    </section>
  );
}
