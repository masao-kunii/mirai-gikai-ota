import { NextResponse } from "next/server";
import { extractFromMinutes } from "@/features/ai-collection/server/utils/extract-from-minutes";
import {
  loadRun,
  saveRun,
} from "@/features/ai-collection/server/utils/storage";
import type {
  CollectionRun,
  DraftBill,
  DraftFactionStance,
} from "@/features/ai-collection/shared/types";
import { findMinuteById } from "@/features/minutes/server/repositories/minutes-repository";
import { fetchAndExtractPdfToMarkdown } from "@/features/minutes/server/services/extract-pdf-to-markdown";
import { updateMinuteMarkdown } from "@/features/minutes/server/repositories/minutes-repository";

/**
 * 選択された議事録（minuteIds）の markdown_text を Vertex AI Gemini に渡し、
 * 議案・会派見解を抽出して CollectionRun として保存する。
 *
 * markdown_text が未抽出の議事録は、その場で markitdown を実行して抽出する。
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { minuteIds?: string[] };
    const minuteIds = body.minuteIds ?? [];
    if (minuteIds.length === 0) {
      return NextResponse.json(
        { error: "minuteIds は1件以上必要です" },
        { status: 400 }
      );
    }

    // 議事録を取得し、未抽出のものは markitdown で抽出して保存
    const minutes = await Promise.all(
      minuteIds.map(async (id) => {
        const minute = await findMinuteById(id);
        if (!minute) {
          throw new Error(`議事録 ${id} が見つかりません`);
        }
        let markdown = minute.markdown_text;
        if (!markdown) {
          markdown = await fetchAndExtractPdfToMarkdown(minute.source_pdf_url);
          await updateMinuteMarkdown(id, markdown);
        }
        return {
          title: minute.title ?? `${minute.meeting_date} の議事録`,
          meeting_date: minute.meeting_date,
          markdown_text: markdown,
          source_pdf_url: minute.source_pdf_url,
        };
      })
    );

    const dates = minutes
      .map((m) => m.meeting_date)
      .sort((a, b) => a.localeCompare(b));
    const startDate = dates[0] ?? "";
    const endDate = dates[dates.length - 1] ?? "";

    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const initialRun: CollectionRun = {
      id: runId,
      startDate,
      endDate,
      mode: "minutes",
      status: "running",
      createdAt: now,
      completedAt: null,
      error: null,
      bills: [],
      factionStances: [],
      sources: minutes.map((m) => m.source_pdf_url),
    };
    await saveRun(initialRun);

    runMinutesExtractionInBackground(runId, minutes);

    return NextResponse.json({ runId });
  } catch (error) {
    console.error("Minutes extraction start error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "抽出の開始に失敗しました",
      },
      { status: 500 }
    );
  }
}

async function runMinutesExtractionInBackground(
  runId: string,
  minutes: Array<{
    title: string;
    meeting_date: string;
    markdown_text: string;
    source_pdf_url: string;
  }>
): Promise<void> {
  try {
    const result = await extractFromMinutes(
      minutes.map((m) => ({
        title: m.title,
        meeting_date: m.meeting_date,
        markdown_text: m.markdown_text,
      }))
    );

    const run = await loadRun(runId);
    if (!run) return;

    const bills: DraftBill[] = result.bills.map((b) => ({
      id: crypto.randomUUID(),
      billNumber: b.billNumber,
      title: b.title,
      summary: b.summary,
      status: b.status,
      submitter: b.submitter,
      sourceUrls: minutes.map((m) => m.source_pdf_url),
    }));

    const factionStances: DraftFactionStance[] = result.factionStances.map(
      (s) => ({
        id: crypto.randomUUID(),
        billTitle: s.billTitle,
        factionName: s.factionName,
        stanceType: s.stanceType,
        comment: s.comment,
        sourceUrls: minutes.map((m) => m.source_pdf_url),
      })
    );

    const updatedRun: CollectionRun = {
      ...run,
      status: "completed",
      completedAt: new Date().toISOString(),
      bills,
      factionStances,
    };
    await saveRun(updatedRun);
  } catch (error) {
    const run = await loadRun(runId);
    if (!run) return;
    const updatedRun: CollectionRun = {
      ...run,
      status: "failed",
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "不明なエラー",
    };
    await saveRun(updatedRun);
  }
}
