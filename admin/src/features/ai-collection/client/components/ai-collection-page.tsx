"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
      {/* 議事録 PDF からの AI 抽出結果をレビューする画面 */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold">議案・会派見解の AI 抽出</h2>
        <p className="text-sm leading-relaxed text-gray-600">
          議案・会派見解は <strong>議事録 PDF からの AI 抽出</strong>{" "}
          で取り込みます。「議事録管理」→「議事録詳細」画面の{" "}
          <strong>「AIで議案・会派見解を抽出」</strong>{" "}
          ボタンから実行すると、この画面に抽出結果（ドラフト）が表示されます。
        </p>
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
                  Gemini が議事録から議案・会派見解を抽出中です...
                </span>
                <span className="tabular-nums text-sm text-blue-400">
                  {formatElapsed(elapsed)} 経過
                </span>
              </div>
              <p className="ml-8 text-xs text-gray-400">
                議事録の長さによって数十秒〜数分かかります。このページを開いたままお待ちください。
              </p>
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
