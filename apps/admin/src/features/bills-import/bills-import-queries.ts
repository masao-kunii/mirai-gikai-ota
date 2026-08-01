import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBillsExtractApi as extractApi } from "../../lib/api";

/**
 * 大田区議会の定例会ページから議案を一括取り込みする。
 * 取り込みは常に下書きで作成され、再実行すると議決結果が更新される。
 */
export function useImportTeirei() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      indexUrl: string;
      councilSessionId: string;
    }) => {
      const res = await extractApi["import-teirei"].$post({ json: vars });
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "会期が見つかりません"
            : "取り込みに失敗しました（URL と公開ページの構造を確認してください）"
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bills"] }),
  });
}
