import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { summarizeReports } from "@mirai-gikai/shared/interview-aggregation/summarize-reports";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { publicQuery } from "../lib/db";
import { publicBillColumns } from "./bills";

const {
  themes,
  themeContents,
  themeInitiatives,
  interviewReport,
  interviewSessions,
  interviewConfigs,
  bills,
  billsTags,
  tags,
} = schema;

export const themesRoute = new Hono()
  // 区政テーマ一覧（is_active のみ・表示順）。hasContent で本文の有無を返す。
  .get("/", async (c) => {
    const rows = await publicQuery((tx) =>
      tx
        .select({
          slug: themes.slug,
          emoji: themes.emoji,
          name: themes.name,
          lead: themes.lead,
          contentId: themeContents.id,
        })
        .from(themes)
        .leftJoin(themeContents, eq(themeContents.themeId, themes.id))
        .orderBy(asc(themes.sortOrder))
    );
    const list = rows.map(({ contentId, ...theme }) => ({
      ...theme,
      hasContent: contentId !== null,
    }));
    return c.json({ themes: list });
  })
  // テーマ詳細（本体 + 本文 + 取り組み）。未存在は 404。
  .get(
    "/:slug",
    zValidator("param", z.object({ slug: z.string().min(1).max(100) })),
    async (c) => {
      const { slug } = c.req.valid("param");
      const result = await publicQuery(async (tx) => {
        const [theme] = await tx
          .select({
            id: themes.id,
            slug: themes.slug,
            emoji: themes.emoji,
            name: themes.name,
            lead: themes.lead,
          })
          .from(themes)
          .where(eq(themes.slug, slug));
        if (!theme) return null;

        const [content] = await tx
          .select({
            overview: themeContents.overview,
            policies: themeContents.policies,
            numbers: themeContents.numbers,
            plans: themeContents.plans,
            billTagLabel: themeContents.billTagLabel,
          })
          .from(themeContents)
          .where(eq(themeContents.themeId, theme.id));

        const initiatives = await tx
          .select({
            id: themeInitiatives.id,
            title: themeInitiatives.title,
            body: themeInitiatives.body,
            dateLabel: themeInitiatives.dateLabel,
            url: themeInitiatives.url,
          })
          .from(themeInitiatives)
          .where(eq(themeInitiatives.themeId, theme.id))
          .orderBy(asc(themeInitiatives.sortOrder));

        // 関連議案: テーマの bill_tag_label と同じ注目タグを持つ published 議案。
        // featured かどうかに関わらずラベルで解決する（tags API の featured 制約を受けない）。
        const relatedBills = content?.billTagLabel
          ? await tx
              .select(publicBillColumns)
              .from(bills)
              .innerJoin(billsTags, eq(billsTags.billId, bills.id))
              .innerJoin(tags, eq(tags.id, billsTags.tagId))
              .where(
                and(
                  eq(tags.label, content.billTagLabel),
                  eq(bills.publishStatus, "published")
                )
              )
              .orderBy(desc(bills.publishedAt))
          : [];

        const { id: _id, ...themePublic } = theme;
        return {
          theme: themePublic,
          content: content ?? null,
          initiatives,
          relatedBills,
        };
      });

      if (!result) {
        return c.json({ error: "not_found" as const }, 404);
      }
      return c.json(result);
    }
  )
  // テーマに寄せられた住民意見（公開インタビューレポート）の集約。
  // 公開境界: interview_report は is_public_by_admin AND is_public_by_user のみ
  // public_reader に見える（RLS）。ここでもアプリ層で明示する（多重防御）。
  .get(
    "/:slug/opinions-summary",
    zValidator("param", z.object({ slug: z.string().min(1).max(100) })),
    async (c) => {
      const { slug } = c.req.valid("param");
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
          .innerJoin(themes, eq(themes.id, interviewConfigs.themeId))
          .where(
            and(
              eq(themes.slug, slug),
              eq(interviewReport.isPublicByAdmin, true),
              eq(interviewReport.isPublicByUser, true)
            )
          )
      );

      return c.json(summarizeReports(rows));
    }
  );

export type ThemesRouteType = typeof themesRoute;
