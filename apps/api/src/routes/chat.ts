import { zValidator } from "@hono/zod-validator";
import { AI_MODELS } from "@mirai-gikai/shared/ai/models";
import {
  convertToModelMessages,
  type LanguageModel,
  streamText,
  type UIMessage,
} from "@mirai-gikai/shared/ai/sdk";
import { FallbackPromptProvider } from "@mirai-gikai/shared/prompt/fallback";
import type { PromptProvider } from "@mirai-gikai/shared/prompt/provider";
import { Hono } from "hono";
import { z } from "zod";
import { resolveAnonId } from "../lib/anon";
import { getDb } from "../lib/db";
import {
  fetchBillChatContext,
  recordChatUsage,
} from "../lib/chat/context-and-usage";
import {
  ChatError,
  ChatErrorCode,
  chatErrorToResponse,
} from "../lib/chat/errors";
import {
  assertWithinCostLimits,
  enforceChatRateLimit,
} from "../lib/chat/guards";

/** テスト時にモック注入するための外部依存 */
export type ChatRouteDeps = {
  model?: LanguageModel;
  promptProvider?: PromptProvider;
};

/**
 * リクエストヘッダーからクライアント IP を推定（web 版 client-ip.ts と同一）。
 * 取得できない場合は "unknown"（一括バケット＝安全側）。
 */
function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

// UIMessage は AI SDK の複雑な型のため、境界では形の最小要件のみ検証する
const uiMessageSchema = z.looseObject({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(z.looseObject({})),
});

const chatBodySchema = z.object({
  billId: z.uuid(),
  difficultyLevel: z.enum(["normal", "hard"]).default("normal"),
  messages: z.array(uiMessageSchema).min(1).max(50),
});

/**
 * 議案チャット（SSE ストリーミング）。
 *
 * ストリーミング3分割（TARGET_ARCHITECTURE §3.3）:
 *   1. 前処理: レート制限・コストガード・議案コンテキスト取得（短 TX 群）
 *   2. ストリーム: LLM 応答を流す（DB 接続を保持しない）
 *   3. 後処理: onFinish で使用量・コストを記録（短 TX）
 */
export function createChatRoute(deps?: ChatRouteDeps) {
  return new Hono().post("/", zValidator("json", chatBodySchema), async (c) => {
    const { anonId, setCookie } = await resolveAnonId(c.req.raw);
    const { billId, difficultyLevel, messages } = c.req.valid("json");
    const db = getDb();

    // ストリーミング応答は素の Response のため、クッキーは明示付与する
    const withAnonCookie = (res: Response): Response => {
      if (setCookie) res.headers.append("set-cookie", setCookie);
      return res;
    };

    try {
      // --- 1. 前処理（それぞれ独立した短いトランザクション） ---
      await enforceChatRateLimit(db, getClientIp(c.req.raw.headers), anonId);
      await assertWithinCostLimits(db, anonId);

      const billContext = await fetchBillChatContext(
        db,
        billId,
        difficultyLevel
      );
      if (!billContext) {
        return withAnonCookie(c.json({ error: "not_found" as const }, 404));
      }

      const promptProvider =
        deps?.promptProvider ?? new FallbackPromptProvider();
      const prompt = await promptProvider.getPrompt(
        `bill-chat-system-${difficultyLevel}`,
        { ...billContext }
      );

      // 公開チャットは gemini-3.1-flash-lite（web 版と同一の選定理由:
      // 2.5-flash より新しく安価。Developer API キー経由）
      const model = deps?.model ?? AI_MODELS.gemini3_1_flash_lite;
      const modelName =
        typeof model === "string" ? model : (model.modelId ?? "unknown");

      // --- 2. ストリーム（DB 接続なし） ---
      const result = streamText({
        model,
        system: prompt.content,
        messages: await convertToModelMessages(
          messages as unknown as UIMessage[]
        ),
        onFinish: async (event) => {
          // --- 3. 後処理（短 TX。失敗してもストリームは成立済み） ---
          try {
            await recordChatUsage(db, {
              anonId,
              model: modelName,
              usage: event.totalUsage,
              metadata: { billId, difficultyLevel },
            });
          } catch (usageError) {
            console.error("Failed to record chat usage:", usageError);
          }
        },
      });

      return withAnonCookie(result.toUIMessageStreamResponse());
    } catch (error) {
      if (error instanceof ChatError) {
        return withAnonCookie(chatErrorToResponse(error));
      }
      console.error("Chat request error:", error);
      return withAnonCookie(
        chatErrorToResponse(
          new ChatError(
            ChatErrorCode.LLM_GENERATION_FAILED,
            error instanceof Error ? error.message : String(error)
          )
        )
      );
    }
  });
}

export type ChatRouteType = ReturnType<typeof createChatRoute>;
