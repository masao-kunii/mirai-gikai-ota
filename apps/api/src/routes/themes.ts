import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { publicQuery } from "../lib/db";

const { themes, themeContents, themeInitiatives } = schema;

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
            title: themeInitiatives.title,
            body: themeInitiatives.body,
            dateLabel: themeInitiatives.dateLabel,
            url: themeInitiatives.url,
          })
          .from(themeInitiatives)
          .where(eq(themeInitiatives.themeId, theme.id))
          .orderBy(asc(themeInitiatives.sortOrder));

        const { id: _id, ...themePublic } = theme;
        return { theme: themePublic, content: content ?? null, initiatives };
      });

      if (!result) {
        return c.json({ error: "not_found" as const }, 404);
      }
      return c.json(result);
    }
  );

export type ThemesRouteType = typeof themesRoute;
