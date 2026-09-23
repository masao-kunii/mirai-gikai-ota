import { describe, expect, it } from "vitest";
import {
  buildSubjectInterviewSystemPrompt,
  buildSubjectSummarySystemPrompt,
} from "./subject-prompts";

const subject = {
  kind: "theme" as const,
  name: "地域・コミュニティ",
  summary: "地域活動、多文化共生、区政運営・情報公開",
};

describe("buildSubjectInterviewSystemPrompt", () => {
  it("対象の名称と概要を含む", () => {
    const prompt = buildSubjectInterviewSystemPrompt({ subject });
    expect(prompt).toContain("地域・コミュニティ");
    expect(prompt).toContain("地域活動、多文化共生");
  });

  it("切り口を渡すと、その話題から始めるよう指示する", () => {
    const prompt = buildSubjectInterviewSystemPrompt({
      subject,
      topic: "多文化共生（国際都市おおた）",
    });
    expect(prompt).toContain("## 今回の切り口");
    expect(prompt).toContain("多文化共生（国際都市おおた）");
  });

  it("切り口が無い・空文字なら、その指示を入れない", () => {
    expect(buildSubjectInterviewSystemPrompt({ subject })).not.toContain(
      "## 今回の切り口"
    );
    expect(
      buildSubjectInterviewSystemPrompt({ subject, topic: "  " })
    ).not.toContain("## 今回の切り口");
  });

  it("立場が申告済みなら立場を尋ねないよう指示する", () => {
    const prompt = buildSubjectInterviewSystemPrompt({
      subject,
      respondentRole: "子育て中の保護者",
    });
    expect(prompt).toContain("子育て中の保護者");
    expect(prompt).toContain("立場や属性を尋ねる質問はしないでください");
  });
});

describe("buildSubjectSummarySystemPrompt", () => {
  const messages = [
    { role: "assistant", content: "どんなことを感じていますか？" },
    { role: "user", content: "日本語教室の案内が見つけにくいです。", id: "m1" },
  ];

  it("会話ログと、回答の msg_id を含む", () => {
    const prompt = buildSubjectSummarySystemPrompt({ subject, messages });
    expect(prompt).toContain("日本語教室の案内が見つけにくいです。");
    expect(prompt).toContain("msg_id:m1");
  });

  it("切り口を渡すと要約側にも伝える", () => {
    const prompt = buildSubjectSummarySystemPrompt({
      subject,
      messages,
      topic: "多文化共生（国際都市おおた）",
    });
    expect(prompt).toContain("## 今回の切り口");
  });
});
