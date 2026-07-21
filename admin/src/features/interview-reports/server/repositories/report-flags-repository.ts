import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

/** 通報が付いた公開意見1件（レポート＋通報の集約）。 */
export type FlaggedReport = {
  reportId: string;
  summary: string | null;
  roleTitle: string | null;
  isPublicByAdmin: boolean;
  reviewStatus: string;
  flagCount: number;
  reasons: string[];
  details: string[];
};

/**
 * 通報のあるレポートを、通報数の多い順に返す。
 * 通報を interview_report_id で束ね、レポート本体を引いて合成する。
 */
export async function findFlaggedReports(): Promise<FlaggedReport[]> {
  const supabase = createAdminClient();

  const { data: flags, error } = await supabase
    .from("interview_report_flags")
    .select("interview_report_id, reason, detail")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch report flags: ${error.message}`);
  }
  if (!flags || flags.length === 0) return [];

  const grouped = new Map<
    string,
    { count: number; reasons: string[]; details: string[] }
  >();
  for (const f of flags) {
    const g = grouped.get(f.interview_report_id) ?? {
      count: 0,
      reasons: [],
      details: [],
    };
    g.count += 1;
    g.reasons.push(f.reason);
    if (f.detail) g.details.push(f.detail);
    grouped.set(f.interview_report_id, g);
  }

  const reportIds = [...grouped.keys()];
  const { data: reports } = await supabase
    .from("interview_report")
    .select("id, summary, role_title, is_public_by_admin, review_status")
    .in("id", reportIds);
  const reportById = new Map((reports ?? []).map((r) => [r.id, r]));

  return reportIds
    .map((id) => {
      const g = grouped.get(id);
      const r = reportById.get(id);
      return {
        reportId: id,
        summary: r?.summary ?? null,
        roleTitle: r?.role_title ?? null,
        isPublicByAdmin: r?.is_public_by_admin ?? false,
        reviewStatus: r?.review_status ?? "unknown",
        flagCount: g?.count ?? 0,
        reasons: [...new Set(g?.reasons ?? [])],
        details: g?.details ?? [],
      };
    })
    .sort((a, b) => b.flagCount - a.flagCount);
}

/** 通報を受けたレポートを非公開にする（review_status=rejected・非公開）。 */
export async function unpublishFlaggedReport(reportId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_report")
    .update({ is_public_by_admin: false, review_status: "rejected" })
    .eq("id", reportId);
  if (error) {
    throw new Error(`Failed to unpublish report: ${error.message}`);
  }
}
