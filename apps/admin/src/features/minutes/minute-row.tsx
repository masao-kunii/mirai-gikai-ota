import { Link } from "@tanstack/react-router";
import { ExternalLink, Pencil } from "lucide-react";
import { InlineDeleteConfirm } from "../../components/inline-delete-confirm";
import { iconButtonClass } from "../../lib/ui";
import { type AdminMinute, useDeleteMinute } from "./minutes-queries";

/** 議事録1行。基本情報を表示し、編集は詳細ページ（本文含む）で行う。 */
export function MinuteRow({ minute }: { minute: AdminMinute }) {
  const deleteMinute = useDeleteMinute();

  return (
    <tr className="border-slate-100 border-b">
      <td className="px-3 py-2 text-slate-700">{minute.meetingDate}</td>
      <td className="px-3 py-2 text-center text-slate-600">
        {minute.dayNumber ?? "—"}
      </td>
      <td className="px-3 py-2">
        <div className="text-slate-800">{minute.title ?? "（無題）"}</div>
        <div className="text-slate-400 text-xs">
          {minute.councilSessionName}
        </div>
      </td>
      <td className="px-3 py-2 text-center">
        {minute.hasText ? (
          <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700 text-xs">
            あり
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500 text-xs">
            なし
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <a
          href={minute.sourcePdfUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-slate-500 text-xs hover:text-slate-800"
        >
          <ExternalLink className="size-3.5" />
          PDF
        </a>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <Link
            to="/minute-edit/$minuteId"
            params={{ minuteId: minute.id }}
            className={iconButtonClass}
            aria-label="編集"
            title="編集"
          >
            <Pencil className="size-4" />
          </Link>
          <InlineDeleteConfirm
            onConfirm={() => deleteMinute.mutate(minute.id)}
            pending={deleteMinute.isPending}
            error={deleteMinute.isError ? deleteMinute.error.message : null}
          />
        </div>
      </td>
    </tr>
  );
}
