import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";

const {
  interviewReportFlags,
  interviewReport,
  interviewSessions,
  interviewConfigs,
  bills,
  themes,
  themeInitiatives,
} = schema;

/**
 * 管理 通報（app_admin ロール）。
 *
 * 公開中の意見（インタビューレポート）に住民から寄せられた通報を、レポート単位で
 * 集約して見せ、内容を確認したうえで非公開化できる。通報は
 * interview_report_flags（reason/detail）に入る。非公開化は
 * is_public_by_admin=false ＋ review_status=rejected（審査キューの却下と同じ効果）。
 */

const paramSchema = z.object({ reportId: z.uuid() });

export const adminReportFlagsRoute = new Hono()
  // 通報のあるレポート一覧（通報数の多い順）
  .get("/", async (c) => {
    const { flagRows, reportRows } = await adminQuery(async (tx) => {
      const flagRows = await tx
        .select({
          reportId: interviewReportFlags.interviewReportId,
          reason: interviewReportFlags.reason,
          detail: interviewReportFlags.detail,
        })
        .from(interviewReportFlags)
        .orderBy(desc(interviewReportFlags.createdAt));

      const reportIds = [...new Set(flagRows.map((f) => f.reportId))];
      const reportRows =
        reportIds.length === 0
          ? []
          : await tx
              .select({
                id: interviewReport.id,
                summary: interviewReport.summary,
                roleTitle: interviewReport.roleTitle,
                isPublicByAdmin: interviewReport.isPublicByAdmin,
                reviewStatus: interviewReport.reviewStatus,
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
              .where(inArray(interviewReport.id, reportIds));

      return { flagRows, reportRows };
    });

    const reportById = new Map(reportRows.map((r) => [r.id, r]));

    // 通報を report ごとに集約（件数・理由の重複除去・補足）。
    const grouped = new Map<
      string,
      { count: number; reasons: string[]; details: string[] }
    >();
    for (const f of flagRows) {
      const g = grouped.get(f.reportId) ?? {
        count: 0,
        reasons: [],
        details: [],
      };
      g.count += 1;
      if (!g.reasons.includes(f.reason)) g.reasons.push(f.reason);
      if (f.detail) g.details.push(f.detail);
      grouped.set(f.reportId, g);
    }

    const resolveTarget = (r: (typeof reportRows)[number] | undefined) => {
      if (!r) return null;
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

    const flagged = [...grouped.entries()]
      .map(([reportId, g]) => {
        const r = reportById.get(reportId);
        return {
          reportId,
          target: resolveTarget(r),
          summary: r?.summary ?? null,
          roleTitle: r?.roleTitle ?? null,
          isPublicByAdmin: r?.isPublicByAdmin ?? false,
          reviewStatus: r?.reviewStatus ?? "unknown",
          flagCount: g.count,
          reasons: g.reasons,
          details: g.details,
        };
      })
      .sort((a, b) => b.flagCount - a.flagCount);

    return c.json({ flagged });
  })
  // 通報を受けたレポートを非公開化（審査キューの却下と同じ効果）
  .post("/:reportId/unpublish", zValidator("param", paramSchema), async (c) => {
    const { reportId } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx
        .update(interviewReport)
        .set({ isPublicByAdmin: false, reviewStatus: "rejected" })
        .where(eq(interviewReport.id, reportId))
        .returning({ id: interviewReport.id })
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: row.id });
  });

export type AdminReportFlagsRouteType = typeof adminReportFlagsRoute;
