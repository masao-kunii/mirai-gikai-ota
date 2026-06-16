"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  importMinutesFromSokuhou,
  type ImportResult,
} from "../../server/actions/import-from-sokuhou";

export function ImportFromSokuhouButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const r = await importMinutesFromSokuhou();
      setResult(r);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button onClick={handleClick} disabled={isPending} variant="secondary">
          {isPending ? "取得中…" : "速報版ページから一括取り込み"}
        </Button>
        <span className="text-xs text-muted-foreground">
          出典: 大田区議会「会議録速報版」ページ
        </span>
      </div>

      {result && (
        <div
          className={`rounded-md border p-3 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-destructive bg-red-50 text-destructive"
          }`}
        >
          <p>{result.message}</p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
