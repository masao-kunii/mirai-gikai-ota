import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { inputClass, primaryButtonClass } from "../../lib/ui";
import { type CreateFactionInput, useCreateFaction } from "./factions-queries";

/** 別名は「,」「、」区切りで受け取り、空要素を除いた配列にする。 */
export function parseAlternativeNames(raw: string): string[] {
  return raw
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 会派 新規作成フォーム。識別名（name）と表示名（displayName）は必須。
 * 別名・ロゴURL・並び順は任意。
 */
export function CreateFactionForm() {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [altNames, setAltNames] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const createFaction = useCreateFaction();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: CreateFactionInput = {
      name: name.trim(),
      displayName: displayName.trim(),
      alternativeNames: parseAlternativeNames(altNames),
      logoUrl: logoUrl.trim() || null,
      sortOrder: sortOrder.trim() === "" ? 0 : Number(sortOrder),
    };
    createFaction.mutate(input, {
      onSuccess: () => {
        setName("");
        setDisplayName("");
        setAltNames("");
        setLogoUrl("");
        setSortOrder("");
      },
    });
  };

  const disabled =
    name.trim() === "" || displayName.trim() === "" || createFaction.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="識別名" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）jimin"
            maxLength={100}
          />
        </Field>
        <Field label="表示名" required>
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例）自民党"
            maxLength={100}
          />
        </Field>
        <Field label="別名（,区切り）">
          <input
            className={inputClass}
            value={altNames}
            onChange={(e) => setAltNames(e.target.value)}
            placeholder="任意"
          />
        </Field>
        <Field label="並び順">
          <input
            className={inputClass}
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="ロゴURL">
          <input
            className={inputClass}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="任意"
            maxLength={1000}
          />
        </Field>
        <div className="col-span-2 flex items-end md:col-span-2 md:justify-end">
          <button
            type="submit"
            disabled={disabled}
            className={primaryButtonClass}
          >
            <Plus className="size-4" />
            追加
          </button>
        </div>
      </div>
      {createFaction.isError ? (
        <p className="mt-2 text-red-600 text-sm">
          {createFaction.error.message}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    // children に必ず入力コントロールを内包する汎用フィールド（label は妥当に関連づく）
    // biome-ignore lint/a11y/noLabelWithoutControl: children が input を内包する
    <label className="flex flex-col gap-1">
      <span className="font-medium text-slate-600 text-xs">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
