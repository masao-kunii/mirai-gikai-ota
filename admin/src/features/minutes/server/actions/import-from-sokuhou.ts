"use server";

import { createAdminClient } from "@mirai-gikai/supabase";
import { revalidatePath } from "next/cache";
import {
  bulkCreateMinutes,
  findExistingSourcePdfUrls,
  type CreateMinuteInput,
} from "../repositories/minutes-repository";
import {
  fetchSokuhouMinutes,
  type ScrapedMinute,
} from "../utils/parse-sokuhou-page";

export type ImportResult = {
  ok: boolean;
  /** 速報版ページから取得した件数 */
  fetched: number;
  /** 既に登録済みでスキップした件数 */
  skipped: number;
  /** 会期が DB に無くスキップした件数 */
  noSession: number;
  /** 今回新規登録した件数 */
  inserted: number;
  /** 詳細メッセージ (UI に表示) */
  message: string;
  /** skip / noSession の内訳ラベル一覧 (UI に表示) */
  warnings: string[];
};

/**
 * 速報版ページから本会議録 PDF を一括取り込み。
 *
 * 取り込み手順:
 *   1. fetchSokuhouMinutes で公式ページの PDF 一覧を取得
 *   2. council_sessions テーブルから既存の会期を取得し、sessionName 完全一致でマッチ
 *   3. 既存登録済みの source_pdf_url をスキップ
 *   4. 残りを bulk insert
 */
export async function importMinutesFromSokuhou(): Promise<ImportResult> {
  const warnings: string[] = [];

  let scraped: ScrapedMinute[];
  try {
    scraped = await fetchSokuhouMinutes();
  } catch (e) {
    return {
      ok: false,
      fetched: 0,
      skipped: 0,
      noSession: 0,
      inserted: 0,
      message: e instanceof Error ? e.message : String(e),
      warnings: [],
    };
  }

  if (scraped.length === 0) {
    return {
      ok: true,
      fetched: 0,
      skipped: 0,
      noSession: 0,
      inserted: 0,
      message: "速報版ページに PDF リンクが見つかりませんでした。",
      warnings: [],
    };
  }

  // council_sessions を name → id でマップ化
  const supabase = createAdminClient();
  const { data: sessions, error: sErr } = await supabase
    .from("council_sessions")
    .select("id, name");
  if (sErr) {
    return {
      ok: false,
      fetched: scraped.length,
      skipped: 0,
      noSession: 0,
      inserted: 0,
      message: `会期取得に失敗: ${sErr.message}`,
      warnings: [],
    };
  }
  const sessionIdByName = new Map(
    (sessions ?? []).map((s) => [s.name.replace(/\s+/g, ""), s.id])
  );

  // 既に DB にある PDF URL を取得
  const existing = await findExistingSourcePdfUrls(
    scraped.map((s) => s.pdfUrl)
  );

  const inputs: CreateMinuteInput[] = [];
  let skipped = 0;
  let noSession = 0;

  for (const item of scraped) {
    if (existing.has(item.pdfUrl)) {
      skipped++;
      continue;
    }
    const normalizedName = item.sessionName?.replace(/\s+/g, "") ?? "";
    const sessionId = sessionIdByName.get(normalizedName);
    if (!sessionId) {
      noSession++;
      warnings.push(
        `「${item.label}」: 会期 "${item.sessionName ?? "不明"}" が DB に未登録のためスキップ`
      );
      continue;
    }
    inputs.push({
      council_session_id: sessionId,
      meeting_date: item.meetingDate,
      day_number: item.dayNumber,
      title: item.label,
      source_pdf_url: item.pdfUrl,
    });
  }

  let inserted = 0;
  if (inputs.length > 0) {
    try {
      inserted = await bulkCreateMinutes(inputs);
    } catch (e) {
      return {
        ok: false,
        fetched: scraped.length,
        skipped,
        noSession,
        inserted: 0,
        message: e instanceof Error ? e.message : String(e),
        warnings,
      };
    }
  }

  revalidatePath("/minutes");

  return {
    ok: true,
    fetched: scraped.length,
    skipped,
    noSession,
    inserted,
    message:
      inserted > 0
        ? `${inserted} 件を取り込みました (取得 ${scraped.length} / スキップ ${skipped} / 会期未登録 ${noSession})`
        : `新規取り込みなし (取得 ${scraped.length} / スキップ ${skipped} / 会期未登録 ${noSession})`,
    warnings,
  };
}
