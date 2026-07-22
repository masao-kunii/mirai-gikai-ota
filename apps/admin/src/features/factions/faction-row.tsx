import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { ActiveBadge } from "../../components/active-badge";
import { InlineDeleteConfirm } from "../../components/inline-delete-confirm";
import { iconButtonClass, inputClass, primaryButtonClass } from "../../lib/ui";
import { parseAlternativeNames } from "./create-faction-form";
import {
  type AdminFaction,
  type UpdateFactionInput,
  useDeleteFaction,
  useUpdateFaction,
} from "./factions-queries";

const FACTION_COLSPAN = 6;

/** 会派1行。表示モードと、行を展開した編集フォームを切り替える。 */
export function FactionRow({ faction }: { faction: AdminFaction }) {
  const [editing, setEditing] = useState(false);
  const updateFaction = useUpdateFaction();
  const deleteFaction = useDeleteFaction();

  if (editing) {
    return (
      <EditFactionRow
        faction={faction}
        pending={updateFaction.isPending}
        error={updateFaction.isError ? updateFaction.error.message : null}
        onCancel={() => {
          updateFaction.reset();
          setEditing(false);
        }}
        onSave={(input) =>
          updateFaction.mutate(
            { id: faction.id, input },
            { onSuccess: () => setEditing(false) }
          )
        }
      />
    );
  }

  return (
    <tr className="border-slate-100 border-b">
      <td className="px-3 py-2">
        <div className="font-medium text-slate-900">{faction.displayName}</div>
        <div className="text-slate-400 text-xs">{faction.name}</div>
      </td>
      <td className="px-3 py-2 text-slate-600">
        {faction.alternativeNames.length > 0
          ? faction.alternativeNames.join("、")
          : "—"}
      </td>
      <td className="px-3 py-2 text-center text-slate-600">
        {faction.sortOrder}
      </td>
      <td className="px-3 py-2 text-center">
        <ActiveBadge active={faction.isActive} />
      </td>
      <td className="px-3 py-2 text-center text-slate-600">
        {faction.stanceCount}
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
            onConfirm={() => deleteFaction.mutate(faction.id)}
            pending={deleteFaction.isPending}
            error={deleteFaction.isError ? deleteFaction.error.message : null}
          />
        </div>
      </td>
    </tr>
  );
}

function EditFactionRow({
  faction,
  pending,
  error,
  onSave,
  onCancel,
}: {
  faction: AdminFaction;
  pending: boolean;
  error: string | null;
  onSave: (input: UpdateFactionInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(faction.name);
  const [displayName, setDisplayName] = useState(faction.displayName);
  const [altNames, setAltNames] = useState(faction.alternativeNames.join("、"));
  const [logoUrl, setLogoUrl] = useState(faction.logoUrl ?? "");
  const [sortOrder, setSortOrder] = useState(String(faction.sortOrder));
  const [isActive, setIsActive] = useState(faction.isActive);

  const save = () =>
    onSave({
      name: name.trim(),
      displayName: displayName.trim(),
      alternativeNames: parseAlternativeNames(altNames),
      logoUrl: logoUrl.trim() || null,
      sortOrder: sortOrder.trim() === "" ? 0 : Number(sortOrder),
      isActive,
    });

  const invalid = name.trim() === "" || displayName.trim() === "";

  return (
    <tr className="border-slate-100 border-b bg-slate-50">
      <td className="px-3 py-3" colSpan={FACTION_COLSPAN}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <EditField label="識別名">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </EditField>
          <EditField label="表示名">
            <input
              className={inputClass}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
          </EditField>
          <EditField label="別名（,区切り）">
            <input
              className={inputClass}
              value={altNames}
              onChange={(e) => setAltNames(e.target.value)}
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
          <EditField label="ロゴURL">
            <input
              className={inputClass}
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              maxLength={1000}
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
            disabled={pending || invalid}
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
