/**
 * インタビューの続きを求めるリクエストが「再開」かどうかを判定する。
 *
 * 再開＝ダイアログを開き直しただけで、新しい回答が無く、会話が AI の質問で
 * 終わっている状態。この状態でモデルを呼ぶと、Gemini 3 系は
 * 「Requests ending with a model turn are not supported」で拒否する。
 * 呼ばずに直前の質問をそのまま返せば、会話を続きから再開できる。
 *
 * まとめ（summary）は会話を system プロンプトに埋め込み、指示をユーザー側の
 * 発話として渡すため、この判定の対象外。
 */
export function isInterviewResumeRequest(input: {
  stage: "chat" | "summary";
  hasAnswer: boolean;
  lastMessageRole: "user" | "assistant" | undefined;
}): boolean {
  return (
    input.stage === "chat" &&
    !input.hasAnswer &&
    input.lastMessageRole === "assistant"
  );
}
