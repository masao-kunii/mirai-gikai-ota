import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { publicQuery } from "../lib/db";

const { bills, billContents, councilSessions, factions, factionStances } =
  schema;

/**
 * 公開用の議案カラム。
 * knowledge_source（AI 用内部資料）は公開境界でカラム除外されているため
 * 含めない（含めると public_reader では permission denied になる）。
 */
const publicBillColumns = {
  id: bills.id,
  slug: bills.slug,
  name: bills.name,
  billNumber: bills.billNumber,
  proposalType: bills.proposalType,
  status: bills.status,
  statusNote: bills.statusNote,
  publishStatus: bills.publishStatus,
  publishedAt: bills.publishedAt,
  submittedDate: bills.submittedDate,
  thumbnailUrl: bills.thumbnailUrl,
  isFeatured: bills.isFeatured,
  councilSessionId: bills.councilSessionId,
  committeeId: bills.committeeId,
};

export const billsRoute = new Hono()
  .get(
    "/",
    zValidator(
      "query",
      z.object({ sessionSlug: z.string().min(1).max(200).optional() })
    ),
    async (c) => {
      const { sessionSlug } = c.req.valid("query");
      const rows = await publicQuery(async (tx) => {
        // RLS でも draft は不可視だが、アプリ層でも published を明示する（多重防御）
        const conditions = [eq(bills.publishStatus, "published")];
        if (sessionSlug) {
          const [session] = await tx
            .select({ id: councilSessions.id })
            .from(councilSessions)
            .where(eq(councilSessions.slug, sessionSlug));
          if (!session) return [];
          conditions.push(eq(bills.councilSessionId, session.id));
        }
        return tx
          .select(publicBillColumns)
          .from(bills)
          .where(and(...conditions))
          .orderBy(desc(bills.publishedAt));
      });
      return c.json({ bills: rows });
    }
  )
  .get(
    "/:id",
    // 現行サイトの公開 URL は /bills/<uuid>。カットオーバー時の URL 継続性のため
    // id で照合する（slug は現データでは未使用。導入時に別途対応）
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await publicQuery(async (tx) => {
        const [bill] = await tx
          .select(publicBillColumns)
          .from(bills)
          .where(and(eq(bills.id, id), eq(bills.publishStatus, "published")));
        if (!bill) return null;

        const contents = await tx
          .select({
            difficultyLevel: billContents.difficultyLevel,
            title: billContents.title,
            summary: billContents.summary,
            content: billContents.content,
          })
          .from(billContents)
          .where(eq(billContents.billId, bill.id));

        const stances = await tx
          .select({
            factionName: factions.displayName,
            type: factionStances.type,
            comment: factionStances.comment,
          })
          .from(factionStances)
          .innerJoin(factions, eq(factionStances.factionId, factions.id))
          .where(eq(factionStances.billId, bill.id));

        return { bill, contents, stances };
      });
      if (!result) {
        return c.json({ error: "not_found" as const }, 404);
      }
      return c.json(result);
    }
  );

// ドメイン別に型を確定して export する（単一の巨大 AppType を作らない: TARGET_ARCHITECTURE §6）
export type BillsRouteType = typeof billsRoute;
