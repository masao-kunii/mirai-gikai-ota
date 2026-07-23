import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";
import { isForeignKeyViolation, isUniqueViolation } from "../../lib/pg-errors";

const {
  bills,
  councilSessions,
  committees,
  billsTags,
  tags,
  factionStances,
  factions,
  billContents,
} = schema;

const DIFFICULTY_LEVELS = ["normal", "hard"] as const;

// bill_contents は title/summary/content とも NOT NULL。空欄は空文字で保存し、
// 3項目すべて空ならその難易度の行を削除する（作成しない）。
const contentSchema = z.object({
  title: z.string().max(200).default(""),
  summary: z.string().max(500).default(""),
  content: z.string().max(50000).default(""),
});

const stanceTypeEnum = z.enum([
  "for",
  "against",
  "neutral",
  "conditional_for",
  "conditional_against",
  "considering",
  "continued_deliberation",
]);

/**
 * 管理 議案 CRUD（app_admin ロール）— 薄い初版。
 *
 * まずは基本スカラー項目（議案名・番号・審議状況/公開状態/提出区分・会期・委員会・
 * 注目フラグ等）の参照/作成/更新/削除に絞る。タグ（M2M）・会派スタンス・本文
 * （bill_contents）・knowledge_source などの関連は後続の PR で段階的に足す。
 *
 * /api/admin/* は requireAdminAccess 配下。app_admin は下書き議案も操作できる。
 */

// enum は DB の pgEnum と一致させる（値の追加時は両方を更新する）。
const statusEnum = z.enum([
  "preparing",
  "submitted",
  "in_committee",
  "plenary_session",
  "approved",
  "rejected",
  "adopted",
  "partially_adopted",
]);
const publishStatusEnum = z.enum(["draft", "published", "coming_soon"]);
const proposalTypeEnum = z.enum([
  "mayor_bill",
  "committee_bill",
  "report",
  "petition",
  "member_bill",
  "other",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dateField = z
  .string()
  .regex(DATE_RE, "YYYY-MM-DD 形式で入力してください");
const slugField = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/, "slug は半角英小文字・数字・ハイフンのみ使用できます")
  .max(200);

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(500),
  billNumber: z.string().trim().max(100).default(""),
  status: statusEnum.default("preparing"),
  publishStatus: publishStatusEnum.default("draft"),
  proposalType: proposalTypeEnum.default("mayor_bill"),
  councilSessionId: z.uuid().nullable().optional(),
  committeeId: z.uuid().nullable().optional(),
  isFeatured: z.boolean().default(false),
});

// PATCH: 指定フィールドのみ更新（undefined=据え置き）。
const updateBodySchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
  billNumber: z.string().trim().max(100).optional(),
  status: statusEnum.optional(),
  statusNote: z.string().trim().max(1000).nullable().optional(),
  publishStatus: publishStatusEnum.optional(),
  proposalType: proposalTypeEnum.optional(),
  councilSessionId: z.uuid().nullable().optional(),
  committeeId: z.uuid().nullable().optional(),
  slug: slugField.nullable().optional(),
  knowledgeSource: z.string().max(50000).nullable().optional(),
  useKnowledgeSourceInChat: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isReviewCompleted: z.boolean().optional(),
  submittedDate: dateField.nullable().optional(),
});

const paramSchema = z.object({ id: z.uuid() });

export const adminBillsRoute = new Hono()
  // 一覧（会期名・委員会名＋付与タグつき・作成日降順）
  .get("/", async (c) => {
    // 議案本体とタグ紐付けを1トランザクションで取得し、JS 側で束ねる
    // （タグの leftJoin は行を増やし session/committee の単一結合を崩すため分離）。
    const { billRows, tagRows, stanceRows } = await adminQuery(async (tx) => {
      const billRows = await tx
        .select({
          id: bills.id,
          name: bills.name,
          billNumber: bills.billNumber,
          status: bills.status,
          statusNote: bills.statusNote,
          publishStatus: bills.publishStatus,
          proposalType: bills.proposalType,
          isFeatured: bills.isFeatured,
          isReviewCompleted: bills.isReviewCompleted,
          submittedDate: bills.submittedDate,
          slug: bills.slug,
          knowledgeSource: bills.knowledgeSource,
          useKnowledgeSourceInChat: bills.useKnowledgeSourceInChat,
          councilSessionId: bills.councilSessionId,
          committeeId: bills.committeeId,
          councilSessionName: councilSessions.name,
          committeeName: committees.name,
        })
        .from(bills)
        .leftJoin(
          councilSessions,
          eq(councilSessions.id, bills.councilSessionId)
        )
        .leftJoin(committees, eq(committees.id, bills.committeeId))
        .orderBy(desc(bills.createdAt));

      const tagRows = await tx
        .select({
          billId: billsTags.billId,
          id: tags.id,
          label: tags.label,
        })
        .from(billsTags)
        .innerJoin(tags, eq(tags.id, billsTags.tagId))
        .orderBy(asc(tags.label));

      const stanceRows = await tx
        .select({
          billId: factionStances.billId,
          factionId: factionStances.factionId,
          factionName: factions.displayName,
          type: factionStances.type,
          comment: factionStances.comment,
        })
        .from(factionStances)
        .innerJoin(factions, eq(factions.id, factionStances.factionId))
        .orderBy(asc(factions.sortOrder));

      return { billRows, tagRows, stanceRows };
    });

    const tagsByBill = new Map<string, { id: string; label: string }[]>();
    for (const t of tagRows) {
      const list = tagsByBill.get(t.billId) ?? [];
      list.push({ id: t.id, label: t.label });
      tagsByBill.set(t.billId, list);
    }

    const stancesByBill = new Map<
      string,
      {
        factionId: string;
        factionName: string;
        type: string;
        comment: string | null;
      }[]
    >();
    for (const s of stanceRows) {
      const list = stancesByBill.get(s.billId) ?? [];
      list.push({
        factionId: s.factionId,
        factionName: s.factionName,
        type: s.type,
        comment: s.comment,
      });
      stancesByBill.set(s.billId, list);
    }

    const result = billRows.map((b) => ({
      ...b,
      tags: tagsByBill.get(b.id) ?? [],
      stances: stancesByBill.get(b.id) ?? [],
    }));
    return c.json({ bills: result });
  })
  // 作成
  .post("/", zValidator("json", createBodySchema), async (c) => {
    const body = c.req.valid("json");
    try {
      const rows = await adminQuery((tx) =>
        tx
          .insert(bills)
          .values({
            name: body.name,
            billNumber: body.billNumber,
            status: body.status,
            publishStatus: body.publishStatus,
            proposalType: body.proposalType,
            councilSessionId: body.councilSessionId ?? null,
            committeeId: body.committeeId ?? null,
            isFeatured: body.isFeatured,
          })
          .returning({ id: bills.id })
      );
      const row = rows[0];
      if (!row) throw new Error("議案の作成に失敗しました");
      return c.json({ id: row.id }, 201);
    } catch (e) {
      if (isUniqueViolation(e)) return c.json({ error: "duplicate" }, 409);
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
        billNumber?: string;
        status?: z.infer<typeof statusEnum>;
        statusNote?: string | null;
        publishStatus?: z.infer<typeof publishStatusEnum>;
        proposalType?: z.infer<typeof proposalTypeEnum>;
        councilSessionId?: string | null;
        committeeId?: string | null;
        slug?: string | null;
        knowledgeSource?: string | null;
        useKnowledgeSourceInChat?: boolean;
        isFeatured?: boolean;
        isReviewCompleted?: boolean;
        submittedDate?: string | null;
      } = {};
      if (body.name !== undefined) values.name = body.name;
      if (body.billNumber !== undefined) values.billNumber = body.billNumber;
      if (body.status !== undefined) values.status = body.status;
      if (body.statusNote !== undefined) values.statusNote = body.statusNote;
      if (body.publishStatus !== undefined) {
        values.publishStatus = body.publishStatus;
      }
      if (body.proposalType !== undefined) {
        values.proposalType = body.proposalType;
      }
      if (body.councilSessionId !== undefined) {
        values.councilSessionId = body.councilSessionId;
      }
      if (body.committeeId !== undefined) {
        values.committeeId = body.committeeId;
      }
      if (body.slug !== undefined) values.slug = body.slug;
      if (body.knowledgeSource !== undefined) {
        values.knowledgeSource = body.knowledgeSource;
      }
      if (body.useKnowledgeSourceInChat !== undefined) {
        values.useKnowledgeSourceInChat = body.useKnowledgeSourceInChat;
      }
      if (body.isFeatured !== undefined) values.isFeatured = body.isFeatured;
      if (body.isReviewCompleted !== undefined) {
        values.isReviewCompleted = body.isReviewCompleted;
      }
      if (body.submittedDate !== undefined) {
        values.submittedDate = body.submittedDate;
      }
      if (Object.keys(values).length === 0) {
        return c.json({ error: "no_fields" }, 400);
      }
      try {
        const rows = await adminQuery((tx) =>
          tx
            .update(bills)
            .set(values)
            .where(eq(bills.id, id))
            .returning({ id: bills.id })
        );
        const row = rows[0];
        if (!row) return c.json({ error: "not_found" }, 404);
        return c.json({ id: row.id });
      } catch (e) {
        if (isUniqueViolation(e)) return c.json({ error: "duplicate" }, 409);
        throw e;
      }
    }
  )
  // 付与タグの置換（渡された tagId 集合に丸ごと入れ替える）
  .put(
    "/:id/tags",
    zValidator("param", paramSchema),
    zValidator("json", z.object({ tagIds: z.array(z.uuid()).max(50) })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { tagIds } = c.req.valid("json");
      const uniqueTagIds = [...new Set(tagIds)];
      try {
        const done = await adminQuery(async (tx) => {
          const [bill] = await tx
            .select({ id: bills.id })
            .from(bills)
            .where(eq(bills.id, id));
          if (!bill) return false;
          await tx.delete(billsTags).where(eq(billsTags.billId, id));
          if (uniqueTagIds.length > 0) {
            await tx
              .insert(billsTags)
              .values(uniqueTagIds.map((tagId) => ({ billId: id, tagId })));
          }
          return true;
        });
        if (!done) return c.json({ error: "not_found" }, 404);
        return c.json({ id });
      } catch (e) {
        // 存在しない tagId を渡された場合（FK 違反）。
        if (isForeignKeyViolation(e)) {
          return c.json({ error: "invalid_tag" }, 400);
        }
        throw e;
      }
    }
  )
  // 会派スタンスの置換（会派ごとに1件。渡された集合へ丸ごと入れ替える）
  .put(
    "/:id/stances",
    zValidator("param", paramSchema),
    zValidator(
      "json",
      z.object({
        stances: z
          .array(
            z.object({
              factionId: z.uuid(),
              type: stanceTypeEnum,
              comment: z.string().trim().max(2000).nullable().optional(),
            })
          )
          .max(50),
      })
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const { stances } = c.req.valid("json");
      // 会派ごと1件（先勝ちで重複除去。DB の unique と整合させる）。
      const seen = new Set<string>();
      const unique = stances.filter((s) => {
        if (seen.has(s.factionId)) return false;
        seen.add(s.factionId);
        return true;
      });
      try {
        const done = await adminQuery(async (tx) => {
          const [bill] = await tx
            .select({ id: bills.id })
            .from(bills)
            .where(eq(bills.id, id));
          if (!bill) return false;
          await tx.delete(factionStances).where(eq(factionStances.billId, id));
          if (unique.length > 0) {
            await tx.insert(factionStances).values(
              unique.map((s) => ({
                billId: id,
                factionId: s.factionId,
                type: s.type,
                comment: s.comment ?? null,
              }))
            );
          }
          return true;
        });
        if (!done) return c.json({ error: "not_found" }, 404);
        return c.json({ id });
      } catch (e) {
        if (isForeignKeyViolation(e)) {
          return c.json({ error: "invalid_faction" }, 400);
        }
        throw e;
      }
    }
  )
  // 本文（bill_contents）取得。難易度別（normal/hard）に title/summary/content を返す。
  .get("/:id/contents", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const result = await adminQuery(async (tx) => {
      const [bill] = await tx
        .select({ id: bills.id, name: bills.name })
        .from(bills)
        .where(eq(bills.id, id));
      if (!bill) return null;
      const rows = await tx
        .select({
          difficultyLevel: billContents.difficultyLevel,
          title: billContents.title,
          summary: billContents.summary,
          content: billContents.content,
        })
        .from(billContents)
        .where(eq(billContents.billId, id));
      return { bill, rows };
    });
    if (!result) return c.json({ error: "not_found" }, 404);
    const pick = (level: (typeof DIFFICULTY_LEVELS)[number]) => {
      const row = result.rows.find((r) => r.difficultyLevel === level);
      return row
        ? { title: row.title, summary: row.summary, content: row.content }
        : null;
    };
    return c.json({
      name: result.bill.name,
      contents: { normal: pick("normal"), hard: pick("hard") },
    });
  })
  // 本文の更新。難易度ごとに upsert（3項目すべて空ならその行を削除）。
  .put(
    "/:id/contents",
    zValidator("param", paramSchema),
    zValidator(
      "json",
      z.object({ normal: contentSchema, hard: contentSchema })
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const done = await adminQuery(async (tx) => {
        const [bill] = await tx
          .select({ id: bills.id })
          .from(bills)
          .where(eq(bills.id, id));
        if (!bill) return false;
        for (const level of DIFFICULTY_LEVELS) {
          const d = body[level];
          const isEmpty =
            d.title.trim() === "" &&
            d.summary.trim() === "" &&
            d.content.trim() === "";
          if (isEmpty) {
            await tx
              .delete(billContents)
              .where(
                and(
                  eq(billContents.billId, id),
                  eq(billContents.difficultyLevel, level)
                )
              );
          } else {
            await tx
              .insert(billContents)
              .values({
                billId: id,
                difficultyLevel: level,
                title: d.title,
                summary: d.summary,
                content: d.content,
              })
              .onConflictDoUpdate({
                target: [billContents.billId, billContents.difficultyLevel],
                set: { title: d.title, summary: d.summary, content: d.content },
              });
          }
        }
        return true;
      });
      if (!done) return c.json({ error: "not_found" }, 404);
      return c.json({ id });
    }
  )
  // 削除
  .delete("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx.delete(bills).where(eq(bills.id, id)).returning({ id: bills.id })
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: row.id });
  });

export type AdminBillsRouteType = typeof adminBillsRoute;
