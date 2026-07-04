/**
 * @mirai-gikai/db — Drizzle ベースの型付き DB クライアント（TARGET_ARCHITECTURE §1 / §6）。
 *
 * - スキーマの真実は supabase/migrations/。generated/ は drizzle-kit pull の出力
 *   （スキーマ変更後は `pnpm --filter @mirai-gikai/db run db:pull` で再生成）
 * - DB アクセスは必ず roles.ts のヘルパー（SET LOCAL ROLE）経由で行う
 */

export { createDbClient, type DbClient, type DbTx } from "./client";
export { withAppAdmin, withPublicReader, withResident } from "./roles";
export * as schema from "./generated/schema";
