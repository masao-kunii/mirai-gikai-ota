"use server";

import { createAdminClient } from "@mirai-gikai/supabase";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import {
  type ImportTeireiResult,
  importTeireiBills,
} from "../services/import-teirei-bills";

export type ImportFromTeireiInput = {
  /** 定例会 index ページの URL */
  indexUrl: string;
  /** 紐付ける council_sessions.id */
  councilSessionId: string;
  /** 取り込み後に即時公開するか（デフォルト false = draft） */
  publish?: boolean;
};

/**
 * 大田区議会の定例会 index ページから議案・報告・請願陳情・会派見解を
 * 取り込む Server Action。
 *
 * 取り込みはデフォルト draft（管理画面で確認後に /bills の一括公開で公開）。
 */
export async function importFromTeirei(
  input: ImportFromTeireiInput
): Promise<ImportTeireiResult> {
  await requireAdmin();

  const supabase = createAdminClient();

  // 会期名を取得（bill_contents の本文に使う）
  const { data: session, error: sErr } = await supabase
    .from("council_sessions")
    .select("name")
    .eq("id", input.councilSessionId)
    .maybeSingle();
  if (sErr || !session) {
    return {
      ok: false,
      billsUpserted: 0,
      stancesUpserted: 0,
      warnings: [],
      error: "指定された会期が見つかりません",
    };
  }

  const result = await importTeireiBills(
    supabase,
    async (url) => {
      const res = await fetch(url, {
        headers: { "user-agent": "mirai-gikai-ota/bills-import" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${url}`);
      }
      return res.text();
    },
    {
      indexUrl: input.indexUrl,
      councilSessionId: input.councilSessionId,
      sessionName: session.name.replace(/\s+/g, ""),
      publishStatus: input.publish ? "published" : "draft",
    }
  );

  if (result.ok) {
    revalidatePath("/bills");
    await invalidateWebCache();
  }

  return result;
}
