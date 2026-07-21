import { zValidator } from "@hono/zod-validator";
import { streamObject } from "@mirai-gikai/shared/ai/sdk";
import {
  buildSubjectInterviewSystemPrompt,
  buildSubjectSummarySystemPrompt,
} from "@mirai-gikai/shared/interview-prompts/subject-prompts";
import {
  interviewChatTextSchema,
  interviewChatWithReportSchema,
} from "@mirai-gikai/shared/interview-schemas/schemas";
import { Hono } from "hono";
import { z } from "zod";
import { resolveAnonId } from "../lib/anon";
import { recordChatUsage } from "../lib/chat/context-and-usage";
import { ChatError, chatErrorToResponse } from "../lib/chat/errors";
import {
  assertWithinCostLimits,
  enforceChatRateLimit,
} from "../lib/chat/guards";
import { getDb } from "../lib/db";
import { completeInterview } from "../lib/interviews/complete";
import {
  ensureConfig,
  getOrCreateSession,
  getSessionMessages,
  type InterviewTarget,
  isReportPublic,
  resolveSubject,
  saveInterviewMessage,
  saveReportFlag,
} from "../lib/interviews/context";
import { resolveInterviewModel } from "../lib/interviews/model";

function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** 保存された assistant メッセージ（JSON文字列）から text を取り出す。 */
function assistantText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed.text === "string") return parsed.text;
  } catch {
    // JSON でなければそのまま
  }
  return content;
}

const targetSchema = z.object({
  targetType: z.enum(["theme", "initiative"]),
  slug: z.string().min(1).max(100).optional(),
  initiativeId: z.uuid().optional(),
});

function toTarget(b: z.infer<typeof targetSchema>): InterviewTarget | null {
  if (b.targetType === "theme") {
    return b.slug ? { type: "theme", slug: b.slug } : null;
  }
  return b.initiativeId ? { type: "initiative", id: b.initiativeId } : null;
}

const messagesBodySchema = targetSchema.extend({
  // 新しいユーザー回答。初回（最初の質問生成）は省略。
  message: z.string().max(4000).optional(),
  // クライアントが直前の next_stage から決めるフェーズ。
  stage: z.enum(["chat", "summary"]).default("chat"),
  // 回答者が最初に選んだ立場ラベル（テーマ側で選択）。
  roleLabel: z.string().max(30).optional(),
});

export const interviewsRoute = new Hono()
  // 対話（部分JSONストリーム。クライアントは useObject で消費）。
  .post("/messages", zValidator("json", messagesBodySchema), async (c) => {
    const { anonId, setCookie } = await resolveAnonId(c.req.raw);
    const body = c.req.valid("json");
    const db = getDb();
    const withAnonCookie = (res: Response): Response => {
      if (setCookie) res.headers.append("set-cookie", setCookie);
      return res;
    };

    try {
      await enforceChatRateLimit(db, getClientIp(c.req.raw.headers), anonId);
      await assertWithinCostLimits(db, anonId);

      const target = toTarget(body);
      if (!target) {
        return withAnonCookie(c.json({ error: "bad_target" as const }, 400));
      }
      const resolved = await resolveSubject(target);
      if (!resolved) {
        return withAnonCookie(c.json({ error: "not_found" as const }, 404));
      }

      const configId = await ensureConfig({
        themeId: resolved.themeId,
        themeInitiativeId: resolved.themeInitiativeId,
      });
      const sessionId = await getOrCreateSession(configId, anonId);

      // 新しいユーザー回答を保存
      const answer = body.message?.trim();
      if (answer) {
        await saveInterviewMessage(sessionId, anonId, "user", answer);
      }

      // DB のメッセージ（id付き・時系列）をロード
      const stored = await getSessionMessages(sessionId, anonId);
      const modelMessages = stored.map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? assistantText(m.content) : m.content,
      }));
      const promptMessages = stored.map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? assistantText(m.content) : m.content,
        id: m.id,
      }));

      const model = resolveInterviewModel();
      const modelName = typeof model === "string" ? model : "unknown";

      const isSummary = body.stage === "summary";
      const system = isSummary
        ? buildSubjectSummarySystemPrompt({
            subject: resolved.subject,
            messages: promptMessages,
            respondentRole: body.roleLabel,
          })
        : buildSubjectInterviewSystemPrompt({
            subject: resolved.subject,
            respondentRole: body.roleLabel,
          });
      const schema = isSummary
        ? interviewChatWithReportSchema
        : interviewChatTextSchema;

      // chat は会話を messages で渡す。summary は会話を system prompt に
      // 埋め込むため、messages ではなく prompt（ユーザーの確認 or 生成指示）で呼ぶ。
      const streamInput = isSummary
        ? {
            prompt:
              answer ??
              "これまでの会話をもとにレポート案を作成し、内容でよいか確認してください。",
          }
        : modelMessages.length > 0
          ? { messages: modelMessages }
          : { prompt: "インタビューを始め、最初の質問を1つしてください。" };

      const result = streamObject({
        model,
        system,
        schema,
        ...streamInput,
        onFinish: async (event) => {
          try {
            if (event.object) {
              await saveInterviewMessage(
                sessionId,
                anonId,
                "assistant",
                JSON.stringify(event.object)
              );
            }
            if (event.usage) {
              await recordChatUsage(db, {
                anonId,
                model: modelName,
                usage: event.usage,
                metadata: { context: "interview", stage: body.stage },
              });
            }
          } catch (e) {
            console.error("interview onFinish failed:", e);
          }
        },
      });

      const res = result.toTextStreamResponse();
      // クライアントが完了APIに渡せるよう session id を返す
      res.headers.set("x-interview-session-id", sessionId);
      return withAnonCookie(res);
    } catch (error) {
      if (error instanceof ChatError) {
        return withAnonCookie(chatErrorToResponse(error));
      }
      console.error("Interview messages error:", error);
      return withAnonCookie(c.json({ error: "internal" as const }, 500));
    }
  })
  // 完了（レポート抽出→moderation→auto-publish）。対象から本人の進行中
  // セッションを解決するため、クライアントは対象だけ渡せばよい。
  .post(
    "/complete",
    zValidator(
      "json",
      targetSchema.extend({ roleLabel: z.string().max(30).optional() })
    ),
    async (c) => {
      const { anonId, setCookie } = await resolveAnonId(c.req.raw);
      const body = c.req.valid("json");
      const withAnonCookie = (res: Response): Response => {
        if (setCookie) res.headers.append("set-cookie", setCookie);
        return res;
      };

      const target = toTarget(body);
      if (!target) {
        return withAnonCookie(c.json({ error: "bad_target" as const }, 400));
      }
      const resolved = await resolveSubject(target);
      if (!resolved) {
        return withAnonCookie(c.json({ error: "not_found" as const }, 404));
      }
      const configId = await ensureConfig({
        themeId: resolved.themeId,
        themeInitiativeId: resolved.themeInitiativeId,
      });
      const sessionId = await getOrCreateSession(configId, anonId);

      const result = await completeInterview(
        sessionId,
        resolveInterviewModel(),
        {
          respondentRole: body.roleLabel,
        }
      );
      if (!result.ok) {
        return withAnonCookie(c.json({ error: result.reason }, 400));
      }
      return withAnonCookie(c.json({ ok: true, published: result.published }));
    }
  )
  // 通報（公開意見に対する住民からの報告）。公開中のレポートのみ。
  .post(
    "/report",
    zValidator(
      "json",
      z.object({
        reportId: z.uuid(),
        reason: z.enum([
          "personal_info",
          "inappropriate",
          "inaccurate",
          "spam",
          "other",
        ]),
        detail: z.string().max(500).optional(),
      })
    ),
    async (c) => {
      const { anonId, setCookie } = await resolveAnonId(c.req.raw);
      const body = c.req.valid("json");
      const withAnonCookie = (res: Response): Response => {
        if (setCookie) res.headers.append("set-cookie", setCookie);
        return res;
      };

      // 公開中のレポートのみ通報可（非公開の存在は秘匿）。
      if (!(await isReportPublic(body.reportId))) {
        return withAnonCookie(c.json({ error: "not_found" as const }, 404));
      }

      try {
        await saveReportFlag(
          body.reportId,
          anonId,
          body.reason,
          body.detail ?? null
        );
        return withAnonCookie(c.json({ ok: true as const }));
      } catch (error) {
        console.error("Report flag error:", error);
        return withAnonCookie(c.json({ error: "internal" as const }, 500));
      }
    }
  );

export type InterviewsRouteType = typeof interviewsRoute;
