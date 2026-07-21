import { Flag, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const REASONS = [
  { value: "personal_info", label: "個人情報が含まれている" },
  { value: "inappropriate", label: "不適切・攻撃的な表現" },
  { value: "inaccurate", label: "事実と異なる" },
  { value: "spam", label: "スパム・無関係な内容" },
  { value: "other", label: "その他" },
] as const;

/**
 * 公開意見（集約の代表意見）に対する「報告する」入口。
 * 押すと理由選択のモーダルを開き、/api/interviews/report に匿名で送る。
 * 通報は公開されず、管理者が確認する。
 */
export function ReportOpinionButton({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-mirai-text-muted transition-colors hover:text-mirai-text-secondary"
      >
        <Flag className="h-3 w-3" />
        報告
      </button>
      {open && (
        <ReportModal reportId={reportId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ReportModal({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (!reason || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/interviews/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          reportId,
          reason,
          detail: detail.trim() || undefined,
        }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
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
        aria-label="意見を報告する"
        className="flex w-[400px] max-w-full flex-col gap-4 rounded-2xl bg-card p-6 shadow-xl"
      >
        {state === "done" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-bold text-mirai-text text-sm">
              報告を受け付けました
            </p>
            <p className="text-mirai-text-secondary text-xs leading-relaxed">
              内容を確認し、必要に応じて対応します。ご協力ありがとうございます。
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-1 rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground text-sm transition-colors hover:bg-primary-accent"
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="font-bold text-base text-mirai-text">
                この意見を報告する
              </h2>
              <p className="text-mirai-text-secondary text-xs leading-relaxed">
                気になる理由を選んでください。報告は匿名で、公開されません。
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                    reason === r.value
                      ? "border-primary bg-mirai-surface-grouped text-mirai-text"
                      : "border-mirai-border-muted text-mirai-text hover:bg-mirai-surface-grouped"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="補足があれば（任意・500文字まで）"
              className="resize-none rounded-xl border border-mirai-border-muted bg-card px-3 py-2 text-mirai-text text-sm outline-none focus:border-primary"
            />

            {state === "error" && (
              <p className="text-stance-against text-xs">
                送信に失敗しました。時間をおいて再度お試しください。
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-mirai-text-secondary text-xs transition-colors hover:text-mirai-text"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!reason || state === "sending"}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground text-sm transition-colors hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {state === "sending" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                報告する
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
