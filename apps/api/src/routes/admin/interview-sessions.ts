import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { resolveInterviewTarget } from "@mirai-gikai/shared/interviews/interview-target";
import { getMessageDisplayText } from "@mirai-gikai/shared/interviews/message-display-text";
import {
  and,
  asc,
  count,
  eq,
  isNotNull,
  isNull,
  type SQL,
  sql,
} from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";

const {
  interviewSessions,
  interviewMessages,
  interviewReport,
  interviewReportFlags,
  interviewConfigs,
  bills,
  themes,
  themeInitiatives,
} = schema;

/**
 * 管理 インタビュー回答の閲覧（app_admin ロール）。
 *
 * 住民のインタビューをセッション単位で一覧し、会話ログとレポートを確認する。
 * 対象は議案・区政テーマ・取り組みのいずれでもよく、インタビュー設定で絞り込む。
 * 公開・非公開の切り替えは審査キューと同じ承認・却下 API（interview-reports）を使う。
 * 住民の匿名 ID（user_id）は返さない（閲覧に不要なため）。
 */

const PAGE_SIZE = 30;

const statusFilter = z
  .enum(["all", "completed", "in_progress", "archived"])
  .default("completed");
const reviewFilter = z
  .enum([
    "all",
    "no_report",
    "auto_approved",
    "pending",
    "approved",
    "rejected",
  ])
  .default("all");
const stanceFilter = z
  .enum(["all", "for", "against", "neutral"])
  .default("all");
const roleFilter = z
  .enum([
    "all",
    "subject_expert",
    "work_related",
    "daily_life_affected",
    "general_citizen",
  ])
  .default("all");
const moderationFilter = z
  .enum(["all", "ok", "warning", "ng", "unscored"])
  .default("all");

const listQuerySchema = z.object({
  configId: z.uuid().optional(),
  status: statusFilter,
  review: reviewFilter,
  stance: stanceFilter,
  role: roleFilter,
  moderation: moderationFilter,
  sort: z
    .enum([
      "started_at",
      "message_count",
      "total_content_richness",
      "moderation_score",
    ])
    .default("started_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
});

const statsQuerySchema = z.object({ configId: z.uuid().optional() });
const paramSchema = z.object({ id: z.uuid() });

/** セッションごとのメッセージ数（並べ替えにも使う）。 */
const messageCount = sql<number>`(
  select count(*) from ${interviewMessages}
  where ${interviewMessages.interviewSessionId} = ${interviewSessions.id}
)`.mapWith(Number);

/** 回答にかかった秒数（整数）。完了していなければ null。 */
const durationSeconds = sql<
  number | null
>`round(extract(epoch from (${interviewSessions.completedAt} - ${interviewSessions.startedAt})))`.mapWith(
  Number
);

function statusCondition(
  status: z.infer<typeof statusFilter>
): SQL | undefined {
  switch (status) {
    case "completed":
      return and(
        isNotNull(interviewSessions.completedAt),
        isNull(interviewSessions.archivedAt)
      );
    case "in_progress":
      return and(
        isNull(interviewSessions.completedAt),
        isNull(interviewSessions.archivedAt)
      );
    case "archived":
      return isNotNull(interviewSessions.archivedAt);
    case "all":
      return undefined;
  }
}

function reviewCondition(
  review: z.infer<typeof reviewFilter>
): SQL | undefined {
  if (review === "all") return undefined;
  if (review === "no_report") return isNull(interviewReport.id);
  return eq(interviewReport.reviewStatus, review);
}

function moderationCondition(
  moderation: z.infer<typeof moderationFilter>
): SQL | undefined {
  if (moderation === "all") return undefined;
  if (moderation === "unscored") {
    return and(
      isNotNull(interviewReport.id),
      isNull(interviewReport.moderationStatus)
    );
  }
  return eq(interviewReport.moderationStatus, moderation);
}

function sortExpression(
  sort: z.infer<typeof listQuerySchema>["sort"],
  order: "asc" | "desc"
): SQL {
  const column = {
    started_at: sql`${interviewSessions.startedAt}`,
    message_count: sql`${messageCount}`,
    total_content_richness: sql`${interviewReport.totalContentRichness}`,
    moderation_score: sql`${interviewReport.moderationScore}`,
  }[sort];
  // 未評価（null）は昇順・降順どちらでも末尾に置く。
  return order === "asc"
    ? sql`${column} asc nulls last`
    : sql`${column} desc nulls last`;
}

const targetColumns = {
  billId: interviewConfigs.billId,
  billName: bills.name,
  themeId: interviewConfigs.themeId,
  themeName: themes.name,
  themeInitiativeId: interviewConfigs.themeInitiativeId,
  initiativeTitle: themeInitiatives.title,
};

export const adminInterviewSessionsRoute = new Hono()
  // 一覧（絞り込み・並べ替え・ページ送り）
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const where = and(
      q.configId
        ? eq(interviewSessions.interviewConfigId, q.configId)
        : undefined,
      statusCondition(q.status),
      reviewCondition(q.review),
      q.stance === "all" ? undefined : eq(interviewReport.stance, q.stance),
      q.role === "all" ? undefined : eq(interviewReport.role, q.role),
      moderationCondition(q.moderation)
    );

    const { rows, total } = await adminQuery(async (tx) => {
      const rows = await tx
        .select({
          id: interviewSessions.id,
          configId: interviewSessions.interviewConfigId,
          startedAt: interviewSessions.startedAt,
          completedAt: interviewSessions.completedAt,
          archivedAt: interviewSessions.archivedAt,
          durationSeconds,
          messageCount,
          ...targetColumns,
          reportId: interviewReport.id,
          summary: interviewReport.summary,
          stance: interviewReport.stance,
          role: interviewReport.role,
          roleTitle: interviewReport.roleTitle,
          totalContentRichness: interviewReport.totalContentRichness,
          moderationScore: interviewReport.moderationScore,
          moderationStatus: interviewReport.moderationStatus,
          faithfulnessOk: interviewReport.faithfulnessOk,
          reviewStatus: interviewReport.reviewStatus,
          isPublicByAdmin: interviewReport.isPublicByAdmin,
          isPublicByUser: interviewReport.isPublicByUser,
        })
        .from(interviewSessions)
        .innerJoin(
          interviewConfigs,
          eq(interviewConfigs.id, interviewSessions.interviewConfigId)
        )
        .leftJoin(
          interviewReport,
          eq(interviewReport.interviewSessionId, interviewSessions.id)
        )
        .leftJoin(bills, eq(bills.id, interviewConfigs.billId))
        .leftJoin(themes, eq(themes.id, interviewConfigs.themeId))
        .leftJoin(
          themeInitiatives,
          eq(themeInitiatives.id, interviewConfigs.themeInitiativeId)
        )
        .where(where)
        .orderBy(sortExpression(q.sort, q.order), asc(interviewSessions.id))
        .limit(PAGE_SIZE)
        .offset((q.page - 1) * PAGE_SIZE);

      const totals = await tx
        .select({ n: count() })
        .from(interviewSessions)
        .leftJoin(
          interviewReport,
          eq(interviewReport.interviewSessionId, interviewSessions.id)
        )
        .where(where);
      return { rows, total: totals[0]?.n ?? 0 };
    });

    const sessions = rows.map((r) => ({
      id: r.id,
      configId: r.configId,
      target: resolveInterviewTarget(r),
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      archivedAt: r.archivedAt,
      durationSeconds: r.durationSeconds,
      messageCount: r.messageCount,
      report: r.reportId
        ? {
            id: r.reportId,
            summary: r.summary,
            stance: r.stance,
            role: r.role,
            roleTitle: r.roleTitle,
            totalContentRichness: r.totalContentRichness,
            moderationScore: r.moderationScore,
            moderationStatus: r.moderationStatus,
            faithfulnessOk: r.faithfulnessOk,
            reviewStatus: r.reviewStatus,
            isPublicByAdmin: r.isPublicByAdmin,
            isPublicByUser: r.isPublicByUser,
          }
        : null,
    }));

    return c.json({ sessions, total, page: q.page, pageSize: PAGE_SIZE });
  })
  // 統計（アーカイブ済みを除く）
  .get("/stats", zValidator("query", statsQuerySchema), async (c) => {
    const { configId } = c.req.valid("query");
    const where = and(
      configId ? eq(interviewSessions.interviewConfigId, configId) : undefined,
      isNull(interviewSessions.archivedAt)
    );
    const completed = sql`${interviewSessions.completedAt} is not null`;
    const n = (cond: SQL) =>
      sql<number>`count(*) filter (where ${cond})`.mapWith(Number);

    const rows = await adminQuery((tx) =>
      tx
        .select({
          totalSessions: count(),
          completedSessions: n(completed),
          avgMessageCount: sql<
            number | null
          >`round(avg(${messageCount}) filter (where ${completed}), 1)`.mapWith(
            Number
          ),
          medianDurationSeconds: sql<
            number | null
          >`round(percentile_cont(0.5) within group (order by ${durationSeconds}) filter (where ${completed}))`.mapWith(
            Number
          ),
          reports: count(interviewReport.id),
          stanceFor: n(sql`${interviewReport.stance} = 'for'`),
          stanceAgainst: n(sql`${interviewReport.stance} = 'against'`),
          stanceNeutral: n(sql`${interviewReport.stance} = 'neutral'`),
          roleSubjectExpert: n(sql`${interviewReport.role} = 'subject_expert'`),
          roleWorkRelated: n(sql`${interviewReport.role} = 'work_related'`),
          roleDailyLifeAffected: n(
            sql`${interviewReport.role} = 'daily_life_affected'`
          ),
          roleGeneralCitizen: n(
            sql`${interviewReport.role} = 'general_citizen'`
          ),
          reviewAutoApproved: n(
            sql`${interviewReport.reviewStatus} = 'auto_approved'`
          ),
          reviewPending: n(sql`${interviewReport.reviewStatus} = 'pending'`),
          reviewApproved: n(sql`${interviewReport.reviewStatus} = 'approved'`),
          reviewRejected: n(sql`${interviewReport.reviewStatus} = 'rejected'`),
          publicReports: n(
            sql`${interviewReport.isPublicByAdmin} and ${interviewReport.isPublicByUser}`
          ),
          avgTotalContentRichness: sql<
            number | null
          >`round(avg(${interviewReport.totalContentRichness}))`.mapWith(
            Number
          ),
        })
        .from(interviewSessions)
        .leftJoin(
          interviewReport,
          eq(interviewReport.interviewSessionId, interviewSessions.id)
        )
        .where(where)
    );
    const stats = rows[0];
    if (!stats) throw new Error("統計の集計に失敗しました");
    return c.json({ stats });
  })
  // 詳細（会話ログ・レポート全文・通報件数）
  .get("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const result = await adminQuery(async (tx) => {
      const sessionRows = await tx
        .select({
          id: interviewSessions.id,
          configId: interviewSessions.interviewConfigId,
          configName: interviewConfigs.name,
          startedAt: interviewSessions.startedAt,
          completedAt: interviewSessions.completedAt,
          archivedAt: interviewSessions.archivedAt,
          durationSeconds,
          ...targetColumns,
        })
        .from(interviewSessions)
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
        .where(eq(interviewSessions.id, id));
      const session = sessionRows[0];
      if (!session) return null;

      const messages = await tx
        .select({
          id: interviewMessages.id,
          role: interviewMessages.role,
          content: interviewMessages.content,
          createdAt: interviewMessages.createdAt,
        })
        .from(interviewMessages)
        .where(eq(interviewMessages.interviewSessionId, id))
        .orderBy(asc(interviewMessages.createdAt), asc(interviewMessages.id));

      const reportRows = await tx
        .select()
        .from(interviewReport)
        .where(eq(interviewReport.interviewSessionId, id));
      const report = reportRows[0] ?? null;

      const flags = report
        ? await tx
            .select({
              reason: interviewReportFlags.reason,
              detail: interviewReportFlags.detail,
              createdAt: interviewReportFlags.createdAt,
            })
            .from(interviewReportFlags)
            .where(eq(interviewReportFlags.interviewReportId, report.id))
            .orderBy(asc(interviewReportFlags.createdAt))
        : [];

      return { session, messages, report, flags };
    });
    if (!result) return c.json({ error: "not_found" }, 404);

    const { session, messages, report, flags } = result;
    return c.json({
      session: {
        id: session.id,
        configId: session.configId,
        configName: session.configName,
        target: resolveInterviewTarget(session),
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        archivedAt: session.archivedAt,
        durationSeconds: session.durationSeconds,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: getMessageDisplayText(m.content),
        createdAt: m.createdAt,
      })),
      report: report
        ? {
            id: report.id,
            summary: report.summary,
            stance: report.stance,
            role: report.role,
            roleTitle: report.roleTitle,
            roleDescription: report.roleDescription,
            opinions: report.opinions,
            contentRichness: report.contentRichness,
            totalContentRichness: report.totalContentRichness,
            moderationScore: report.moderationScore,
            moderationStatus: report.moderationStatus,
            moderationCategories: report.moderationCategories,
            moderationReasoning: report.moderationReasoning,
            faithfulnessOk: report.faithfulnessOk,
            faithfulnessReasoning: report.faithfulnessReasoning,
            reviewStatus: report.reviewStatus,
            isPublicByAdmin: report.isPublicByAdmin,
            isPublicByUser: report.isPublicByUser,
            createdAt: report.createdAt,
          }
        : null,
      flags,
    });
  });

export type AdminInterviewSessionsRouteType =
  typeof adminInterviewSessionsRoute;
