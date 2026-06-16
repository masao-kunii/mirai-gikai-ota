"use server";

import { revalidatePath } from "next/cache";
import {
  listMinutes,
  updateMinuteMarkdown,
} from "../repositories/minutes-repository";
import { fetchAndExtractPdfToMarkdown } from "../services/extract-pdf-to-markdown";

export type ExtractAllResult = {
  ok: boolean;
  /** まだ markdown_text が無くて対象になった件数 */
  targeted: number;
  /** 抽出に成功した件数 */
  succeeded: number;
  /** 失敗した件数 */
  failed: number;
  /** 失敗詳細 (タイトル + エラーメッセージ) */
  errors: string[];
  /** UI に表示するサマリ */
  message: string;
};

/**
 * markdown_text が未設定の議事録を全件まとめて Markdown 抽出する。
 *
 * Vertex AI Gemini に PDF を直接渡す方式 (extract-pdf-to-markdown.ts) を使うため
 * Cloud Run でも動作する。1 件あたり数十秒かかる可能性があるため、件数が多いと
 * Cloud Run のリクエストタイムアウト (デフォルト 60 分) に注意。
 *
 * 並列実行はせず、Gemini API への過負荷とエラー時の切り分けやすさを優先する。
 */
export async function extractAllMinutes(): Promise<ExtractAllResult> {
  const all = await listMinutes();
  const targets = all.filter((m) => !m.markdown_text);

  if (targets.length === 0) {
    return {
      ok: true,
      targeted: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
      message: "未抽出の議事録はありません。",
    };
  }

  let succeeded = 0;
  const errors: string[] = [];

  for (const minute of targets) {
    try {
      const markdown = await fetchAndExtractPdfToMarkdown(
        minute.source_pdf_url
      );
      await updateMinuteMarkdown(minute.id, markdown);
      succeeded++;
    } catch (e) {
      const label = minute.title ?? minute.meeting_date;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${label}: ${msg}`);
    }
  }

  revalidatePath("/minutes");

  const failed = errors.length;
  return {
    ok: failed === 0,
    targeted: targets.length,
    succeeded,
    failed,
    errors,
    message:
      failed === 0
        ? `${succeeded} 件すべて抽出しました`
        : `${succeeded} 件成功、${failed} 件失敗 (詳細は下記)`,
  };
}
