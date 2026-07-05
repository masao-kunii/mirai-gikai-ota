import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

/**
 * 議案チャット（最小 UI）。apps/api の POST /api/chat を叩く。
 *
 * - transport の body に billId / difficultyLevel を固定で載せる
 *   （api の chatBodySchema に合わせる）
 * - リクエストは vite proxy 経由で同一オリジン → 匿名クッキーが自動で一巡
 * - デザインは骨組み段階の最小限（後続フェーズで現行同等に整える）
 */
export function BillChat({
  billId,
  difficultyLevel = "normal",
}: {
  billId: string;
  difficultyLevel?: "normal" | "hard";
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { billId, difficultyLevel },
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <section className="chat">
      <h2>この議案について質問する</h2>
      <p className="bill-meta">
        AI が公開情報をもとに回答します。正確性を保証するものではありません。
      </p>

      <div className="chat-log">
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
            <span className="chat-role">
              {m.role === "user" ? "あなた" : "AI"}
            </span>
            <div className="chat-text">
              {m.parts.map((part, i) =>
                part.type === "text" ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: parts は順序固定で再並び替えされない
                  <span key={i}>{part.text}</span>
                ) : null
              )}
            </div>
          </div>
        ))}
        {status === "submitted" && (
          <div className="chat-msg chat-msg--assistant">
            <span className="chat-role">AI</span>
            <div className="chat-text">…</div>
          </div>
        )}
      </div>

      {error && (
        <p className="chat-error">
          エラーが発生しました。しばらく待ってから再度お試しください。
        </p>
      )}

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例: この議案の対象者は誰ですか？"
          disabled={isBusy}
          aria-label="質問を入力"
        />
        <button type="submit" disabled={isBusy || input.trim() === ""}>
          送信
        </button>
      </form>
    </section>
  );
}
