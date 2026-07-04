import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as relations from "./generated/relations";
import * as schema from "./generated/schema";

/**
 * Drizzle クライアントを生成する。
 *
 * - prepare: false — Supabase の transaction pooler（Supavisor）は
 *   prepared statement を跨いだ接続再利用と相性が悪いため無効化する。
 *   ローカル直結でも挙動差はない。
 * - 接続ロールの切替は roles.ts のヘルパー（SET LOCAL ROLE）で行う。
 *   トランザクションスコープなのでプール環境でも文脈が残留しない
 *   （TARGET_ARCHITECTURE §3.2）。
 */
export function createDbClient(url: string) {
  const sql = postgres(url, { prepare: false, onnotice: () => {} });
  return drizzle(sql, { schema: { ...schema, ...relations } });
}

export type DbClient = ReturnType<typeof createDbClient>;

/** createDbClient のトランザクションハンドル型 */
export type DbTx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
