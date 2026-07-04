import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { publicQuery } from "../lib/db";

const { councilSessions } = schema;

const sessionColumns = {
  id: councilSessions.id,
  slug: councilSessions.slug,
  name: councilSessions.name,
  startDate: councilSessions.startDate,
  endDate: councilSessions.endDate,
  isActive: councilSessions.isActive,
};

export const councilSessionsRoute = new Hono()
  .get("/", async (c) => {
    const rows = await publicQuery((tx) =>
      tx
        .select(sessionColumns)
        .from(councilSessions)
        .orderBy(desc(councilSessions.startDate))
    );
    return c.json({ councilSessions: rows });
  })
  .get(
    "/:slug",
    zValidator("param", z.object({ slug: z.string().min(1).max(200) })),
    async (c) => {
      const { slug } = c.req.valid("param");
      const [session] = await publicQuery((tx) =>
        tx
          .select(sessionColumns)
          .from(councilSessions)
          .where(eq(councilSessions.slug, slug))
      );
      if (!session) {
        return c.json({ error: "not_found" as const }, 404);
      }
      return c.json({ councilSession: session });
    }
  );

export type CouncilSessionsRouteType = typeof councilSessionsRoute;
