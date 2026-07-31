import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminBillsApi as billsApi } from "../../lib/api";

export type BillContentsResponse = InferResponseType<
  (typeof billsApi)[":id"]["contents"]["$get"],
  200
>;
export type SaveBillContentsInput = InferRequestType<
  (typeof billsApi)[":id"]["contents"]["$put"]
>["json"];

type GenerateResponse = InferResponseType<
  (typeof billsApi)[":id"]["generate-contents"]["$post"],
  200
>;
export type GeneratedContents = GenerateResponse["contents"];

const contentsKey = (billId: string) =>
  ["admin", "bills", billId, "contents"] as const;

export function useBillContents(billId: string) {
  return useQuery({
    queryKey: contentsKey(billId),
    queryFn: async (): Promise<BillContentsResponse> => {
      const res = await billsApi[":id"].contents.$get({
        param: { id: billId },
      });
      if (!res.ok) throw new Error("本文の取得に失敗しました");
      return res.json();
    },
  });
}

export function useSaveBillContents(billId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveBillContentsInput) => {
      const res = await billsApi[":id"].contents.$put({
        param: { id: billId },
        json: input,
      });
      if (!res.ok) throw new Error("本文の保存に失敗しました");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentsKey(billId) });
      // 一覧の本文有無の表示にも影響しうるため議案一覧も無効化。
      qc.invalidateQueries({ queryKey: ["admin", "bills"] });
    },
  });
}

/** AI で本文（normal/hard）を生成する。保存はせず、フォームに反映してレビューする。 */
export function useGenerateBillContents(billId: string) {
  return useMutation({
    mutationFn: async (): Promise<GeneratedContents> => {
      const res = await billsApi[":id"]["generate-contents"].$post({
        param: { id: billId },
      });
      if (!res.ok) {
        throw new Error(
          res.status === 502
            ? "AI 生成に失敗しました（時間をおいて再試行してください）"
            : "AI 生成に失敗しました"
        );
      }
      const data = await res.json();
      return data.contents;
    },
  });
}
