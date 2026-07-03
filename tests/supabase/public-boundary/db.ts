/**
 * 公開境界テスト用の直接 Postgres 接続。
 *
 * supabase-js（PostgREST 経由）では SET ROLE できないため、DB ポートへ直接続する。
 * ポートは supabase/config.toml の [db].port（54432）。CI も同じ config で
 * `supabase start` するため、既定値のままで動作する。
 */

import postgres from "postgres";

export const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54432/postgres";

export function createSql() {
  return postgres(DB_URL, { max: 1, onnotice: () => {} });
}

export type Sql = ReturnType<typeof createSql>;

export type BoundaryRole = "public_reader" | "resident_writer" | "app_admin";

/**
 * 指定ロールとしてトランザクション内で fn を実行する。
 * anonId を渡すと app.anon_id を SET LOCAL 相当で注入する（resident_writer 用）。
 *
 * エラー（権限拒否等）はトランザクションをロールバックして再送出されるため、
 * 「拒否されること」の検証は 1 トランザクション = 1 検証で行うこと。
 */
export async function asRole<T>(
  sql: Sql,
  role: BoundaryRole,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
  anonId?: string
): Promise<T> {
  return (await sql.begin(async (tx) => {
    if (anonId !== undefined) {
      await tx`select set_config('app.anon_id', ${anonId}, true)`;
    }
    // role は上の union 型リテラルのみのため identifier 直埋めで安全
    await tx.unsafe(`set local role ${role}`);
    return fn(tx);
  })) as T;
}

/** Postgres の権限拒否 / RLS 違反（insufficient_privilege） */
export const PERMISSION_DENIED = "42501";
