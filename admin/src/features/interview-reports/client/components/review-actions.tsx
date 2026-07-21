"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  approveReportAction,
  rejectReportAction,
} from "../../server/actions/review-report-actions";

/** 承認キューの1件に対する承認/却下ボタン。 */
export function ReviewActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);

  const run = async (kind: "approve" | "reject") => {
    if (busy) return;
    setBusy(kind);
    try {
      const result =
        kind === "approve"
          ? await approveReportAction(reportId)
          : await rejectReportAction(reportId);
      if (result.success) {
        toast.success(
          kind === "approve" ? "承認して公開しました" : "却下しました"
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "更新に失敗しました");
      }
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => run("approve")} disabled={busy !== null}>
        <Check className="size-4" />
        {busy === "approve" ? "承認中…" : "承認して公開"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => run("reject")}
        disabled={busy !== null}
      >
        <X className="size-4" />
        {busy === "reject" ? "却下中…" : "却下"}
      </Button>
    </div>
  );
}
