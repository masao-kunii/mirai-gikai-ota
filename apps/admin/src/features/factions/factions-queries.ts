import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminFactionsApi as factionsApi } from "../../lib/api";

type ListResponse = InferResponseType<typeof factionsApi.index.$get>;
export type AdminFaction = ListResponse["factions"][number];

export type CreateFactionInput = InferRequestType<
  typeof factionsApi.index.$post
>["json"];
export type UpdateFactionInput = InferRequestType<
  (typeof factionsApi)[":id"]["$patch"]
>["json"];

const FACTIONS_KEY = ["admin", "factions"] as const;

async function fetchFactions(): Promise<AdminFaction[]> {
  const res = await factionsApi.index.$get();
  if (!res.ok) throw new Error("会派一覧の取得に失敗しました");
  const data = await res.json();
  return data.factions;
}

export function useFactions() {
  return useQuery({ queryKey: FACTIONS_KEY, queryFn: fetchFactions });
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 409) return "同じ識別名の会派が既に存在します";
  return fallback;
}

export function useCreateFaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFactionInput) => {
      const res = await factionsApi.index.$post({ json: input });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "会派の作成に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTIONS_KEY }),
  });
}

export function useUpdateFaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; input: UpdateFactionInput }) => {
      const res = await factionsApi[":id"].$patch({
        param: { id: vars.id },
        json: vars.input,
      });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "会派の更新に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTIONS_KEY }),
  });
}

export function useDeleteFaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await factionsApi[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("会派の削除に失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTIONS_KEY }),
  });
}
