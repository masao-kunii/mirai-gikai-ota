/**
 * 区長提出議案の原文 PDF（グループPDF：複数議案を含む）を Gemini に渡し、
 * 指定議案ごとに住民向け解説（normal/hard）を生成する純粋ユーティリティ。
 *
 * 取り込みスクリプト（tsx）からも再利用するため "server-only" / "@/" は使わない。
 * モデル識別子は文字列で渡し、共有 sdk が getModel で解決する。
 */

import { AI_MODELS } from "@mirai-gikai/shared/ai/models";
import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import { z } from "zod";

export type PdfBillInput = {
  /** DB と突き合わせる表記（例: 第58号議案）。AI にもこの表記で返させる */
  billNumber: string;
  title: string;
};

const summarySchema = z.object({
  bills: z.array(
    z.object({
      billNumber: z
        .string()
        .describe("入力で与えた議案番号の表記をそのまま返す"),
      found: z
        .boolean()
        .describe("この議案の内容が PDF から読み取れた場合 true"),
      normal: z.object({
        summary: z.string().describe("1〜2文・150字以内の平易な要約"),
        content: z.string().describe("500〜1000字・日常語の markdown 解説"),
      }),
      hard: z.object({
        summary: z.string().describe("要点を簡潔にまとめた要約"),
        content: z
          .string()
          .describe("800〜1500字・条文/金額/制度に踏み込む markdown 解説"),
      }),
    })
  ),
});

export type GeneratedPdfSummaries = z.infer<typeof summarySchema>;

function buildSystem(sourceLabel: string): string {
  return `あなたは大田区議会の案件を住民にわかりやすく伝えるライターです。
添付 PDF は${sourceLabel}の原文です。指定された各案件について、PDF 本文のみを根拠に解説を作成してください。

# ルール
- normal.summary: 1〜2文・150字以内。「何がどう変わる/何が報告されたか」を端的に。
- normal.content: 500〜1000字。中学生〜大人が読める日常語。markdown（見出し/箇条書き可）。
- hard.summary: 要点を簡潔に。
- hard.content: 800〜1500字。条文番号・金額・制度・影響など踏み込む。markdown。
- PDF に該当案件の記載が見つからない場合は found=false とし、summary/content は空文字にする。
- PDF に書かれていない事実は推測・補完しない。断定を避け、中立的なトーンを保つ。
- billNumber は入力で与えた表記をそのまま返す（対応付けに使うため変更しない）。`;
}

/**
 * グループ PDF と、その PDF に含まれる案件リストから、案件ごとの解説を生成する。
 * sourceLabel で原文の種別（例: 区長提出議案 / 区から議会への報告）を指定する。
 */
export async function generateBillSummariesFromPdf(
  pdfBytes: Buffer,
  bills: PdfBillInput[],
  sessionName: string,
  sourceLabel = "区長提出議案"
): Promise<GeneratedPdfSummaries> {
  const billList = bills.map((b) => `- ${b.billNumber}: ${b.title}`).join("\n");

  const prompt = `# 会期: ${sessionName}
# 対象案件（この PDF に含まれるもの）
${billList}

上記の各案件について normal / hard の解説を生成してください。`;

  const { object } = await generateObject({
    model: AI_MODELS.pro,
    system: buildSystem(sourceLabel),
    schema: summarySchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "file", mediaType: "application/pdf", data: pdfBytes },
        ],
      },
    ],
  });

  return object;
}
