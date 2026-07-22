import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { type CreateTagInput, useCreateTag } from "./tags-queries";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

/**
 * タグ新規作成フォーム。label 必須、description と注目順（featuredPriority）は任意。
 * 注目順は空欄なら「非注目（null）」として扱う。
 */
export function CreateTagForm() {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const createTag = useCreateTag();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: CreateTagInput = {
      label: label.trim(),
      description: description.trim() || undefined,
      featuredPriority: priority.trim() === "" ? null : Number(priority),
    };
    createTag.mutate(input, {
      onSuccess: () => {
        setLabel("");
        setDescription("");
        setPriority("");
      },
    });
  };

  const disabled = label.trim() === "" || createTag.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-600 text-xs">
            タグ名 <span className="text-red-500">*</span>
          </span>
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="例）子育て・教育"
            maxLength={100}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-medium text-slate-600 text-xs">説明</span>
          <input
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="任意"
            maxLength={1000}
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="font-medium text-slate-600 text-xs">注目順</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            placeholder="空=非注目"
          />
        </label>
        <button
          type="submit"
          disabled={disabled}
          className="flex items-center gap-1 rounded-md bg-slate-800 px-4 py-2 font-medium text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" />
          追加
        </button>
      </div>
      {createTag.isError ? (
        <p className="mt-2 text-red-600 text-sm">{createTag.error.message}</p>
      ) : null}
    </form>
  );
}
