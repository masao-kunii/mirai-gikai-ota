"use server";

import { createAdminClient } from "@mirai-gikai/supabase";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import {
  findMinuteById,
  updateMinuteMarkdown,
} from "@/features/minutes/server/repositories/minutes-repository";
import { fetchAndExtractPdfToMarkdown } from "@/features/minutes/server/services/extract-pdf-to-markdown";
import { generateBillContents } from "../utils/generate-bill-content";

export type GenerateBillContentsResult =
  | {
      ok: true;
      results: Array<{
        billId: string;
        billName: string;
        normalChars: number;
        hardChars: number;
      }>;
      skipped: Array<{ billName: string; reason: string }>;
    }
  | { ok: false; error: string };

type Input = {
  /** 入力ソースとして使う議事録の id 配列 */
  minuteIds: string[];
  /** 対象議案の id 配列。空なら minutes に紐づく council_session の全議案を対象 */
  billIds?: string[];
};

/**
 * 指定された議事録 markdown を入力に、対象議案の bill_contents（normal / hard）を
 * Vertex AI Gemini で生成し upsert する。
 */
export async function generateBillContentsFromMinutesAction(
  input: Input
): Promise<GenerateBillContentsResult> {
  await requireAdmin();
  if (input.minuteIds.length === 0) {
    return { ok: false, error: "minuteIds は1件以上必要です" };
  }

  const supabase = createAdminClient();

  // 議事録を集める（未抽出は markitdown でその場で抽出）
  const minutes: {
    id: string;
    title: string;
    meeting_date: string;
    markdown_text: string;
    council_session_id: string;
  }[] = [];

  for (const id of input.minuteIds) {
    const m = await findMinuteById(id);
    if (!m) {
      return { ok: false, error: `議事録 ${id} が見つかりません` };
    }
    let md = m.markdown_text;
    if (!md) {
      md = await fetchAndExtractPdfToMarkdown(m.source_pdf_url);
      await updateMinuteMarkdown(id, md);
    }
    minutes.push({
      id: m.id,
      title: m.title ?? `${m.meeting_date} の議事録`,
      meeting_date: m.meeting_date,
      markdown_text: md,
      council_session_id: m.council_session_id,
    });
  }

  // 対象議案の特定
  const sessionIds = Array.from(
    new Set(minutes.map((m) => m.council_session_id))
  );

  let billIds = input.billIds;
  if (!billIds || billIds.length === 0) {
    const { data, error } = await supabase
      .from("bills")
      .select("id")
      .in("council_session_id", sessionIds);
    if (error) {
      return { ok: false, error: `対象議案取得失敗: ${error.message}` };
    }
    billIds = (data ?? []).map((b) => b.id);
  }
  if (billIds.length === 0) {
    return {
      ok: false,
      error: "対象議案が見つかりません。先にAI抽出→適用を実行してください。",
    };
  }

  // 議案メタを取得
  const { data: bills, error: billsError } = await supabase
    .from("bills")
    .select("id, name, bill_number, status")
    .in("id", billIds);
  if (billsError) {
    return { ok: false, error: `議案メタ取得失敗: ${billsError.message}` };
  }

  const minuteSourcesForPrompt = minutes.map((m) => ({
    title: m.title,
    meeting_date: m.meeting_date,
    markdown_text: m.markdown_text,
  }));

  const results: Extract<GenerateBillContentsResult, { ok: true }>["results"] =
    [];
  const skipped: Extract<GenerateBillContentsResult, { ok: true }>["skipped"] =
    [];

  // 既存 bill_contents を一括取得（summary が既に充実している議案はスキップ判定に使う）
  const { data: existingContents } = await supabase
    .from("bill_contents")
    .select("bill_id, difficulty_level, content")
    .in("bill_id", billIds);
  const existingByBill = new Map<string, Set<string>>();
  for (const c of existingContents ?? []) {
    if (!existingByBill.has(c.bill_id)) {
      existingByBill.set(c.bill_id, new Set());
    }
    // content が summary より明らかに長ければ「すでに本文あり」とみなす
    if (c.content && c.content.length > 600) {
      existingByBill.get(c.bill_id)?.add(c.difficulty_level);
    }
  }

  for (const bill of bills ?? []) {
    const existingLevels = existingByBill.get(bill.id) ?? new Set();
    if (existingLevels.has("normal") && existingLevels.has("hard")) {
      skipped.push({
        billName: bill.name,
        reason: "既に normal / hard の本文があります",
      });
      continue;
    }

    try {
      const generated = await generateBillContents(
        {
          title: bill.name,
          billNumber: bill.bill_number ?? null,
          summary: "",
          status: bill.status,
        },
        minuteSourcesForPrompt
      );

      const rows = (["normal", "hard"] as const).map((level) => ({
        bill_id: bill.id,
        difficulty_level: level,
        title: generated[level].title,
        summary: generated[level].summary.slice(0, 500),
        content: generated[level].content,
      }));

      const { error: upsertError } = await supabase
        .from("bill_contents")
        .upsert(rows, { onConflict: "bill_id,difficulty_level" });
      if (upsertError) {
        skipped.push({ billName: bill.name, reason: upsertError.message });
        continue;
      }

      results.push({
        billId: bill.id,
        billName: bill.name,
        normalChars: generated.normal.content.length,
        hardChars: generated.hard.content.length,
      });
    } catch (e) {
      skipped.push({
        billName: bill.name,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
  revalidatePath("/bills");

  return { ok: true, results, skipped };
}
