import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { Field } from "../components/field";
import { useImportTeirei } from "../features/bills-import/bills-import-queries";
import { useCouncilSessions } from "../features/council-sessions/council-sessions-queries";
import { inputClass, primaryButtonClass } from "../lib/ui";

export const Route = createFileRoute("/bills-import")({
  component: BillsImportPage,
});

function BillsImportPage() {
  const sessions = useCouncilSessions();
  const importTeirei = useImportTeirei();
  const [indexUrl, setIndexUrl] = useState("");
  const [councilSessionId, setCouncilSessionId] = useState("");
  const [result, setResult] = useState<{
    bills: number;
    stances: number;
    warnings: string[];
  } | null>(null);

  const run = () => {
    setResult(null);
    importTeirei.mutate(
      { indexUrl: indexUrl.trim(), councilSessionId },
      {
        onSuccess: (data) =>
          setResult({
            bills: data.billsUpserted,
            stances: data.stancesUpserted,
            warnings: data.warnings,
          }),
      }
    );
  };

  const disabled =
    indexUrl.trim() === "" || councilSessionId === "" || importTeirei.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/bills"
          className="inline-flex items-center gap-1 text-slate-500 text-sm hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          議案一覧へ戻る
        </Link>
      </div>
      <header>
        <h1 className="font-bold text-slate-900 text-xl">議案の一括取り込み</h1>
        <p className="text-slate-500 text-sm">
          大田区議会サイトの定例会ページ（index）から、区長提出議案・委員会提出議案・議員提出議案・報告・請願陳情・会派態度をまとめて取り込みます。
        </p>
      </header>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-slate-400" />
        <div>
          <p>
            取り込んだ議案は<strong>下書き</strong>
            で作成されます（公開は議案一覧で判断してください）。
          </p>
          <p className="mt-1 text-slate-500 text-xs">
            同じ会期・議案番号の議案は更新されるため、会期の進行に合わせて再実行できます。既存議案の本文と公開状態は上書きされません。
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="定例会ページ（index）の URL" required>
          <input
            className={inputClass}
            value={indexUrl}
            onChange={(e) => setIndexUrl(e.target.value)}
            placeholder="https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/r_8/2teirei/index.html"
            maxLength={2000}
          />
        </Field>
        <Field label="取り込み先の会期" required>
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
        <div className="flex items-center justify-end gap-3">
          {importTeirei.isError ? (
            <span className="text-red-600 text-sm">
              {importTeirei.error.message}
            </span>
          ) : null}
          <button
            type="button"
            onClick={run}
            disabled={disabled}
            className={primaryButtonClass}
          >
            <Download className="size-4" />
            {importTeirei.isPending ? "取り込み中…" : "取り込む"}
          </button>
        </div>
        {importTeirei.isPending ? (
          <p className="text-slate-500 text-sm">
            公式サイトのページを取得して解析しています…
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-green-800 text-sm">
            議案 {result.bills}件・会派見解 {result.stances}件を取り込みました。
          </p>
          {result.warnings.length > 0 ? (
            <div>
              <p className="font-medium text-amber-700 text-xs">
                注意（{result.warnings.length}件）
              </p>
              <ul className="mt-1 space-y-0.5">
                {result.warnings.map((w) => (
                  <li key={w} className="text-amber-700 text-xs">
                    ・{w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
