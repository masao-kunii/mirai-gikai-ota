import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";

const { bills, billsTags, billContents, factionStances } = schema;

/**
 * 管理 議案マージ（app_admin ロール）。
 *
 * 重複議案を1件（keep）に統合する。keep 側を優先し、マージ対象（delete）議案の
 * タグ・本文（難易度別）・会派スタンスのうち keep に無いものだけを keep へ移し、
 * 最後にマージ対象議案を削除する。削除は CASCADE のため、マージ対象議案に紐づく
 * インタビュー設定・セッション・レポート等は失われる（住民の回答は戻せない）ので、
 * フロント側で件数を提示して確認させる前提の破壊的操作。
 *
 * 本文は (bill_id, difficulty_level)、スタンスは (bill_id, faction_id) が一意なので、
 * keep に既にある難易度/会派は移さない（keep のものを残す）。
 */

const bodySchema = z
  .object({
    keepBillId: z.uuid(),
    mergeBillIds: z.array(z.uuid()).min(1).max(20),
  })
  .refine((d) => !d.mergeBillIds.includes(d.keepBillId), {
    message: "keep と merge に同じ議案は指定できません",
    path: ["mergeBillIds"],
  });

export const adminBillsMergeRoute = new Hono().post(
  "/",
  zValidator("json", bodySchema),
  async (c) => {
    const { keepBillId, mergeBillIds } = c.req.valid("json");
    const uniqueMergeIds = [...new Set(mergeBillIds)];
    const allIds = [keepBillId, ...uniqueMergeIds];

    const result = await adminQuery(async (tx) => {
      // 対象がすべて存在するか確認。
      const found = await tx
        .select({ id: bills.id })
        .from(bills)
        .where(inArray(bills.id, allIds));
      if (found.length !== allIds.length) {
        return { kind: "invalid" as const };
      }

      // タグ: keep に無いものだけ追加（和集合）。
      const keepTags = await tx
        .select({ tagId: billsTags.tagId })
        .from(billsTags)
        .where(eq(billsTags.billId, keepBillId));
      const keepTagIds = new Set(keepTags.map((t) => t.tagId));
      const mergeTags = await tx
        .select({ tagId: billsTags.tagId })
        .from(billsTags)
        .where(inArray(billsTags.billId, uniqueMergeIds));
      let tagsAdded = 0;
      for (const t of mergeTags) {
        if (!keepTagIds.has(t.tagId)) {
          keepTagIds.add(t.tagId);
          await tx
            .insert(billsTags)
            .values({ billId: keepBillId, tagId: t.tagId });
          tagsAdded += 1;
        }
      }

      // 本文: keep に無い難易度だけ keep へ移動。
      const keepContents = await tx
        .select({ difficultyLevel: billContents.difficultyLevel })
        .from(billContents)
        .where(eq(billContents.billId, keepBillId));
      const keepDiffs = new Set(keepContents.map((r) => r.difficultyLevel));
      const mergeContents = await tx
        .select({
          id: billContents.id,
          difficultyLevel: billContents.difficultyLevel,
        })
        .from(billContents)
        .where(inArray(billContents.billId, uniqueMergeIds));
      let contentsMoved = 0;
      for (const cnt of mergeContents) {
        if (!keepDiffs.has(cnt.difficultyLevel)) {
          keepDiffs.add(cnt.difficultyLevel);
          await tx
            .update(billContents)
            .set({ billId: keepBillId })
            .where(eq(billContents.id, cnt.id));
          contentsMoved += 1;
        }
      }

      // 会派スタンス: keep に無い会派だけ keep へ移動。
      const keepStances = await tx
        .select({ factionId: factionStances.factionId })
        .from(factionStances)
        .where(eq(factionStances.billId, keepBillId));
      const keepFactions = new Set(keepStances.map((r) => r.factionId));
      const mergeStances = await tx
        .select({
          id: factionStances.id,
          factionId: factionStances.factionId,
        })
        .from(factionStances)
        .where(inArray(factionStances.billId, uniqueMergeIds));
      let stancesMoved = 0;
      for (const st of mergeStances) {
        if (!keepFactions.has(st.factionId)) {
          keepFactions.add(st.factionId);
          await tx
            .update(factionStances)
            .set({ billId: keepBillId })
            .where(eq(factionStances.id, st.id));
          stancesMoved += 1;
        }
      }

      // マージ対象を削除（残りは CASCADE）。
      await tx.delete(bills).where(inArray(bills.id, uniqueMergeIds));

      return {
        kind: "ok" as const,
        mergedCount: uniqueMergeIds.length,
        tagsAdded,
        contentsMoved,
        stancesMoved,
      };
    });

    if (result.kind === "invalid") {
      return c.json({ error: "invalid_bills" }, 400);
    }
    return c.json({
      keepBillId,
      mergedCount: result.mergedCount,
      tagsAdded: result.tagsAdded,
      contentsMoved: result.contentsMoved,
      stancesMoved: result.stancesMoved,
    });
  }
);

export type AdminBillsMergeRouteType = typeof adminBillsMergeRoute;
