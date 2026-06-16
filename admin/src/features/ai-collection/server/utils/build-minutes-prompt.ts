import "server-only";
import { siteConfig } from "@/config/site.config";

export type MinuteForPrompt = {
  title: string;
  meeting_date: string;
  markdown_text: string;
};

/**
 * 議事録 Markdown から議案・会派見解を抽出するための system + user プロンプトを構築する。
 * Vertex AI Gemini の generateObject に渡すことを想定。
 */
export function buildMinutesExtractionPrompt(minutes: MinuteForPrompt[]): {
  system: string;
  prompt: string;
} {
  const system = `あなたは ${siteConfig.councilName} の議事録分析の専門家です。
入力された議事録（速報版）から、その会議で審議・採決された議案類（議案・請願・陳情・意見書・決議・諮問等）を網羅的に抽出し、
さらに討論で表明された各会派の賛否と要旨を構造化データとして出力してください。

# 抽出ルール
- 議案番号は議事録にある正式な表記をそのまま使う（例: "第1号議案"、"7第38号"、"意見書案第3号"）。番号がなければ null。
- 議案名は議事録にある正式な議案名・請願名をそのまま使う。
- summary は議案の趣旨を、議事録の説明文・委員長報告等から1〜3文で要約する。元になる発言を要約するだけでよく、独自の評価は含めない。
- status は議事録での結果に基づき次の値を選ぶ:
  - "approved": 議案・条例案・予算案が可決された
  - "rejected": 否決された / 不採択
  - "adopted": 請願・陳情が採択された
  - "partially_adopted": 趣旨採択
  - "in_committee": 委員会付託中で本会議採決前
  - "plenary_session": 本会議審議中
  - "submitted": 上程のみ
- 会派名は議事録に登場する正式な表記（例: "自民党・無所属の会"、"つばさ"、"公明党"）をそのまま使う。
- stanceType:
  - "for": 賛成
  - "against": 反対
  - "neutral": 中立・態度保留
  - "absent": 退席・欠席
- 各議案ごとに、明示的に賛否が記載されている会派のみ抽出する。記載がない会派を勝手に補完しないこと。
- comment は当該会派の討論の要旨を1〜2文で書く。原文のニュアンスを保つ。
- sourceUrls は今回は空配列で良い（議事録URLは別途付与される）。`;

  const sections = minutes
    .map(
      (m, i) => `## ${i + 1}. ${m.title}（${m.meeting_date}）

${m.markdown_text}`
    )
    .join("\n\n---\n\n");

  const prompt = `次の ${minutes.length} 件の議事録から、議案と会派見解を抽出してください。
複数の議事録に同じ議案が登場する場合は、最終結果（採決があればそれ）を採用し、議案は1件にまとめてください。

${sections}`;

  return { system, prompt };
}
