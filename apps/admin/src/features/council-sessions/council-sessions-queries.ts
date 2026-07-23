import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminCouncilSessionsApi as sessionsApi } from "../../lib/api";

type ListResponse = InferResponseType<typeof sessionsApi.index.$get>;
export type AdminCouncilSession = ListResponse["councilSessions"][number];

export type CreateCouncilSessionInput = InferRequestType<
  typeof sessionsApi.index.$post
>["json"];
export type UpdateCouncilSessionInput = InferRequestType<
  (typeof sessionsApi)[":id"]["$patch"]
>["json"];

const SESSIONS_KEY = ["admin", "council-sessions"] as const;

async function fetchSessions(): Promise<AdminCouncilSession[]> {
  const res = await sessionsApi.index.$get();
  if (!res.ok) throw new Error("議会会期一覧の取得に失敗しました");
  const data = await res.json();
  return data.councilSessions;
}

export function useCouncilSessions() {
  return useQuery({ queryKey: SESSIONS_KEY, queryFn: fetchSessions });
}

// slug 重複（409）/ 日付範囲（400）をユーザーに分かる文言へ変換する。
function messageForStatus(status: number, fallback: string): string {
  if (status === 409) return "同じ slug の会期が既に存在します";
  if (status === 400) return "入力内容を確認してください（日付・slug）";
  return fallback;
}

export function useCreateCouncilSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCouncilSessionInput) => {
      const res = await sessionsApi.index.$post({ json: input });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "会期の作成に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

export function useUpdateCouncilSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      input: UpdateCouncilSessionInput;
    }) => {
      const res = await sessionsApi[":id"].$patch({
        param: { id: vars.id },
        json: vars.input,
      });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "会期の更新に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

/** 対象会期を排他的にアクティブ化する（常に1件のみ active）。 */
export function useActivateCouncilSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await sessionsApi[":id"].activate.$post({ param: { id } });
      if (!res.ok) throw new Error("アクティブ会期の設定に失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

export function useDeleteCouncilSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await sessionsApi[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("会期の削除に失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}
