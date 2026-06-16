import { describe, expect, it } from "vitest";
import {
  CHAT_MODEL_GROUPS,
  CHAT_MODEL_OPTIONS,
  isValidChatModel,
} from "./chat-model-options";

describe("CHAT_MODEL_OPTIONS", () => {
  it("全てのオプションが gemini- プレフィックスを持つ", () => {
    for (const option of CHAT_MODEL_OPTIONS) {
      expect(option.value).toMatch(/^gemini-/);
    }
  });

  it("全てのオプションがラベルを持つ", () => {
    for (const option of CHAT_MODEL_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("重複するvalueがない", () => {
    const values = CHAT_MODEL_OPTIONS.map((opt) => opt.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("CHAT_MODEL_GROUPS", () => {
  it("Vertex AI プロバイダーグループが存在する", () => {
    expect(CHAT_MODEL_GROUPS).toHaveLength(1);
    expect(CHAT_MODEL_GROUPS[0]?.provider).toBe("Google Vertex AI");
  });

  it("全グループのモデル数がフラット一覧と一致する", () => {
    const groupTotal = CHAT_MODEL_GROUPS.reduce(
      (sum, g) => sum + g.options.length,
      0
    );
    expect(groupTotal).toBe(CHAT_MODEL_OPTIONS.length);
  });

  it("全モデルに推定コストが設定されている", () => {
    for (const group of CHAT_MODEL_GROUPS) {
      for (const option of group.options) {
        expect(option.estimatedCost).not.toBeNull();
        expect(option.estimatedCost).toMatch(/^~\d+円$/);
      }
    }
  });
});

describe("isValidChatModel", () => {
  it("有効なモデルIDに対してtrueを返す", () => {
    expect(isValidChatModel("gemini-2.5-flash")).toBe(true);
    expect(isValidChatModel("gemini-2.5-flash-lite")).toBe(true);
    expect(isValidChatModel("gemini-2.5-pro")).toBe(true);
  });

  it("無効なモデルIDに対してfalseを返す", () => {
    expect(isValidChatModel("invalid-model")).toBe(false);
    expect(isValidChatModel("openai/gpt-4o")).toBe(false);
    expect(isValidChatModel("")).toBe(false);
  });
});
