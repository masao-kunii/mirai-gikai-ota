import { getModel } from "@mirai-gikai/shared/ai/get-model";
import { AI_MODELS } from "@mirai-gikai/shared/ai/models";
import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import { z } from "zod";

/**
 * 議事録（Markdown）から議案と会派見解を構造化抽出する（ai-collection の移植）。
 *
 * 旧実装はローカルファイル（collections/*.json）にドラフトを保存していたが、
 * Workers ではファイルシステムを持てないため、新アーキでは**ステートレス**にする：
 *   1. この抽出で候補を返す（保存しない）
 *   2. 管理画面でレビューし、選んだものだけ議案として作成する
 */

const billStatusSchema = z.enum([
  "submitted",
  "in_committee",
  "plenary_session",
  "approved",
  "rejected",
  "adopted",
  "partially_adopted",
]);

// 抽出時の会派スタンス。absent（退席・欠席）は DB の stance_type_enum に無いので
// 取り込み時に落とす（faction_stances は for/against/neutral 等のみ）。
const stanceTypeSchema = z.enum(["for", "against", "neutral", "absent"]);

export const minutesExtractionSchema = z.object({
  bills: z.array(
    z.object({
      billNumber: z.string().nullable(),
      title: z.string(),
      summary: z.string(),
      status: billStatusSchema,
      submitter: z.string().nullable(),
    })
  ),
  factionStances: z.array(
    z.object({
      billTitle: z.string(),
      factionName: z.string(),
      stanceType: stanceTypeSchema,
      comment: z.string().nullable(),
    })
  ),
});

export type MinutesExtractionResult = z.infer<typeof minutesExtractionSchema>;

export type MinuteForExtraction = {
  title: string | null;
  meetingDate: string;
  markdownText: string;
};

const COUNCIL_NAME = "大田区議会";

function buildPrompt(minutes: MinuteForExtraction[]): {
  system: string;
  prompt: string;
} {
  const system = `あなたは ${COUNCIL_NAME} の議事録分析の専門家です。
入力された議事録（速報版）から、その会議で審議・採決された議案類（議案・請願・陳情・意見書・決議・諮問等）を網羅的に抽出し、
さらに討論で表明された各会派の賛否と要旨を構造化データとして出力してください。

# 抽出ルール
- 議案番号は議事録にある正式な表記をそのまま使う（例: "第1号議案"、"7第38号"、"意見書案第3号"）。番号がなければ null。
- 議案名は議事録にある正式な議案名・請願名をそのまま使う。
- summary は議案の趣旨を、議事録の説明文・委員長報告等から1〜3文で要約する。独自の評価は含めない。
- status は議事録での結果に基づき次の値を選ぶ:
  - "approved": 議案・条例案・予算案が可決された
  - "rejected": 否決された / 不採択
  - "adopted": 請願・陳情が採択された
  - "partially_adopted": 趣旨採択
  - "in_committee": 委員会付託中で本会議採決前
  - "plenary_session": 本会議審議中
  - "submitted": 上程のみ
- 会派名は議事録に登場する正式な表記をそのまま使う。
- stanceType: "for"=賛成 / "against"=反対 / "neutral"=中立・態度保留 / "absent"=退席・欠席。
- 各議案ごとに、明示的に賛否が記載されている会派のみ抽出する。記載がない会派を勝手に補完しない。
- comment は当該会派の討論の要旨を1〜2文で書く。原文のニュアンスを保つ。`;

  const sections = minutes
    .map(
      (m, i) =>
        `## ${i + 1}. ${m.title ?? "議事録"}（${m.meetingDate}）\n\n${m.markdownText}`
    )
    .join("\n\n---\n\n");

  const prompt = `次の ${minutes.length} 件の議事録から、議案と会派見解を抽出してください。
複数の議事録に同じ議案が登場する場合は、最終結果（採決があればそれ）を採用し、議案は1件にまとめてください。

${sections}`;

  return { system, prompt };
}

export async function extractFromMinutes(
  minutes: MinuteForExtraction[]
): Promise<MinutesExtractionResult> {
  const { system, prompt } = buildPrompt(minutes);
  const { object } = await generateObject({
    model: getModel(AI_MODELS.pro),
    system,
    prompt,
    schema: minutesExtractionSchema,
  });
  return object;
}

export type FactionRecord = {
  id: string;
  displayName: string;
  alternativeNames: string[];
};

/**
 * 会派名から DB の会派を引く（完全一致のみ）。
 *
 * 部分一致を許すと「大田区議会議員団」が「自由民主党大田区議会議員団」等に
 * 誤マッチするため、別表記は会派の alternative_names に登録して対応する。
 */
export function findFactionByName(
  factions: FactionRecord[],
  searchName: string
): FactionRecord | undefined {
  const normalized = searchName.trim().toLowerCase();
  const byDisplayName = factions.find(
    (f) => f.displayName.toLowerCase() === normalized
  );
  if (byDisplayName) return byDisplayName;
  return factions.find((f) =>
    f.alternativeNames.some((alt) => alt.toLowerCase() === normalized)
  );
}
