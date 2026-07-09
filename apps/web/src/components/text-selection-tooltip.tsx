import { MessageCircleQuestion } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { askAboutSelection } from "../lib/chat-bus";

/** 選択が短すぎるときはツールチップを出さない（誤クリック抑制） */
const MIN_SELECTION_LENGTH = 4;
const TOOLTIP_WIDTH = 104;
const TOOLTIP_MARGIN = 8;

type TooltipState = { text: string; top: number; left: number };

/** Range から <rt>（ルビ）を除いたテキストを取り出す。 */
function getTextWithoutRuby(range: Range): string {
  const div = document.createElement("div");
  div.appendChild(range.cloneContents());
  for (const rt of div.querySelectorAll("rt")) {
    rt.remove();
  }
  return div.textContent?.trim() ?? "";
}

/**
 * 議案本文の選択に反応して「AIに質問」ツールチップを表示する（現行 TextSelectionTooltip 相当）。
 * containerRef 内の選択のみ対象。押すと選択テキストを常設チャットへ注入する。
 */
export function TextSelectionTooltip({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setTooltip(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const container = containerRef.current;
      // 対象コンテナ外（チャットや別要素）の選択は無視する
      if (container && !container.contains(range.commonAncestorContainer)) {
        setTooltip(null);
        return;
      }
      const text = getTextWithoutRuby(range);
      if (text.length < MIN_SELECTION_LENGTH) {
        setTooltip(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const maxLeft = window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
      const left = Math.max(
        TOOLTIP_MARGIN,
        Math.min(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, maxLeft)
      );
      setTooltip({ text, top: rect.bottom + TOOLTIP_MARGIN, left });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef]);

  if (!tooltip) return null;

  return createPortal(
    <div
      className="fixed z-50"
      style={{ top: tooltip.top, left: tooltip.left }}
    >
      <button
        type="button"
        // mousedown で選択が消えないよう既定動作を止める
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          askAboutSelection(tooltip.text);
          window.getSelection()?.removeAllRanges();
          setTooltip(null);
        }}
        className="inline-flex h-10 items-center gap-1 rounded-md border border-mirai-border-light bg-card px-4 text-xs font-bold text-primary-accent shadow-lg transition-colors hover:bg-gray-50"
      >
        <MessageCircleQuestion className="h-3 w-3" />
        AIに質問
      </button>
    </div>,
    document.body
  );
}
