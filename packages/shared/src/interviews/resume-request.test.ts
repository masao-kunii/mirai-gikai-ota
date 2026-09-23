import { describe, expect, it } from "vitest";
import { isInterviewResumeRequest } from "./resume-request";

describe("isInterviewResumeRequest", () => {
  it("回答が無く AI の質問で終わっていれば再開", () => {
    expect(
      isInterviewResumeRequest({
        stage: "chat",
        hasAnswer: false,
        lastMessageRole: "assistant",
      })
    ).toBe(true);
  });

  it("新しい回答があれば再開ではない（通常の対話）", () => {
    expect(
      isInterviewResumeRequest({
        stage: "chat",
        hasAnswer: true,
        lastMessageRole: "assistant",
      })
    ).toBe(false);
  });

  it("会話がまだ無ければ再開ではない（最初の質問を生成する）", () => {
    expect(
      isInterviewResumeRequest({
        stage: "chat",
        hasAnswer: false,
        lastMessageRole: undefined,
      })
    ).toBe(false);
  });

  it("最後が回答者の発言なら再開ではない", () => {
    expect(
      isInterviewResumeRequest({
        stage: "chat",
        hasAnswer: false,
        lastMessageRole: "user",
      })
    ).toBe(false);
  });

  it("まとめの生成は対象外", () => {
    expect(
      isInterviewResumeRequest({
        stage: "summary",
        hasAnswer: false,
        lastMessageRole: "assistant",
      })
    ).toBe(false);
  });
});
