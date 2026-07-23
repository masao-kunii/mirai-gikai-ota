import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { InlineDeleteConfirm } from "../../components/inline-delete-confirm";
import { iconButtonClass, inputClass, primaryButtonClass } from "../../lib/ui";
import {
  type AdminCouncilSession,
  type UpdateCouncilSessionInput,
  useActivateCouncilSession,
  useDeleteCouncilSession,
  useUpdateCouncilSession,
} from "./council-sessions-queries";

const SESSION_COLSPAN = 5;

/** 議会会期1行。表示／展開編集を切り替える。状態列でアクティブ会期を排他設定する。 */
export function CouncilSessionRow({
  session,
}: {
  session: AdminCouncilSession;
}) {
  const [editing, setEditing] = useState(false);
  const updateSession = useUpdateCouncilSession();
  const activateSession = useActivateCouncilSession();
  const deleteSession = useDeleteCouncilSession();

  if (editing) {
    return (
      <EditSessionRow
        session={session}
        pending={updateSession.isPending}
        error={updateSession.isError ? updateSession.error.message : null}
        onCancel={() => {
          updateSession.reset();
          setEditing(false);
        }}
        onSave={(input) =>
          updateSession.mutate(
            { id: session.id, input },
            { onSuccess: () => setEditing(false) }
          )
        }
      />
    );
  }

  return (
    <tr className="border-slate-100 border-b">
      <td className="px-3 py-2">
        <div className="font-medium text-slate-900">{session.name}</div>
        {session.slug ? (
          <div className="text-slate-400 text-xs">{session.slug}</div>
        ) : null}
      </td>
      <td className="px-3 py-2 text-slate-600">
        {session.startDate} 〜 {session.endDate ?? "（未定）"}
      </td>
      <td className="px-3 py-2 text-center">
        {session.isActive ? (
          <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700 text-xs">
            アクティブ
          </span>
        ) : (
          <button
            type="button"
            onClick={() => activateSession.mutate(session.id)}
            disabled={activateSession.isPending}
            className="rounded border border-slate-300 px-2 py-1 text-slate-600 text-xs hover:bg-slate-100 disabled:opacity-50"
          >
            アクティブにする
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-center text-slate-600">
        {session.billCount}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={iconButtonClass}
            aria-label="編集"
          >
            <Pencil className="size-4" />
          </button>
          <InlineDeleteConfirm
            onConfirm={() => deleteSession.mutate(session.id)}
            pending={deleteSession.isPending}
            error={deleteSession.isError ? deleteSession.error.message : null}
          />
        </div>
      </td>
    </tr>
  );
}

function EditSessionRow({
  session,
  pending,
  error,
  onSave,
  onCancel,
}: {
  session: AdminCouncilSession;
  pending: boolean;
  error: string | null;
  onSave: (input: UpdateCouncilSessionInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(session.name);
  const [slug, setSlug] = useState(session.slug ?? "");
  const [councilUrl, setCouncilUrl] = useState(session.councilUrl ?? "");
  const [startDate, setStartDate] = useState(session.startDate);
  const [endDate, setEndDate] = useState(session.endDate ?? "");

  const save = () =>
    onSave({
      name: name.trim(),
      slug: slug.trim() || null,
      councilUrl: councilUrl.trim() || null,
      startDate,
      endDate: endDate || null,
    });

  return (
    <tr className="border-slate-100 border-b bg-slate-50">
      <td className="px-3 py-3" colSpan={SESSION_COLSPAN}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <EditField label="議会名">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </EditField>
          <EditField label="slug">
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </EditField>
          <EditField label="議会URL">
            <input
              className={inputClass}
              value={councilUrl}
              onChange={(e) => setCouncilUrl(e.target.value)}
              maxLength={1000}
            />
          </EditField>
          <EditField label="開始日">
            <input
              className={inputClass}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </EditField>
          <EditField label="終了日">
            <input
              className={inputClass}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </EditField>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          {error ? <span className="text-red-600 text-sm">{error}</span> : null}
          <button
            type="button"
            onClick={onCancel}
            className={`${iconButtonClass} border border-slate-300`}
            aria-label="キャンセル"
          >
            <X className="size-4" />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || name.trim() === "" || startDate === ""}
            className={primaryButtonClass}
          >
            <Check className="size-4" />
            保存
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children が input を内包する
    <label className="flex flex-col gap-1">
      <span className="font-medium text-slate-500 text-xs">{label}</span>
      {children}
    </label>
  );
}
