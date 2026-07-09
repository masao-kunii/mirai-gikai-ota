import { Share } from "lucide-react";
import { useState } from "react";

/**
 * 共有ボタン。Web Share API が使えれば OS の共有シート、無ければ URL を
 * クリップボードにコピーする。label / className で見た目を差し替え可能。
 */
export function ShareButton({
  title,
  label = "共有する",
  className,
}: {
  title: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // ユーザーがキャンセルした場合など。何もしない。
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可の場合は何もしない
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      className={
        className ??
        "inline-flex items-center gap-2 self-start rounded-full border border-mirai-text px-5 py-2 text-sm font-bold text-mirai-text transition-colors hover:bg-mirai-surface-grouped"
      }
    >
      <Share className="h-4 w-4" />
      {copied ? "コピーしました" : label}
    </button>
  );
}
