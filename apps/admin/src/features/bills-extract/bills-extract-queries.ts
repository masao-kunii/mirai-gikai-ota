import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminBillsExtractApi as extractApi } from "../../lib/api";

type ExtractResponse = InferResponseType<
  (typeof extractApi.extract)["$post"],
  200
>;
export type ExtractedBill = ExtractResponse["bills"][number];

export type ImportInput = InferRequestType<
  (typeof extractApi.import)["$post"]
>["json"];

/** 選択した議事録を LLM で解析し、議案候補＋会派見解を得る（保存しない）。 */
export function useExtractFromMinutes() {
  return useMutation({
    mutationFn: async (minuteIds: string[]): Promise<ExtractResponse> => {
      const res = await extractApi.extract.$post({ json: { minuteIds } });
      if (!res.ok) {
        throw new Error(
          res.status === 400
            ? "本文（Markdown）のある議事録を選んでください"
            : "抽出に失敗しました（時間をおいて再試行してください）"
        );
      }
      return res.json();
    },
  });
}

/** レビューして選んだ候補を draft 議案として取り込む。 */
export function useImportExtractedBills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ImportInput) => {
      const res = await extractApi.import.$post({ json: input });
      if (!res.ok) throw new Error("取り込みに失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bills"] }),
  });
}
