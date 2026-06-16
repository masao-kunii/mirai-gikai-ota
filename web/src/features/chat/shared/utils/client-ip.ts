/**
 * リクエストヘッダーからクライアント IP を推定する純粋関数。
 *
 * Cloud Run / プロキシ配下では `x-forwarded-for` に
 * `client, proxy1, proxy2` の形でカンマ区切りの IP 列が入る。先頭が
 * 最も外側のクライアント IP。取得できない場合は "unknown" を返す
 * （レートリミットのキーとして一括バケットになる＝安全側に倒れる）。
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}
