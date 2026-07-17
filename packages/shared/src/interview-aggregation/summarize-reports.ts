/**
 * 公開レポート（インタビュー結果）の集約。
 *
 * 議案・区政テーマなど「対象」ごとに集めた公開レポートから、スタンス／立場の
 * 分布と、代表意見（充実度の高い順に数件）を作る。対象に依存しない純粋関数
 * なので、議案の集約（bills ルート）とテーマの集約（themes ルート）で共用する。
 */

/** 集約の入力（1レポート）。DB から必要列だけ取り出したもの。 */
export type ReportRow = {
  id: string;
  summary: string | null;
  stance: string | null;
  role: string | null;
  roleTitle: string | null;
  /** 内容の充実度（総合スコア）。代表意見の並び替えに使う。 */
  richness: number | null;
};

/** 集約の出力。フロントの OpinionsSummary と対応する。 */
export type OpinionsSummary = {
  total: number;
  stances: Record<string, number>;
  roles: Record<string, number>;
  reports: {
    id: string;
    summary: string | null;
    stance: string | null;
    role: string | null;
    roleTitle: string | null;
  }[];
};

/** 代表意見として返す最大件数。 */
export const TOP_REPORT_COUNT = 6;

export function summarizeReports(
  rows: ReportRow[],
  options?: {
    /**
     * 立場の分布を role（enum）ではなく roleTitle（回答者が申告したラベル）で
     * 集計する。区政テーマ/取り組みは立場を本人が選ぶため true にする。
     */
    groupRolesByTitle?: boolean;
  }
): OpinionsSummary {
  // スタンス・立場の分布を集計
  const stances: Record<string, number> = {};
  const roles: Record<string, number> = {};
  for (const r of rows) {
    if (r.stance) stances[r.stance] = (stances[r.stance] ?? 0) + 1;
    const roleKey = options?.groupRolesByTitle ? r.roleTitle : r.role;
    if (roleKey) roles[roleKey] = (roles[roleKey] ?? 0) + 1;
  }

  // 代表意見（充実度の高い順に数件）
  const reports = [...rows]
    .sort((a, b) => (b.richness ?? 0) - (a.richness ?? 0))
    .slice(0, TOP_REPORT_COUNT)
    .map((r) => ({
      id: r.id,
      summary: r.summary,
      stance: r.stance,
      role: r.role,
      roleTitle: r.roleTitle,
    }));

  return { total: rows.length, stances, roles, reports };
}
