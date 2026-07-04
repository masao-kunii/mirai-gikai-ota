import { createDbClient, schema, withAppAdmin } from "@mirai-gikai/db";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app";

/**
 * 公開 API の統合テスト（ローカル Supabase の Postgres 直結）。
 *
 * シードは app_admin ロール、API 本体は public_reader ロールで動くため、
 * 「draft が API から構造的に見えない」ことを RLS ごと検証している。
 */

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54432/postgres";
const db = createDbClient(DB_URL);
const { bills, billContents, councilSessions } = schema;

const stamp = Date.now();
const sessionSlug = `api-test-session-${stamp}`;
const publishedSlug = `api-test-published-${stamp}`;
const draftSlug = `api-test-draft-${stamp}`;
let sessionId: string;
let publishedId: string;
let draftId: string;
const billIds: string[] = [];

beforeAll(async () => {
  await withAppAdmin(db, async (tx) => {
    const [session] = await tx
      .insert(councilSessions)
      .values({
        name: `APIテスト会期 ${stamp}`,
        slug: sessionSlug,
        startDate: "2026-01-01",
        endDate: "2026-03-31",
      })
      .returning({ id: councilSessions.id });
    if (!session) throw new Error("会期のシードに失敗");
    sessionId = session.id;

    const inserted = await tx
      .insert(bills)
      .values([
        {
          name: "APIテスト公開議案",
          slug: publishedSlug,
          status: "submitted",
          publishStatus: "published",
          publishedAt: new Date().toISOString(),
          councilSessionId: sessionId,
        },
        {
          name: "APIテスト下書き議案",
          slug: draftSlug,
          status: "submitted",
          publishStatus: "draft",
          councilSessionId: sessionId,
        },
      ])
      .returning({ id: bills.id, slug: bills.slug });
    billIds.push(...inserted.map((b) => b.id));

    const published = inserted.find((b) => b.slug === publishedSlug);
    const draft = inserted.find((b) => b.slug === draftSlug);
    if (!published || !draft) throw new Error("議案のシードに失敗");
    publishedId = published.id;
    draftId = draft.id;
    await tx.insert(billContents).values({
      billId: published.id,
      difficultyLevel: "normal",
      title: "やさしいタイトル",
      summary: "やさしい要約",
      content: "やさしい本文",
    });
  });
});

afterAll(async () => {
  await withAppAdmin(db, async (tx) => {
    if (billIds.length > 0) {
      await tx.delete(bills).where(inArray(bills.id, billIds));
    }
    if (sessionId) {
      await tx.delete(councilSessions).where(eq(councilSessions.id, sessionId));
    }
  });
  await db.$client.end();
});

/** テスト用: レスポンス JSON を期待形状として読む（実形状は各 expect で検証） */
async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("GET /api/bills", () => {
  it("published のみ返り、draft は含まれない", async () => {
    const res = await app.request(`/api/bills?sessionSlug=${sessionSlug}`);
    expect(res.status).toBe(200);
    const body = await json<{ bills: { slug: string | null }[] }>(res);
    const slugs = body.bills.map((b) => b.slug);
    expect(slugs).toContain(publishedSlug);
    expect(slugs).not.toContain(draftSlug);
  });

  it("存在しない会期 slug では空配列", async () => {
    const res = await app.request("/api/bills?sessionSlug=no-such-session");
    expect(res.status).toBe(200);
    const body = await json<{ bills: unknown[] }>(res);
    expect(body.bills).toEqual([]);
  });

  it("query バリデーション違反は 400", async () => {
    const long = "a".repeat(201);
    const res = await app.request(`/api/bills?sessionSlug=${long}`);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/bills/:id", () => {
  it("published 議案は本体・コンテンツ・会派見解を返す", async () => {
    const res = await app.request(`/api/bills/${publishedId}`);
    expect(res.status).toBe(200);
    const body = await json<{
      bill: { slug: string | null; name: string };
      contents: { title: string }[];
      stances: unknown[];
    }>(res);
    expect(body.bill.slug).toBe(publishedSlug);
    expect(body.bill.name).toBe("APIテスト公開議案");
    expect(body.contents).toHaveLength(1);
    expect(body.contents[0]?.title).toBe("やさしいタイトル");
    expect(Array.isArray(body.stances)).toBe(true);
    // 公開境界: knowledge_source はレスポンス形状にも存在しない
    expect("knowledgeSource" in body.bill).toBe(false);
  });

  it("draft 議案は 404（RLS で行として存在しない）", async () => {
    const res = await app.request(`/api/bills/${draftId}`);
    expect(res.status).toBe(404);
  });

  it("存在しない id は 404", async () => {
    const res = await app.request(
      "/api/bills/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(404);
  });

  it("uuid でない id は 400（バリデーション）", async () => {
    const res = await app.request("/api/bills/not-a-uuid");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/council-sessions", () => {
  it("会期一覧にテスト会期が含まれる", async () => {
    const res = await app.request("/api/council-sessions");
    expect(res.status).toBe(200);
    const body = await json<{ councilSessions: { slug: string | null }[] }>(
      res
    );
    expect(body.councilSessions.map((s) => s.slug)).toContain(sessionSlug);
  });

  it("slug 指定で会期を取得できる", async () => {
    const res = await app.request(`/api/council-sessions/${sessionSlug}`);
    expect(res.status).toBe(200);
    const body = await json<{ councilSession: { slug: string | null } }>(res);
    expect(body.councilSession.slug).toBe(sessionSlug);
  });

  it("存在しない slug は 404", async () => {
    const res = await app.request("/api/council-sessions/no-such-session");
    expect(res.status).toBe(404);
  });
});
