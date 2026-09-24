import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { inputClass, primaryButtonClass } from "../../lib/ui";
import {
  type RescoreKind,
  rescorePendingOnce,
  useBulkPublish,
  useBulkPublishTargets,
  useInvalidateAfterRescore,
  useRescoreTargets,
} from "./bulk-actions-queries";

/** 自動公開と同じ基準を既定値にする（これより厳しくするのが安全側）。 */
const DEFAULT_MAX_MODERATION_SCORE = 29;
const DEFAULT_MIN_CONTENT_RICHNESS = 50;
/** 再判定は1回のリクエストでこの件数ずつ処理する（1件あたり数秒かかる）。 */
const RESCORE_CHUNK = 5;

export function BulkActionsPanel({ configId }: { configId?: string }) {
  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-2">
      <BulkPublish configId={configId} />
      <RescorePending configId={configId} />
    </section>
  );
}

/** 条件を満たすレポートをまとめて公開する。 */
function BulkPublish({ configId }: { configId?: string }) {
  const [maxModerationScore, setMax] = useState(DEFAULT_MAX_MODERATION_SCORE);
  const [minContentRichness, setMin] = useState(DEFAULT_MIN_CONTENT_RICHNESS);
  const [confirming, setConfirming] = useState(false);
  const input = { configId, maxModerationScore, minContentRichness };
  const targets = useBulkPublishTargets(input);
  const publish = useBulkPublish();

  const count = targets.data ?? 0;

  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-1 font-medium text-slate-800 text-sm">
        <ShieldCheck className="size-4" />
        条件を決めて一括公開
      </h2>
      <p className="text-slate-500 text-xs">
        本人が公開に同意していて、まだ公開していないレポートのうち、条件を満たすものを公開します。
        却下したものは対象外です。
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <NumberField
          label="モデレーション上限"
          value={maxModerationScore}
          onChange={setMax}
          hint="低いほど安全"
        />
        <NumberField
          label="内容充実度の下限"
          value={minContentRichness}
          onChange={setMin}
          hint="高いほど濃い"
        />
        <div className="text-slate-600 text-sm">
          対象{" "}
          <span className="font-semibold text-slate-900">
            {targets.isPending ? "…" : count}
          </span>{" "}
          件
        </div>
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600 text-xs">
            {count} 件を公開します。よろしいですか？
          </span>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              publish.mutate(input);
            }}
            className="rounded bg-slate-800 px-3 py-1.5 font-medium text-white text-xs hover:bg-slate-700"
          >
            公開する
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-600 text-xs hover:bg-slate-100"
          >
            やめる
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={count === 0 || publish.isPending}
          className={primaryButtonClass}
        >
          {publish.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          対象をまとめて公開
        </button>
      )}

      {publish.isError ? (
        <p className="text-red-600 text-xs">{publish.error.message}</p>
      ) : null}
      {publish.isSuccess ? (
        <p className="text-green-700 text-xs">
          {publish.data} 件を公開しました
        </p>
      ) : null}
    </div>
  );
}

type Progress =
  | { state: "idle" }
  | { state: "running"; done: number; total: number; failed: number }
  | { state: "done"; done: number; failed: number };

/** 評価が付いていないレポートを、少しずつ再判定する。 */
function RescorePending({ configId }: { configId?: string }) {
  const [kind, setKind] = useState<RescoreKind>("moderation");
  const [progress, setProgress] = useState<Progress>({ state: "idle" });
  const [error, setError] = useState<string | null>(null);
  const targets = useRescoreTargets(kind, configId);
  const invalidate = useInvalidateAfterRescore();

  const total = targets.data ?? 0;
  const running = progress.state === "running";

  const run = async () => {
    setError(null);
    let done = 0;
    let failed = 0;
    setProgress({ state: "running", done: 0, total, failed: 0 });
    try {
      // 残りが無くなるまで少しずつ繰り返す。失敗が続くときは打ち切る。
      for (let i = 0; i < Math.ceil(total / RESCORE_CHUNK) + 1; i++) {
        const result = await rescorePendingOnce({
          kind,
          configId,
          limit: RESCORE_CHUNK,
        });
        done += result.processed;
        failed += result.failed;
        setProgress({ state: "running", done, total, failed });
        await invalidate();
        if (result.remaining === 0) break;
        if (result.processed === 0) break;
      }
      setProgress({ state: "done", done, failed });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProgress({ state: "idle" });
    }
    await targets.refetch();
  };

  return (
    <div className="space-y-2 border-slate-100 border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
      <h2 className="flex items-center gap-1 font-medium text-slate-800 text-sm">
        <Sparkles className="size-4" />
        未評価のレポートを再判定
      </h2>
      <p className="text-slate-500 text-xs">
        回答完了時の自動評価が失敗して未評価のまま残っているレポートを、AI
        で評価し直します。承認・却下済みのものは、数値だけ更新して判断は変えません。
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as RescoreKind)}
          disabled={running}
          className={inputClass}
        >
          <option value="moderation">モデレーション</option>
          <option value="richness">内容充実度</option>
          <option value="both">両方</option>
        </select>
        <div className="text-slate-600 text-sm">
          未評価{" "}
          <span className="font-semibold text-slate-900">
            {targets.isPending ? "…" : total}
          </span>{" "}
          件
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running || total === 0}
          className={primaryButtonClass}
        >
          {running ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {running ? "再判定中…" : "まとめて再判定"}
        </button>
      </div>
      {progress.state === "running" ? (
        <p className="text-slate-600 text-sm">
          {progress.done} / {progress.total}{" "}
          件を再判定しました（1件あたり数秒かかります）
        </p>
      ) : null}
      {progress.state === "done" ? (
        <p
          className={
            progress.failed > 0
              ? "text-slate-700 text-sm"
              : "text-green-700 text-sm"
          }
        >
          {progress.done} 件を再判定しました
          {progress.failed > 0 ? `。${progress.failed} 件は失敗しました` : ""}
        </p>
      ) : null}
      {error ? <p className="text-red-600 text-xs">{error}</p> : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-slate-500 text-xs">
      {label}
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.min(100, Math.max(0, next)));
        }}
        className={`${inputClass} w-24`}
      />
      <span className="text-slate-400">{hint}</span>
    </label>
  );
}
