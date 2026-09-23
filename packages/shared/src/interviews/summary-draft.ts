/**
 * 保存済みの AI メッセージが「レポート案（要約）」かどうかを判定する。
 *
 * 要約フェーズの応答は report を含む構造化出力として保存される。ダイアログを
 * 閉じたまま送信しなかった場合、このメッセージで終わったセッションが残る。
 * 開き直したときにそれを再開すると、別の切り口を選んでも前回のレポート案が
 * 出てくるため、この判定で新しい対話を始める。
 */
export function isSummaryDraftMessage(content: string): boolean {
  try {
    const parsed: unknown = JSON.parse(content);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "report" in parsed &&
      typeof parsed.report === "object" &&
      parsed.report !== null
    );
  } catch {
    return false;
  }
}
