import { MessageCircle } from "lucide-react";
import { useState } from "react";
import type { InterviewTargetInput } from "../lib/interview-schema";
import { InterviewDialog } from "./interview-dialog";

/**
 * テーマ／取り組みに対する「意見する」入口。
 *
 * 押すと、先に「匿名で公開される」ことへの同意を取ってから AI インタビュー
 * （InterviewDialog）に入る。subject は表示名、target は API 上の対象
 * （テーマ slug or 取り組み id）。
 */
export function OpinionEntryButton({
  subject,
  target,
  label = "意見する",
  variant = "outline",
}: {
  subject: string;
  target: InterviewTargetInput;
  label?: string;
  variant?: "outline" | "solid";
}) {
  const [open, setOpen] = useState(false);

  const className =
    variant === "solid"
      ? "inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-accent"
      : "inline-flex items-center gap-1.5 self-start rounded-full border border-primary px-3.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-mirai-surface-grouped";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <MessageCircle
          className={variant === "solid" ? "h-4 w-4" : "h-3.5 w-3.5"}
        />
        {label}
      </button>
      {open && (
        <InterviewDialog
          subject={subject}
          target={target}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
