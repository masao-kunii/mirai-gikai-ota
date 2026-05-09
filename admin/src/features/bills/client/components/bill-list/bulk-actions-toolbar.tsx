"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { bulkUpdateBillsAction } from "../../../server/actions/bulk-update-bills";

type Props = {
  /** 一括操作の対象（現在の絞り込み結果に基づく表示中の議案ID） */
  billIds: string[];
};

export function BulkActionsToolbar({ billIds }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(input: Parameters<typeof bulkUpdateBillsAction>[0]) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await bulkUpdateBillsAction(input);
      if (result.ok) {
        setMessage(`${result.updatedCount}件を更新しました`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (billIds.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
      <span className="font-medium">表示中の議案 {billIds.length} 件を:</span>
      <Button
        size="sm"
        variant="default"
        disabled={isPending}
        onClick={() =>
          run({
            billIds,
            publishStatus: "published",
            setPublishedAtNow: true,
          })
        }
      >
        全て公開
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run({ billIds, publishStatus: "draft" })}
      >
        全て非公開（draft）
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run({ billIds, isFeatured: true })}
      >
        全て注目に追加
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run({ billIds, isFeatured: false })}
      >
        注目から外す
      </Button>
      {isPending && <span className="text-muted-foreground">更新中…</span>}
      {message && <span className="text-green-700">{message}</span>}
      {error && (
        <span className="text-destructive whitespace-pre-line">{error}</span>
      )}
    </div>
  );
}
