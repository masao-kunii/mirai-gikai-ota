import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { adminExpertsApi as expertsApi } from "../../lib/api";

type ListResponse = InferResponseType<typeof expertsApi.index.$get, 200>;
export type AdminExpert = ListResponse["experts"][number];

export function useExperts() {
  return useQuery({
    queryKey: ["admin", "experts"] as const,
    queryFn: async (): Promise<AdminExpert[]> => {
      const res = await expertsApi.index.$get();
      if (!res.ok) throw new Error("専門家一覧の取得に失敗しました");
      const data = await res.json();
      return data.experts;
    },
  });
}

// レポートの立場（stance_type_enum）ラベル。
export const STANCE_LABELS: Record<string, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
  conditional_for: "条件付き賛成",
  conditional_against: "条件付き反対",
  considering: "検討中",
  continued_deliberation: "継続審査中",
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  bill: "議案",
  theme: "テーマ",
  initiative: "取り組み",
};
