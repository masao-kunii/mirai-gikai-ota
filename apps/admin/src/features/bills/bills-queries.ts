import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminBillsApi as billsApi } from "../../lib/api";

type ListResponse = InferResponseType<typeof billsApi.index.$get>;
export type AdminBill = ListResponse["bills"][number];

export type CreateBillInput = InferRequestType<
  typeof billsApi.index.$post
>["json"];
export type UpdateBillInput = InferRequestType<
  (typeof billsApi)[":id"]["$patch"]
>["json"];

const BILLS_KEY = ["admin", "bills"] as const;

async function fetchBills(): Promise<AdminBill[]> {
  const res = await billsApi.index.$get();
  if (!res.ok) throw new Error("議案一覧の取得に失敗しました");
  const data = await res.json();
  return data.bills;
}

export function useBills() {
  return useQuery({ queryKey: BILLS_KEY, queryFn: fetchBills });
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 409)
    return "会期内で重複する議案番号、または重複する slug です";
  if (status === 400) return "入力内容を確認してください";
  return fallback;
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBillInput) => {
      const res = await billsApi.index.$post({ json: input });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "議案の作成に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BILLS_KEY }),
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; input: UpdateBillInput }) => {
      const res = await billsApi[":id"].$patch({
        param: { id: vars.id },
        json: vars.input,
      });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "議案の更新に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BILLS_KEY }),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await billsApi[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("議案の削除に失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BILLS_KEY }),
  });
}
