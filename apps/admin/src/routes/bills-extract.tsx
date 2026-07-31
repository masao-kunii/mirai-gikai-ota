import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Upload } from "lucide-react";
import { useState } from "react";
import {
  BILL_STATUS_LABELS,
  type BillStatus,
} from "../features/bills/bill-labels";
import { STANCE_TYPE_LABELS } from "../features/bills/stance-labels";
import {
  type ExtractedBill,
  type ImportInput,
  useExtractFromMinutes,
  useImportExtractedBills,
} from "../features/bills-extract/bills-extract-queries";
import { useMinutes } from "../features/minutes/minutes-queries";

export const Route = createFileRoute("/bills-extract")({
  component: BillsExtractPage,
});

// 取り込めるスタンス（DB の stance_type_enum にある値）。absent は落とす。
const IMPORTABLE_STANCES = new Set(["for", "against", "neutral"]);

function BillsExtractPage() {
  const minutes = useMinutes();
  const extract = useExtractFromMinutes();
  const importBills = useImportExtractedBills();
  const [selectedMinuteIds, setSelectedMinuteIds] = useState<string[]>([]);
  const [extracted, setExtracted] = useState<ExtractedBill[] | null>(null);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const toggleMinute = (id: string) => {
    setResult(null);
    setSelectedMinuteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runExtract = () => {
    setResult(null);
    setExtracted(null);
    extract.mutate(selectedMinuteIds, {
      onSuccess: (data) => {
        setExtracted(data.bills);
        // 既存議案と重複しないものを初期選択にする。
        setSelectedBills(
          data.bills.filter((b) => !b.alreadyExists).map((b) => b.title)
        );
        // 取り込み先の会期は、選んだ議事録の会期を既定にする。
        const first = (minutes.data ?? []).find((m) =>
          selectedMinuteIds.includes(m.id)
        );
        setSessionId(first?.councilSessionId ?? null);
      },
    });
  };

  const runImport = () => {
    if (!extracted) return;
    setResult(null);
    const input: ImportInput = {
      councilSessionId: sessionId,
      bills: extracted
        .filter((b) => selectedBills.includes(b.title))
        .map((b) => ({
          title: b.title,
          billNumber: b.billNumber,
          summary: b.summary,
          status: b.status,
          stances: b.stances
            .filter((s) => IMPORTABLE_STANCES.has(s.stanceType))
            .map((s) => ({
              factionName: s.factionName,
              stanceType: s.stanceType as "for" | "against" | "neutral",
              comment: s.comment,
            })),
        })),
    };
    importBills.mutate(input, {
      onSuccess: (data) => {
        const warn =
          data.warnings.length > 0
            ? `（注意: ${data.warnings.join(" / ")}）`
            : "";
        setResult(
          `${data.createdCount}件の議案を下書きで取り込みました（会派見解 ${data.stanceCount}件）${warn}`
        );
        setExtracted(null);
        setSelectedBills([]);
        setSelectedMinuteIds([]);
      },
    });
  };

  const minutesWithText = (minutes.data ?? []).filter((m) => m.hasText);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
        <h1 className="font-bold text-slate-900 text-xl">
          議事録から議案を抽出
        </h1>
        <p className="text-slate-500 text-sm">
          本文のある議事録を選ぶと、AI
          が議案と会派見解を抽出します。内容を確認して選んだものを下書き議案として取り込みます。
        </p>
      </header>

      {result ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 text-sm">
          {result}
        </p>
      ) : null}

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-700 text-sm">1. 議事録を選ぶ</h2>
        {minutes.isPending ? (
          <p className="text-slate-500 text-sm">読み込み中…</p>
        ) : minutesWithText.length === 0 ? (
          <p className="text-slate-500 text-sm">
            本文（Markdown）のある議事録がありません。議事録ページで本文を登録してください。
          </p>
        ) : (
          <div className="space-y-1">
            {minutesWithText.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedMinuteIds.includes(m.id)}
                  onChange={() => toggleMinute(m.id)}
                  className="size-4"
                />
                <span className="text-slate-700 text-sm">
                  {m.meetingDate} {m.title ?? "（無題）"}
                </span>
                <span className="text-slate-400 text-xs">
                  {m.councilSessionName}
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          {extract.isError ? (
            <span className="text-red-600 text-sm">
              {extract.error.message}
            </span>
          ) : null}
          <button
            type="button"
            onClick={runExtract}
            disabled={selectedMinuteIds.length === 0 || extract.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-4 py-2 font-medium text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            {extract.isPending ? "抽出中…" : "AIで抽出"}
          </button>
        </div>
        {extract.isPending ? (
          <p className="text-slate-500 text-sm">
            AI が議事録を解析しています（数十秒かかる場合があります）…
          </p>
        ) : null}
      </section>

      {extracted ? (
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-700 text-sm">
            2. 取り込む議案を選ぶ（{extracted.length}件を抽出）
          </h2>
          {extracted.length === 0 ? (
            <p className="text-slate-500 text-sm">
              議案は抽出されませんでした。
            </p>
          ) : (
            <div className="space-y-3">
              {extracted.map((b) => (
                <ExtractedBillCard
                  key={b.title}
                  bill={b}
                  checked={selectedBills.includes(b.title)}
                  onToggle={() =>
                    setSelectedBills((prev) =>
                      prev.includes(b.title)
                        ? prev.filter((x) => x !== b.title)
                        : [...prev, b.title]
                    )
                  }
                />
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 border-slate-100 border-t pt-3">
            {importBills.isError ? (
              <span className="text-red-600 text-sm">
                {importBills.error.message}
              </span>
            ) : null}
            <span className="text-slate-400 text-xs">
              取り込んだ議案は「下書き」で作成されます
            </span>
            <button
              type="button"
              onClick={runImport}
              disabled={selectedBills.length === 0 || importBills.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-4 py-2 font-medium text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="size-4" />
              {selectedBills.length}件を取り込む
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ExtractedBillCard({
  bill,
  checked,
  onToggle,
}: {
  bill: ExtractedBill;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-md border border-slate-200 p-3">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 size-4"
          aria-label={`${bill.title} を取り込む`}
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {bill.billNumber ? (
              <span className="text-slate-400 text-xs">{bill.billNumber}</span>
            ) : null}
            <span className="font-medium text-slate-800 text-sm">
              {bill.title}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 text-xs">
              {BILL_STATUS_LABELS[bill.status as BillStatus] ?? bill.status}
            </span>
            {bill.alreadyExists ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 text-xs">
                同名の議案が既にあります
              </span>
            ) : null}
          </div>
          {bill.summary ? (
            <p className="mt-1 text-slate-600 text-sm">{bill.summary}</p>
          ) : null}
          {bill.stances.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {bill.stances.map((s) => (
                <li
                  key={`${s.factionName}-${s.stanceType}`}
                  className="text-slate-500 text-xs"
                >
                  {s.factionName}：
                  {STANCE_TYPE_LABELS[
                    s.stanceType as keyof typeof STANCE_TYPE_LABELS
                  ] ?? s.stanceType}
                  {s.comment ? `（${s.comment}）` : ""}
                  {!IMPORTABLE_STANCES.has(s.stanceType) ? (
                    <span className="ml-1 text-amber-600">
                      ※この賛否は取り込まれません
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  );
}
