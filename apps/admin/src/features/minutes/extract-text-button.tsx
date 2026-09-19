import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { iconButtonClass } from "../../lib/ui";
import { useExtractMinuteText } from "./minutes-queries";

/**
 * 1件分の「PDF から本文を抽出」。本文が既にあるときは上書きになるので、
 * その場で確認してから実行する。
 */
export function ExtractTextButton({
  minuteId,
  hasText,
}: {
  minuteId: string;
  hasText: boolean;
}) {
  const extract = useExtractMinuteText();
  const [confirming, setConfirming] = useState(false);

  const run = () => {
    setConfirming(false);
    extract.mutate(minuteId);
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-slate-500 text-xs">
          本文を上書きしますか？
        </span>
        <button
          type="button"
          onClick={run}
          className="whitespace-nowrap rounded bg-slate-800 px-2 py-1 font-medium text-white text-xs hover:bg-slate-700"
        >
          上書き
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="whitespace-nowrap rounded border border-slate-300 px-2 py-1 text-slate-600 text-xs hover:bg-slate-100"
        >
          やめる
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => (hasText ? setConfirming(true) : run())}
        disabled={extract.isPending}
        className={iconButtonClass}
        aria-label="PDF から本文を抽出"
        title="PDF から本文を抽出"
      >
        {extract.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileText className="size-4" />
        )}
      </button>
      {extract.isError ? (
        <p className="max-w-48 text-right text-red-600 text-xs">
          {extract.error.message}
        </p>
      ) : null}
      {extract.isSuccess ? (
        <p className="whitespace-nowrap text-green-700 text-xs">
          {extract.data.toLocaleString()} 文字を保存
        </p>
      ) : null}
    </div>
  );
}
