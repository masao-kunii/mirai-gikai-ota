"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateBillContentsFromMinutesAction } from "@/features/ai-collection/server/actions/generate-bill-contents-from-minutes";

type Props = { minuteId: string };

export function GenerateContentsButton({ minuteId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await generateBillContentsFromMinutesAction({
        minuteIds: [minuteId],
      });
      if (result.ok) {
        const reasons = result.skipped
          .slice(0, 3)
          .map((s) => `${s.billName}: ${s.reason}`)
          .join(" / ");
        setMessage(
          `生成: ${result.results.length}件, スキップ: ${result.skipped.length}件${reasons ? `\n[skip理由 抜粋] ${reasons}` : ""}`
        );
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? "生成中…（数分）" : "議案本文をAI生成"}
      </Button>
      {error && (
        <span className="text-sm text-destructive whitespace-pre-line">
          {error}
        </span>
      )}
      {message && (
        <span className="text-sm text-green-700 whitespace-pre-line">
          {message}
        </span>
      )}
    </span>
  );
}
