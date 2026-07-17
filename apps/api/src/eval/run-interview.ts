import { generateObject, generateText } from "@mirai-gikai/shared/ai/sdk";
import {
  buildSubjectInterviewSystemPrompt,
  buildSubjectSummarySystemPrompt,
  type InterviewSubjectInput,
} from "@mirai-gikai/shared/interview-prompts/subject-prompts";
import {
  type InterviewReportData,
  interviewChatTextSchema,
  interviewChatWithReportSchema,
} from "@mirai-gikai/shared/interview-schemas/schemas";
import { buildIntervieweeSystemPrompt } from "./interviewee";
import type { EvalPersona } from "./personas";

export type SimTurn = {
  role: "interviewer" | "interviewee";
  content: string;
  topicTitle?: string | null;
};

export type SimResult = {
  transcript: SimTurn[];
  report: InterviewReportData | null;
  reachedComplete: boolean;
  exchanges: number;
};

// interviewer + interviewee の発話数の上限（安全弁）。
const MAX_TURNS = 16;

type ConvMessage = { role: "user" | "assistant"; content: string; id?: string };

/**
 * 模擬回答者ペルソナとインタビュアー（subject-prompts）を対話させ、
 * transcript と生成レポートを返す。非ストリームで単純に回す。
 */
export async function runSimulatedInterview(params: {
  subject: InterviewSubjectInput;
  persona: EvalPersona;
  model: string;
}): Promise<SimResult> {
  const { subject, persona, model } = params;
  const intervieweeSystem = buildIntervieweeSystemPrompt(persona, subject);

  // インタビュアー視点の会話履歴（interviewer=assistant, interviewee=user）
  const messages: ConvMessage[] = [];
  const transcript: SimTurn[] = [];
  let stage: "chat" | "summary" = "chat";
  let report: InterviewReportData | null = null;
  let reachedComplete = false;
  let userSeq = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // --- インタビュアーの発話 ---
    const interviewerMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (stage === "chat") {
      const { object } = await generateObject({
        model,
        system: buildSubjectInterviewSystemPrompt({ subject }),
        schema: interviewChatTextSchema,
        ...(interviewerMessages.length > 0
          ? { messages: interviewerMessages }
          : { prompt: "インタビューを始め、最初の質問を1つしてください。" }),
      });
      transcript.push({
        role: "interviewer",
        content: object.text,
        topicTitle: object.topic_title,
      });
      messages.push({ role: "assistant", content: object.text });
      if (object.next_stage === "summary") stage = "summary";
    } else {
      const { object } = await generateObject({
        model,
        system: buildSubjectSummarySystemPrompt({ subject, messages }),
        schema: interviewChatWithReportSchema,
        messages: interviewerMessages,
      });
      transcript.push({ role: "interviewer", content: object.text });
      messages.push({ role: "assistant", content: object.text });
      if (object.report) report = object.report;
      if (object.next_stage === "summary_complete") {
        reachedComplete = true;
        break;
      }
      if (object.next_stage === "chat") stage = "chat";
    }

    // --- 回答者（ペルソナ）の返答 ---
    // 回答者視点では interviewer=user, interviewee=assistant に反転
    const flipped = messages.map((m) => ({
      role: (m.role === "assistant" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: m.content,
    }));
    const { text } = await generateText({
      model,
      system: intervieweeSystem,
      messages: flipped,
    });
    userSeq += 1;
    transcript.push({ role: "interviewee", content: text });
    messages.push({ role: "user", content: text, id: `u${userSeq}` });
  }

  return {
    transcript,
    report,
    reachedComplete,
    exchanges: transcript.filter((t) => t.role === "interviewee").length,
  };
}
