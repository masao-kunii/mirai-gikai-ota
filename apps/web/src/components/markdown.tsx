import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown を描画する（AI 応答・議案本文で共用）。
 * react-markdown は SSR でも安全に HTML へ変換する。見た目は Tailwind Typography
 * の prose で整える。GFM（表・打ち消し線・自動リンク等）に対応。
 */
export function Markdown({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={`prose prose-sm max-w-none text-mirai-text prose-headings:text-mirai-text prose-strong:text-mirai-text prose-a:text-primary [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
