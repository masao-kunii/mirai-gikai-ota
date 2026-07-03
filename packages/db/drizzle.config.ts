import { defineConfig } from "drizzle-kit";

/**
 * 現行スキーマの introspect（drizzle-kit pull）設定。
 * スキーマの真実は supabase/migrations/ にあり、本パッケージは
 * 「型付きクライアント」を提供する（Phase 3 の間はスキーマ変更を行わない）。
 * スキーマ変更後は `pnpm --filter @mirai-gikai/db run db:pull` で再生成する。
 *
 * 既知の癖:
 * - pull は空文字デフォルト（bills.bill_number の default ''）を
 *   `.default(')` と壊して出力することがある。再生成後は必ず typecheck を通し、
 *   壊れていたら `.default('')` に手修正すること。
 * - 生成される 0000_*.sql と meta/ はマイグレーション用途では使わないため削除する。
 */
export default defineConfig({
  dialect: "postgresql",
  out: "./src/generated",
  schemaFilter: ["public"],
  dbCredentials: {
    url:
      process.env.SUPABASE_DB_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54432/postgres",
  },
});
