import {
  createDbClient,
  type DbClient,
  type DbTx,
  withPublicReader,
} from "@mirai-gikai/db";

/**
 * API の DB 接続。
 *
 * Node ランタイム前提のモジュールシングルトン（Workers 移行時は
 * env バインディング経由の生成に差し替える。ハンドラ側は publicQuery の
 * シグネチャが変わらないため影響しない）。
 */
const DEFAULT_LOCAL_DB_URL =
  "postgresql://postgres:postgres@127.0.0.1:54432/postgres";

let client: DbClient | undefined;
let overrideUrl: string | undefined;

/**
 * 接続文字列を明示注入する（Workers エントリが Hyperdrive の connectionString を渡す）。
 * Node の dev / test では呼ばれず、process.env.SUPABASE_DB_URL が使われる。
 */
export function setDbConnectionString(url: string): void {
  if (url === overrideUrl) return;
  overrideUrl = url;
  client = undefined;
}

/**
 * DB クライアント（モジュールシングルトン）。
 * 解決順: 明示注入(Hyperdrive) → process.env.SUPABASE_DB_URL → ローカル既定。
 * 公開ルートは publicQuery を、チャット等のサーバー内部処理は
 * lib/chat/ のヘルパー経由で利用する（生の withAppAdmin をルートに書かない）。
 */
export function getDb(): DbClient {
  client ??= createDbClient(
    overrideUrl ?? process.env.SUPABASE_DB_URL ?? DEFAULT_LOCAL_DB_URL
  );
  return client;
}

/**
 * 公開読み取りクエリ（public_reader ロール）。
 *
 * 公開系ルートは必ずこのヘルパー経由で DB に触れること。
 * draft 議案・未公開レポートは RLS により「行として存在しない」。
 * bills.knowledge_source はカラム GRANT が無いため、明示的な
 * カラム指定（SELECT * 禁止）が構造的に強制される。
 */
export function publicQuery<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
  return withPublicReader(getDb(), fn);
}
