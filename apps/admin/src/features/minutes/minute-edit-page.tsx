import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Field } from "../../components/field";
import { inputClass, primaryButtonClass } from "../../lib/ui";
import {
  type AdminMinuteDetail,
  type UpdateMinuteInput,
  useMinute,
  useUpdateMinute,
} from "./minutes-queries";

/** 議事録の編集ページ。基本項目に加えて本文（Markdown）を編集する。 */
export function MinuteEditPage({ minuteId }: { minuteId: string }) {
  const { data, isPending, isError, error } = useMinute(minuteId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to="/minutes"
          className="inline-flex items-center gap-1 text-slate-500 text-sm hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          議事録一覧へ戻る
        </Link>
      </div>
      {isPending ? (
        <p className="text-slate-500 text-sm">読み込み中…</p>
      ) : isError ? (
        <p className="text-red-600 text-sm">{error.message}</p>
      ) : (
        <EditForm minuteId={minuteId} minute={data} />
      )}
    </div>
  );
}

function EditForm({
  minuteId,
  minute,
}: {
  minuteId: string;
  minute: AdminMinuteDetail;
}) {
  const [meetingDate, setMeetingDate] = useState(minute.meetingDate);
  const [dayNumber, setDayNumber] = useState(
    minute.dayNumber === null ? "" : String(minute.dayNumber)
  );
  const [title, setTitle] = useState(minute.title ?? "");
  const [sourcePdfUrl, setSourcePdfUrl] = useState(minute.sourcePdfUrl);
  const [markdownText, setMarkdownText] = useState(minute.markdownText ?? "");
  const updateMinute = useUpdateMinute(minuteId);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(false);
    const input: UpdateMinuteInput = {
      meetingDate,
      dayNumber: dayNumber.trim() === "" ? null : Number(dayNumber),
      title: title.trim() || null,
      sourcePdfUrl: sourcePdfUrl.trim(),
      markdownText: markdownText.trim() || null,
    };
    updateMinute.mutate(input, { onSuccess: () => setSaved(true) });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">議事録の編集</h1>
        <p className="text-slate-500 text-sm">{minute.councilSessionName}</p>
      </header>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="会議日">
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
            />
          </Field>
          <Field label="タイトル" className="col-span-2">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
            />
          </Field>
          <Field label="PDF URL" className="col-span-2 md:col-span-4">
            <div className="flex items-center gap-2">
              <input
                className={inputClass}
                value={sourcePdfUrl}
                onChange={(e) => setSourcePdfUrl(e.target.value)}
                maxLength={2000}
              />
              {sourcePdfUrl.trim() !== "" ? (
                <a
                  href={sourcePdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-slate-500 text-sm hover:text-slate-800"
                >
                  <ExternalLink className="size-4" />
                  開く
                </a>
              ) : null}
            </div>
          </Field>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="本文（Markdown）">
          <textarea
            className={`${inputClass} font-mono`}
            rows={16}
            value={markdownText}
            onChange={(e) => setMarkdownText(e.target.value)}
            placeholder="PDF から抽出した議事録本文（Markdown）。手動で貼り付け・編集できます。"
            maxLength={500000}
          />
        </Field>
      </section>

      <div className="flex items-center justify-end gap-3">
        {updateMinute.isError ? (
          <span className="text-red-600 text-sm">
            {updateMinute.error.message}
          </span>
        ) : null}
        {saved && !updateMinute.isPending ? (
          <span className="text-green-600 text-sm">保存しました</span>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={
            updateMinute.isPending ||
            meetingDate === "" ||
            sourcePdfUrl.trim() === ""
          }
          className={primaryButtonClass}
        >
          <Check className="size-4" />
          保存
        </button>
      </div>
    </div>
  );
}
