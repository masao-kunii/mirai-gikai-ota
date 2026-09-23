/**
 * 保存されたインタビューのメッセージから、画面に出す本文を取り出す。
 *
 * AI 側のメッセージは構造化出力をそのまま JSON 文字列で保存している
 * （例: `{"text":"…","quick_replies":[…]}`）。text があればそれを返し、
 * JSON でないもの（住民の回答など）はそのまま返す。
 */
export function getMessageDisplayText(content: string): string {
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "text" in parsed &&
      typeof parsed.text === "string"
    ) {
      return parsed.text;
    }
  } catch {
    // JSON でなければそのまま本文として扱う
  }
  return content;
}
