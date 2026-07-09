import { Info } from "lucide-react";

/** レビュー未完了時に記事上部に表示するバナー（現行 web と同文言） */
export function ReviewInProgressBanner() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-mirai-surface-grouped px-4 py-2">
      <Info className="size-5 shrink-0 text-mirai-text" />
      <p className="font-medium text-[13px] text-mirai-text leading-relaxed">
        この記事は現在、複数有識者によるレビュー中です。今後内容が変更されることがあります。
      </p>
    </div>
  );
}

/**
 * レビュー完了時にタイトル/カード横に表示するチェックマーク。
 * lucide に該当の塗り円チェックが無いため、現行 web と同じ図形を SVG で描く。
 */
export function ReviewCompleteBadge({ size = 20 }: { size?: number }) {
  return (
    <span
      className="relative top-[1px] ml-0.5 inline-flex items-center"
      title="この記事は複数有識者によるレビューが完了しています"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        role="img"
        aria-label="レビュー完了"
        style={{ width: size, height: size }}
      >
        <circle cx="8" cy="8" r="8" className="fill-primary" />
        <path
          d="M5 8L7 10L11 6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
