import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { count, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";
import { isCheckViolation, isUniqueViolation } from "../../lib/pg-errors";

const { councilSessions, bills } = schema;

/**
 * 管理 議会会期 CRUD（app_admin ロール）。
 *
 * /api/admin/* は requireAdminAccess 配下。会期は start_date 降順の一覧に、
 * 紐づく議案数（billCount）を添える。slug は一意で半角英小数字ハイフンのみ。
 * end_date は任意（会期途中で未定のことがある。DB check で end_date >= start_date）。
 * is_active は通常の更新では変えず、専用の /:id/activate で排他的に切り替える
 * （常に1会期のみ active。DB 関数 set_active_council_session で原子的に処理）。
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9-]+$/;

const dateField = z
  .string()
  .regex(DATE_RE, "YYYY-MM-DD 形式で入力してください");
const slugField = z
  .string()
  .trim()
  .regex(SLUG_RE, "slug は半角英小文字・数字・ハイフンのみ使用できます")
  .max(100);

const createBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    slug: slugField.nullable().optional(),
    councilUrl: z.string().trim().max(1000).nullable().optional(),
    startDate: dateField,
    endDate: dateField.nullable().optional(),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: "終了日は開始日以降にしてください",
    path: ["endDate"],
  });

// PATCH: 指定フィールドのみ更新（undefined=据え置き）。is_active は含めない。
const updateBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: slugField.nullable().optional(),
  councilUrl: z.string().trim().max(1000).nullable().optional(),
  startDate: dateField.optional(),
  endDate: dateField.nullable().optional(),
});

const paramSchema = z.object({ id: z.uuid() });

export const adminCouncilSessionsRoute = new Hono()
  // 一覧（議案数つき・開始日降順）
  .get("/", async (c) => {
    const rows = await adminQuery((tx) =>
      tx
        .select({
          id: councilSessions.id,
          name: councilSessions.name,
          slug: councilSessions.slug,
          councilUrl: councilSessions.councilUrl,
          startDate: councilSessions.startDate,
          endDate: councilSessions.endDate,
          isActive: councilSessions.isActive,
          billCount: count(bills.id),
        })
        .from(councilSessions)
        .leftJoin(bills, eq(bills.councilSessionId, councilSessions.id))
        .groupBy(councilSessions.id)
        .orderBy(desc(councilSessions.startDate))
    );
    return c.json({ councilSessions: rows });
  })
  // 作成
  .post("/", zValidator("json", createBodySchema), async (c) => {
    const body = c.req.valid("json");
    try {
      const rows = await adminQuery((tx) =>
        tx
          .insert(councilSessions)
          .values({
            name: body.name,
            slug: body.slug ?? null,
            councilUrl: body.councilUrl ?? null,
            startDate: body.startDate,
            endDate: body.endDate ?? null,
          })
          .returning({ id: councilSessions.id })
      );
      const row = rows[0];
      if (!row) throw new Error("議会会期の作成に失敗しました");
      return c.json({ id: row.id }, 201);
    } catch (e) {
      if (isUniqueViolation(e)) return c.json({ error: "duplicate_slug" }, 409);
      if (isCheckViolation(e)) {
        return c.json({ error: "invalid_date_range" }, 400);
      }
      throw e;
    }
  })
  // 更新（PATCH: 指定フィールドのみ。is_active は activate で切り替える）
  .patch(
    "/:id",
    zValidator("param", paramSchema),
    zValidator("json", updateBodySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const values: {
        name?: string;
        slug?: string | null;
        councilUrl?: string | null;
        startDate?: string;
        endDate?: string | null;
      } = {};
      if (body.name !== undefined) values.name = body.name;
      if (body.slug !== undefined) values.slug = body.slug;
      if (body.councilUrl !== undefined) values.councilUrl = body.councilUrl;
      if (body.startDate !== undefined) values.startDate = body.startDate;
      if (body.endDate !== undefined) values.endDate = body.endDate;
      if (Object.keys(values).length === 0) {
        return c.json({ error: "no_fields" }, 400);
      }
      try {
        const rows = await adminQuery((tx) =>
          tx
            .update(councilSessions)
            .set(values)
            .where(eq(councilSessions.id, id))
            .returning({ id: councilSessions.id })
        );
        const row = rows[0];
        if (!row) return c.json({ error: "not_found" }, 404);
        return c.json({ id: row.id });
      } catch (e) {
        if (isUniqueViolation(e)) {
          return c.json({ error: "duplicate_slug" }, 409);
        }
        if (isCheckViolation(e)) {
          return c.json({ error: "invalid_date_range" }, 400);
        }
        throw e;
      }
    }
  )
  // アクティブ会期を排他的に設定（常に1件のみ active）
  .post("/:id/activate", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const activated = await adminQuery(async (tx) => {
      const [exists] = await tx
        .select({ id: councilSessions.id })
        .from(councilSessions)
        .where(eq(councilSessions.id, id));
      if (!exists) return false;
      // 対象のみ active、他を inactive にする原子的な DB 関数（app_admin 実行可）。
      await tx.execute(sql`select set_active_council_session(${id}::uuid)`);
      return true;
    });
    if (!activated) return c.json({ error: "not_found" }, 404);
    return c.json({ id });
  })
  // 削除（bills は council_session_id が SET NULL、議事録は CASCADE 削除）
  .delete("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx
        .delete(councilSessions)
        .where(eq(councilSessions.id, id))
        .returning({ id: councilSessions.id })
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: row.id });
  });

export type AdminCouncilSessionsRouteType = typeof adminCouncilSessionsRoute;
