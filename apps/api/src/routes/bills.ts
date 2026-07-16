import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { summarizeReports } from "@mirai-gikai/shared/interview-aggregation/summarize-reports";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { publicQuery } from "../lib/db";

const {
  bills,
  billContents,
  billsTags,
  councilSessions,
  factions,
  factionStances,
  interviewReport,
  interviewSessions,
  interviewConfigs,
} = schema;

/**
 * 公開用の議案カラム。
 * knowledge_source（AI 用内部資料）は公開境界でカラム除外されているため
 * 含めない（含めると public_reader では permission denied になる）。
 */
// テーマの関連議案（themes ルート）でも同じ列を返すため export する。
export const publicBillColumns = {
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
  isReviewCompleted: bills.isReviewCompleted,
  councilSessionId: bills.councilSessionId,
  committeeId: bills.committeeId,
};

export const billsRoute = new Hono()
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        sessionSlug: z.string().min(1).max(200).optional(),
        // 既定 published。coming_soon（公開予告）は公開境界で読み取り可。
        status: z.enum(["published", "coming_soon"]).optional(),
        // "true" のとき注目議案のみ
        isFeatured: z.enum(["true"]).optional(),
        // 指定タグの議案のみ
        tagId: z.uuid().optional(),
      })
    ),
    async (c) => {
      const { sessionSlug, status, isFeatured, tagId } = c.req.valid("query");
      const rows = await publicQuery(async (tx) => {
        // RLS でも draft は不可視だが、アプリ層でも明示する（多重防御）
        const conditions = [eq(bills.publishStatus, status ?? "published")];
        if (isFeatured === "true") {
          conditions.push(eq(bills.isFeatured, true));
        }
        if (sessionSlug) {
          const [session] = await tx
            .select({ id: councilSessions.id })
            .from(councilSessions)
            .where(eq(councilSessions.slug, sessionSlug));
          if (!session) return [];
          conditions.push(eq(bills.councilSessionId, session.id));
        }
        if (tagId) {
          return tx
            .select(publicBillColumns)
            .from(bills)
            .innerJoin(billsTags, eq(billsTags.billId, bills.id))
            .where(and(eq(billsTags.tagId, tagId), ...conditions))
            .orderBy(desc(bills.publishedAt));
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
  )
  .get(
    // 議案に寄せられた住民意見（公開インタビューレポート）の集約。
    // 公開境界: interview_report は is_public_by_admin AND is_public_by_user のみ
    // public_reader に見える（RLS）。ここでもアプリ層で明示する（多重防御）。
    "/:id/opinions-summary",
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const rows = await publicQuery((tx) =>
        tx
          .select({
            id: interviewReport.id,
            summary: interviewReport.summary,
            stance: interviewReport.stance,
            role: interviewReport.role,
            roleTitle: interviewReport.roleTitle,
            richness: interviewReport.totalContentRichness,
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
          .where(
            and(
              eq(interviewConfigs.billId, id),
              eq(interviewReport.isPublicByAdmin, true),
              eq(interviewReport.isPublicByUser, true)
            )
          )
      );

      return c.json(summarizeReports(rows));
    }
  );

// ドメイン別に型を確定して export する（単一の巨大 AppType を作らない: TARGET_ARCHITECTURE §6）
export type BillsRouteType = typeof billsRoute;
