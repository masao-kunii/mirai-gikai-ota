import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { ChatError, ChatErrorCode } from "../../shared/types/errors";
import { getClientIp } from "../../shared/utils/client-ip";

/**
 * AIチャットの回数レートリミット。
 *
 * DB の固定ウィンドウ・カウンタ（check_rate_limit RPC）を使い、複数の
 * Cloud Run インスタンスをまたいでも一貫して制限する。コスト上限の前段で
 * 連打・並列フラッドを即時に弾く第一防御線。
 *
 * 既定: 1分あたり per-IP 20回 / per-user 30回。環境変数で調整可能。
 */
const PER_IP_LIMIT = Number(process.env.CHAT_RATE_LIMIT_PER_IP_PER_MIN || "20");
const PER_USER_LIMIT = Number(
  process.env.CHAT_RATE_LIMIT_PER_USER_PER_MIN || "30"
);
const WINDOW_SECONDS = 60;

/**
 * 単一キーのレートリミットを判定する。
 * 返り値 true = 許可、false = 上限超過。
 * RPC 自体が失敗した場合は true（許可）を返す = レートリミットは fail-open。
 * （回数制限の DB 不調で全チャットを止めるのは過剰。コスト上限側を fail-closed
 *   にして最終防御は別途担保する。）
 */
async function isWithinRateLimit(key: string, limit: number): Promise<boolean> {
  if (!Number.isFinite(limit) || limit <= 0) return true;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_window_seconds: WINDOW_SECONDS,
      p_limit: limit,
    });
    if (error) {
      console.error("Rate limit check error:", error);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("Rate limit check threw:", e);
    return true;
  }
}

/**
 * チャットリクエストのレートリミットを適用する。
 * IP・ユーザーのいずれかが上限を超えていれば ChatError(RATE_LIMITED) を投げる。
 */
export async function enforceChatRateLimit(
  req: Request,
  userId: string
): Promise<void> {
  const ip = getClientIp(req.headers);
  const [ipOk, userOk] = await Promise.all([
    isWithinRateLimit(`chat:ip:${ip}`, PER_IP_LIMIT),
    isWithinRateLimit(`chat:user:${userId}`, PER_USER_LIMIT),
  ]);
  if (!ipOk || !userOk) {
    throw new ChatError(ChatErrorCode.RATE_LIMITED);
  }
}
