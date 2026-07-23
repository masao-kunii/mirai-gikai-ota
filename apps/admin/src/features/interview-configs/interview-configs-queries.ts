import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminInterviewConfigsApi as configsApi } from "../../lib/api";
import type { ConfigStatus } from "./config-labels";

type ListResponse = InferResponseType<typeof configsApi.index.$get, 200>;
export type AdminInterviewConfig = ListResponse["configs"][number];

export type UpdateConfigInput = InferRequestType<
  (typeof configsApi)[":id"]["$patch"]
>["json"];

type StatusFilter = ConfigStatus | "all";

const CONFIGS_KEY = ["admin", "interview-configs"] as const;

export function useInterviewConfigs(status: StatusFilter) {
  return useQuery({
    queryKey: [...CONFIGS_KEY, status],
    queryFn: async (): Promise<AdminInterviewConfig[]> => {
      const res = await configsApi.index.$get({ query: { status } });
      if (!res.ok) throw new Error("インタビュー設定の取得に失敗しました");
      const data = await res.json();
      return data.configs;
    },
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; input: UpdateConfigInput }) => {
      const res = await configsApi[":id"].$patch({
        param: { id: vars.id },
        json: vars.input,
      });
      if (!res.ok) {
        // 同じ対象に受付中が既にある（部分ユニーク）場合は 409。
        if (res.status === 409) {
          throw new Error("同じ対象で「受付中」の設定が既にあります");
        }
        throw new Error("設定の更新に失敗しました");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIGS_KEY }),
  });
}

export function useDeleteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await configsApi[":id"].$delete({ param: { id } });
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("回答（セッション）があるため削除できません");
        }
        throw new Error("設定の削除に失敗しました");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIGS_KEY }),
  });
}
