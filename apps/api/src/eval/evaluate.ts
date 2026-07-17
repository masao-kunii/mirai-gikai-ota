import { generateObject } from "@mirai-gikai/shared/ai/sdk";
import type { InterviewSubjectInput } from "@mirai-gikai/shared/interview-prompts/subject-prompts";
import { z } from "zod";
import type { EvalPersona } from "./personas";
import type { SimResult } from "./run-interview";

export const interviewEvaluationSchema = z
  // スコアは 1〜5 の想定だが、判定LLMがまれに範囲外を返すため schema では
  // 制約せず（落とさない）、利用側で 1〜5 に clamp する。
  .object({
    question_quality: z
      .number()
      .describe(
        "質問の質（1〜5）。1メッセージ1論点・「なぜ」の詰問回避・共感しつつ自然に深掘りできていたか（5=非常に良い）"
      ),
    coverage: z
      .number()
      .describe(
        "回答者が本当に伝えたかった主要論点をどれだけ引き出せたか（1〜5）"
      ),
    report_faithfulness: z
      .number()
      .describe(
        "生成レポートが対話内容に忠実か（対話にないことを書いていないか、要約が的確か）（1〜5）"
      ),
    interviewee_satisfaction: z
      .number()
      .describe(
        "回答者の立場で、自分の考えを十分に伝えられたと感じるか（1〜5）"
      ),
    covered_points: z
      .array(z.string())
      .describe("インタビューで引き出せた、回答者の主要論点"),
    missed_points: z
      .array(z.string())
      .describe("引き出せなかった、回答者の主要論点"),
    strengths: z.array(z.string()).describe("このインタビューの良かった点"),
    improvements: z
      .array(z.string())
      .describe("インタビュアーのプロンプト改善につながる具体的な指摘"),
  })
  .strict();

export type InterviewEvaluation = z.infer<typeof interviewEvaluationSchema>;

function formatTranscript(sim: SimResult): string {
  return sim.transcript
    .map(
      (t) =>
        `${t.role === "interviewer" ? "インタビュアー" : "回答者"}: ${t.content}`
    )
    .join("\n");
}

/**
 * 完了した模擬インタビューを、判定LLMで採点する。
 */
export async function evaluateInterview(params: {
  subject: InterviewSubjectInput;
  persona: EvalPersona;
  sim: SimResult;
  model: string;
}): Promise<InterviewEvaluation> {
  const { subject, persona, sim, model } = params;

  const system = `あなたは、住民インタビューの品質を評価する審査員です。区政の「${subject.name}」について、AIインタビュアーが区民（回答者）から意見を引き出した対話を、公平かつ辛口に採点してください。回答者が本当は伝えたかった論点（下記）が、対話でどれだけ引き出せたかを重視します。甘い点はつけないでください。`;

  const prompt = `## 対象
${subject.name}
${subject.summary}

## 回答者の設定（この人が本当に伝えたかったこと）
立場: ${persona.label}
背景: ${persona.background}
主要論点:
${persona.keyPoints.map((p) => `- ${p}`).join("\n")}

## 対話の全文
${formatTranscript(sim)}

## インタビュアーが生成した最終レポート
${sim.report ? JSON.stringify(sim.report, null, 2) : "（レポート未生成／インタビューが完了しなかった）"}

## 採点の観点
- question_quality: 質問が1論点ずつか、詰問的でないか、共感しつつ自然に深掘りできたか
- coverage: 回答者の主要論点をどれだけ引き出せたか
- report_faithfulness: レポートが対話に忠実で、対話にないことを書いていないか
- interviewee_satisfaction: 回答者として十分に伝えられたと感じるか
- covered_points / missed_points: 主要論点のうち引き出せた/引き出せなかったもの
- strengths / improvements: 良かった点と、プロンプト改善につながる具体的な指摘

上記スキーマに従って採点してください。`;

  const { object } = await generateObject({
    model,
    system,
    prompt,
    schema: interviewEvaluationSchema,
  });
  const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
  return {
    ...object,
    question_quality: clamp(object.question_quality),
    coverage: clamp(object.coverage),
    report_faithfulness: clamp(object.report_faithfulness),
    interviewee_satisfaction: clamp(object.interviewee_satisfaction),
  };
}
