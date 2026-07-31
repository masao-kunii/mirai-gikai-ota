import { getModel } from "@mirai-gikai/shared/ai/get-model";
import { AI_MODELS } from "@mirai-gikai/shared/ai/models";
import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import { z } from "zod";

/**
 * 議案の本文（bill_contents）を LLM で生成する（ai-collection の中核を移植）。
 *
 * 議案メタ情報と、紐づく会期の議事録（Markdown）を一次情報として、住民向けの
 * 解説を 2 難易度（normal: 一般市民向け / hard: 詳しく知りたい人向け）で生成する。
 * 認証は get-model が担う（GEMINI_API_KEY→Developer API / 無→Vertex ADC）。管理系は
 * Vertex（ADC）想定。生成結果は保存せず、管理画面でレビューして保存する。
 */

const COUNCIL_NAME = "大田区議会";

const generatedSchema = z.object({
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

export type GeneratedBillContents = z.infer<typeof generatedSchema>;

export type GenerateBillContentsInput = {
  bill: {
    name: string;
    billNumber: string;
    status: string;
    statusNote: string | null;
    knowledgeSource: string | null;
  };
  minutes: {
    title: string | null;
    meetingDate: string;
    markdownText: string;
  }[];
};

export async function generateBillContents(
  input: GenerateBillContentsInput
): Promise<GeneratedBillContents> {
  const { bill, minutes } = input;

  const minutesSection =
    minutes.length > 0
      ? minutes
          .map(
            (m) =>
              `## ${m.title ?? "議事録"}（${m.meetingDate}）\n\n${m.markdownText}`
          )
          .join("\n\n---\n\n")
      : "（この議案に紐づく議事録本文はありません）";

  const system = `あなたは ${COUNCIL_NAME} の議案を住民向けにわかりやすく解説するライターです。
入力される議案情報と議事録（あれば一次情報）をもとに、対象議案について 2 つの難易度の解説 markdown を作成してください。

# 出力ルール
- title は議案名そのまま、もしくは住民向けにわかりやすく言い換えたもの。元の意味を変えない。
- summary は 1〜2 文（150 字以内）。議案で何が変わるのかを端的に。
- content は markdown 形式。見出し（##, ###）・箇条書き・表を活用して構造化する。
- normal の content は 500〜1000 字、専門用語は最小限、日常語で。
- hard の content は 1000〜2000 字、条文番号・財政影響・他自治体比較・委員会論点などに踏み込む。
- 与えられた情報に書かれていない事実は推測しない。不明な点は「資料からは読み取れない」と明記する。
- 結論を断定せず、論点を並べる中立的なトーンを保つ。`;

  const prompt = `# 対象議案
- 議案番号: ${bill.billNumber || "（番号なし）"}
- 議案名: ${bill.name}
- 審議状況: ${bill.status}
- 補足: ${bill.statusNote || "（なし）"}
- 参考メモ: ${bill.knowledgeSource || "（なし）"}

# 議事録
${minutesSection}

上記の議案について、与えられた情報のみを根拠に、normal（一般市民向け）と hard（詳しく知りたい人向け）の解説本文を生成してください。`;

  const { object } = await generateObject({
    model: getModel(AI_MODELS.pro),
    system,
    prompt,
    schema: generatedSchema,
  });
  return object;
}
