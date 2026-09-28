/**
 * 議案を区政テーマに振り分ける（AI）。議会（議案）と区政（テーマ）をつなぐための
 * 分類で、結果は議案タグ（テーマの bill_tag_label と同じ名前のタグ）として保存する。
 *
 * プロンプトの組み立てと結果の整理は純粋関数にして、テストできるようにしている。
 */
import { z } from "zod";
import { AI_MODELS } from "../ai/models";
import { generateObject } from "../ai/sdk";

export type ThemeForClassification = {
  slug: string;
  name: string;
  lead: string | null;
};

export type BillForClassification = {
  id: string;
  name: string;
  summary: string | null;
};

/** 1議案に付けるテーマの上限。多すぎると「何にでも関係する」になり導線の意味が薄れる。 */
export const MAX_THEMES_PER_BILL = 2;

export const classificationSchema = z.object({
  results: z.array(
    z.object({
      billId: z.string(),
      themeSlugs: z.array(z.string()),
    })
  ),
});

export type ThemeClassification = z.infer<typeof classificationSchema>;

export const CLASSIFY_SYSTEM = `あなたは大田区議会の議案を、区政のテーマに振り分ける担当です。
各議案について、住民がその議案を読んだあとに「区は普段この分野で何をしているか」を
知りたくなるテーマを選んでください。

- 選べるのは与えられたテーマの slug だけです
- 議案の中身と直接関係するテーマを、関係が強い順に最大${MAX_THEMES_PER_BILL}つまで選びます
- 条例の文言整理、人事（同意・選任）、区の組織や手数料全般など、特定のテーマに当てはまらない議案は空配列にします
- 迷う場合は選ばず空配列にします（無理に当てはめない）
- すべての議案について、与えられた billId をそのまま使って1件ずつ結果を返します`;

/** 議案のまとまりを分類するためのプロンプト。 */
export function buildClassifyPrompt(
  themes: ThemeForClassification[],
  bills: BillForClassification[]
): string {
  const themeLines = themes
    .map((t) => `- ${t.slug}: ${t.name}${t.lead ? `（${t.lead}）` : ""}`)
    .join("\n");
  const billLines = bills
    .map((b) =>
      [
        `### billId: ${b.id}`,
        `議案名: ${b.name}`,
        b.summary ? `概要: ${b.summary}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
  return `## テーマ\n${themeLines}\n\n## 議案\n${billLines}`;
}

/**
 * AI の結果を整える。知らない議案・テーマは捨て、重複を除き、上限で切る。
 * 結果が返らなかった議案は含めない（空配列＝「どれにも当てはまらない」と区別する）。
 */
export function normalizeClassification(
  output: ThemeClassification,
  themes: ThemeForClassification[],
  bills: BillForClassification[]
): Map<string, string[]> {
  const themeSlugs = new Set(themes.map((t) => t.slug));
  const billIds = new Set(bills.map((b) => b.id));
  const result = new Map<string, string[]>();
  for (const { billId, themeSlugs: slugs } of output.results) {
    if (!billIds.has(billId) || result.has(billId)) continue;
    const valid = [...new Set(slugs)].filter((s) => themeSlugs.has(s));
    result.set(billId, valid.slice(0, MAX_THEMES_PER_BILL));
  }
  return result;
}

/** 議案のまとまりを AI で分類する。 */
export async function classifyBillsIntoThemes(
  themes: ThemeForClassification[],
  bills: BillForClassification[]
): Promise<Map<string, string[]>> {
  const { object } = await generateObject({
    model: AI_MODELS.gemini3_8_flash,
    system: CLASSIFY_SYSTEM,
    prompt: buildClassifyPrompt(themes, bills),
    schema: classificationSchema,
  });
  return normalizeClassification(object, themes, bills);
}
