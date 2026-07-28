import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { adminQuery } from "../../lib/db";
import { isUniqueViolation } from "../../lib/pg-errors";

const { councilSessionMinutes, councilSessions } = schema;

/**
 * 管理 議事録（app_admin ロール）。
 *
 * council_session_minutes は会期に紐づく議事録。app_admin のみ（公開なし）。
 * PDF からの Markdown 抽出・速報サイト取込・議案抽出などの自動化は ai-collection
 * 相当で本 PR のスコープ外。ここでは基本項目の CRUD ＋ 本文（markdown_text）の
 * 手動編集に絞る。(council_session_id, meeting_date) は一意。
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dateField = z
  .string()
  .regex(DATE_RE, "YYYY-MM-DD 形式で入力してください");

const createBodySchema = z.object({
  councilSessionId: z.uuid(),
  meetingDate: dateField,
  dayNumber: z.number().int().min(1).nullable().optional(),
  title: z.string().trim().max(500).nullable().optional(),
  sourcePdfUrl: z.string().trim().min(1).max(2000),
  markdownText: z.string().max(500000).nullable().optional(),
});

const updateBodySchema = z.object({
  meetingDate: dateField.optional(),
  dayNumber: z.number().int().min(1).nullable().optional(),
  title: z.string().trim().max(500).nullable().optional(),
  sourcePdfUrl: z.string().trim().min(1).max(2000).optional(),
  markdownText: z.string().max(500000).nullable().optional(),
});

const paramSchema = z.object({ id: z.uuid() });
const listQuerySchema = z.object({ sessionId: z.uuid().optional() });

export const adminMinutesRoute = new Hono()
  // 一覧（会期名つき・会議日降順）。本文は重いので有無フラグだけ返す。
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const { sessionId } = c.req.valid("query");
    const rows = await adminQuery((tx) =>
      tx
        .select({
          id: councilSessionMinutes.id,
          councilSessionId: councilSessionMinutes.councilSessionId,
          councilSessionName: councilSessions.name,
          meetingDate: councilSessionMinutes.meetingDate,
          dayNumber: councilSessionMinutes.dayNumber,
          title: councilSessionMinutes.title,
          sourcePdfUrl: councilSessionMinutes.sourcePdfUrl,
          extractedAt: councilSessionMinutes.extractedAt,
          hasText: sql<boolean>`(${councilSessionMinutes.markdownText} is not null and ${councilSessionMinutes.markdownText} <> '')`,
        })
        .from(councilSessionMinutes)
        .innerJoin(
          councilSessions,
          eq(councilSessions.id, councilSessionMinutes.councilSessionId)
        )
        .where(
          sessionId
            ? eq(councilSessionMinutes.councilSessionId, sessionId)
            : undefined
        )
        .orderBy(desc(councilSessionMinutes.meetingDate))
    );
    return c.json({ minutes: rows });
  })
  // 詳細（本文つき）
  .get("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx
        .select({
          id: councilSessionMinutes.id,
          councilSessionId: councilSessionMinutes.councilSessionId,
          councilSessionName: councilSessions.name,
          meetingDate: councilSessionMinutes.meetingDate,
          dayNumber: councilSessionMinutes.dayNumber,
          title: councilSessionMinutes.title,
          sourcePdfUrl: councilSessionMinutes.sourcePdfUrl,
          markdownText: councilSessionMinutes.markdownText,
          extractedAt: councilSessionMinutes.extractedAt,
        })
        .from(councilSessionMinutes)
        .innerJoin(
          councilSessions,
          eq(councilSessions.id, councilSessionMinutes.councilSessionId)
        )
        .where(eq(councilSessionMinutes.id, id))
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ minute: row });
  })
  // 作成
  .post("/", zValidator("json", createBodySchema), async (c) => {
    const body = c.req.valid("json");
    try {
      const rows = await adminQuery((tx) =>
        tx
          .insert(councilSessionMinutes)
          .values({
            councilSessionId: body.councilSessionId,
            meetingDate: body.meetingDate,
            dayNumber: body.dayNumber ?? null,
            title: body.title ?? null,
            sourcePdfUrl: body.sourcePdfUrl,
            markdownText: body.markdownText ?? null,
          })
          .returning({ id: councilSessionMinutes.id })
      );
      const row = rows[0];
      if (!row) throw new Error("議事録の作成に失敗しました");
      return c.json({ id: row.id }, 201);
    } catch (e) {
      // 同一会期・同一会議日が既にある（一意違反）。
      if (isUniqueViolation(e)) return c.json({ error: "duplicate" }, 409);
      throw e;
    }
  })
  // 更新
  .patch(
    "/:id",
    zValidator("param", paramSchema),
    zValidator("json", updateBodySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const values: {
        meetingDate?: string;
        dayNumber?: number | null;
        title?: string | null;
        sourcePdfUrl?: string;
        markdownText?: string | null;
      } = {};
      if (body.meetingDate !== undefined) values.meetingDate = body.meetingDate;
      if (body.dayNumber !== undefined) values.dayNumber = body.dayNumber;
      if (body.title !== undefined) values.title = body.title;
      if (body.sourcePdfUrl !== undefined) {
        values.sourcePdfUrl = body.sourcePdfUrl;
      }
      if (body.markdownText !== undefined) {
        values.markdownText = body.markdownText;
      }
      if (Object.keys(values).length === 0) {
        return c.json({ error: "no_fields" }, 400);
      }
      try {
        const rows = await adminQuery((tx) =>
          tx
            .update(councilSessionMinutes)
            .set(values)
            .where(eq(councilSessionMinutes.id, id))
            .returning({ id: councilSessionMinutes.id })
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
  // 削除
  .delete("/:id", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx
        .delete(councilSessionMinutes)
        .where(eq(councilSessionMinutes.id, id))
        .returning({ id: councilSessionMinutes.id })
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ id: row.id });
  });

export type AdminMinutesRouteType = typeof adminMinutesRoute;
