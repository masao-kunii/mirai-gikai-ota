/**
 * Postgres エラーコード判定（管理ルート共通）。
 *
 * drizzle は実 PostgresError を DrizzleQueryError の `.cause` に包むため、
 * 本体と cause の両方から SQLSTATE を拾う。
 */
function codeOf(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  const direct = (e as { code?: unknown }).code;
  if (typeof direct === "string") return direct;
  const cause = (e as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null) {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === "string") return causeCode;
  }
  return undefined;
}

/** 一意制約違反（23505）。重複ラベル/名称を 409 として扱うために使う。 */
export function isUniqueViolation(e: unknown): boolean {
  return codeOf(e) === "23505";
}

/** 外部キー違反（23503）。関連データがあり削除できないケースの判定に使う。 */
export function isForeignKeyViolation(e: unknown): boolean {
  return codeOf(e) === "23503";
}
