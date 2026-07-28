import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminMinutesApi as minutesApi } from "../../lib/api";

type ListResponse = InferResponseType<typeof minutesApi.index.$get, 200>;
export type AdminMinute = ListResponse["minutes"][number];

type DetailResponse = InferResponseType<
  (typeof minutesApi)[":id"]["$get"],
  200
>;
export type AdminMinuteDetail = DetailResponse["minute"];

export type CreateMinuteInput = InferRequestType<
  typeof minutesApi.index.$post
>["json"];
export type UpdateMinuteInput = InferRequestType<
  (typeof minutesApi)[":id"]["$patch"]
>["json"];

const MINUTES_KEY = ["admin", "minutes"] as const;

export function useMinutes() {
  return useQuery({
    queryKey: MINUTES_KEY,
    queryFn: async (): Promise<AdminMinute[]> => {
      const res = await minutesApi.index.$get({ query: {} });
      if (!res.ok) throw new Error("議事録一覧の取得に失敗しました");
      const data = await res.json();
      return data.minutes;
    },
  });
}

export function useMinute(id: string) {
  return useQuery({
    queryKey: [...MINUTES_KEY, id],
    queryFn: async (): Promise<AdminMinuteDetail> => {
      const res = await minutesApi[":id"].$get({ param: { id } });
      if (!res.ok) throw new Error("議事録の取得に失敗しました");
      const data = await res.json();
      return data.minute;
    },
  });
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 409) return "同じ会期・同じ会議日の議事録が既に存在します";
  return fallback;
}

export function useCreateMinute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMinuteInput) => {
      const res = await minutesApi.index.$post({ json: input });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "議事録の作成に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MINUTES_KEY }),
  });
}

export function useUpdateMinute(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMinuteInput) => {
      const res = await minutesApi[":id"].$patch({
        param: { id },
        json: input,
      });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "議事録の更新に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MINUTES_KEY }),
  });
}

export function useDeleteMinute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await minutesApi[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("議事録の削除に失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MINUTES_KEY }),
  });
}
