import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { type AdminTag, useDeleteTag, useUpdateTag } from "./tags-queries";

const inputClass =
  "w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none";
const iconBtnClass =
  "rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40";

/**
 * タグ1行。表示モードと編集モードを内部状態で切り替える。
 * 削除はブラウザ標準ダイアログを使わず、行内の確認 UI で行う
 * （誤操作防止＋自動テストがダイアログでブロックされないため）。
 */
export function TagRow({ tag }: { tag: AdminTag }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  if (editing) {
    return (
      <EditRow
        tag={tag}
        pending={updateTag.isPending}
        error={updateTag.isError ? updateTag.error.message : null}
        onCancel={() => {
          updateTag.reset();
          setEditing(false);
        }}
        onSave={(input) =>
          updateTag.mutate(
            { id: tag.id, input },
            { onSuccess: () => setEditing(false) }
          )
        }
      />
    );
  }

  return (
    <tr className="border-slate-100 border-b">
      <td className="px-3 py-2 font-medium text-slate-900">{tag.label}</td>
      <td className="px-3 py-2 text-slate-600">{tag.description ?? "—"}</td>
      <td className="px-3 py-2 text-center text-slate-600">
        {tag.featuredPriority ?? "—"}
      </td>
      <td className="px-3 py-2 text-center text-slate-600">{tag.billCount}</td>
      <td className="px-3 py-2">
        {confirmingDelete ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-slate-500 text-xs">削除しますか？</span>
            <button
              type="button"
              onClick={() => deleteTag.mutate(tag.id)}
              disabled={deleteTag.isPending}
              className="rounded bg-red-600 px-2 py-1 font-medium text-white text-xs hover:bg-red-500 disabled:opacity-50"
            >
              削除
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded border border-slate-300 px-2 py-1 text-slate-600 text-xs hover:bg-slate-100"
            >
              やめる
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={iconBtnClass}
              aria-label="編集"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={`${iconBtnClass} hover:text-red-600`}
              aria-label="削除"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
        {deleteTag.isError ? (
          <p className="mt-1 text-red-600 text-xs">{deleteTag.error.message}</p>
        ) : null}
      </td>
    </tr>
  );
}

function EditRow({
  tag,
  pending,
  error,
  onSave,
  onCancel,
}: {
  tag: AdminTag;
  pending: boolean;
  error: string | null;
  onSave: (input: {
    label: string;
    description: string | null;
    featuredPriority: number | null;
  }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(tag.label);
  const [description, setDescription] = useState(tag.description ?? "");
  const [priority, setPriority] = useState(
    tag.featuredPriority === null ? "" : String(tag.featuredPriority)
  );

  const save = () =>
    onSave({
      label: label.trim(),
      description: description.trim() || null,
      featuredPriority: priority.trim() === "" ? null : Number(priority),
    });

  return (
    <tr className="border-slate-100 border-b bg-slate-50">
      <td className="px-3 py-2">
        <input
          className={inputClass}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className={inputClass}
          type="number"
          min={0}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-center text-slate-400">{tag.billCount}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={save}
            disabled={pending || label.trim() === ""}
            className={`${iconBtnClass} text-green-700 hover:text-green-800`}
            aria-label="保存"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={iconBtnClass}
            aria-label="キャンセル"
          >
            <X className="size-4" />
          </button>
        </div>
        {error ? <p className="mt-1 text-red-600 text-xs">{error}</p> : null}
      </td>
    </tr>
  );
}
