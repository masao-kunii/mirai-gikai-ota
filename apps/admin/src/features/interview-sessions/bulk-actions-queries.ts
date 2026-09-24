import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminInterviewReportsApi as reportsApi } from "../../lib/api";

export type RescoreKind = "moderation" | "richness" | "both";

/** 一括公開の条件。既定値は自動公開と同じ基準（安全側）。 */
export type BulkPublishInput = {
  configId?: string;
  maxModerationScore: number;
  minContentRichness: number;
};

const BULK_KEY = ["admin", "interview-reports", "bulk"] as const;

/** 承認・却下・一括処理のあと、審査キューと回答一覧の両方を最新にする。 */
function useInvalidateReports() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "interview-reports"] }),
      qc.invalidateQueries({ queryKey: ["admin", "interview-sessions"] }),
    ]);
}

export function useBulkPublishTargets(input: BulkPublishInput) {
  return useQuery({
    queryKey: [...BULK_KEY, "publish-targets", input],
    queryFn: async (): Promise<number> => {
      const res = await reportsApi["bulk-publish"].targets.$get({
        query: {
          maxModerationScore: String(input.maxModerationScore),
          minContentRichness: String(input.minContentRichness),
          ...(input.configId ? { configId: input.configId } : {}),
        },
      });
      if (!res.ok) throw new Error("対象件数の取得に失敗しました");
      const data = await res.json();
      return data.count;
    },
  });
}

export function useBulkPublish() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: async (input: BulkPublishInput): Promise<number> => {
      const res = await reportsApi["bulk-publish"].$post({ json: input });
      if (!res.ok) throw new Error("一括公開に失敗しました");
      const data = await res.json();
      return data.publishedCount;
    },
    onSuccess: invalidate,
  });
}

export function useRescoreTargets(kind: RescoreKind, configId?: string) {
  return useQuery({
    queryKey: [...BULK_KEY, "rescore-targets", kind, configId ?? "all"],
    queryFn: async (): Promise<number> => {
      const res = await reportsApi["rescore-pending"].targets.$get({
        query: { kind, ...(configId ? { configId } : {}) },
      });
      if (!res.ok) throw new Error("再判定の対象件数の取得に失敗しました");
      const data = await res.json();
      return data.count;
    },
  });
}

/** 未評価のレポートを1回分だけ再判定する（画面側で残りが0になるまで繰り返す）。 */
export async function rescorePendingOnce(input: {
  kind: RescoreKind;
  configId?: string;
  limit: number;
}): Promise<{ processed: number; failed: number; remaining: number }> {
  const res = await reportsApi["rescore-pending"].$post({ json: input });
  if (!res.ok) throw new Error("再判定に失敗しました");
  return res.json();
}

export function useRescoreReport() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: async (input: { reportId: string; kind: RescoreKind }) => {
      const res = await reportsApi[":id"].rescore.$post({
        param: { id: input.reportId },
        json: { kind: input.kind },
      });
      if (!res.ok) throw new Error("再判定に失敗しました");
      return res.json();
    },
    onSuccess: invalidate,
  });
}

export function useInvalidateAfterRescore() {
  return useInvalidateReports();
}
