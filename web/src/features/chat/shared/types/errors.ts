/**
 * チャット機能で使用するエラーコード
 */
export const ChatErrorCode = {
  DAILY_COST_LIMIT_REACHED: "DAILY_COST_LIMIT_REACHED",
  SYSTEM_DAILY_COST_LIMIT_REACHED: "SYSTEM_DAILY_COST_LIMIT_REACHED",
  SYSTEM_MONTHLY_COST_LIMIT_REACHED: "SYSTEM_MONTHLY_COST_LIMIT_REACHED",
  /** 回数レートリミット超過（短時間に多すぎるリクエスト） */
  RATE_LIMITED: "RATE_LIMITED",
  /** コスト/利用状況のチェック自体に失敗（fail-closed でブロック） */
  USAGE_CHECK_FAILED: "USAGE_CHECK_FAILED",
  PROMPT_FETCH_FAILED: "PROMPT_FETCH_FAILED",
  LLM_GENERATION_FAILED: "LLM_GENERATION_FAILED",
} as const;

export type ChatErrorCode = (typeof ChatErrorCode)[keyof typeof ChatErrorCode];

/**
 * チャット機能のカスタムエラー
 */
export class ChatError extends Error {
  constructor(
    public readonly code: ChatErrorCode,
    message?: string
  ) {
    super(message || code);
    this.name = "ChatError";
  }
}
