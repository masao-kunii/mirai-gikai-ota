import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { primaryButtonClass } from "../../lib/ui";
import { extractAndSaveMinuteText } from "./extract-minute-text";
import { type AdminMinute, useInvalidateMinutes } from "./minutes-queries";

type Failure = { id: string; label: string; message: string };

type Progress =
  | { state: "idle" }
  | { state: "running"; done: number; total: number }
  | { state: "done"; succeeded: number; failures: Failure[] };

/**
 * 本文が未抽出の議事録をまとめて抽出する。1件ずつ順に処理するので、長い
 * リクエストにならない。処理中にページを離れると、残りは抽出されない。
 */
export function ExtractAllPanel({ minutes }: { minutes: AdminMinute[] }) {
  const invalidate = useInvalidateMinutes();
  const [progress, setProgress] = useState<Progress>({ state: "idle" });
  const targets = minutes.filter((m) => !m.hasText);
  const running = progress.state === "running";

  const run = async () => {
    const queue = [...targets];
    let succeeded = 0;
    const failures: Failure[] = [];
    for (const [i, minute] of queue.entries()) {
      setProgress({ state: "running", done: i, total: queue.length });
      try {
        await extractAndSaveMinuteText(minute.id);
        succeeded++;
      } catch (e) {
        failures.push({
          id: minute.id,
          label: minute.title ?? minute.meetingDate,
          message: e instanceof Error ? e.message : String(e),
        });
      }
      await invalidate();
    }
    setProgress({ state: "done", succeeded, failures });
  };

  return (
    <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-800 text-sm">
            PDF から本文を抽出
          </h2>
          <p className="text-slate-500 text-xs">
            本文が空の議事録について、元 PDF の文字を読み取って保存します。
            既に本文がある議事録は対象外です（行の
            <FileText className="mx-0.5 inline size-3.5" />
            から個別に上書きできます）。
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running || targets.length === 0}
          className={primaryButtonClass}
        >
          {running ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          {running ? "抽出中…" : `未抽出をまとめて抽出（${targets.length} 件）`}
        </button>
      </div>

      {progress.state === "running" ? (
        <p className="text-slate-600 text-sm">
          {progress.done + 1} / {progress.total} 件目を抽出しています…
        </p>
      ) : null}
      {progress.state === "done" ? (
        <div className="text-sm">
          <p
            className={
              progress.failures.length === 0
                ? "text-green-700"
                : "text-slate-700"
            }
          >
            {progress.succeeded} 件を抽出しました
            {progress.failures.length > 0
              ? `。${progress.failures.length} 件は失敗しました`
              : ""}
          </p>
          {progress.failures.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-red-600 text-xs">
              {progress.failures.map((f) => (
                <li key={f.id}>
                  {f.label}: {f.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
