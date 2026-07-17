import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type InterviewReportView,
  type InterviewTargetInput,
  interviewChatResponseSchema,
  interviewTargetBody,
} from "../lib/interview-schema";

type Phase = "consent" | "chat" | "review" | "done";
type Turn = { role: "assistant" | "user"; text: string };

/**
 * テーマ／取り組みへの匿名 AI インタビュー（同意→対話→要約確認→送信）。
 *
 * 事前同意で「匿名公開」を先に取り、対話は /api/interviews/messages を
 * useObject（部分JSONストリーム）で消費する。要約フェーズでレポート案を
 * 提示し、本人が「送信」したら /api/interviews/complete でモデレーション＋
 * 自動公開判定まで確定する。
 */
export function InterviewDialog({
  subject,
  target,
  onClose,
}: {
  subject: string;
  target: InterviewTargetInput;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("consent");
  const [agreed, setAgreed] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [report, setReport] = useState<InterviewReportView | null>(null);
  const [published, setPublished] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  // onFinish から常に最新の submit を呼べるよう ref に保持する。
  const submitRef = useRef<(body: unknown) => void>(() => {});

  const { submit, object, isLoading, error } = useObject({
    api: "/api/interviews/messages",
    schema: interviewChatResponseSchema,
    onFinish: ({ object: finished }) => {
      if (!finished) return;
      const text = finished.text ?? "";
      setTurns((prev) => [...prev, { role: "assistant", text }]);

      if (finished.report) {
        // 要約フェーズのレスポンス → レビューへ
        setReport(finished.report);
        setPhase("review");
      } else if (finished.next_stage === "summary") {
        // chat 側が「まとめる」と判断 → 自動で要約を生成
        setTimeout(() => {
          submitRef.current({
            ...interviewTargetBody(target),
            stage: "summary",
          });
        }, 0);
      }
    },
  });
  submitRef.current = submit as (body: unknown) => void;

  // Escape で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 会話・ストリームの更新で末尾へスクロール
  // biome-ignore lint/correctness/useExhaustiveDependencies: ストリーム進行で追従したい
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, object?.text, phase, isLoading]);

  const start = () => {
    setPhase("chat");
    submit({ ...interviewTargetBody(target), stage: "chat" });
  };

  const sendAnswer = () => {
    const msg = input.trim();
    if (!msg || isLoading) return;
    setTurns((prev) => [...prev, { role: "user", text: msg }]);
    setInput("");
    submit({ ...interviewTargetBody(target), message: msg, stage: "chat" });
  };

  const requestSummary = () => {
    if (isLoading) return;
    submit({ ...interviewTargetBody(target), stage: "summary" });
  };

  const continueChat = () => {
    setReport(null);
    setPhase("chat");
  };

  const complete = async () => {
    setCompleting(true);
    setCompleteError(null);
    try {
      const res = await fetch("/api/interviews/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(interviewTargetBody(target)),
      });
      if (!res.ok) {
        setCompleteError(
          "送信に失敗しました。時間をおいて再度お試しください。"
        );
        return;
      }
      const data = (await res.json()) as { ok?: boolean; published?: boolean };
      setPublished(Boolean(data.published));
      setPhase("done");
    } catch {
      setCompleteError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setCompleting(false);
    }
  };

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: 背景クリックで閉じる。キーボードは Escape で対応。
    // biome-ignore lint/a11y/noStaticElementInteractions: モーダルの背景オーバーレイ
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${subject}について意見する`}
        className="flex max-h-[85vh] w-[440px] max-w-full flex-col overflow-hidden rounded-2xl bg-card shadow-xl"
      >
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-3 border-mirai-border-light border-b px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-mirai-text-muted">
              意見を聞かせてください
            </span>
            <h2 className="font-bold text-base text-mirai-text leading-snug">
              「{subject}」
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-xs text-mirai-text-secondary transition-colors hover:text-mirai-text"
          >
            閉じる
          </button>
        </div>

        {phase === "consent" ? (
          <ConsentBody agreed={agreed} setAgreed={setAgreed} onStart={start} />
        ) : phase === "done" ? (
          <DoneBody published={published} onClose={onClose} />
        ) : (
          <>
            {/* 会話ログ */}
            <div
              ref={scrollRef}
              className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
            >
              {turns.map((t, i) => (
                <ChatBubble
                  key={`${t.role}-${i}`}
                  speaker={t.role}
                  text={t.text}
                />
              ))}
              {isLoading && (
                <ChatBubble
                  speaker="assistant"
                  text={object?.text ?? ""}
                  pending
                />
              )}
              {error && (
                <p className="rounded-lg bg-stance-against-bg px-3 py-2 text-stance-against text-xs">
                  通信でエラーが発生しました。入力し直すか、時間をおいてお試しください。
                </p>
              )}

              {phase === "review" && report && <ReportCard report={report} />}
            </div>

            {/* フッター（入力 or レビュー操作） */}
            {phase === "review" ? (
              <div className="flex flex-col gap-3 border-mirai-border-light border-t px-5 py-4">
                <p className="text-xs leading-relaxed text-mirai-text-secondary">
                  この内容で送信すると、匿名で集計・掲載の対象になります。
                  修正したい点があれば「続けて話す」で追記できます。
                </p>
                {completeError && (
                  <p className="text-stance-against text-xs">{completeError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={continueChat}
                    disabled={completing}
                    className="rounded-full border border-mirai-border-muted px-4 py-2 text-xs font-bold text-mirai-text transition-colors hover:bg-mirai-surface-grouped disabled:opacity-40"
                  >
                    続けて話す
                  </button>
                  <button
                    type="button"
                    onClick={complete}
                    disabled={completing}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 font-bold text-primary-foreground text-sm transition-colors hover:bg-primary-accent disabled:opacity-50"
                  >
                    {completing && <Loader2 className="h-4 w-4 animate-spin" />}
                    この内容で送信する
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 border-mirai-border-light border-t px-5 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        sendAnswer();
                      }
                    }}
                    rows={2}
                    disabled={isLoading}
                    placeholder="お考えや困っていることを書いてください（氏名・住所などは入力しないでください）"
                    className="min-h-[3rem] flex-1 resize-none rounded-xl border border-mirai-border-muted bg-card px-3 py-2 text-sm text-mirai-text outline-none focus:border-primary disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={sendAnswer}
                    disabled={isLoading || !input.trim()}
                    aria-label="送信"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-accent disabled:opacity-40"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={requestSummary}
                  disabled={isLoading || turns.length === 0}
                  className="self-start text-xs text-primary transition-colors hover:text-primary-accent disabled:opacity-40"
                >
                  話を終えてまとめる →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function ConsentBody({
  agreed,
  setAgreed,
  onStart,
}: {
  agreed: boolean;
  setAgreed: (v: boolean) => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <p className="text-sm leading-relaxed text-mirai-text-secondary">
        このことについて、あなたの考え・困っていること・期待することを
        お聞かせください。AI が対話形式でお話をうかがいます。
      </p>
      <div className="flex flex-col gap-2 rounded-xl border border-mirai-border-muted bg-mirai-surface-grouped p-4">
        <span className="font-bold text-mirai-text text-xs">
          公開について（先にご確認ください）
        </span>
        <p className="text-mirai-text-secondary text-xs leading-relaxed">
          いただいたご意見は、AI が要約したうえで
          <strong className="text-mirai-text">匿名で</strong>
          このサイトに掲載されることがあります（お話の内容が匿名でそのまま
          掲載される場合もあります）。氏名・住所・勤務先など、個人が特定
          できる情報は入力しないでください。
        </p>
        <label className="flex items-start gap-2 pt-1 text-mirai-text text-xs">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span>上記に同意します（匿名で公開されることを理解しました）</span>
        </label>
      </div>
      <button
        type="button"
        disabled={!agreed}
        onClick={onStart}
        className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground text-sm transition-colors hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        同意してインタビューを始める
      </button>
    </div>
  );
}

function DoneBody({
  published,
  onClose,
}: {
  published: boolean | null;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mirai-surface-grouped text-2xl">
        🙏
      </div>
      <p className="font-bold text-mirai-text">
        お話しいただきありがとうございました
      </p>
      <p className="max-w-[22rem] text-mirai-text-secondary text-sm leading-relaxed">
        {published
          ? "いただいた声は匿名で集計・掲載されます。このテーマのページに反映されます。"
          : "いただいた声は匿名で受け付けました。内容を確認のうえ、掲載を検討します。"}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground text-sm transition-colors hover:bg-primary-accent"
      >
        閉じる
      </button>
    </div>
  );
}

function ChatBubble({
  speaker,
  text,
  pending,
}: {
  speaker: "assistant" | "user";
  text: string;
  pending?: boolean;
}) {
  const isUser = speaker === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-mirai-surface-grouped text-mirai-text"
        }`}
      >
        {text || (pending ? "…" : "")}
        {pending && text && (
          <Loader2 className="ml-1 inline h-3 w-3 animate-spin align-[-1px]" />
        )}
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: InterviewReportView }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-card p-4">
      <span className="font-bold text-mirai-text-muted text-xs">
        あなたの声（要約案）
      </span>
      {report.role_title && (
        <span className="text-mirai-text-muted text-xs">
          {report.role_title}
        </span>
      )}
      {report.summary && (
        <p className="text-mirai-text text-sm leading-relaxed">
          {report.summary}
        </p>
      )}
      {report.opinions && report.opinions.length > 0 && (
        <ul className="flex flex-col gap-1.5 pt-1">
          {report.opinions.map((o) => (
            <li key={o.title} className="flex flex-col gap-0.5">
              <span className="font-bold text-mirai-text text-xs">
                {o.title}
              </span>
              <span className="text-mirai-text-secondary text-xs leading-relaxed">
                {o.content}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
