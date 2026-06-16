"use client";

import { Loader2, PauseCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CollectionForm } from "./collection-form";
import { DraftReview } from "./draft-review";
import { RunHistory } from "./run-history";
import type { CollectionRun } from "../../shared/types";

type AiCollectionPageProps = {
  initialRuns: CollectionRun[];
  existingBillNumbers: string[];
};

const POLL_INTERVAL_MS = 3000;

function useElapsedSeconds(startIso: string | null): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startIso) return;
    const calc = () =>
      Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
    setElapsed(calc());
    const id = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [startIso]);

  return elapsed;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

export function AiCollectionPage({
  initialRuns,
  existingBillNumbers,
}: AiCollectionPageProps) {
  const [runs, setRuns] = useState<CollectionRun[]>(initialRuns);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRun = activeRunId
    ? (runs.find((r) => r.id === activeRunId) ?? null)
    : null;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollRun = useCallback(
    async (runId: string) => {
      try {
        const res = await fetch(`/api/ai-collection/${runId}`);
        if (!res.ok) return;

        const updated = (await res.json()) as CollectionRun;

        setRuns((prev) => {
          const exists = prev.some((r) => r.id === runId);
          if (exists) {
            return prev.map((r) => (r.id === runId ? updated : r));
          }
          return [updated, ...prev];
        });

        if (updated.status !== "running") {
          stopPolling();
        }
        if (updated.status === "paused") {
          toast.warning("Claude制限に達した為、一時停止しています");
        }
      } catch {
        // Ignore polling errors
      }
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (runId: string) => {
      stopPolling();
      // Poll immediately, then at intervals
      void pollRun(runId);
      pollRef.current = setInterval(() => {
        void pollRun(runId);
      }, POLL_INTERVAL_MS);
    },
    [pollRun, stopPolling]
  );

  const handleRunStarted = useCallback(
    (runId: string) => {
      setActiveRunId(runId);
      startPolling(runId);
    },
    [startPolling]
  );

  const handleSelectRun = useCallback(
    (run: CollectionRun) => {
      setActiveRunId(run.id);
      if (run.status === "running") {
        startPolling(run.id);
      } else {
        stopPolling();
      }
    },
    [startPolling, stopPolling]
  );

  const elapsed = useElapsedSeconds(
    activeRun?.status === "running" ? (activeRun.createdAt ?? null) : null
  );

  const [isResuming, setIsResuming] = useState(false);

  const handleResume = useCallback(
    async (runId: string) => {
      setIsResuming(true);
      try {
        const res = await fetch(`/api/ai-collection/${runId}`, {
          method: "POST",
        });
        const data = (await res.json()) as { runId?: string; error?: string };
        if (!res.ok) {
          toast.error(data.error ?? "収集の再開に失敗しました");
          return;
        }
        toast.success("情報収集を再開しました");
        startPolling(runId);
      } catch {
        toast.error("収集の再開に失敗しました");
      } finally {
        setIsResuming(false);
      }
    },
    [startPolling]
  );

  // Resume polling for any in-progress run on mount
  useEffect(() => {
    const runningRun = initialRuns.find((r) => r.status === "running");
    if (runningRun) {
      setActiveRunId(runningRun.id);
      startPolling(runningRun.id);
    }
  }, [initialRuns, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return (
    <div className="space-y-8">
      {/* Web 検索ベースの収集は地方議会版では未対応 */}
      <section className="rounded-lg border border-yellow-300 bg-yellow-50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-yellow-900">
          Web 検索ベースの情報収集について
        </h2>
        <p className="text-sm leading-relaxed text-yellow-900">
          地方議会版では、Web 検索で議案を自動収集する機能
          (上流の国会版で使われている Claude CLI ベースの収集)
          には現在対応していません。
          <br />
          代わりに <strong>議事録 PDF からの AI 抽出</strong>{" "}
          をご利用ください。「議事録管理」→「議事録詳細」画面の{" "}
          <strong>「AIで議案・会派見解を抽出」</strong> ボタンから実行できます。
        </p>
      </section>

      {/* Collection form (disabled) */}
      <section className="rounded-lg border bg-white p-6 opacity-60">
        <h2 className="mb-4 text-lg font-semibold">
          情報収集（地方議会版では無効化中）
        </h2>
        <div className="pointer-events-none select-none">
          <CollectionForm onRunStarted={handleRunStarted} />
        </div>
      </section>

      {/* Active run status */}
      {activeRun && (
        <section className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">収集結果</h2>

          {activeRun.status === "running" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">
                  {activeRun.mode === "minutes"
                    ? "Gemini が議事録から議案・会派見解を抽出中です..."
                    : activeRun.mode === "status_check"
                      ? "Claude がステータスをチェック中です..."
                      : "Claude がウェブ検索・情報収集中です..."}
                </span>
                <span className="tabular-nums text-sm text-blue-400">
                  {formatElapsed(elapsed)} 経過
                </span>
              </div>
              <p className="ml-8 text-xs text-gray-400">
                {activeRun.mode === "minutes"
                  ? "議事録の長さによって数十秒〜数分かかります。このページを開いたままお待ちください。"
                  : "ウェブ検索を伴うため数分〜10分程度かかります。このページを開いたままお待ちください。"}
              </p>
            </div>
          )}

          {activeRun.status === "paused" && (
            <div className="rounded-md bg-yellow-50 p-4 text-yellow-800">
              <div className="flex items-center gap-3">
                <PauseCircle className="h-5 w-5 shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold">
                    Claude制限に達した為、一時停止しています
                  </p>
                  <p className="mt-1 text-sm text-yellow-700">
                    しばらく待ってから再開ボタンを押してください。
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={isResuming}
                  onClick={() => void handleResume(activeRun.id)}
                  className="shrink-0 border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                >
                  {isResuming && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  再開
                </Button>
              </div>
            </div>
          )}

          {activeRun.status === "failed" && (
            <div className="rounded-md bg-red-50 p-4 text-red-700">
              <p className="font-semibold">収集に失敗しました</p>
              {activeRun.error && (
                <p className="mt-1 text-sm">{activeRun.error}</p>
              )}
            </div>
          )}

          {activeRun.status === "completed" && (
            <DraftReview
              run={activeRun}
              existingBillNumbers={existingBillNumbers}
            />
          )}
        </section>
      )}

      {/* Run history */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">収集履歴</h2>
        <RunHistory
          runs={runs}
          activeRunId={activeRunId}
          onSelectRun={handleSelectRun}
        />
      </section>
    </div>
  );
}
