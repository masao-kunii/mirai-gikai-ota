import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import { buildModerationPrompt } from "@mirai-gikai/shared/moderation/build-prompt";
import { moderationResultSchema } from "@mirai-gikai/shared/moderation/schemas";

const MODERATION_TIMEOUT_MS = 30_000;

/**
 * 完了レポートのモデレーションスコアを算出する。
 * 失敗・タイムアウトは握りつぶし null を返す（レポート保存は継続する）。
 */
export async function evaluateModerationScore(params: {
  summary: string | null;
  opinions: Array<{ title: string; content: string }> | null;
  roleDescription: string | null;
  messages: Array<{ role: string; content: string }>;
  model: string;
}): Promise<{
  score: number | null;
  reasoning: string | null;
  flaggedCategories: string[] | null;
}> {
  try {
    const prompt = buildModerationPrompt({
      summary: params.summary,
      opinions: params.opinions,
      roleDescription: params.roleDescription,
      messages: params.messages,
    });
    const result = await Promise.race([
      generateObject({
        model: params.model,
        schema: moderationResultSchema,
        prompt,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("moderation timeout")),
          MODERATION_TIMEOUT_MS
        )
      ),
    ]);
    return {
      score: result.object.score,
      reasoning: result.object.reasoning,
      flaggedCategories: result.object.flagged_categories,
    };
  } catch (error) {
    console.error("Moderation evaluation failed:", error);
    // 失敗は null（＝未確認）。承認判定側で pending に倒す。
    return { score: null, reasoning: null, flaggedCategories: null };
  }
}
