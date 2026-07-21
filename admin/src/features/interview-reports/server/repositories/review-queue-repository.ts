import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

/** 承認待ちレポートの対象（議案／テーマ／取り組み）。 */
export type ReviewTarget = {
  type: "bill" | "theme" | "initiative";
  id: string;
  name: string;
};

/** 承認キューに並べる1件。 */
export type PendingReviewItem = {
  reportId: string;
  sessionId: string;
  target: ReviewTarget | null;
  summary: string | null;
  roleTitle: string | null;
  stance: string | null;
  roleDescription: string | null;
  moderationScore: number | null;
  moderationCategories: string[];
  moderationReasoning: string | null;
  faithfulnessOk: boolean | null;
  faithfulnessReasoning: string | null;
  totalContentRichness: number | null;
  startedAt: string | null;
};

/** jsonb の moderation_categories を安全に string[] へ。 */
function normalizeCategories(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/**
 * 承認待ち（review_status='pending'）のレポートを、対象名を解決して新しい順に返す。
 * 議案・テーマ・取り組みを横断する。件数は多くない想定なので素直に段階取得する。
 */
export async function findPendingReviewItems(): Promise<PendingReviewItem[]> {
  const supabase = createAdminClient();

  const { data: reports, error } = await supabase
    .from("interview_report")
    .select(
      "id, interview_session_id, summary, role_title, stance, role_description, moderation_score, moderation_categories, moderation_reasoning, faithfulness_ok, faithfulness_reasoning, total_content_richness, created_at"
    )
    .eq("review_status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch pending reports: ${error.message}`);
  }
  if (!reports || reports.length === 0) return [];

  // session → config を解決
  const sessionIds = [...new Set(reports.map((r) => r.interview_session_id))];
  const { data: sessions } = await supabase
    .from("interview_sessions")
    .select("id, started_at, interview_config_id")
    .in("id", sessionIds);
  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));

  const configIds = [
    ...new Set((sessions ?? []).map((s) => s.interview_config_id)),
  ];
  const { data: configs } = await supabase
    .from("interview_configs")
    .select("id, bill_id, theme_id, theme_initiative_id")
    .in("id", configIds);
  const configById = new Map((configs ?? []).map((c) => [c.id, c]));

  // 対象 id を種別ごとに集めて名称を引く
  const billIds: string[] = [];
  const themeIds: string[] = [];
  const initiativeIds: string[] = [];
  for (const c of configs ?? []) {
    if (c.bill_id) billIds.push(c.bill_id);
    else if (c.theme_id) themeIds.push(c.theme_id);
    else if (c.theme_initiative_id) initiativeIds.push(c.theme_initiative_id);
  }

  const billName = new Map<string, string>();
  if (billIds.length > 0) {
    const { data } = await supabase
      .from("bills")
      .select("id, name")
      .in("id", billIds);
    for (const b of data ?? []) billName.set(b.id, b.name);
  }
  const themeName = new Map<string, string>();
  if (themeIds.length > 0) {
    const { data } = await supabase
      .from("themes")
      .select("id, name")
      .in("id", themeIds);
    for (const t of data ?? []) themeName.set(t.id, t.name);
  }
  const initiativeName = new Map<string, string>();
  if (initiativeIds.length > 0) {
    const { data } = await supabase
      .from("theme_initiatives")
      .select("id, title")
      .in("id", initiativeIds);
    for (const i of data ?? []) initiativeName.set(i.id, i.title);
  }

  const resolveTarget = (configId: string | undefined): ReviewTarget | null => {
    const config = configId ? configById.get(configId) : undefined;
    if (!config) return null;
    if (config.bill_id) {
      return {
        type: "bill",
        id: config.bill_id,
        name: billName.get(config.bill_id) ?? "(不明な議案)",
      };
    }
    if (config.theme_id) {
      return {
        type: "theme",
        id: config.theme_id,
        name: themeName.get(config.theme_id) ?? "(不明なテーマ)",
      };
    }
    if (config.theme_initiative_id) {
      return {
        type: "initiative",
        id: config.theme_initiative_id,
        name:
          initiativeName.get(config.theme_initiative_id) ?? "(不明な取り組み)",
      };
    }
    return null;
  };

  return reports.map((r) => {
    const session = sessionById.get(r.interview_session_id);
    return {
      reportId: r.id,
      sessionId: r.interview_session_id,
      target: resolveTarget(session?.interview_config_id),
      summary: r.summary,
      roleTitle: r.role_title,
      stance: r.stance,
      roleDescription: r.role_description,
      moderationScore: r.moderation_score,
      moderationCategories: normalizeCategories(r.moderation_categories),
      moderationReasoning: r.moderation_reasoning,
      faithfulnessOk: r.faithfulness_ok,
      faithfulnessReasoning: r.faithfulness_reasoning,
      totalContentRichness: r.total_content_richness,
      startedAt: session?.started_at ?? null,
    };
  });
}

/** 承認/却下の確定（review_status ＋ 公開フラグを更新）。 */
export async function updateReviewDecision(
  reportId: string,
  params: { reviewStatus: "approved" | "rejected"; isPublicByAdmin: boolean }
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_report")
    .update({
      review_status: params.reviewStatus,
      is_public_by_admin: params.isPublicByAdmin,
    })
    .eq("id", reportId);
  if (error) {
    throw new Error(`Failed to update review decision: ${error.message}`);
  }
}
