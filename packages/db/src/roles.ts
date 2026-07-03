import { sql } from "drizzle-orm";
import type { DbClient, DbTx } from "./client";

/**
 * 公開境界ロール（TARGET_ARCHITECTURE §3 / migration 20260703150000）での実行ヘルパー。
 *
 * すべてトランザクション + SET LOCAL のため、接続プール環境でも
 * ロール・匿名 ID がトランザクション外へ残留しない。
 * ハンドラは必ずこれらのヘルパー経由で DB に触れること
 * （公開系ハンドラでの withAppAdmin 使用は禁止。TARGET_ARCHITECTURE §13）。
 */

/** 公開データのみ読める接続として実行する（公開 API の読み取りパス用） */
export async function withPublicReader<T>(
  db: DbClient,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role public_reader`);
    return fn(tx);
  });
}

/**
 * 住民（匿名 ID）の行だけ読み書きできる接続として実行する。
 * anonId が RLS の app.anon_id 文脈になる（set_config の第3引数 true = SET LOCAL 相当）。
 */
export async function withResident<T>(
  db: DbClient,
  anonId: string,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.anon_id', ${anonId}, true)`);
    await tx.execute(sql`set local role resident_writer`);
    return fn(tx);
  });
}

/** 全テーブルへアクセスできる管理接続として実行する（管理 API・パイプライン用） */
export async function withAppAdmin<T>(
  db: DbClient,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role app_admin`);
    return fn(tx);
  });
}
