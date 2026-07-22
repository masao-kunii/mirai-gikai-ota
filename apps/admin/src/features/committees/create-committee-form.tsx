import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { inputClass, primaryButtonClass } from "../../lib/ui";
import {
  type CreateCommitteeInput,
  useCreateCommittee,
} from "./committees-queries";

/**
 * 委員会 新規作成フォーム。委員会名（name）は必須。説明・並び順は任意。
 */
export function CreateCommitteeForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const createCommittee = useCreateCommittee();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: CreateCommitteeInput = {
      name: name.trim(),
      description: description.trim() || null,
      sortOrder: sortOrder.trim() === "" ? 0 : Number(sortOrder),
    };
    createCommittee.mutate(input, {
      onSuccess: () => {
        setName("");
        setDescription("");
        setSortOrder("");
      },
    });
  };

  const disabled = name.trim() === "" || createCommittee.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-600 text-xs">
            委員会名 <span className="text-red-500">*</span>
          </span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）総務財政委員会"
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
        <label className="flex w-24 flex-col gap-1">
          <span className="font-medium text-slate-600 text-xs">並び順</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
          />
        </label>
        <button
          type="submit"
          disabled={disabled}
          className={primaryButtonClass}
        >
          <Plus className="size-4" />
          追加
        </button>
      </div>
      {createCommittee.isError ? (
        <p className="mt-2 text-red-600 text-sm">
          {createCommittee.error.message}
        </p>
      ) : null}
    </form>
  );
}
