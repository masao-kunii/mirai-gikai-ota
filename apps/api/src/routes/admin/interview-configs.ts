import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";
import { isUniqueViolation } from "../../lib/pg-errors";

const { interviewConfigs, interviewSessions, bills, themes, themeInitiatives } =
  schema;

/**
 * 管理 インタビュー設定（app_admin ロール）。
 *
 * 新エンジンは対象（議案/テーマ/取り組み）に public な設定が無ければ
 * オンデマンドで自動作成する（lib/interviews/context.ts）。また質問は loop で
 * 動的生成するため interview_questions は使わない。したがって管理側の役割は
 * 「既存設定の一覧・公開/終了の切替・名称等の軽微な編集」が中心。
 *
 * status: public=インタビュー受付中 / closed=停止。対象ごとに public は1件のみ
 *（部分ユニークインデックス）。削除はセッション（＝住民の回答・レポート）に
 * CASCADE するため、セッションがある設定は削除させない（closed で止める）。
 */

const statusEnum = z.enum(["public", "closed"]);
const modeEnum = z.enum(["loop", "bulk"]);

const listQuerySchema = z.object({
  status: z.union([statusEnum, z.literal("all")]).default("all"),
});

const updateBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  status: statusEnum.optional(),
  mode: modeEnum.optional(),
  chatModel: z.string().trim().max(200).nullable().optional(),
  estimatedDuration: z.number().int().min(0).nullable().optional(),
});

const paramSchema = z.object({ id: z.uuid() });

export const adminInterviewConfigsRoute = new Hono()
  // 一覧（対象名・セッション数つき・新しい順）
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const { status } = c.req.valid("query");
    const { configRows, sessionCounts } = await adminQuery(async (tx) => {
      const configRows = await tx
        .select({
          id: interviewConfigs.id,
          name: interviewConfigs.name,
          status: interviewConfigs.status,
          mode: interviewConfigs.mode,
          chatModel: interviewConfigs.chatModel,
          estimatedDuration: interviewConfigs.estimatedDuration,
          createdAt: interviewConfigs.createdAt,
          billId: interviewConfigs.billId,
          themeId: interviewConfigs.themeId,
          themeInitiativeId: interviewConfigs.themeInitiativeId,
          billName: bills.name,
          themeName: themes.name,
          initiativeTitle: themeInitiatives.title,
        })
        .from(interviewConfigs)
        .leftJoin(bills, eq(bills.id, interviewConfigs.billId))
        .leftJoin(themes, eq(themes.id, interviewConfigs.themeId))
        .leftJoin(
          themeInitiatives,
          eq(themeInitiatives.id, interviewConfigs.themeInitiativeId)
        )
        .where(
          status === "all" ? undefined : eq(interviewConfigs.status, status)
        )
        .orderBy(desc(interviewConfigs.createdAt));

      // セッション数は別クエリで集計（対象の leftJoin と混ぜず groupBy を単純化）。
      const sessionCounts = await tx
        .select({
          configId: interviewSessions.interviewConfigId,
          n: count(interviewSessions.id),
        })
        .from(interviewSessions)
        .groupBy(interviewSessions.interviewConfigId);

      return { configRows, sessionCounts };
    });

    const countByConfig = new Map<string, number>();
    for (const s of sessionCounts) countByConfig.set(s.configId, s.n);

    const resolveTarget = (r: (typeof configRows)[number]) => {
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

    const configs = configRows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      mode: r.mode,
      chatModel: r.chatModel,
      estimatedDuration: r.estimatedDuration,
      createdAt: r.createdAt,
      target: resolveTarget(r),
      sessionCount: countByConfig.get(r.id) ?? 0,
    }));

    return c.json({ configs });
  })
  // 更新（名称・公開状態・モード等）。対象ごとに public は1件のみ。
  .patch(
    "/:id",
    zValidator("param", paramSchema),
    zValidator("json", updateBodySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const values: {
        name?: string;
        status?: z.infer<typeof statusEnum>;
        mode?: z.infer<typeof modeEnum>;
        chatModel?: string | null;
        estimatedDuration?: number | null;
      } = {};
      if (body.name !== undefined) values.name = body.name;
      if (body.status !== undefined) values.status = body.status;
      if (body.mode !== undefined) values.mode = body.mode;
      if (body.chatModel !== undefined) values.chatModel = body.chatModel;
      if (body.estimatedDuration !== undefined) {
        values.estimatedDuration = body.estimatedDuration;
      }
      if (Object.keys(values).length === 0) {
        return c.json({ error: "no_fields" }, 400);
      }
      try {
        const rows = await adminQuery((tx) =>
          tx
            .update(interviewConfigs)
            .set(values)
            .where(eq(interviewConfigs.id, id))
            .returning({ id: interviewConfigs.id })
        );
        const row = rows[0];
        if (!row) return c.json({ error: "not_found" }, 404);
        return c.json({ id: row.id });
      } catch (e) {
        // 同じ対象に既に public な設定がある（部分ユニーク違反）。
        if (isUniqueViolation(e)) {
          return c.json({ error: "duplicate_public" }, 409);
        }
        throw e;
      }
    }
  )
  // 削除（セッションがあると拒否。CASCADE で回答・レポートを失わないため）。
  .delete("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const result = await adminQuery(async (tx) => {
      const [config] = await tx
        .select({ id: interviewConfigs.id })
        .from(interviewConfigs)
        .where(eq(interviewConfigs.id, id));
      if (!config) return { kind: "not_found" as const };
      const [linked] = await tx
        .select({ n: count() })
        .from(interviewSessions)
        .where(eq(interviewSessions.interviewConfigId, id));
      if ((linked?.n ?? 0) > 0) {
        return { kind: "has_sessions" as const, count: linked?.n ?? 0 };
      }
      await tx.delete(interviewConfigs).where(eq(interviewConfigs.id, id));
      return { kind: "done" as const };
    });
    if (result.kind === "not_found") return c.json({ error: "not_found" }, 404);
    if (result.kind === "has_sessions") {
      return c.json({ error: "has_sessions", count: result.count }, 409);
    }
    return c.json({ id });
  });

export type AdminInterviewConfigsRouteType = typeof adminInterviewConfigsRoute;
