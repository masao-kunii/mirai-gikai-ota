import { sql } from "drizzle-orm";
import type { DbClient } from "@mirai-gikai/db";
import { withAppAdmin } from "@mirai-gikai/db";
import {
  getJstDayRange,
  getJstMonthRange,
} from "@mirai-gikai/shared/time/jst-day-range";
import { ChatError, ChatErrorCode } from "./errors";

/**
 * チャットの前段ガード（web 版 rate-limit.ts / cost-tracker.ts /
 * system-cost-guard.ts と同一仕様）。
 *
 * - 回数レートリミット: fail-open（DB 不調で全チャットを止めるのは過剰。
 *   最終防御はコスト上限側が担う）
 * - コスト上限: fail-closed（上限が確認できないまま続けると DB 不調時に
 *   濫用・コスト超過の抜け道になるため、安全側に倒して拒否する）
 *
 * いずれも SET LOCAL ROLE の短いトランザクションで完結し、
 * ストリーミング中に接続を保持しない（TARGET_ARCHITECTURE §3.3 の「前処理」）。
 */

const WINDOW_SECONDS = 60;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : fallback;
  return Number.isFinite(n) ? n : fallback;
}

async function isWithinRateLimit(
  db: DbClient,
  key: string,
  limit: number
): Promise<boolean> {
  if (limit <= 0) return true;
  try {
    const rows = await withAppAdmin(db, (tx) =>
      tx.execute(
        sql`select check_rate_limit(${key}, ${WINDOW_SECONDS}, ${limit}) as ok`
      )
    );
    return rows[0]?.ok === true;
  } catch (e) {
    console.error("Rate limit check threw:", e);
    return true; // fail-open
  }
}

/** IP・匿名ユーザーの回数レートリミット。超過時は ChatError(RATE_LIMITED) */
export async function enforceChatRateLimit(
  db: DbClient,
  ip: string,
  anonId: string
): Promise<void> {
  const perIp = envNumber("CHAT_RATE_LIMIT_PER_IP_PER_MIN", 20);
  const perUser = envNumber("CHAT_RATE_LIMIT_PER_USER_PER_MIN", 30);
  const [ipOk, userOk] = await Promise.all([
    isWithinRateLimit(db, `chat:ip:${ip}`, perIp),
    isWithinRateLimit(db, `chat:user:${anonId}`, perUser),
  ]);
  if (!ipOk || !userOk) {
    throw new ChatError(ChatErrorCode.RATE_LIMITED);
  }
}

async function sumUserCost(
  db: DbClient,
  anonId: string,
  fromIso: string,
  toIso: string
): Promise<number> {
  const rows = await withAppAdmin(db, (tx) =>
    tx.execute(
      sql`select coalesce(sum(cost_usd), 0)::float8 as total
          from chat_usage_events
          where user_id = ${anonId}
            and occurred_at >= ${fromIso} and occurred_at < ${toIso}`
    )
  );
  return Number(rows[0]?.total ?? 0);
}

async function sumTotalCost(
  db: DbClient,
  fromIso: string,
  toIso: string
): Promise<number> {
  const rows = await withAppAdmin(db, (tx) =>
    tx.execute(
      sql`select sum_chat_usage_cost(${fromIso}, ${toIso})::float8 as total`
    )
  );
  return Number(rows[0]?.total ?? 0);
}

/**
 * コスト3段ガード（ユーザー日次 / システム日次 / システム月次）。
 * 超過・確認不能はいずれも ChatError を投げる（fail-closed）。
 */
export async function assertWithinCostLimits(
  db: DbClient,
  anonId: string
): Promise<void> {
  const userDailyLimit = envNumber("CHAT_DAILY_USER_COST_LIMIT_USD", 0.5);
  const systemDailyLimit = envNumber("CHAT_DAILY_TOTAL_COST_LIMIT_USD", 50);
  const systemMonthlyLimit = envNumber(
    "CHAT_MONTHLY_TOTAL_COST_LIMIT_USD",
    1000
  );

  try {
    const day = getJstDayRange();
    const month = getJstMonthRange();

    const userDaily = await sumUserCost(db, anonId, day.from, day.to);
    if (userDaily >= userDailyLimit) {
      throw new ChatError(ChatErrorCode.DAILY_COST_LIMIT_REACHED);
    }

    const systemDaily = await sumTotalCost(db, day.from, day.to);
    if (systemDaily >= systemDailyLimit) {
      throw new ChatError(ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED);
    }

    const systemMonthly = await sumTotalCost(db, month.from, month.to);
    if (systemMonthly >= systemMonthlyLimit) {
      throw new ChatError(ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED);
    }
  } catch (error) {
    if (error instanceof ChatError) throw error;
    console.error("Cost limit check error:", error);
    throw new ChatError(
      ChatErrorCode.USAGE_CHECK_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}
