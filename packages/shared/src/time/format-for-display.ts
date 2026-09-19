/**
 * 管理画面などで日時・所要時間を日本語で表示するための整形。
 */

/**
 * Postgres の timestamptz 文字列（例: `2026-09-19 10:40:47.669039+00`）を
 * `new Date()` が確実に読める ISO 8601 に直す。ISO 形式ならそのまま通る。
 * 区切りの空白・マイクロ秒・分のない時差（`+00`）はブラウザによって解釈できないため。
 */
export function toIsoTimestamp(value: string): string {
  const match = value
    .trim()
    .match(
      /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}(?::?\d{2})?)?$/
    );
  if (!match) return value;
  const [, date, time, fraction, zone] = match;
  const millis = fraction ? fraction.slice(0, 4).padEnd(4, "0") : "";
  let offset = zone ?? "Z";
  if (/^[+-]\d{2}$/.test(offset)) offset = `${offset}:00`;
  else if (/^[+-]\d{4}$/.test(offset)) {
    offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
  }
  return `${date}T${time}${millis}${offset}`;
}

/** 日時を日本時間の `YYYY/MM/DD HH:mm` で表す。読めない値は元の文字列を返す。 */
export function formatJstDateTime(value: string): string {
  const date = new Date(toIsoTimestamp(value));
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 秒数を「1時間2分」「3分13秒」「45秒」の形で表す。null・負数は「—」。 */
export function formatDurationJa(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}時間${minutes}分`;
  if (minutes > 0) return `${minutes}分${secs}秒`;
  return `${secs}秒`;
}
