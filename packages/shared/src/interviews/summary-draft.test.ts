import { describe, expect, it } from "vitest";
import { isSummaryDraftMessage } from "./summary-draft";

describe("isSummaryDraftMessage", () => {
  it("report を含む要約の応答は true", () => {
    const content = JSON.stringify({
      text: "レポート案を作成しました。",
      report: { summary: "情報が見つけにくい", stance: "neutral" },
      next_stage: "summary_complete",
    });
    expect(isSummaryDraftMessage(content)).toBe(true);
  });

  it("通常の質問は false", () => {
    const content = JSON.stringify({
      text: "普段どんなことを感じていますか？",
      quick_replies: ["保育園"],
      next_stage: "chat",
    });
    expect(isSummaryDraftMessage(content)).toBe(false);
  });

  it("report が null やオブジェクト以外なら false", () => {
    expect(isSummaryDraftMessage('{"text":"x","report":null}')).toBe(false);
    expect(isSummaryDraftMessage('{"text":"x","report":"まだ"}')).toBe(false);
  });

  it("JSON でない文字列（住民の回答など）は false", () => {
    expect(isSummaryDraftMessage("学童に入れませんでした。")).toBe(false);
  });
});
