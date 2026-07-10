import { Share } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  shareNative,
  shareOnFacebook,
  shareOnLine,
  shareOnThreads,
  shareOnTwitter,
} from "../lib/share";

/**
 * 共有ボタン。押すと SNS シェアのモーダル（現行 web と同じ X / Facebook ＋
 * モバイルで LINE / Threads / OS 共有）を開く。label / className で見た目を差し替え可能。
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-2 self-start rounded-full border border-mirai-text px-5 py-2 text-sm font-bold text-mirai-text transition-colors hover:bg-mirai-surface-grouped"
        }
      >
        <Share className="h-4 w-4" />
        {label}
      </button>
      {open && <ShareModal title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

/** SNS シェアのアイコン。モバイル限定のものは onlyMobile=true。 */
type ShareTarget = {
  name: string;
  icon: string;
  onClick: (message: string, url: string) => void;
  onlyMobile?: boolean;
};

const SHARE_TARGETS: ShareTarget[] = [
  {
    name: "X (Twitter)",
    icon: "/icons/sns/icon_x.png",
    onClick: (m, u) => shareOnTwitter(m, u),
  },
  {
    name: "Facebook",
    icon: "/icons/sns/icon_facebook.png",
    onClick: (_m, u) => shareOnFacebook(u),
  },
  {
    name: "LINE",
    icon: "/icons/sns/icon_line.png",
    onClick: (m, u) => shareOnLine(m, u),
    onlyMobile: true,
  },
  {
    name: "Threads",
    icon: "/icons/sns/icon_threads.png",
    onClick: (m, u) => shareOnThreads(m, u),
    onlyMobile: true,
  },
  {
    name: "共有",
    icon: "/icons/share-general.png",
    onClick: (m, u) => {
      void shareNative(m, u);
    },
    onlyMobile: true,
  },
];

function ShareModal({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
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
        // 背景そのものをクリックしたときだけ閉じる（中身のクリックは無視）
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="記事を共有する"
        className="flex w-[370px] max-w-full flex-col items-center gap-8 rounded-2xl bg-card p-7 shadow-xl"
      >
        <h2 className="w-full text-center font-bold text-mirai-text text-xl">
          記事を共有する
        </h2>
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-center font-bold text-base text-mirai-text">
            シェアして区議会の議論をオープンに
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {SHARE_TARGETS.map((target) => (
              <button
                key={target.name}
                type="button"
                onClick={() => target.onClick(title, window.location.href)}
                aria-label={`${target.name}で共有`}
                className={`flex h-12 w-12 items-center justify-center ${
                  target.onlyMobile ? "lg:hidden" : ""
                }`}
              >
                <img
                  src={target.icon}
                  alt={target.name}
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-[287px] max-w-full rounded-full border border-mirai-text bg-mirai-gradient px-6 py-3 font-bold text-base text-mirai-text"
        >
          このまま閉じる
        </button>
      </div>
    </div>,
    document.body
  );
}
