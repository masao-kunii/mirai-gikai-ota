import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestBill,
  cleanupTestUser,
  createTestBill,
  createTestUser,
  type TestUser,
} from "../utils";
import { asRole, createSql, PERMISSION_DENIED } from "./db";

/**
 * resident_writer の漏洩テスト（TARGET_ARCHITECTURE §3.2 / §10.1）。
 *
 * 住民スコープの接続（resident_writer + app.anon_id 注入）から:
 *   - 自分のセッション・メッセージのみ読み書きできること
 *   - 他人の行が存在しない・書き込めないこと
 *   - app.anon_id 未注入では何も見えないこと
 * を検証する。
 */

const sql = createSql();

let billId: string;
let userA: TestUser;
let userB: TestUser;
let sessionA: string;
let sessionB: string;

beforeAll(async () => {
  const bill = await createTestBill({ publish_status: "published" });
  billId = bill.id;
  userA = await createTestUser();
  userB = await createTestUser();

  const { data: config, error: cErr } = await adminClient
    .from("interview_configs")
    .insert({
      bill_id: billId,
      status: "public",
      name: `住民境界テスト設定 ${Date.now()}`,
    })
    .select()
    .single();
  if (cErr || !config) throw new Error(`config 作成失敗: ${cErr?.message}`);

  const insertSession = async (userId: string) => {
    const { data, error } = await adminClient
      .from("interview_sessions")
      .insert({ interview_config_id: config.id, user_id: userId })
      .select()
      .single();
    if (error || !data) throw new Error(`session 作成失敗: ${error?.message}`);
    return data.id;
  };
  sessionA = await insertSession(userA.id);
  sessionB = await insertSession(userB.id);

  for (const sessionId of [sessionA, sessionB]) {
    const { error } = await adminClient.from("interview_messages").insert({
      interview_session_id: sessionId,
      role: "user",
      content: "住民境界テストメッセージ",
    });
    if (error) throw new Error(`message 作成失敗: ${error.message}`);
  }
});

afterAll(async () => {
  if (billId) await cleanupTestBill(billId);
  if (userA) await cleanupTestUser(userA.id);
  if (userB) await cleanupTestUser(userB.id);
  await sql.end();
});

describe("resident_writer: 自分の行のみ", () => {
  it("自分のセッションのみ可視（他人の行は存在しない）", async () => {
    const rows = await asRole(
      sql,
      "resident_writer",
      (tx) =>
        tx`select id from interview_sessions where id in (${sessionA}, ${sessionB})`,
      userA.id
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(sessionA);
    expect(ids).not.toContain(sessionB);
  });

  it("自分のセッションのメッセージのみ可視", async () => {
    const rows = await asRole(
      sql,
      "resident_writer",
      (tx) =>
        tx`select interview_session_id from interview_messages
           where interview_session_id in (${sessionA}, ${sessionB})`,
      userA.id
    );
    const ids = rows.map((r) => r.interview_session_id);
    expect(ids).toContain(sessionA);
    expect(ids).not.toContain(sessionB);
  });

  it("app.anon_id 未注入では何も見えない", async () => {
    const rows = await asRole(
      sql,
      "resident_writer",
      (tx) =>
        tx`select id from interview_sessions where id in (${sessionA}, ${sessionB})`
    );
    expect(rows).toEqual([]);
  });

  it("自分のセッションへメッセージを INSERT できる", async () => {
    await asRole(
      sql,
      "resident_writer",
      (tx) =>
        tx`insert into interview_messages (interview_session_id, role, content)
           values (${sessionA}, 'user', '本人による追記')`,
      userA.id
    );
    const { data } = await adminClient
      .from("interview_messages")
      .select("content")
      .eq("interview_session_id", sessionA);
    expect(data?.map((m) => m.content)).toContain("本人による追記");
  });

  it("他人のセッションへの INSERT は拒否される", async () => {
    await expect(
      asRole(
        sql,
        "resident_writer",
        (tx) =>
          tx`insert into interview_messages (interview_session_id, role, content)
             values (${sessionB}, 'user', 'なりすまし')`,
        userA.id
      )
    ).rejects.toMatchObject({ code: PERMISSION_DENIED });
  });

  it("他人のセッションの UPDATE は 0 行（行として存在しない）", async () => {
    const result = await asRole(
      sql,
      "resident_writer",
      (tx) =>
        tx`update interview_sessions set rating = 1 where id = ${sessionB}`,
      userA.id
    );
    expect(result.count).toBe(0);
    const { data } = await adminClient
      .from("interview_sessions")
      .select("rating")
      .eq("id", sessionB)
      .single();
    expect(data?.rating).toBeNull();
  });

  it("公開データ（bills）には権限が無い", async () => {
    await expect(
      asRole(
        sql,
        "resident_writer",
        (tx) => tx`select id from bills limit 1`,
        userA.id
      )
    ).rejects.toMatchObject({ code: PERMISSION_DENIED });
  });
});
