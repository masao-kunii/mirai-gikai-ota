"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { extractMinute } from "../../server/actions/extract-minute";

type Props = { id: string };

export function ExtractMinuteButton({ id }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await extractMinute(id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      <Button size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "抽出中…（30秒〜2分）" : "Markdown抽出"}
      </Button>
      {error && (
        <span className="text-sm text-destructive whitespace-pre-line">
          {error}
        </span>
      )}
    </span>
  );
}
