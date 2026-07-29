import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBillsMergeApi as mergeApi } from "../../lib/api";

/** 重複議案を keep へ統合する（マージ対象は削除）。 */
export function useMergeBills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      keepBillId: string;
      mergeBillIds: string[];
    }) => {
      const res = await mergeApi.index.$post({ json: vars });
      if (!res.ok) {
        throw new Error(
          res.status === 400 ? "選択した議案が不正です" : "マージに失敗しました"
        );
      }
      return res.json();
    },
    // 議案・タグ・スタンス等が変わるため議案一覧を無効化。
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bills"] }),
  });
}
