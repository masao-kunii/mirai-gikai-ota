import { schema, withAppAdmin, withResident } from "@mirai-gikai/db";
import type { InterviewSubjectInput } from "@mirai-gikai/shared/interview-prompts/subject-prompts";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb, publicQuery } from "../db";

const {
  themes,
  themeContents,
  themeInitiatives,
  interviewConfigs,
  interviewSessions,
  interviewMessages,
} = schema;

/** インタビュー対象の指定（テーマ slug or 取り組み id）。 */
export type InterviewTarget =
  | { type: "theme"; slug: string }
  | { type: "initiative"; id: string };

export type ResolvedSubject = {
  subject: InterviewSubjectInput;
  themeId: string | null;
  themeInitiativeId: string | null;
};

/**
 * 対象（公開中のテーマ/取り組み）の表示情報と、config 紐付け用の ID を解決する。
 * 未存在・非公開は null。
 */
export async function resolveSubject(
  target: InterviewTarget
): Promise<ResolvedSubject | null> {
  if (target.type === "theme") {
    const row = await publicQuery(async (tx) => {
      const [t] = await tx
        .select({ id: themes.id, name: themes.name })
        .from(themes)
        .where(and(eq(themes.slug, target.slug), eq(themes.isActive, true)));
      if (!t) return null;
      const [c] = await tx
        .select({ overview: themeContents.overview })
        .from(themeContents)
        .where(eq(themeContents.themeId, t.id));
      return { id: t.id, name: t.name, overview: c?.overview ?? null };
    });
    if (!row) return null;
    return {
      subject: { kind: "theme", name: row.name, summary: row.overview },
      themeId: row.id,
      themeInitiativeId: null,
    };
  }

  const [it] = await publicQuery((tx) =>
    tx
      .select({
        id: themeInitiatives.id,
        title: themeInitiatives.title,
        body: themeInitiatives.body,
      })
      .from(themeInitiatives)
      .where(
        and(
          eq(themeInitiatives.id, target.id),
          eq(themeInitiatives.isActive, true)
        )
      )
  );
  if (!it) return null;
  return {
    subject: { kind: "initiative", name: it.title, summary: it.body },
    themeId: null,
    themeInitiativeId: it.id,
  };
}

/**
 * 対象に紐づく公開インタビュー設定を返す。無ければ作成する（管理系接続）。
 * 事前同意で公開前提のため status='public' で扱う。
 */
export async function ensureConfig(target: {
  themeId: string | null;
  themeInitiativeId: string | null;
}): Promise<string> {
  const db = getDb();
  const matchTarget = target.themeId
    ? eq(interviewConfigs.themeId, target.themeId)
    : eq(
        interviewConfigs.themeInitiativeId,
        target.themeInitiativeId as string
      );

  const existing = await withAppAdmin(db, (tx) =>
    tx
      .select({ id: interviewConfigs.id })
      .from(interviewConfigs)
      .where(and(eq(interviewConfigs.status, "public"), matchTarget))
      .limit(1)
  );
  if (existing[0]) return existing[0].id;

  const [created] = await withAppAdmin(db, (tx) =>
    tx
      .insert(interviewConfigs)
      .values({
        themeId: target.themeId,
        themeInitiativeId: target.themeInitiativeId,
        status: "public",
        name: "住民の声",
        mode: "loop",
      })
      .returning({ id: interviewConfigs.id })
  );
  if (!created) throw new Error("Failed to create interview config");
  return created.id;
}

/**
 * (config, anonId) の進行中セッション（未完了・未アーカイブ）を返す。無ければ作成。
 */
export async function getOrCreateSession(
  configId: string,
  anonId: string
): Promise<string> {
  return withResident(getDb(), anonId, async (tx) => {
    const [existing] = await tx
      .select({ id: interviewSessions.id })
      .from(interviewSessions)
      .where(
        and(
          eq(interviewSessions.interviewConfigId, configId),
          eq(interviewSessions.userId, anonId),
          isNull(interviewSessions.archivedAt),
          isNull(interviewSessions.completedAt)
        )
      )
      .orderBy(desc(interviewSessions.startedAt))
      .limit(1);
    if (existing) return existing.id;

    const [created] = await tx
      .insert(interviewSessions)
      .values({ interviewConfigId: configId, userId: anonId })
      .returning({ id: interviewSessions.id });
    if (!created) throw new Error("Failed to create interview session");
    return created.id;
  });
}

export type StoredMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

/** セッションのメッセージを時系列で取得（本人のみ・RLS）。 */
export async function getSessionMessages(
  sessionId: string,
  anonId: string
): Promise<StoredMessage[]> {
  return withResident(getDb(), anonId, (tx) =>
    tx
      .select({
        id: interviewMessages.id,
        role: interviewMessages.role,
        content: interviewMessages.content,
      })
      .from(interviewMessages)
      .where(eq(interviewMessages.interviewSessionId, sessionId))
      .orderBy(asc(interviewMessages.createdAt))
  );
}

/** セッションが anonId 本人のものか（RLS で own のみ読めることを利用）。 */
export async function isSessionOwned(
  sessionId: string,
  anonId: string
): Promise<boolean> {
  const rows = await withResident(getDb(), anonId, (tx) =>
    tx
      .select({ id: interviewSessions.id })
      .from(interviewSessions)
      .where(eq(interviewSessions.id, sessionId))
      .limit(1)
  );
  return rows.length > 0;
}

/** メッセージを保存（本人のみ・RLS）。 */
export async function saveInterviewMessage(
  sessionId: string,
  anonId: string,
  role: "assistant" | "user",
  content: string
): Promise<void> {
  await withResident(getDb(), anonId, (tx) =>
    tx
      .insert(interviewMessages)
      .values({ interviewSessionId: sessionId, role, content })
  );
}
