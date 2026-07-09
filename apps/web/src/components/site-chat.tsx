import { useChat } from "@ai-sdk/react";
import { useParams } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import { Send, X } from "lucide-react";
import { useState } from "react";
import { Markdown } from "./markdown";

/**
 * サイト共通の AI チャット。ルートレイアウトに常設し、ページ遷移で
 * 再マウントされない（＝チャット領域が保持され、遷移がガチャつかない）。
 * 現在のルートに応じて文脈を切り替える:
 *   - トップ（/）      : billId なし = 大田区議会・議案全般
 *   - 議案詳細（/bills/$id）: billId あり = その議案について
 *
 * - variant="sidebar":  デスクトップ右カラムに常時オープン（カード・枠線なし）
 * - variant="floating": モバイルで右下フローティング → ボトムシート
 */
const HOME_SUGGESTIONS = [
  "みらい議会＠大田区って何？",
  "区議会って何をするところ？",
  "注目の議案について教えて",
];
const BILL_SUGGESTIONS = [
  "この議案のポイントは？",
  "この議案は私にどんな影響がある？",
];

export function SiteChat({ variant }: { variant: "sidebar" | "floating" }) {
  // strict:false で現在ルートの params を緩く取得（/bills/$id のとき id が入る）
  const params = useParams({ strict: false }) as { id?: string };
  const billId = params.id;
  // 文脈（トップ / 議案 / 別議案）が変わったら会話をリセットする
  return <ChatPane key={billId ?? "home"} billId={billId} variant={variant} />;
}

function ChatPane({
  billId,
  variant,
}: {
  billId?: string;
  variant: "sidebar" | "floating";
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: billId
        ? { billId, difficultyLevel: "normal" }
        : { difficultyLevel: "normal" },
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";
  const heading = billId
    ? "この議案について、AIに質問してください。"
    : "大田区議会や議案について、気になることをAIに質問してください。";
  const suggestions = billId ? BILL_SUGGESTIONS : HOME_SUGGESTIONS;

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const panelBody = (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2 pt-5">
        <p className="text-sm font-bold leading-loose text-mirai-text">
          {heading}
        </p>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-3">
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                disabled={isBusy}
                onClick={() => send(question)}
                className="rounded-full border border-primary px-3 py-1 text-xs leading-7 text-primary-accent transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          return (
            <div
              key={m.id}
              className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
            >
              <span className="text-[11px] text-mirai-text-muted">
                {isUser ? "あなた" : "AI"}
              </span>
              <div
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  isUser
                    ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                    : "border border-mirai-border-light bg-mirai-surface-grouped text-mirai-text"
                }`}
              >
                {isUser ? text : <Markdown>{text}</Markdown>}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <span className="text-sm text-mirai-text-muted">考え中...</span>
        )}
        {error && (
          <p className="text-sm text-stance-against">
            エラーが発生しました。しばらく待ってから再度お試しください。
          </p>
        )}
      </div>

      <div className="px-6 pb-4 pt-2">
        <form
          onSubmit={onSubmit}
          className="border-mirai-gradient flex items-center gap-2 rounded-full py-1.5 pl-5 pr-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="わからないことをAIに質問する"
            disabled={isBusy}
            aria-label="質問を入力"
            className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-mirai-text placeholder:text-mirai-text-placeholder focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={!input || isBusy}
            aria-label="送信"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-mirai-progress-fill text-mirai-text-secondary transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );

  // デスクトップ: 右カラムに常設（カード=影・角丸・背景あり／境界線なし）
  if (variant === "sidebar") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-lg">
        {panelBody}
      </div>
    );
  }

  // モバイル: 右下フローティング → ボトムシート（lg 以上では非表示）
  return (
    <div className="lg:hidden">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary-accent"
        >
          💬 AIに質問
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/40"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-2xl bg-card shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="m-2 self-end rounded-full p-2 text-mirai-text-muted transition-colors hover:bg-mirai-surface-grouped"
            >
              <X className="h-5 w-5" />
            </button>
            {panelBody}
          </div>
        </>
      )}
    </div>
  );
}
