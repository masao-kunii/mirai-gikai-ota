import {
  createDbClient,
  type DbClient,
  type DbTx,
  withPublicReader,
} from "@mirai-gikai/db";

/**
 * API の DB 接続。
 *
 * Cloudflare Workers では TCP ソケットがリクエストに紐づくため、あるリクエストで
 * 生成したクライアントを別リクエストで再利用すると
 * "Cannot perform I/O on behalf of a different request" になる。そこで:
 *   - Workers: リクエストごとに新規生成する（ソケットはリクエスト終了時に
 *     ランタイムが破棄するので明示 close は不要。Hyperdrive が上流の
 *     Postgres 接続をプールする）。
 *   - Node（dev / test）: モジュールシングルトンで使い回す。
 * ハンドラ側は getDb / publicQuery のシグネチャが変わらないため影響しない。
 */
const DEFAULT_LOCAL_DB_URL =
  "postgresql://postgres:postgres@127.0.0.1:54432/postgres";

// Workers ランタイムのみ navigator.userAgent が "Cloudflare-Workers"。
// Node 22 は "Node.js/..." を返すので誤判定しない。
const isCloudflareWorkers =
  typeof navigator !== "undefined" &&
  navigator.userAgent === "Cloudflare-Workers";

let overrideUrl: string | undefined;
let singleton: DbClient | undefined;

/**
 * 接続文字列を明示注入する（Workers エントリが Hyperdrive の connectionString を渡す）。
 * Node の dev / test では呼ばれず、process.env.SUPABASE_DB_URL が使われる。
 */
export function setDbConnectionString(url: string): void {
  if (url === overrideUrl) return;
  overrideUrl = url;
  singleton = undefined;
}

function resolveUrl(): string {
  return overrideUrl ?? process.env.SUPABASE_DB_URL ?? DEFAULT_LOCAL_DB_URL;
}

/**
 * DB クライアントを取得する。
 * 解決順: 明示注入(Hyperdrive) → process.env.SUPABASE_DB_URL → ローカル既定。
 *
 * Workers では毎回新規生成する（クロスリクエスト I/O 制約の回避）。1 リクエスト内で
 * 複数回の DB アクセスがある場合は、得たクライアントを使い回すこと（chat 参照）。
 * 公開系ルートは publicQuery を、チャット等のサーバー内部処理は lib/chat/ の
 * ヘルパー経由で利用する（生の withAppAdmin をルートに書かない）。
 */
export function getDb(): DbClient {
  if (isCloudflareWorkers) {
    return createDbClient(resolveUrl());
  }
  singleton ??= createDbClient(resolveUrl());
  return singleton;
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
