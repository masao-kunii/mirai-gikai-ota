"use client";

import { EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unpublishReportAction } from "../../server/actions/unpublish-report-action";

/** 通報を受けたレポートを非公開にするボタン。 */
export function UnpublishReportButton({
  reportId,
  isPublic,
}: {
  reportId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!isPublic) {
    return <span className="text-gray-400 text-xs">非公開済み</span>;
  }

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await unpublishReportAction(reportId);
      if (result.success) {
        toast.success("非公開にしました");
        router.refresh();
      } else {
        toast.error(result.error ?? "更新に失敗しました");
      }
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="destructive" onClick={run} disabled={busy}>
      <EyeOff className="size-4" />
      {busy ? "処理中…" : "非公開にする"}
    </Button>
  );
}
