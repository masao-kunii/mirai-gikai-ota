import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestBill,
  cleanupTestUser,
  createTestBill,
  createTestBillContent,
  createTestUser,
  type TestUser,
} from "../utils";
import { asRole, createSql, PERMISSION_DENIED } from "./db";

/**
 * public_reader の漏洩テスト（TARGET_ARCHITECTURE §10.1）。
 *
 * 公開系の接続（public_reader）から:
 *   - draft 議案・そのコンテンツが「行として存在しない」こと
 *   - 未公開レポート・管理系テーブルへ到達できないこと
 *   - 一切の書き込みができないこと
 * を、実データを使って検証する。
 */

const sql = createSql();

let draftBillId: string;
let publishedBillId: string;
let comingSoonBillId: string;
let testUser: TestUser;
let publicSessionId: string;
let privateSessionId: string;

beforeAll(async () => {
  const draft = await createTestBill({ publish_status: "draft" });
  const published = await createTestBill({ publish_status: "published" });
  const comingSoon = await createTestBill({ publish_status: "coming_soon" });
  draftBillId = draft.id;
  publishedBillId = published.id;
  comingSoonBillId = comingSoon.id;
  await createTestBillContent(draftBillId, { difficulty_level: "normal" });
  await createTestBillContent(publishedBillId, { difficulty_level: "normal" });

  // 公開レポート / 非公開レポート（published 議案のインタビュー）
  testUser = await createTestUser();
  const { data: config, error: cErr } = await adminClient
    .from("interview_configs")
    .insert({
      bill_id: publishedBillId,
      status: "public",
      name: `境界テスト設定 ${Date.now()}`,
    })
    .select()
    .single();
  if (cErr || !config) throw new Error(`config 作成失敗: ${cErr?.message}`);

  const insertSession = async () => {
    const { data, error } = await adminClient
      .from("interview_sessions")
      .insert({ interview_config_id: config.id, user_id: testUser.id })
      .select()
      .single();
    if (error || !data) throw new Error(`session 作成失敗: ${error?.message}`);
    return data.id;
  };
  publicSessionId = await insertSession();
  privateSessionId = await insertSession();

  const insertReport = async (sessionId: string, isPublic: boolean) => {
    const { error } = await adminClient.from("interview_report").insert({
      interview_session_id: sessionId,
      summary: "境界テスト要約",
      opinions: [],
      is_public_by_user: isPublic,
      is_public_by_admin: isPublic,
    });
    if (error) throw new Error(`report 作成失敗: ${error.message}`);
  };
  await insertReport(publicSessionId, true);
  await insertReport(privateSessionId, false);

  for (const sessionId of [publicSessionId, privateSessionId]) {
    const { error } = await adminClient.from("interview_messages").insert({
      interview_session_id: sessionId,
      role: "user",
      content: "境界テストメッセージ",
    });
    if (error) throw new Error(`message 作成失敗: ${error.message}`);
  }
});

afterAll(async () => {
  // bill の削除で config/session/report/message は CASCADE される
  for (const id of [draftBillId, publishedBillId, comingSoonBillId]) {
    if (id) await cleanupTestBill(id);
  }
  if (testUser) await cleanupTestUser(testUser.id);
  await sql.end();
});

describe("public_reader: 議案の公開境界", () => {
  it("draft 議案は行として存在しない（published/coming_soon のみ可視）", async () => {
    const rows = await asRole(
      sql,
      "public_reader",
      (tx) =>
        tx`select id from bills where id in (${draftBillId}, ${publishedBillId}, ${comingSoonBillId})`
    );
    const ids = rows.map((r) => r.id);
    expect(ids).not.toContain(draftBillId);
    expect(ids).toContain(publishedBillId);
    expect(ids).toContain(comingSoonBillId);
  });

  it("draft 議案の bill_contents は行として存在しない", async () => {
    const rows = await asRole(
      sql,
      "public_reader",
      (tx) =>
        tx`select bill_id from bill_contents where bill_id in (${draftBillId}, ${publishedBillId})`
    );
    const ids = rows.map((r) => r.bill_id);
    expect(ids).not.toContain(draftBillId);
    expect(ids).toContain(publishedBillId);
  });

  it("bills の SELECT * は拒否される（knowledge_source のカラム保護）", async () => {
    await expect(
      asRole(sql, "public_reader", (tx) => tx`select * from bills limit 1`)
    ).rejects.toMatchObject({ code: PERMISSION_DENIED });
  });

  it("bills.knowledge_source の単体 SELECT も拒否される", async () => {
    await expect(
      asRole(
        sql,
        "public_reader",
        (tx) => tx`select knowledge_source from bills limit 1`
      )
    ).rejects.toMatchObject({ code: PERMISSION_DENIED });
  });
});

describe("public_reader: 住民の声の公開境界", () => {
  it("公開レポートのみ可視（非公開は行として存在しない）", async () => {
    const rows = await asRole(
      sql,
      "public_reader",
      (tx) =>
        tx`select interview_session_id from interview_report
         where interview_session_id in (${publicSessionId}, ${privateSessionId})`
    );
    const ids = rows.map((r) => r.interview_session_id);
    expect(ids).toContain(publicSessionId);
    expect(ids).not.toContain(privateSessionId);
  });

  it("チャットログは公開レポートのセッション分のみ可視", async () => {
    const rows = await asRole(
      sql,
      "public_reader",
      (tx) =>
        tx`select interview_session_id from interview_messages
         where interview_session_id in (${publicSessionId}, ${privateSessionId})`
    );
    const ids = rows.map((r) => r.interview_session_id);
    expect(ids).toContain(publicSessionId);
    expect(ids).not.toContain(privateSessionId);
  });
});

describe("public_reader: 管理系テーブルと書き込みの拒否", () => {
  const adminOnlyTables = [
    "preview_tokens",
    "chat_usage_events",
    "rate_limit_counters",
    "council_session_minutes",
    "expert_registrations",
    "topic_analysis_versions",
    "topic_analysis_topics",
    "topic_analysis_classifications",
    "interview_rating_feedbacks",
    "chats",
    "report_reactions",
  ] as const;

  for (const table of adminOnlyTables) {
    it(`${table}: SELECT が拒否される`, async () => {
      await expect(
        asRole(sql, "public_reader", (tx) =>
          tx.unsafe(`select * from ${table} limit 1`)
        )
      ).rejects.toMatchObject({ code: PERMISSION_DENIED });
    });
  }

  it("公開テーブルへの INSERT も拒否される", async () => {
    await expect(
      asRole(
        sql,
        "public_reader",
        (tx) => tx`insert into tags (label) values ('境界テスト不正タグ')`
      )
    ).rejects.toMatchObject({ code: PERMISSION_DENIED });
  });

  it("公開テーブルの UPDATE も拒否される", async () => {
    await expect(
      asRole(
        sql,
        "public_reader",
        (tx) =>
          tx`update bills set name = '改ざん' where id = ${publishedBillId}`
      )
    ).rejects.toMatchObject({ code: PERMISSION_DENIED });
  });
});
