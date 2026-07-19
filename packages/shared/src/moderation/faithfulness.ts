import { z } from "zod";

/**
 * 要約忠実性チェック。AI が作ったレポート（要約・意見）が、実際の対話ログに
 * 忠実か（捏造・歪曲・誇張・立場のすり替えが無いか）を LLM で検証する。
 * モデレーション（安全性）とは別軸で、「本人が言っていないことを住民の声として
 * 出す」信頼リスクを防ぐ。忠実でない（faithful=false）なら自動公開せず承認待ちへ。
 */
export const faithfulnessResultSchema = z.object({
  faithful: z
    .boolean()
    .describe(
      "要約・意見が対話ログに忠実なら true。ログにない主張の捏造・意味の歪曲・誇張・賛否や立場のすり替えがあれば false"
    ),
  reasoning: z
    .string()
    .describe("判定の根拠を簡潔に説明（200文字以内）。false の場合は該当箇所を挙げる"),
});

export type FaithfulnessResult = z.infer<typeof faithfulnessResultSchema>;

type Message = { role: string; content: string };

/**
 * 忠実性チェック用プロンプトを構築する。
 */
export function buildFaithfulnessPrompt(params: {
  summary: string | null;
  opinions: Array<{ title: string; content: string }> | null;
  messages: Message[];
}): string {
  const conversation =
    params.messages.length > 0
      ? params.messages.map((m) => `[${m.role}] ${m.content}`).join("\n")
      : "（対話ログなし）";

  const opinionsText =
    params.opinions && params.opinions.length > 0
      ? params.opinions
          .map((o, i) => `${i + 1}. ${o.title}\n   ${o.content}`)
          .join("\n")
      : "（意見なし）";

  return `あなたは、AIが作成したインタビュー要約が「実際の発言に忠実か」を厳密に検証する校閲者です。

以下の【対話ログ】だけを根拠に、【要約】と【意見】が忠実かどうかを判定してください。

## 対話ログ（唯一の根拠）
${conversation}

## 要約
${params.summary ?? "（要約なし）"}

## 意見
${opinionsText}

## 判定基準（1つでも当てはまれば faithful=false）
- **捏造**: 対話ログに根拠が無い主張・事実・数値が要約/意見に含まれている
- **歪曲**: 発言の意味が変えられている（条件付きの意見が断定にされている等）
- **誇張**: 強度が不当に強められている（「少し不安」→「強く反対」等）
- **立場のすり替え**: 賛否・立場（for/against/neutral 等）が発言と食い違う
- **文脈無視**: 前後の文脈を切り取って本人の意図と異なる意味にしている

## 注意
- 表現を短く言い換える・自然な日本語に整えることは、意味が保たれていれば忠実（true）です。
- 複数の発言を無理なく統合するのは許容します。ログにある内容の範囲内かどうかで判定してください。
- 判断に迷う軽微な言い換えは true 寄りに、明確な逸脱があれば false にしてください。`;
}
