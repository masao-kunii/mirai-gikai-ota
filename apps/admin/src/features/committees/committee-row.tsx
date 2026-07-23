import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { ActiveBadge } from "../../components/active-badge";
import { InlineDeleteConfirm } from "../../components/inline-delete-confirm";
import { iconButtonClass, inputClass, primaryButtonClass } from "../../lib/ui";
import {
  type AdminCommittee,
  type UpdateCommitteeInput,
  useDeleteCommittee,
  useUpdateCommittee,
} from "./committees-queries";

const COMMITTEE_COLSPAN = 6;

/** 委員会1行。表示モードと、行を展開した編集フォームを切り替える。 */
export function CommitteeRow({ committee }: { committee: AdminCommittee }) {
  const [editing, setEditing] = useState(false);
  const updateCommittee = useUpdateCommittee();
  const deleteCommittee = useDeleteCommittee();

  if (editing) {
    return (
      <EditCommitteeRow
        committee={committee}
        pending={updateCommittee.isPending}
        error={updateCommittee.isError ? updateCommittee.error.message : null}
        onCancel={() => {
          updateCommittee.reset();
          setEditing(false);
        }}
        onSave={(input) =>
          updateCommittee.mutate(
            { id: committee.id, input },
            { onSuccess: () => setEditing(false) }
          )
        }
      />
    );
  }

  return (
    <tr className="border-slate-100 border-b">
      <td className="px-3 py-2 font-medium text-slate-900">{committee.name}</td>
      <td className="px-3 py-2 text-slate-600">
        {committee.description ?? "—"}
      </td>
      <td className="px-3 py-2 text-center text-slate-600">
        {committee.sortOrder}
      </td>
      <td className="px-3 py-2 text-center">
        <ActiveBadge active={committee.isActive} />
      </td>
      <td className="px-3 py-2 text-center text-slate-600">
        {committee.billCount}
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
            onConfirm={() => deleteCommittee.mutate(committee.id)}
            pending={deleteCommittee.isPending}
            error={
              deleteCommittee.isError ? deleteCommittee.error.message : null
            }
          />
        </div>
      </td>
    </tr>
  );
}

function EditCommitteeRow({
  committee,
  pending,
  error,
  onSave,
  onCancel,
}: {
  committee: AdminCommittee;
  pending: boolean;
  error: string | null;
  onSave: (input: UpdateCommitteeInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(committee.name);
  const [description, setDescription] = useState(committee.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(committee.sortOrder));
  const [isActive, setIsActive] = useState(committee.isActive);

  const save = () =>
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      sortOrder: sortOrder.trim() === "" ? 0 : Number(sortOrder),
      isActive,
    });

  return (
    <tr className="border-slate-100 border-b bg-slate-50">
      <td className="px-3 py-3" colSpan={COMMITTEE_COLSPAN}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <EditField label="委員会名">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </EditField>
          <EditField label="説明" span2>
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </EditField>
          <EditField label="並び順">
            <input
              className={inputClass}
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </EditField>
          <label className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4"
            />
            <span className="text-slate-600 text-sm">有効</span>
          </label>
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
            disabled={pending || name.trim() === ""}
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
  span2,
  children,
}: {
  label: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children が input を内包する
    <label className={`flex flex-col gap-1 ${span2 ? "col-span-2" : ""}`}>
      <span className="font-medium text-slate-500 text-xs">{label}</span>
      {children}
    </label>
  );
}
