import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { inputClass, primaryButtonClass } from "../../lib/ui";
import {
  type CreateCouncilSessionInput,
  useCreateCouncilSession,
} from "./council-sessions-queries";

/**
 * 議会会期 新規作成フォーム。議会名・開始日は必須。slug・URL・終了日は任意。
 * slug は半角英小文字/数字/ハイフンのみ（サーバーでも検証）。
 */
export function CreateCouncilSessionForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [councilUrl, setCouncilUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const createSession = useCreateCouncilSession();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: CreateCouncilSessionInput = {
      name: name.trim(),
      slug: slug.trim() || null,
      councilUrl: councilUrl.trim() || null,
      startDate,
      endDate: endDate || null,
    };
    createSession.mutate(input, {
      onSuccess: () => {
        setName("");
        setSlug("");
        setCouncilUrl("");
        setStartDate("");
        setEndDate("");
      },
    });
  };

  const disabled =
    name.trim() === "" || startDate === "" || createSession.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="議会名" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）令和8年 第2回定例会"
            maxLength={200}
          />
        </Field>
        <Field label="slug">
          <input
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="例）r8-2"
          />
        </Field>
        <Field label="議会URL">
          <input
            className={inputClass}
            value={councilUrl}
            onChange={(e) => setCouncilUrl(e.target.value)}
            placeholder="任意"
            maxLength={1000}
          />
        </Field>
        <Field label="開始日" required>
          <input
            className={inputClass}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="終了日">
          <input
            className={inputClass}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
        <div className="flex items-end">
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
      {createSession.isError ? (
        <p className="mt-2 text-red-600 text-sm">
          {createSession.error.message}
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
