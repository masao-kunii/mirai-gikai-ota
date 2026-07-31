import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { Field } from "../../components/field";
import { inputClass, primaryButtonClass } from "../../lib/ui";
import {
  type BillContentsResponse,
  type SaveBillContentsInput,
  useBillContents,
  useGenerateBillContents,
  useSaveBillContents,
} from "./bill-contents-queries";

type LevelDraft = { title: string; summary: string; content: string };
const EMPTY: LevelDraft = { title: "", summary: "", content: "" };

/** 議案本文（bill_contents）の編集ページ。難易度 normal / hard を編集する。 */
export function BillContentsPage({ billId }: { billId: string }) {
  const { data, isPending, isError, error } = useBillContents(billId);

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
      {isPending ? (
        <p className="text-slate-500 text-sm">読み込み中…</p>
      ) : isError ? (
        <p className="text-red-600 text-sm">{error.message}</p>
      ) : (
        <ContentsForm billId={billId} data={data} />
      )}
    </div>
  );
}

function ContentsForm({
  billId,
  data,
}: {
  billId: string;
  data: BillContentsResponse;
}) {
  const [normal, setNormal] = useState<LevelDraft>(
    data.contents.normal ?? EMPTY
  );
  const [hard, setHard] = useState<LevelDraft>(data.contents.hard ?? EMPTY);
  const saveContents = useSaveBillContents(billId);
  const generate = useGenerateBillContents(billId);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(false);
    const input: SaveBillContentsInput = { normal, hard };
    saveContents.mutate(input, { onSuccess: () => setSaved(true) });
  };

  const runGenerate = () => {
    setSaved(false);
    generate.mutate(undefined, {
      onSuccess: (contents) => {
        // 生成結果をフォームに反映（保存はユーザーが確認して行う）。
        setNormal(contents.normal);
        setHard(contents.hard);
      },
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-slate-900 text-xl">本文編集</h1>
          <p className="text-slate-500 text-sm">{data.name}</p>
          <p className="mt-1 text-slate-400 text-xs">
            難易度ごとに本文（Markdown）を編集します。3項目すべて空にすると、その難易度の本文は削除されます。
          </p>
        </div>
        <button
          type="button"
          onClick={runGenerate}
          disabled={generate.isPending}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100 disabled:opacity-50"
          title="議案情報と紐づく議事録から本文を生成します"
        >
          <Sparkles className="size-4" />
          {generate.isPending ? "生成中…" : "AIで生成"}
        </button>
      </header>

      {generate.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600 text-sm">
          {generate.error.message}
        </p>
      ) : null}
      {generate.isPending ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 text-sm">
          AI が本文を生成しています（数十秒かかる場合があります）…
        </p>
      ) : null}

      <LevelEditor
        label="ふつう（normal）"
        value={normal}
        onChange={setNormal}
      />
      <LevelEditor label="難しい（hard）" value={hard} onChange={setHard} />

      <div className="flex items-center justify-end gap-3">
        {saveContents.isError ? (
          <span className="text-red-600 text-sm">
            {saveContents.error.message}
          </span>
        ) : null}
        {saved && !saveContents.isPending ? (
          <span className="text-green-600 text-sm">保存しました</span>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={saveContents.isPending}
          className={primaryButtonClass}
        >
          <Check className="size-4" />
          保存
        </button>
      </div>
    </div>
  );
}

function LevelEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LevelDraft;
  onChange: (v: LevelDraft) => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-medium text-slate-700 text-sm">{label}</h2>
      <Field label="タイトル">
        <input
          className={inputClass}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          maxLength={200}
        />
      </Field>
      <Field label="要約">
        <textarea
          className={inputClass}
          rows={2}
          value={value.summary}
          onChange={(e) => onChange({ ...value, summary: e.target.value })}
          maxLength={500}
        />
      </Field>
      <Field label="本文（Markdown）">
        <textarea
          className={`${inputClass} font-mono`}
          rows={12}
          value={value.content}
          onChange={(e) => onChange({ ...value, content: e.target.value })}
          maxLength={50000}
        />
      </Field>
    </section>
  );
}
