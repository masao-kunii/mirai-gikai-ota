import { Trash2 } from "lucide-react";
import { useState } from "react";
import { iconButtonClass } from "../lib/ui";

/**
 * 行内の削除確認。ブラウザ標準ダイアログを使わず、その場で確認 UI を展開する
 * （誤操作防止＋自動テストがダイアログでブロックされないため）。
 * 確認状態は自身で持ち、確定時に onConfirm を呼ぶ。
 */
export function InlineDeleteConfirm({
  onConfirm,
  pending,
  error,
  confirmLabel = "削除しますか？",
}: {
  onConfirm: () => void;
  pending: boolean;
  error?: string | null;
  confirmLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`${iconButtonClass} hover:text-red-600`}
        aria-label="削除"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-slate-500 text-xs">
          {confirmLabel}
        </span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded bg-red-600 px-2 py-1 font-medium text-white text-xs hover:bg-red-500 disabled:opacity-50"
        >
          削除
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded border border-slate-300 px-2 py-1 text-slate-600 text-xs hover:bg-slate-100"
        >
          やめる
        </button>
      </div>
      {error ? <p className="text-red-600 text-xs">{error}</p> : null}
    </div>
  );
}
