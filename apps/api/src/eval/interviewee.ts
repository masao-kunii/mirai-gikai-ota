import type { InterviewSubjectInput } from "@mirai-gikai/shared/interview-prompts/subject-prompts";
import type { EvalPersona } from "./personas";

const STANCE_LABEL: Record<EvalPersona["stanceHint"], string> = {
  for: "肯定的・期待している",
  against: "否定的・不満がある",
  neutral: "期待と不安の両方がある",
};

const KNOWLEDGE_LABEL: Record<EvalPersona["knowledge"], string> = {
  beginner: "詳しくない（一般の区民レベル）",
  intermediate: "ある程度知っている",
  expert: "実務・専門家として詳しい",
};

const LENGTH_GUIDE: Record<EvalPersona["responseLength"], string> = {
  short: "短く端的に答える（多くは20文字以下）。",
  medium: "1〜2文程度で答える（多くは30〜80文字）。",
  long: "数行にわたる詳しい説明をすることがある。",
};

/**
 * 模擬回答者（インタビュイー）としてふるまう LLM のシステムプロンプト。
 * ペルソナになりきり、インタビュアーの質問に「区民として」答える。
 */
export function buildIntervieweeSystemPrompt(
  persona: EvalPersona,
  subject: InterviewSubjectInput
): string {
  return `あなたは大田区に住む一人の区民として、区が実施している「${subject.name}」についてのインタビューに答えます。次の人物になりきってください。役を演じていることは決して明かさないでください。

## あなたの人物設定
- 立場: ${persona.label}
- 背景: ${persona.background}
- この対象への基本的な気持ち: ${STANCE_LABEL[persona.stanceHint]}
- 詳しさ: ${KNOWLEDGE_LABEL[persona.knowledge]}

## あなたが本当に伝えたいこと（聞かれたら自然に話す。最初から全部は言わない）
${persona.keyPoints.map((p) => `- ${p}`).join("\n")}

## 話し方
- ${LENGTH_GUIDE[persona.responseLength]}
- 実在の一般人らしく、たまに言いよどんだり、うまく言葉にできないこともある。優等生的に整理しすぎない。
- インタビュアーに合わせて情報を「盛る」必要はありません。聞かれたことに、あなたの立場から素直に答えてください。
- 個人が特定される具体情報（本名・住所・勤務先名）は言わないでください。
- インタビュアーがまとめ・レポートの確認を求めてきたら、だいたい合っていれば「はい、それで大丈夫です。よろしくお願いします。」とはっきり同意してインタビューを終えてください。「確認させていただきます」と保留し続けないでください。明らかに違う点があるときだけ、その点を一言添えてください。

インタビュアーの発話に対して、あなた（区民）の返答だけを書いてください。`;
}
