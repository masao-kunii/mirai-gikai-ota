import { useChat } from "@ai-sdk/react";
import { useMatch, useParams } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { subscribeSelection } from "../lib/chat-bus";
import { type DifficultyLevel, useDifficulty } from "../lib/difficulty";
import { Markdown } from "./markdown";

/**
 * サイト共通の AI チャット。ルートレイアウトに常設し、ページ遷移で
 * 再マウントされない（＝チャット領域が保持され、遷移がガチャつかない）。
 * 現在のルートに応じて文脈を切り替える:
 *   - トップ（/）      : billId なし = 大田区議会・議案全般
 *   - 議案詳細（/bills/$id）: billId あり = その議案について
 *   - 区政一覧（/kusei）: 区政テーマ全体について
 *   - 区政テーマ（/kusei/$theme）: そのテーマについて
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
const KUSEI_SUGGESTIONS = [
  "大田区はどんな分野に取り組んでいる？",
  "子育て支援にはどんな取り組みがある？",
  "区の計画はどこで見られる？",
];
const THEME_SUGGESTIONS = [
  "このテーマで区は何に取り組んでいる？",
  "私の暮らしにどう関係する？",
  "最近の取り組みを教えて",
];

/** チャットの文脈。ページごとに AI に渡す情報と表示を切り替える。 */
type ChatContext =
  | { kind: "home" }
  | { kind: "bill"; billId: string }
  | { kind: "kusei" }
  | { kind: "theme"; slug: string; name: string };

function contextKey(context: ChatContext): string {
  switch (context.kind) {
    case "bill":
      return `bill:${context.billId}`;
    case "theme":
      return `theme:${context.slug}`;
    default:
      return context.kind;
  }
}

export function SiteChat({ variant }: { variant: "sidebar" | "floating" }) {
  // strict:false で現在ルートの params を緩く取得（/bills/$id のとき id が入る）
  const params = useParams({ strict: false }) as { id?: string };
  // 区政テーマは、ページが読み込んだテーマ名を見出しに使う
  const themeMatch = useMatch({ from: "/kusei/$theme", shouldThrow: false });
  const kuseiIndex = useMatch({ from: "/kusei/", shouldThrow: false });
  const { level } = useDifficulty();

  const context: ChatContext = themeMatch?.loaderData
    ? {
        kind: "theme",
        slug: themeMatch.loaderData.slug,
        name: themeMatch.loaderData.theme.name,
      }
    : kuseiIndex
      ? { kind: "kusei" }
      : params.id
        ? { kind: "bill", billId: params.id }
        : { kind: "home" };

  // 文脈（トップ / 議案 / 区政 / テーマ）や難易度が変わったら会話をリセットする
  return (
    <ChatPane
      key={`${contextKey(context)}:${level}`}
      context={context}
      difficultyLevel={level}
      variant={variant}
    />
  );
}

/** 文脈ごとの見出し・質問候補・API に送る値。 */
function chatSettings(context: ChatContext): {
  heading: string;
  suggestions: string[];
  body: Record<string, string>;
} {
  switch (context.kind) {
    case "bill":
      return {
        heading: "この議案について、AIに質問してください。",
        suggestions: BILL_SUGGESTIONS,
        body: { billId: context.billId },
      };
    case "kusei":
      return {
        heading: "大田区の区政について、気になることをAIに質問してください。",
        suggestions: KUSEI_SUGGESTIONS,
        body: { scope: "kusei" },
      };
    case "theme":
      return {
        heading: `「${context.name}」について、気になることをAIに質問してください。`,
        suggestions: THEME_SUGGESTIONS,
        body: { themeSlug: context.slug },
      };
    case "home":
      return {
        heading:
          "大田区議会や議案について、気になることをAIに質問してください。",
        suggestions: HOME_SUGGESTIONS,
        body: {},
      };
  }
}

function ChatPane({
  context,
  difficultyLevel,
  variant,
}: {
  context: ChatContext;
  difficultyLevel: DifficultyLevel;
  variant: "sidebar" | "floating";
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { heading, suggestions, body } = chatSettings(context);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { ...body, difficultyLevel },
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

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

  // 議案本文の選択 →「AIに質問」から質問を注入する（現行 openWithText 相当）。
  // sidebar/floating の両方が常設マウントされるため、表示中の一方だけが反応して
  // 二重送信を避ける（lg 以上=sidebar、未満=floating）。
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    return subscribeSelection((text) => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      // 表示中の一方だけ反応させる（sidebar=lg以上 / floating=lg未満）
      if (variant === "sidebar" ? !isDesktop : isDesktop) return;
      if (variant === "floating") setOpen(true);
      sendRef.current(`「${text}」について教えてください。`);
    });
  }, [variant]);

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
