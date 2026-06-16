"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  extractAllMinutes,
  type ExtractAllResult,
} from "../../server/actions/extract-all-minutes";

export function ExtractAllMinutesButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ExtractAllResult | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const r = await extractAllMinutes();
      setResult(r);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button onClick={handleClick} disabled={isPending} variant="secondary">
          {isPending
            ? "抽出中…（数分かかります）"
            : "未抽出の議事録を一括 Markdown 化"}
        </Button>
        <span className="text-xs text-muted-foreground">
          markdown_text が空の議事録を順に Vertex AI Gemini で Markdown 化
        </span>
      </div>

      {result && (
        <div
          className={`rounded-md border p-3 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          <p>{result.message}</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
