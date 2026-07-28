import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Field } from "../../components/field";
import { inputClass, primaryButtonClass } from "../../lib/ui";
import { useCouncilSessions } from "../council-sessions/council-sessions-queries";
import { type CreateMinuteInput, useCreateMinute } from "./minutes-queries";

/**
 * 議事録 新規作成フォーム。会期・会議日・PDF URL は必須。
 * 本文（Markdown）は作成後の編集ページで扱う。
 */
export function CreateMinuteForm() {
  const [councilSessionId, setCouncilSessionId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [dayNumber, setDayNumber] = useState("");
  const [title, setTitle] = useState("");
  const [sourcePdfUrl, setSourcePdfUrl] = useState("");
  const createMinute = useCreateMinute();
  const sessions = useCouncilSessions();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: CreateMinuteInput = {
      councilSessionId,
      meetingDate,
      dayNumber: dayNumber.trim() === "" ? null : Number(dayNumber),
      title: title.trim() || null,
      sourcePdfUrl: sourcePdfUrl.trim(),
    };
    createMinute.mutate(input, {
      onSuccess: () => {
        setMeetingDate("");
        setDayNumber("");
        setTitle("");
        setSourcePdfUrl("");
      },
    });
  };

  const disabled =
    councilSessionId === "" ||
    meetingDate === "" ||
    sourcePdfUrl.trim() === "" ||
    createMinute.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="会期" required>
          <select
            className={inputClass}
            value={councilSessionId}
            onChange={(e) => setCouncilSessionId(e.target.value)}
          >
            <option value="">（選択）</option>
            {(sessions.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="会議日" required>
          <input
            className={inputClass}
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
          />
        </Field>
        <Field label="日目">
          <input
            className={inputClass}
            type="number"
            min={1}
            value={dayNumber}
            onChange={(e) => setDayNumber(e.target.value)}
            placeholder="任意"
          />
        </Field>
        <Field label="タイトル">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="任意"
            maxLength={500}
          />
        </Field>
        <Field label="PDF URL" required className="col-span-2 md:col-span-3">
          <input
            className={inputClass}
            value={sourcePdfUrl}
            onChange={(e) => setSourcePdfUrl(e.target.value)}
            placeholder="https://..."
            maxLength={2000}
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
      {createMinute.isError ? (
        <p className="mt-2 text-red-600 text-sm">
          {createMinute.error.message}
        </p>
      ) : null}
    </form>
  );
}
