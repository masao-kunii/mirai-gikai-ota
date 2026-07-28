import { schema } from "@mirai-gikai/db";
import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { adminQuery } from "../../lib/db";

const {
  expertRegistrations,
  interviewReport,
  interviewSessions,
  interviewConfigs,
  bills,
  themes,
  themeInitiatives,
} = schema;

/**
 * 管理 専門家（app_admin ロール）— 読み取り一覧。
 *
 * expert_registrations は公開サイトで自己登録された専門家（氏名・所属・メール）。
 * app_admin のみ（PII を含むため公開なし）。管理側では一覧の閲覧に加え、各専門家が
 * どの議案/テーマに意見（インタビューレポート）を出したかを確認できる。
 * 作成/編集は自己登録が担うため、ここでは提供しない（読み取り主体）。
 */

export const adminExpertsRoute = new Hono().get("/", async (c) => {
  const { experts, reportRows } = await adminQuery(async (tx) => {
    const experts = await tx
      .select({
        id: expertRegistrations.id,
        name: expertRegistrations.name,
        affiliation: expertRegistrations.affiliation,
        email: expertRegistrations.email,
        userId: expertRegistrations.userId,
        createdAt: expertRegistrations.createdAt,
      })
      .from(expertRegistrations)
      .orderBy(desc(expertRegistrations.createdAt));

    const userIds = experts.map((e) => e.userId);
    const reportRows =
      userIds.length === 0
        ? []
        : await tx
            .select({
              userId: interviewSessions.userId,
              stance: interviewReport.stance,
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
            .where(inArray(interviewSessions.userId, userIds));

    return { experts, reportRows };
  });

  type Report = {
    target: { type: "bill" | "theme" | "initiative"; name: string } | null;
    stance: string | null;
  };
  const reportsByUser = new Map<string, Report[]>();
  for (const r of reportRows) {
    const target: Report["target"] = r.billId
      ? { type: "bill", name: r.billName ?? "(不明な議案)" }
      : r.themeId
        ? { type: "theme", name: r.themeName ?? "(不明なテーマ)" }
        : r.themeInitiativeId
          ? {
              type: "initiative",
              name: r.initiativeTitle ?? "(不明な取り組み)",
            }
          : null;
    const list = reportsByUser.get(r.userId) ?? [];
    list.push({ target, stance: r.stance });
    reportsByUser.set(r.userId, list);
  }

  const result = experts.map((e) => ({
    id: e.id,
    name: e.name,
    affiliation: e.affiliation,
    email: e.email,
    createdAt: e.createdAt,
    reports: reportsByUser.get(e.userId) ?? [],
  }));

  return c.json({ experts: result });
});

export type AdminExpertsRouteType = typeof adminExpertsRoute;
