"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = { minuteId: string };

export function ExtractBillsButton({ minuteId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai-collection/start-from-minutes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minuteIds: [minuteId] }),
        });
        const json = (await res.json()) as { runId?: string; error?: string };
        if (!res.ok || !json.runId) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        // ai-collection のレビュー画面に遷移
        router.push(`/ai-collection?runId=${json.runId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      <Button
        size="sm"
        variant="default"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "抽出開始中…" : "AIで議案・会派見解を抽出"}
      </Button>
      {error && (
        <span className="text-sm text-destructive whitespace-pre-line">
          {error}
        </span>
      )}
    </span>
  );
}
