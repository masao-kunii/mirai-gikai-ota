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
 * 基本項目の CRUD、本文（markdown_text）の手動編集、PDF からの本文抽出の保存を扱う。
 * PDF のテキスト抽出そのものは管理画面（ブラウザ）で行い、ここは元 PDF の中継と
 * 抽出結果の保存だけを受け持つ（Workers の CPU 時間に PDF 解析を載せないため）。
 * 速報サイトからの取込は未対応。(council_session_id, meeting_date) は一意。
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

// 抽出本文は空を許さない（抽出に失敗した空文字で既存本文を消さないため）。
const extractedTextBodySchema = z.object({
  text: z.string().trim().min(1).max(500000),
});

/** 元 PDF 取得のタイムアウト。議事録 PDF は 1MB 前後。 */
const SOURCE_PDF_TIMEOUT_MS = 30_000;
/** 中継する PDF の上限。これを超える Content-Length は断る。 */
const MAX_SOURCE_PDF_BYTES = 30 * 1024 * 1024;

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
  // 元 PDF の中継。PDF からのテキスト抽出は管理画面（ブラウザ）で行うが、市のサイトは
  // CORS を返さないためブラウザから直接取れない。取得先は DB に登録済みの URL に限る。
  .get("/:id/source-pdf", zValidator("param", paramSchema), async (c) => {
    const { id } = c.req.valid("param");
    const rows = await adminQuery((tx) =>
      tx
        .select({ sourcePdfUrl: councilSessionMinutes.sourcePdfUrl })
        .from(councilSessionMinutes)
        .where(eq(councilSessionMinutes.id, id))
    );
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    if (
      !URL.canParse(row.sourcePdfUrl) ||
      new URL(row.sourcePdfUrl).protocol !== "https:"
    ) {
      return c.json({ error: "invalid_url" }, 422);
    }

    let upstream: Response;
    try {
      upstream = await fetch(row.sourcePdfUrl, {
        signal: AbortSignal.timeout(SOURCE_PDF_TIMEOUT_MS),
      });
    } catch {
      return c.json({ error: "upstream_unreachable" }, 502);
    }
    if (!upstream.ok || !upstream.body) {
      return c.json({ error: "upstream_error", status: upstream.status }, 502);
    }
    const length = Number(upstream.headers.get("content-length"));
    if (length > MAX_SOURCE_PDF_BYTES) {
      return c.json({ error: "too_large" }, 413);
    }
    return c.body(upstream.body, 200, {
      "content-type": "application/pdf",
      "cache-control": "no-store",
    });
  })
  // PDF から抽出した本文の保存。手動編集（PATCH）と分け、抽出日時を記録する。
  .put(
    "/:id/extracted-text",
    zValidator("param", paramSchema),
    zValidator("json", extractedTextBodySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { text } = c.req.valid("json");
      const rows = await adminQuery((tx) =>
        tx
          .update(councilSessionMinutes)
          .set({ markdownText: text, extractedAt: sql`now()` })
          .where(eq(councilSessionMinutes.id, id))
          .returning({
            id: councilSessionMinutes.id,
            extractedAt: councilSessionMinutes.extractedAt,
          })
      );
      const row = rows[0];
      if (!row) return c.json({ error: "not_found" }, 404);
      return c.json(row);
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
