import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { asc, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";
import { isUniqueViolation } from "../../lib/pg-errors";

const { factions, factionStances } = schema;

/**
 * 管理 会派 CRUD（app_admin ロール）。
 *
 * /api/admin/* は requireAdminAccess 配下。会派はマスタで、name が一意。
 * 一覧は sort_order 昇順＋会派スタンス数（stanceCount）つき。
 * name/displayName は必須、alternativeNames は別名の配列（空要素は含めない）。
 */

// name は unique。alternativeNames は別名（空文字は SPA 側で除去して送る）。
const createBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(100),
  alternativeNames: z.array(z.string().trim().min(1)).max(20).default([]),
  logoUrl: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

// PATCH: 指定フィールドのみ更新（undefined=据え置き）。
const updateBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  displayName: z.string().trim().min(1).max(100).optional(),
  alternativeNames: z.array(z.string().trim().min(1)).max(20).optional(),
  logoUrl: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const paramSchema = z.object({ id: z.uuid() });

export const adminFactionsRoute = new Hono()
  // 一覧（スタンス数つき・sort_order 昇順）
  .get("/", async (c) => {
    const rows = await adminQuery((tx) =>
      tx
        .select({
          id: factions.id,
          name: factions.name,
          displayName: factions.displayName,
          alternativeNames: factions.alternativeNames,
          logoUrl: factions.logoUrl,
          sortOrder: factions.sortOrder,
          isActive: factions.isActive,
          stanceCount: count(factionStances.id),
        })
        .from(factions)
        .leftJoin(factionStances, eq(factionStances.factionId, factions.id))
        .groupBy(factions.id)
        .orderBy(asc(factions.sortOrder), asc(factions.name))
    );
    return c.json({ factions: rows });
  })
  // 作成
  .post("/", zValidator("json", createBodySchema), async (c) => {
    const body = c.req.valid("json");
    try {
      const rows = await adminQuery((tx) =>
        tx
          .insert(factions)
          .values({
            name: body.name,
            displayName: body.displayName,
            alternativeNames: body.alternativeNames,
            logoUrl: body.logoUrl ?? null,
            sortOrder: body.sortOrder,
          })
          .returning({ id: factions.id })
      );
      const row = rows[0];
      if (!row) throw new Error("会派の作成に失敗しました");
      return c.json({ id: row.id }, 201);
    } catch (e) {
      if (isUniqueViolation(e)) return c.json({ error: "duplicate_name" }, 409);
      throw e;
    }
  })
  // 更新（PATCH: 指定フィールドのみ）
  .patch(
    "/:id",
    zValidator("param", paramSchema),
    zValidator("json", updateBodySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const values: {
        name?: string;
        displayName?: string;
        alternativeNames?: string[];
        logoUrl?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      } = {};
      if (body.name !== undefined) values.name = body.name;
      if (body.displayName !== undefined) values.displayName = body.displayName;
      if (body.alternativeNames !== undefined) {
        values.alternativeNames = body.alternativeNames;
      }
      if (body.logoUrl !== undefined) values.logoUrl = body.logoUrl;
      if (body.sortOrder !== undefined) values.sortOrder = body.sortOrder;
      if (body.isActive !== undefined) values.isActive = body.isActive;
      if (Object.keys(values).length === 0) {
        return c.json({ error: "no_fields" }, 400);
      }
      try {
        const rows = await adminQuery((tx) =>
          tx
            .update(factions)
            .set(values)
            .where(eq(factions.id, id))
            .returning({ id: factions.id })
        );
        const row = rows[0];
        if (!row) return c.json({ error: "not_found" }, 404);
        return c.json({ id: row.id });
      } catch (e) {
        if (isUniqueViolation(e)) {
          return c.json({ error: "duplicate_name" }, 409);
        }
        throw e;
      }
    }
  )
  // 削除
  .delete("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx
        .delete(factions)
        .where(eq(factions.id, id))
        .returning({ id: factions.id })
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: row.id });
  });

export type AdminFactionsRouteType = typeof adminFactionsRoute;
