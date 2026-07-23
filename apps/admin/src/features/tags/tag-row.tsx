import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { InlineDeleteConfirm } from "../../components/inline-delete-confirm";
import { cellInputClass, iconButtonClass } from "../../lib/ui";
import { type AdminTag, useDeleteTag, useUpdateTag } from "./tags-queries";

/**
 * タグ1行。表示モードと編集モードを内部状態で切り替える。削除は行内で確認する。
 */
export function TagRow({ tag }: { tag: AdminTag }) {
  const [editing, setEditing] = useState(false);
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
            onConfirm={() => deleteTag.mutate(tag.id)}
            pending={deleteTag.isPending}
            error={deleteTag.isError ? deleteTag.error.message : null}
          />
        </div>
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
          className={cellInputClass}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className={cellInputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className={cellInputClass}
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
            className={`${iconButtonClass} text-green-700 hover:text-green-800`}
            aria-label="保存"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={iconButtonClass}
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
