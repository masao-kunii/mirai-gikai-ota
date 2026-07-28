import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { adminReportFlagsApi as flagsApi } from "../../lib/api";

type ListResponse = InferResponseType<typeof flagsApi.index.$get, 200>;
export type FlaggedReport = ListResponse["flagged"][number];

const FLAGS_KEY = ["admin", "report-flags"] as const;

export function useFlaggedReports() {
  return useQuery({
    queryKey: FLAGS_KEY,
    queryFn: async (): Promise<FlaggedReport[]> => {
      const res = await flagsApi.index.$get();
      if (!res.ok) throw new Error("通報一覧の取得に失敗しました");
      const data = await res.json();
      return data.flagged;
    },
  });
}

export function useUnpublishReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const res = await flagsApi[":reportId"].unpublish.$post({
        param: { reportId },
      });
      if (!res.ok) throw new Error("非公開化に失敗しました");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FLAGS_KEY });
      // 審査キュー側の表示にも影響するため無効化。
      qc.invalidateQueries({ queryKey: ["admin", "interview-reports"] });
    },
  });
}

export const FLAG_REASON_LABELS: Record<string, string> = {
  personal_info: "個人情報",
  inappropriate: "不適切・攻撃的",
  inaccurate: "事実と異なる",
  spam: "スパム",
  other: "その他",
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  bill: "議案",
  theme: "テーマ",
  initiative: "取り組み",
};
