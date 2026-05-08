import { describe, expect, it } from "vitest";
import {
  estimateInterviewCostUsd,
  formatEstimatedCost,
} from "./estimate-interview-cost";

describe("estimateInterviewCostUsd", () => {
  it("Gemini 2.5 Flash Liteの推定コストを正しく算出する", () => {
    // input: 0.1 * 85000 / 1M = 0.0085
    // output: 0.4 * 3000 / 1M = 0.0012
    // total: 0.0097
    const cost = estimateInterviewCostUsd("gemini-2.5-flash-lite");
    expect(cost).toBeCloseTo(0.0097, 4);
  });

  it("Gemini 2.5 Proの推定コストを正しく算出する", () => {
    // input: 1.25 * 85000 / 1M = 0.10625
    // output: 10 * 3000 / 1M = 0.03
    // total: 0.13625
    const cost = estimateInterviewCostUsd("gemini-2.5-pro");
    expect(cost).toBeCloseTo(0.13625, 4);
  });

  it("Gemini 2.5 Flashの推定コストを正しく算出する", () => {
    // input: 0.3 * 85000 / 1M = 0.0255
    // output: 2.5 * 3000 / 1M = 0.0075
    // total: 0.033
    const cost = estimateInterviewCostUsd("gemini-2.5-flash");
    expect(cost).toBeCloseTo(0.033, 4);
  });

  it("不明なモデルに対してnullを返す", () => {
    expect(estimateInterviewCostUsd("unknown-model")).toBeNull();
  });
});

describe("formatEstimatedCost", () => {
  it("1円未満のコストを~1円と表示する", () => {
    // $0.005 * 150 = 0.75円 → ~1円
    expect(formatEstimatedCost(0.005)).toBe("~1円");
  });

  it("コストを四捨五入して円表示する", () => {
    // $0.01455 * 150 = 2.18円 → ~2円
    expect(formatEstimatedCost(0.01455)).toBe("~2円");
    // $0.225 * 150 = 33.75円 → ~34円
    expect(formatEstimatedCost(0.225)).toBe("~34円");
    // $0.5 * 150 = 75円 → ~75円
    expect(formatEstimatedCost(0.5)).toBe("~75円");
  });
});
