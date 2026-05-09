import "server-only";

import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import { AI_MODELS } from "@mirai-gikai/shared/ai/models";
import { getModel } from "@mirai-gikai/shared/ai/get-model";
import { z } from "zod";
import { siteConfig } from "@/config/site.config";

export type BillContextForContent = {
  title: string;
  billNumber: string | null;
  summary: string;
  status: string;
};

export type MinuteSourceForContent = {
  title: string;
  meeting_date: string;
  markdown_text: string;
};

const billContentsSchema = z.object({
  normal: z.object({
    title: z.string(),
    summary: z.string(),
    content: z.string(),
  }),
  hard: z.object({
    title: z.string(),
    summary: z.string(),
    content: z.string(),
  }),
});

export type GeneratedBillContents = z.infer<typeof billContentsSchema>;

/**
 * 議事録 Markdown と議案メタ情報から、住民向け解説本文を Vertex AI Gemini で
 * 2難易度（normal: 一般市民向け / hard: 詳しく知りたい人向け）生成する。
 *
 * normal: 中学生〜大人がさっと読んで理解できる平易な解説（500〜1000字）
 * hard:   制度・条文・財政影響など掘り下げた解説（1000〜2000字）
 */
export async function generateBillContents(
  bill: BillContextForContent,
  minutes: MinuteSourceForContent[]
): Promise<GeneratedBillContents> {
  const minutesSection = minutes
    .map(
      (m) => `## ${m.title}（${m.meeting_date}）

${m.markdown_text}`
    )
    .join("\n\n---\n\n");

  const system = `あなたは ${siteConfig.councilName} の議案を住民向けにわかりやすく解説するライターです。
入力される議事録（速報版）を一次情報として、対象議案について 2 つの難易度の解説 markdown を作成してください。

# 出力ルール
- title は議案名そのまま、もしくは住民向けにわかりやすく言い換えたもの。元の意味を変えない。
- summary は 1〜2 文（150 字以内）。議案で何が変わるのかを端的に。
- content は markdown 形式。見出し（##, ###）、箇条書き、表を活用して構造化する。
- normal の content は 500〜1000 字、専門用語は最小限、日常語で。
- hard の content は 1000〜2000 字、条文番号・財政影響・他自治体比較・委員会論点など踏み込む。
- 議事録に書かれていない事実は推測せず、「議事録からは読み取れない」と明記する。
- 各会派の賛否や発言要旨に触れる場合、議事録の表現を尊重する。
- 結論を断定せず、論点を並べる中立的なトーンを保つ。`;

  const prompt = `# 対象議案
- 議案番号: ${bill.billNumber ?? "（番号なし）"}
- 議案名: ${bill.title}
- 概要: ${bill.summary}
- 議決ステータス: ${bill.status}

# 議事録
${minutesSection}

上記の議案について、議事録から読み取れる情報のみを根拠に、normal（一般市民向け）と hard（詳しく知りたい人向け）の解説本文を生成してください。`;

  const { object } = await generateObject({
    model: getModel(AI_MODELS.pro),
    system,
    prompt,
    schema: billContentsSchema,
  });
  return object;
}
