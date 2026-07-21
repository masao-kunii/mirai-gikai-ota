import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import {
  buildFaithfulnessPrompt,
  faithfulnessResultSchema,
} from "@mirai-gikai/shared/moderation/faithfulness";

const FAITHFULNESS_TIMEOUT_MS = 30_000;

/**
 * 完了レポート（要約・意見）が対話ログに忠実かを検証する。
 * 失敗・タイムアウトは握りつぶし null を返す（承認判定側で pending に倒す）。
 */
export async function evaluateFaithfulness(params: {
  summary: string | null;
  opinions: Array<{ title: string; content: string }> | null;
  messages: Array<{ role: string; content: string }>;
  model: string;
}): Promise<{ faithful: boolean | null; reasoning: string | null }> {
  try {
    const prompt = buildFaithfulnessPrompt({
      summary: params.summary,
      opinions: params.opinions,
      messages: params.messages,
    });
    const result = await Promise.race([
      generateObject({
        model: params.model,
        schema: faithfulnessResultSchema,
        prompt,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("faithfulness timeout")),
          FAITHFULNESS_TIMEOUT_MS
        )
      ),
    ]);
    return {
      faithful: result.object.faithful,
      reasoning: result.object.reasoning,
    };
  } catch (error) {
    console.error("Faithfulness evaluation failed:", error);
    return { faithful: null, reasoning: null };
  }
}
