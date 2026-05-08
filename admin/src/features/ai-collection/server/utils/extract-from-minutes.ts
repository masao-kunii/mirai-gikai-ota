import "server-only";

import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import { AI_MODELS } from "@mirai-gikai/shared/ai/models";
import { getModel } from "@mirai-gikai/shared/ai/get-model";
import { z } from "zod";
import {
  buildMinutesExtractionPrompt,
  type MinuteForPrompt,
} from "./build-minutes-prompt";

const billStatusSchema = z.enum([
  "submitted",
  "in_committee",
  "plenary_session",
  "approved",
  "rejected",
  "adopted",
  "partially_adopted",
]);

const stanceTypeSchema = z.enum(["for", "against", "neutral", "absent"]);

export const minutesExtractionSchema = z.object({
  bills: z.array(
    z.object({
      billNumber: z.string().nullable(),
      title: z.string(),
      summary: z.string(),
      status: billStatusSchema,
      submitter: z.string().nullable(),
    })
  ),
  factionStances: z.array(
    z.object({
      billTitle: z.string(),
      factionName: z.string(),
      stanceType: stanceTypeSchema,
      comment: z.string().nullable(),
    })
  ),
});

export type MinutesExtractionResult = z.infer<typeof minutesExtractionSchema>;

/**
 * 議事録 markdown を Vertex AI Gemini に渡して、議案と会派見解を構造化抽出する。
 * 内部で generateObject + zod スキーマで型安全に取得する。
 */
export async function extractFromMinutes(
  minutes: MinuteForPrompt[]
): Promise<MinutesExtractionResult> {
  const { system, prompt } = buildMinutesExtractionPrompt(minutes);
  const { object } = await generateObject({
    model: getModel(AI_MODELS.pro),
    system,
    prompt,
    schema: minutesExtractionSchema,
  });
  return object;
}
