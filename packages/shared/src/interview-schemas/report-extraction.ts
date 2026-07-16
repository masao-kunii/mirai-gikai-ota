import { z } from "zod";
import { type InterviewReportData, interviewReportSchema } from "./schemas";

/**
 * 保存済み assistant メッセージ（構造化JSON文字列）からレポートを抽出する。
 * next_stage はレスポンス時のみ必要なので抽出スキーマには含めない。
 */
const reportExtractionSchema = z.object({
  text: z.string(),
  report: interviewReportSchema,
});

export function extractReportFromMessage(
  content: string
): InterviewReportData | null {
  try {
    const parsed = JSON.parse(content);
    const result = reportExtractionSchema.safeParse(parsed);
    if (result.success) {
      return result.data.report;
    }
  } catch (e) {
    // JSON でない場合は無視
    console.error("Failed to parse report from message content", content, e);
  }
  return null;
}
