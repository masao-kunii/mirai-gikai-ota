/**
 * チャットのエラーコードと HTTP 応答変換（web 版 chat/shared/types/errors.ts と同一仕様）。
 */

export const ChatErrorCode = {
  DAILY_COST_LIMIT_REACHED: "DAILY_COST_LIMIT_REACHED",
  SYSTEM_DAILY_COST_LIMIT_REACHED: "SYSTEM_DAILY_COST_LIMIT_REACHED",
  SYSTEM_MONTHLY_COST_LIMIT_REACHED: "SYSTEM_MONTHLY_COST_LIMIT_REACHED",
  /** 回数レートリミット超過（短時間に多すぎるリクエスト） */
  RATE_LIMITED: "RATE_LIMITED",
  /** コスト/利用状況のチェック自体に失敗（fail-closed でブロック） */
  USAGE_CHECK_FAILED: "USAGE_CHECK_FAILED",
  LLM_GENERATION_FAILED: "LLM_GENERATION_FAILED",
} as const;

export type ChatErrorCode = (typeof ChatErrorCode)[keyof typeof ChatErrorCode];

export class ChatError extends Error {
  constructor(
    public readonly code: ChatErrorCode,
    message?: string
  ) {
    super(message || code);
    this.name = "ChatError";
  }
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/** ChatError を HTTP レスポンスへ変換する（メッセージは web 版と同一） */
export function chatErrorToResponse(error: unknown): Response {
  if (error instanceof ChatError) {
    switch (error.code) {
      case ChatErrorCode.DAILY_COST_LIMIT_REACHED:
      case ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED:
        return textResponse(
          "本日の利用上限に達しました。明日0時以降に再度お試しください。",
          429
        );
      case ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED:
        return textResponse(
          "今月の利用上限に達しました。来月1日以降に再度お試しください。",
          429
        );
      case ChatErrorCode.RATE_LIMITED:
        return textResponse(
          "リクエストが多すぎます。少し時間をおいてから再度お試しください。",
          429
        );
      case ChatErrorCode.USAGE_CHECK_FAILED:
        return textResponse(
          "現在チャットを利用できません。しばらく待ってから再度お試しください。",
          503
        );
      default:
        return textResponse(
          "エラーが発生しました。しばらく待ってから再度お試しください。",
          500
        );
    }
  }
  return textResponse(
    "エラーが発生しました。しばらく待ってから再度お試しください。",
    500
  );
}
