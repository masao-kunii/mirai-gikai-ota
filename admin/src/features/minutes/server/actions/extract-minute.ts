"use server";

import { revalidatePath } from "next/cache";
import {
  findMinuteById,
  updateMinuteMarkdown,
} from "../repositories/minutes-repository";
import { fetchAndExtractPdfToMarkdown } from "../services/extract-pdf-to-markdown";

export type ExtractMinuteResult =
  | { ok: true; charCount: number }
  | { ok: false; error: string };

/**
 * 指定した議事録の PDF を fetch → markitdown でMarkdown化 → DB保存。
 * ローカル開発では uvx 経由で markitdown[pdf] を実行する。
 */
export async function extractMinute(id: string): Promise<ExtractMinuteResult> {
  const minute = await findMinuteById(id);
  if (!minute) {
    return { ok: false, error: `議事録 ${id} が見つかりません` };
  }
  try {
    const markdown = await fetchAndExtractPdfToMarkdown(minute.source_pdf_url);
    await updateMinuteMarkdown(id, markdown);
    revalidatePath("/minutes");
    revalidatePath(`/minutes/${id}`);
    return { ok: true, charCount: markdown.length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
