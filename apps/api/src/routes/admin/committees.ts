import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { asc, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";
import { isUniqueViolation } from "../../lib/pg-errors";

const { committees, bills } = schema;

/**
 * 管理 委員会 CRUD（app_admin ロール）。
 *
 * /api/admin/* は requireAdminAccess 配下。委員会はマスタで name が一意。
 * 一覧は sort_order 昇順＋紐づく議案数（billCount）つき。
 * 削除は議案が紐づいていると拒否する（誤削除で議案の委員会参照を失わないため）。
 */

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

// PATCH: 指定フィールドのみ更新（undefined=据え置き）。
const updateBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const paramSchema = z.object({ id: z.uuid() });

export const adminCommitteesRoute = new Hono()
  // 一覧（議案数つき・sort_order 昇順）
  .get("/", async (c) => {
    const rows = await adminQuery((tx) =>
      tx
        .select({
          id: committees.id,
          name: committees.name,
          description: committees.description,
          sortOrder: committees.sortOrder,
          isActive: committees.isActive,
          billCount: count(bills.id),
        })
        .from(committees)
        .leftJoin(bills, eq(bills.committeeId, committees.id))
        .groupBy(committees.id)
        .orderBy(asc(committees.sortOrder), asc(committees.name))
    );
    return c.json({ committees: rows });
  })
  // 作成
  .post("/", zValidator("json", createBodySchema), async (c) => {
    const body = c.req.valid("json");
    try {
      const rows = await adminQuery((tx) =>
        tx
          .insert(committees)
          .values({
            name: body.name,
            description: body.description ?? null,
            sortOrder: body.sortOrder,
          })
          .returning({ id: committees.id })
      );
      const row = rows[0];
      if (!row) throw new Error("委員会の作成に失敗しました");
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
        description?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      } = {};
      if (body.name !== undefined) values.name = body.name;
      if (body.description !== undefined) values.description = body.description;
      if (body.sortOrder !== undefined) values.sortOrder = body.sortOrder;
      if (body.isActive !== undefined) values.isActive = body.isActive;
      if (Object.keys(values).length === 0) {
        return c.json({ error: "no_fields" }, 400);
      }
      try {
        const rows = await adminQuery((tx) =>
          tx
            .update(committees)
            .set(values)
            .where(eq(committees.id, id))
            .returning({ id: committees.id })
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
  // 削除（議案が紐づいていると拒否）
  .delete("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const result = await adminQuery(async (tx) => {
      const [linked] = await tx
        .select({ n: count() })
        .from(bills)
        .where(eq(bills.committeeId, id));
      const linkedCount = linked?.n ?? 0;
      if (linkedCount > 0)
        return { kind: "linked" as const, count: linkedCount };
      const rows = await tx
        .delete(committees)
        .where(eq(committees.id, id))
        .returning({ id: committees.id });
      return { kind: "done" as const, row: rows[0] };
    });
    if (result.kind === "linked") {
      return c.json({ error: "has_linked_bills", count: result.count }, 409);
    }
    if (!result.row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: result.row.id });
  });

export type AdminCommitteesRouteType = typeof adminCommitteesRoute;
