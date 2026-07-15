import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * テーマ／取り組みに対する「意見する」入口（プロトタイプ）。
 *
 * 押すと、先に「匿名で公開される」ことへの同意を取ってからインタビューに入る、
 * という想定フローのモーダルを開く。インタビュー本体はまだ未実装のため、
 * 同意後は「準備中」を表示するモックにとどめている。
 *
 * subject には意見してほしい対象（テーマ名や取り組み名）を渡す。
 */
export function OpinionEntryButton({
  subject,
  label = "意見する",
  variant = "outline",
}: {
  subject: string;
  label?: string;
  variant?: "outline" | "solid";
}) {
  const [open, setOpen] = useState(false);

  const className =
    variant === "solid"
      ? "inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-accent"
      : "inline-flex items-center gap-1.5 self-start rounded-full border border-primary px-3.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-mirai-surface-grouped";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <MessageCircle
          className={variant === "solid" ? "h-4 w-4" : "h-3.5 w-3.5"}
        />
        {label}
      </button>
      {open && (
        <OpinionModal subject={subject} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function OpinionModal({
  subject,
  onClose,
}: {
  subject: string;
  onClose: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [started, setStarted] = useState(false);

  // Escape で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: 背景クリックで閉じる。キーボードは Escape（上の useEffect）で対応。
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
        className="flex w-[420px] max-w-full flex-col gap-5 rounded-2xl bg-card p-6 shadow-xl"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-mirai-text-muted">
            意見を聞かせてください
          </span>
          <h2 className="font-bold text-lg text-mirai-text">「{subject}」</h2>
        </div>

        {started ? (
          <div className="flex flex-col gap-2 rounded-xl border border-mirai-border-light bg-mirai-surface-grouped p-5 text-center">
            <p className="font-bold text-sm text-mirai-text">
              準備中：インタビュー機能は近日公開予定です
            </p>
            <p className="text-xs leading-relaxed text-mirai-text-secondary">
              ここから、AI が対話形式であなたのお話をうかがう予定です。
              集まった声は要約して、このテーマのページに匿名で掲載します。
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-mirai-text-secondary">
              このことについて、あなたの考え・困っていること・期待することを
              お聞かせください。AI が対話形式でお話をうかがいます。
            </p>

            {/* 先に「匿名で公開される」ことの同意を取る */}
            <div className="flex flex-col gap-2 rounded-xl border border-mirai-border-muted bg-mirai-surface-grouped p-4">
              <span className="font-bold text-xs text-mirai-text">
                公開について（先にご確認ください）
              </span>
              <p className="text-xs leading-relaxed text-mirai-text-secondary">
                いただいたご意見は、AI が要約したうえで
                <strong className="text-mirai-text">匿名で</strong>
                このサイトに掲載されることがあります（お話の内容が匿名で
                そのまま掲載される場合もあります）。氏名・住所・勤務先など、
                個人が特定できる情報は入力しないでください。
              </p>
              <label className="flex items-start gap-2 pt-1 text-xs text-mirai-text">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  上記に同意します（匿名で公開されることを理解しました）
                </span>
              </label>
            </div>

            <button
              type="button"
              disabled={!agreed}
              onClick={() => setStarted(true)}
              className="rounded-full bg-primary px-6 py-3 font-bold text-sm text-primary-foreground transition-colors hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              同意してインタビューを始める
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-mirai-text-secondary transition-colors hover:text-mirai-text"
        >
          閉じる
        </button>
      </div>
    </div>,
    document.body
  );
}
