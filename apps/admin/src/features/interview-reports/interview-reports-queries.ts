import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { adminInterviewReportsApi as reportsApi } from "../../lib/api";
import type { ReviewStatus } from "./moderation-labels";

type ListResponse = InferResponseType<typeof reportsApi.index.$get, 200>;
export type AdminInterviewReport = ListResponse["reports"][number];

type StatusFilter = ReviewStatus | "all";

const reportsKey = (status: StatusFilter) =>
  ["admin", "interview-reports", status] as const;

export function useInterviewReports(status: StatusFilter) {
  return useQuery({
    queryKey: reportsKey(status),
    queryFn: async (): Promise<AdminInterviewReport[]> => {
      const res = await reportsApi.index.$get({ query: { status } });
      if (!res.ok) throw new Error("審査一覧の取得に失敗しました");
      const data = await res.json();
      return data.reports;
    },
  });
}

function useReviewMutation(
  action: (id: string) => Promise<Response>,
  failMessage: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await action(id);
      if (!res.ok) throw new Error(failMessage);
      return res.json();
    },
    // 判定でステータスが移るため、全タブのキャッシュを無効化する。
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "interview-reports"] }),
  });
}

export function useApproveReport() {
  return useReviewMutation(
    (id) => reportsApi[":id"].approve.$post({ param: { id } }),
    "承認に失敗しました"
  );
}

export function useRejectReport() {
  return useReviewMutation(
    (id) => reportsApi[":id"].reject.$post({ param: { id } }),
    "却下に失敗しました"
  );
}
