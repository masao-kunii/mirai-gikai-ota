import { describe, expect, it } from "vitest";
import { getMessageDisplayText } from "./message-display-text";

describe("getMessageDisplayText", () => {
  it("JSON の text を取り出す", () => {
    const content = JSON.stringify({
      text: "普段どんなことを感じていますか？",
      quick_replies: ["保育園", "学童"],
    });
    expect(getMessageDisplayText(content)).toBe(
      "普段どんなことを感じていますか？"
    );
  });

  it("JSON でない文字列はそのまま返す", () => {
    expect(getMessageDisplayText("学童に入れませんでした。")).toBe(
      "学童に入れませんでした。"
    );
  });

  it("text が無い、または文字列でない JSON は元の文字列を返す", () => {
    expect(getMessageDisplayText('{"quick_replies":[]}')).toBe(
      '{"quick_replies":[]}'
    );
    expect(getMessageDisplayText('{"text":1}')).toBe('{"text":1}');
  });

  it("JSON として有効でもオブジェクトでなければ元の文字列を返す", () => {
    expect(getMessageDisplayText("123")).toBe("123");
    expect(getMessageDisplayText("null")).toBe("null");
    expect(getMessageDisplayText('"引用符つき"')).toBe('"引用符つき"');
  });
});
