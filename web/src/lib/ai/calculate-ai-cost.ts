import type { LanguageModelUsage } from "ai";

export type ModelPricing = {
  inputTokensPerMillionUsd: number;
  outputTokensPerMillionUsd: number;
};

export type SanitizedUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

/**
 * Vertex AI Gemini モデルの単価（USD / 100万トークン）
 *
 * 出典: https://cloud.google.com/vertex-ai/generative-ai/pricing
 * （長文/短文プロンプトで料金が変わるが、ここでは標準価格を採用）
 */
export const modelPricing: Record<string, ModelPricing> = {
  "gemini-2.5-flash": {
    inputTokensPerMillionUsd: 0.3,
    outputTokensPerMillionUsd: 2.5,
  },
  "gemini-2.5-flash-lite": {
    inputTokensPerMillionUsd: 0.1,
    outputTokensPerMillionUsd: 0.4,
  },
  // Gemini Developer API 価格（出典: https://ai.google.dev/gemini-api/docs/pricing）
  "gemini-3.1-flash-lite": {
    inputTokensPerMillionUsd: 0.25,
    outputTokensPerMillionUsd: 1.5,
  },
  "gemini-2.5-pro": {
    inputTokensPerMillionUsd: 1.25,
    outputTokensPerMillionUsd: 10,
  },
};

const COST_DECIMALS = 6;

export function sanitizeUsage(usage: LanguageModelUsage): SanitizedUsage {
  const inputTokens = ensureInteger(usage.inputTokens);
  const outputTokens = ensureInteger(usage.outputTokens);
  let totalTokens = ensureInteger(usage.totalTokens);

  if (inputTokens > 0 || outputTokens > 0) {
    if (totalTokens <= 0) {
      totalTokens = ensureInteger(inputTokens + outputTokens);
    }
    return { inputTokens, outputTokens, totalTokens };
  }

  if (totalTokens > 0) {
    const half = Math.floor(totalTokens / 2);
    return {
      inputTokens: half,
      outputTokens: totalTokens - half,
      totalTokens,
    };
  }

  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export function calculateUsageCostUsd(
  model: string,
  usage: SanitizedUsage
): number {
  const pricing = modelPricing[model];
  if (!pricing) {
    throw new Error(`Unknown pricing for model "${model}"`);
  }

  const inputCost =
    (pricing.inputTokensPerMillionUsd * usage.inputTokens) / 1_000_000;
  const outputCost =
    (pricing.outputTokensPerMillionUsd * usage.outputTokens) / 1_000_000;

  return roundCost(inputCost + outputCost);
}

export function roundCost(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const scale = 10 ** COST_DECIMALS;
  return Math.round(value * scale) / scale;
}

function ensureInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}
