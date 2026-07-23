import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";

const {
  interviewReport,
  interviewSessions,
  interviewConfigs,
  interviewReportFlags,
  bills,
  themes,
  themeInitiatives,
} = schema;

/**
 * 管理 インタビューレポート審査キュー（app_admin ロール）。
 *
 * 匿名インタビューのレポートは moderation で ok なら自動公開、引っかかれば
 * review_status='pending' で承認待ちになる。ここでは承認待ち等を一覧し、
 * 承認（公開）/却下（非公開）する。公開は is_public_by_admin AND is_public_by_user
 * の RLS を通る行のみなので、承認は is_public_by_admin を立てる操作にあたる。
 */

const reviewStatusEnum = z.enum([
  "auto_approved",
  "pending",
  "approved",
  "rejected",
]);

const listQuerySchema = z.object({
  status: z.union([reviewStatusEnum, z.literal("all")]).default("pending"),
});

const paramSchema = z.object({ id: z.uuid() });

function normalizeOpinions(
  value: unknown
): { title: string; content: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((o): o is Record<string, unknown> => !!o && typeof o === "object")
    .map((o) => ({
      title: typeof o.title === "string" ? o.title : "",
      content: typeof o.content === "string" ? o.content : "",
    }));
}

function normalizeCategories(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export const adminInterviewReportsRoute = new Hono()
  // 審査一覧（既定は承認待ち）。対象名・モデレーション・通報つき・新しい順。
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const { status } = c.req.valid("query");
    const { reportRows, flagRows } = await adminQuery(async (tx) => {
      const reportRows = await tx
        .select({
          id: interviewReport.id,
          sessionId: interviewReport.interviewSessionId,
          summary: interviewReport.summary,
          stance: interviewReport.stance,
          roleTitle: interviewReport.roleTitle,
          roleDescription: interviewReport.roleDescription,
          opinions: interviewReport.opinions,
          moderationScore: interviewReport.moderationScore,
          moderationStatus: interviewReport.moderationStatus,
          moderationCategories: interviewReport.moderationCategories,
          moderationReasoning: interviewReport.moderationReasoning,
          faithfulnessOk: interviewReport.faithfulnessOk,
          faithfulnessReasoning: interviewReport.faithfulnessReasoning,
          totalContentRichness: interviewReport.totalContentRichness,
          reviewStatus: interviewReport.reviewStatus,
          isPublicByAdmin: interviewReport.isPublicByAdmin,
          isPublicByUser: interviewReport.isPublicByUser,
          createdAt: interviewReport.createdAt,
          billId: interviewConfigs.billId,
          themeId: interviewConfigs.themeId,
          themeInitiativeId: interviewConfigs.themeInitiativeId,
          billName: bills.name,
          themeName: themes.name,
          initiativeTitle: themeInitiatives.title,
        })
        .from(interviewReport)
        .innerJoin(
          interviewSessions,
          eq(interviewSessions.id, interviewReport.interviewSessionId)
        )
        .innerJoin(
          interviewConfigs,
          eq(interviewConfigs.id, interviewSessions.interviewConfigId)
        )
        .leftJoin(bills, eq(bills.id, interviewConfigs.billId))
        .leftJoin(themes, eq(themes.id, interviewConfigs.themeId))
        .leftJoin(
          themeInitiatives,
          eq(themeInitiatives.id, interviewConfigs.themeInitiativeId)
        )
        .where(
          status === "all"
            ? undefined
            : eq(interviewReport.reviewStatus, status)
        )
        .orderBy(desc(interviewReport.createdAt));

      const flagRows = await tx
        .select({
          reportId: interviewReportFlags.interviewReportId,
          reason: interviewReportFlags.reason,
          detail: interviewReportFlags.detail,
          createdAt: interviewReportFlags.createdAt,
        })
        .from(interviewReportFlags)
        .orderBy(asc(interviewReportFlags.createdAt));

      return { reportRows, flagRows };
    });

    const flagsByReport = new Map<
      string,
      { reason: string; detail: string | null }[]
    >();
    for (const f of flagRows) {
      const list = flagsByReport.get(f.reportId) ?? [];
      list.push({ reason: f.reason, detail: f.detail });
      flagsByReport.set(f.reportId, list);
    }

    const resolveTarget = (r: (typeof reportRows)[number]) => {
      if (r.billId) {
        return { type: "bill" as const, name: r.billName ?? "(不明な議案)" };
      }
      if (r.themeId) {
        return {
          type: "theme" as const,
          name: r.themeName ?? "(不明なテーマ)",
        };
      }
      if (r.themeInitiativeId) {
        return {
          type: "initiative" as const,
          name: r.initiativeTitle ?? "(不明な取り組み)",
        };
      }
      return null;
    };

    const reports = reportRows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      target: resolveTarget(r),
      summary: r.summary,
      stance: r.stance,
      roleTitle: r.roleTitle,
      roleDescription: r.roleDescription,
      opinions: normalizeOpinions(r.opinions),
      moderationScore: r.moderationScore,
      moderationStatus: r.moderationStatus,
      moderationCategories: normalizeCategories(r.moderationCategories),
      moderationReasoning: r.moderationReasoning,
      faithfulnessOk: r.faithfulnessOk,
      faithfulnessReasoning: r.faithfulnessReasoning,
      totalContentRichness: r.totalContentRichness,
      reviewStatus: r.reviewStatus,
      isPublicByAdmin: r.isPublicByAdmin,
      isPublicByUser: r.isPublicByUser,
      createdAt: r.createdAt,
      flags: flagsByReport.get(r.id) ?? [],
    }));

    return c.json({ reports });
  })
  // 承認（review_status=approved・is_public_by_admin=true で公開へ）
  .post("/:id/approve", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx
        .update(interviewReport)
        .set({ reviewStatus: "approved", isPublicByAdmin: true })
        .where(eq(interviewReport.id, id))
        .returning({ id: interviewReport.id })
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: row.id });
  })
  // 却下（review_status=rejected・is_public_by_admin=false で非公開へ）
  .post("/:id/reject", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx
        .update(interviewReport)
        .set({ reviewStatus: "rejected", isPublicByAdmin: false })
        .where(eq(interviewReport.id, id))
        .returning({ id: interviewReport.id })
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: row.id });
  });

export type AdminInterviewReportsRouteType = typeof adminInterviewReportsRoute;
