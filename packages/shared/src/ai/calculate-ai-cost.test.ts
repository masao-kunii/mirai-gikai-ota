import { describe, expect, it } from "vitest";

import {
  calculateUsageCostUsd,
  type SanitizedUsage,
  sanitizeUsage,
} from "./calculate-ai-cost";
import { AI_MODELS } from "./models";

describe("calculateUsageCostUsd", () => {
  it("returns 0 when usage has no tokens", () => {
    const usage: SanitizedUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    expect(calculateUsageCostUsd(AI_MODELS.flash, usage)).toBe(0);
  });

  it("calculates cost for known model", () => {
    const usage: SanitizedUsage = {
      inputTokens: 500,
      outputTokens: 1000,
      totalTokens: 1500,
    };

    // gemini-2.5-flash: 500 * $0.30/M + 1000 * $2.50/M = 0.00015 + 0.0025 = 0.00265
    expect(calculateUsageCostUsd(AI_MODELS.flash, usage)).toBeCloseTo(0.00265);
  });

  it("calculates cost for new models", () => {
    const usage: SanitizedUsage = {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      totalTokens: 2_000_000,
    };

    // Gemini 2.5 Pro: $1.25 input + $10.00 output = $11.25
    expect(calculateUsageCostUsd(AI_MODELS.pro, usage)).toBeCloseTo(11.25);
    // Gemini 2.5 Flash: $0.30 input + $2.50 output = $2.80
    expect(calculateUsageCostUsd(AI_MODELS.flash, usage)).toBeCloseTo(2.8);
    // Gemini 2.5 Flash Lite: $0.10 input + $0.40 output = $0.50
    expect(calculateUsageCostUsd(AI_MODELS.flash_lite, usage)).toBeCloseTo(0.5);
  });

  it("throws for unknown model", () => {
    const usage: SanitizedUsage = {
      inputTokens: 1000,
      outputTokens: 1000,
      totalTokens: 2000,
    };

    expect(() => calculateUsageCostUsd("unknown-model", usage)).toThrow(
      'Unknown pricing for model "unknown-model"'
    );
  });
});

describe("sanitizeUsage", () => {
  it("uses provided input/output tokens", () => {
    const usage = sanitizeUsage({
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 0,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
    });

    expect(usage).toEqual({
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 300,
    });
  });

  it("splits total tokens when input/output missing", () => {
    // biome-ignore lint/suspicious/noExplicitAny: APIレスポンスのシミュレーションのため
    const usage = sanitizeUsage({ totalTokens: 5 } as any);

    expect(usage).toEqual({ inputTokens: 2, outputTokens: 3, totalTokens: 5 });
  });
});
