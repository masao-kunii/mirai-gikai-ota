import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { asc, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";
import { isUniqueViolation } from "../../lib/pg-errors";

const { tags, billsTags } = schema;

/**
 * 管理タグ CRUD（app_admin ロール）。
 *
 * /api/admin/* は requireAdminAccess（Cloudflare Access）配下にマウントされ、
 * 認証済み管理者のみ到達する。DB は adminQuery（app_admin）経由で、下書き議案・
 * 未公開含む全行を操作できる。公開系の tags.ts（public_reader / 注目タグのみ）
 * とは別ルート・別ロールで、境界を混在させない（TARGET_ARCHITECTURE §13/§158）。
 */

// label は unique。featuredPriority は「注目タグ」の並び順（null=非注目）。
const createBodySchema = z.object({
  label: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  featuredPriority: z.number().int().min(0).nullable().optional(),
});

// PATCH: 指定したフィールドのみ更新（undefined=据え置き / null=クリア）。
const updateBodySchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  featuredPriority: z.number().int().min(0).nullable().optional(),
});

const paramSchema = z.object({ id: z.uuid() });

export const adminTagsRoute = new Hono()
  // 一覧（紐づく議案数つき・label 昇順）
  .get("/", async (c) => {
    const rows = await adminQuery((tx) =>
      tx
        .select({
          id: tags.id,
          label: tags.label,
          description: tags.description,
          featuredPriority: tags.featuredPriority,
          billCount: count(billsTags.billId),
        })
        .from(tags)
        .leftJoin(billsTags, eq(billsTags.tagId, tags.id))
        .groupBy(tags.id)
        .orderBy(asc(tags.label))
    );
    return c.json({ tags: rows });
  })
  // 作成
  .post("/", zValidator("json", createBodySchema), async (c) => {
    const body = c.req.valid("json");
    try {
      const rows = await adminQuery((tx) =>
        tx
          .insert(tags)
          .values({
            label: body.label,
            description: body.description ?? null,
            featuredPriority: body.featuredPriority ?? null,
          })
          .returning({ id: tags.id })
      );
      const row = rows[0];
      if (!row) throw new Error("タグの作成に失敗しました");
      return c.json({ id: row.id }, 201);
    } catch (e) {
      if (isUniqueViolation(e)) {
        return c.json({ error: "duplicate_label" }, 409);
      }
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
        label?: string;
        description?: string | null;
        featuredPriority?: number | null;
      } = {};
      if (body.label !== undefined) values.label = body.label;
      if (body.description !== undefined) values.description = body.description;
      if (body.featuredPriority !== undefined) {
        values.featuredPriority = body.featuredPriority;
      }
      if (Object.keys(values).length === 0) {
        return c.json({ error: "no_fields" }, 400);
      }
      try {
        const rows = await adminQuery((tx) =>
          tx
            .update(tags)
            .set(values)
            .where(eq(tags.id, id))
            .returning({ id: tags.id })
        );
        const row = rows[0];
        if (!row) return c.json({ error: "not_found" }, 404);
        return c.json({ id: row.id });
      } catch (e) {
        if (isUniqueViolation(e)) {
          return c.json({ error: "duplicate_label" }, 409);
        }
        throw e;
      }
    }
  )
  // 削除
  .delete("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id })
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: row.id });
  });

export type AdminTagsRouteType = typeof adminTagsRoute;
