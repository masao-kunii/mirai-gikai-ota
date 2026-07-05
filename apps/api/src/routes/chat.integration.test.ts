import { createDbClient, schema, withAppAdmin } from "@mirai-gikai/db";
import { convertArrayToReadableStream, MockLanguageModelV3 } from "ai/test";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createChatRoute } from "./chat";

/**
 * チャット API の統合テスト（LLM はモック、DB はローカル Supabase 直結）。
 *
 * ストリーミング3分割の前処理（レート制限・コストガード・公開境界）と
 * 後処理（使用量記録）を、実 DB で検証する。
 */

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54432/postgres";
const db = createDbClient(DB_URL);
const { bills, billContents, chatUsageEvents, rateLimitCounters } = schema;

const stamp = Date.now();
let publishedId: string;
let draftId: string;
const billIds: string[] = [];
const anonIds: string[] = [];

/** streamText 用のモックモデル（使用量: input 100 / output 20） */
function createStreamMock(chunks: string[]): MockLanguageModelV3 {
  const usage = {
    inputTokens: {
      total: 100,
      noCache: 100,
      cacheRead: 0 as number | undefined,
      cacheWrite: 0 as number | undefined,
    },
    outputTokens: {
      total: 20,
      text: 20,
      reasoning: 0 as number | undefined,
    },
  };
  return new MockLanguageModelV3({
    doStream: {
      stream: convertArrayToReadableStream([
        { type: "stream-start" as const, warnings: [] as [] },
        { type: "text-start" as const, id: "text-1" },
        ...chunks.map((delta) => ({
          type: "text-delta" as const,
          id: "text-1",
          delta,
        })),
        { type: "text-end" as const, id: "text-1" },
        {
          type: "finish" as const,
          usage,
          finishReason: { unified: "stop" as const, raw: undefined },
        },
      ]),
    },
  });
}

function makeApp() {
  return createChatRoute({ model: createStreamMock(["こんにちは", "！"]) });
}

function chatRequest(billId: string, cookie?: string): [string, RequestInit] {
  return [
    "/",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({
        billId,
        difficultyLevel: "normal",
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "この議案を教えて" }],
          },
        ],
      }),
    },
  ];
}

/** Set-Cookie から mg_anon のクッキー文字列と匿名 ID を取り出す */
function extractAnon(res: Response): { cookie: string; anonId: string } {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/mg_anon=([^;]+)/);
  if (!m?.[1]) throw new Error(`mg_anon クッキーが無い: ${setCookie}`);
  const cookieValue = m[1];
  const anonId = cookieValue.split(".")[0];
  if (!anonId) throw new Error("匿名 ID の抽出に失敗");
  anonIds.push(anonId);
  return { cookie: `mg_anon=${cookieValue}`, anonId };
}

beforeAll(async () => {
  await withAppAdmin(db, async (tx) => {
    const inserted = await tx
      .insert(bills)
      .values([
        {
          name: "チャットテスト公開議案",
          slug: `chat-test-published-${stamp}`,
          status: "submitted",
          publishStatus: "published",
          publishedAt: new Date().toISOString(),
        },
        {
          name: "チャットテスト下書き議案",
          slug: `chat-test-draft-${stamp}`,
          status: "submitted",
          publishStatus: "draft",
        },
      ])
      .returning({ id: bills.id, slug: bills.slug });
    billIds.push(...inserted.map((b) => b.id));
    const pub = inserted.find((b) => b.slug?.includes("published"));
    const draft = inserted.find((b) => b.slug?.includes("draft"));
    if (!pub || !draft) throw new Error("議案のシードに失敗");
    publishedId = pub.id;
    draftId = draft.id;
    await tx.insert(billContents).values({
      billId: publishedId,
      difficultyLevel: "normal",
      title: "チャット用タイトル",
      summary: "チャット用要約",
      content: "チャット用本文",
    });
  });
});

afterAll(async () => {
  await withAppAdmin(db, async (tx) => {
    if (anonIds.length > 0) {
      await tx
        .delete(chatUsageEvents)
        .where(inArray(chatUsageEvents.userId, anonIds));
    }
    if (billIds.length > 0) {
      await tx.delete(bills).where(inArray(bills.id, billIds));
    }
    // 共有 IP バケットを掃除（連続ローカル実行での誤検知防止）
    await tx
      .delete(rateLimitCounters)
      .where(like(rateLimitCounters.bucketKey, "chat:%"));
  });
  await db.$client.end();
});

describe("POST /api/chat", () => {
  it("published 議案でストリーミング応答と匿名クッキーが返る", async () => {
    const app = makeApp();
    const res = await app.request(...chatRequest(publishedId));
    expect(res.status).toBe(200);
    const { anonId } = extractAnon(res);
    expect(anonId).toMatch(/^[0-9a-f-]{36}$/);

    const body = await res.text();
    expect(body).toContain("こんにちは");
  });

  it("ストリーム完了後に使用量が記録される（後処理 TX）", async () => {
    const app = makeApp();
    const res = await app.request(...chatRequest(publishedId));
    const { anonId } = extractAnon(res);
    await res.text(); // ストリームを消費して onFinish を発火させる

    // onFinish は非同期のため短くポーリング
    let rows: { totalTokens: number }[] = [];
    for (let i = 0; i < 20; i++) {
      rows = await withAppAdmin(db, (tx) =>
        tx
          .select({ totalTokens: chatUsageEvents.totalTokens })
          .from(chatUsageEvents)
          .where(eq(chatUsageEvents.userId, anonId))
      );
      if (rows.length > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(rows).toHaveLength(1);
    expect(rows[0]?.totalTokens).toBe(120);
  });

  it("draft 議案は 404（公開境界）", async () => {
    const app = makeApp();
    const res = await app.request(...chatRequest(draftId));
    expect(res.status).toBe(404);
  });

  it("uuid でない billId は 400", async () => {
    const app = makeApp();
    const res = await app.request(...chatRequest("not-a-uuid"));
    expect(res.status).toBe(400);
  });

  it("同一クッキーの連投はレート制限される（fail-open 側の正常系）", async () => {
    process.env.CHAT_RATE_LIMIT_PER_USER_PER_MIN = "1";
    try {
      const app = makeApp();
      const first = await app.request(...chatRequest(publishedId));
      expect(first.status).toBe(200);
      const { cookie } = extractAnon(first);
      await first.text();

      const second = await app.request(...chatRequest(publishedId, cookie));
      expect(second.status).toBe(429);
    } finally {
      delete process.env.CHAT_RATE_LIMIT_PER_USER_PER_MIN;
    }
  });

  it("ユーザー日次コスト上限を超えると 429（fail-closed ガード）", async () => {
    const app = makeApp();
    const first = await app.request(...chatRequest(publishedId));
    const { cookie, anonId } = extractAnon(first);
    await first.text();

    // 当日分として大きなコストを記録
    await withAppAdmin(db, (tx) =>
      tx.insert(chatUsageEvents).values({
        userId: anonId,
        model: "test-model",
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        costUsd: "999",
      })
    );

    const second = await app.request(...chatRequest(publishedId, cookie));
    expect(second.status).toBe(429);
    expect(await second.text()).toContain("本日の利用上限");
  });
});
