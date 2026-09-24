import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { resolveInterviewTarget } from "@mirai-gikai/shared/interviews/interview-target";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";
import { type RescoreKind, rescoreReport } from "../../lib/interviews/rescore";

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

// 一括公開の条件。moderation は低いほど安全、内容充実度は高いほど濃い。
const bulkPublishSchema = z.object({
  configId: z.uuid().optional(),
  maxModerationScore: z.coerce.number().int().min(0).max(100),
  minContentRichness: z.coerce.number().int().min(0).max(100),
});

const rescoreKindSchema = z.enum(["moderation", "richness", "both"]);

// 未評価のレポートをまとめて再判定する。1 リクエストの件数を抑え、画面側で
// 繰り返し呼んで進捗を出す（1件あたり数秒かかるため）。
const rescorePendingSchema = z.object({
  configId: z.uuid().optional(),
  kind: rescoreKindSchema.default("moderation"),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

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

    const reports = reportRows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      target: resolveInterviewTarget(r),
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
  // 一括公開の対象条件。住民が公開に同意していて、管理者がまだ公開しておらず、
  // 却下もしていないレポートのうち、モデレーションと内容充実度が基準を満たすもの。
  // 却下済みは管理者が明示的に伏せた判断なので対象外にする。
  .get(
    "/bulk-publish/targets",
    zValidator("query", bulkPublishSchema),
    async (c) => {
      const q = c.req.valid("query");
      const rows = await adminQuery((tx) =>
        tx
          .select({ n: count() })
          .from(interviewReport)
          .innerJoin(
            interviewSessions,
            eq(interviewSessions.id, interviewReport.interviewSessionId)
          )
          .where(bulkPublishCondition(q))
      );
      return c.json({ count: rows[0]?.n ?? 0 });
    }
  )
  // 一括公開（条件を満たすものを承認済み・公開にする）
  .post("/bulk-publish", zValidator("json", bulkPublishSchema), async (c) => {
    const body = c.req.valid("json");
    const updated = await adminQuery(async (tx) => {
      const targets = await tx
        .select({ id: interviewReport.id })
        .from(interviewReport)
        .innerJoin(
          interviewSessions,
          eq(interviewSessions.id, interviewReport.interviewSessionId)
        )
        .where(bulkPublishCondition(body));
      const ids = targets.map((t) => t.id);
      if (ids.length === 0) return [];
      return tx
        .update(interviewReport)
        .set({
          reviewStatus: "approved",
          isPublicByAdmin: true,
          updatedAt: sql`now()`,
        })
        .where(inArray(interviewReport.id, ids))
        .returning({ id: interviewReport.id });
    });
    return c.json({ publishedCount: updated.length });
  })
  // 1件の再判定（モデレーション / 内容充実度）
  .post(
    "/:id/rescore",
    zValidator("param", paramSchema),
    zValidator("json", z.object({ kind: rescoreKindSchema })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { kind } = c.req.valid("json");
      const result = await rescoreReport(id, kind);
      if (!result) return c.json({ error: "not_found" }, 404);
      return c.json(result);
    }
  )
  // 再判定が必要な（評価が付いていない）レポートの件数
  .get(
    "/rescore-pending/targets",
    zValidator(
      "query",
      z.object({ configId: z.uuid().optional(), kind: rescoreKindSchema })
    ),
    async (c) => {
      const { configId, kind } = c.req.valid("query");
      const rows = await adminQuery((tx) =>
        tx
          .select({ n: count() })
          .from(interviewReport)
          .innerJoin(
            interviewSessions,
            eq(interviewSessions.id, interviewReport.interviewSessionId)
          )
          .where(unscoredCondition(kind, configId))
      );
      return c.json({ count: rows[0]?.n ?? 0 });
    }
  )
  // 未評価のレポートをまとめて再判定する。残り件数も返すので、画面側は
  // 0 になるまで呼び出して進捗を出す。
  .post(
    "/rescore-pending",
    zValidator("json", rescorePendingSchema),
    async (c) => {
      const { configId, kind, limit } = c.req.valid("json");
      const condition = unscoredCondition(kind, configId);

      const { targets, remaining } = await adminQuery(async (tx) => {
        const targets = await tx
          .select({ id: interviewReport.id })
          .from(interviewReport)
          .innerJoin(
            interviewSessions,
            eq(interviewSessions.id, interviewReport.interviewSessionId)
          )
          .where(condition)
          .orderBy(asc(interviewReport.createdAt))
          .limit(limit);
        const total = await tx
          .select({ n: count() })
          .from(interviewReport)
          .innerJoin(
            interviewSessions,
            eq(interviewSessions.id, interviewReport.interviewSessionId)
          )
          .where(condition);
        return { targets, remaining: total[0]?.n ?? 0 };
      });

      let processed = 0;
      let failed = 0;
      // AI 呼び出しは 1 件ずつ順に行う（同時実行でレート制限に当てないため）。
      for (const target of targets) {
        const result = await rescoreReport(target.id, kind);
        if (!result || result.failed.length > 0) failed++;
        else processed++;
      }
      return c.json({
        processed,
        failed,
        // 残り＝処理前の該当件数から、今回成功した分を引いた数。
        remaining: Math.max(0, remaining - processed),
      });
    }
  )
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

/** 一括公開の対象条件（一覧の件数と実行で同じ条件を使う）。 */
function bulkPublishCondition(params: {
  configId?: string;
  maxModerationScore: number;
  minContentRichness: number;
}) {
  return and(
    params.configId
      ? eq(interviewSessions.interviewConfigId, params.configId)
      : undefined,
    eq(interviewReport.isPublicByUser, true),
    eq(interviewReport.isPublicByAdmin, false),
    ne(interviewReport.reviewStatus, "rejected"),
    sql`${interviewReport.moderationScore} is not null`,
    sql`${interviewReport.moderationScore} <= ${params.maxModerationScore}`,
    sql`${interviewReport.totalContentRichness} is not null`,
    sql`${interviewReport.totalContentRichness} >= ${params.minContentRichness}`
  );
}

/** 再判定の対象（評価が付いていないレポート）。 */
function unscoredCondition(kind: RescoreKind, configId?: string) {
  const missing =
    kind === "richness"
      ? isNull(interviewReport.totalContentRichness)
      : kind === "moderation"
        ? isNull(interviewReport.moderationScore)
        : sql`(${interviewReport.moderationScore} is null or ${interviewReport.totalContentRichness} is null)`;
  return and(
    configId ? eq(interviewSessions.interviewConfigId, configId) : undefined,
    missing
  );
}

export type AdminInterviewReportsRouteType = typeof adminInterviewReportsRoute;
