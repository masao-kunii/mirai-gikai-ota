import { schema } from "@mirai-gikai/db";
import { asc, isNotNull } from "drizzle-orm";
import { Hono } from "hono";
import { publicQuery } from "../lib/db";

const { tags } = schema;

/**
 * 公開タグ。トップの「タグ別議案」用に、featured_priority が付いた
 * 注目タグのみを優先度順で返す。tags は public_reader で無条件読み取り可。
 */
export const tagsRoute = new Hono().get("/", async (c) => {
  const rows = await publicQuery((tx) =>
    tx
      .select({
        id: tags.id,
        label: tags.label,
        description: tags.description,
        featuredPriority: tags.featuredPriority,
      })
      .from(tags)
      .where(isNotNull(tags.featuredPriority))
      .orderBy(asc(tags.featuredPriority))
  );
  return c.json({ tags: rows });
});

export type TagsRouteType = typeof tagsRoute;
