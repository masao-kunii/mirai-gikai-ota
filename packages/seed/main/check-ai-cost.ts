/**
 * 当月（JST）の AI 利用コストを集計し、月次上限を超えていたら非ゼロ終了する。
 *
 * TARGET_ARCHITECTURE §10.4「AI コストの月次上限アラート」の実装。
 * 個人運営のため、コストの静かな膨張に気づけることを最優先とする。
 *
 * 実行方法:
 *   SUPABASE_URL=https://<project-ref>.supabase.co \
 *   SUPABASE_SECRET_KEY=<sb_secret_xxx> \
 *   AI_COST_MONTHLY_LIMIT_USD=50 \
 *   npx tsx packages/seed/main/check-ai-cost.ts
 *
 * 判定:
 *   - 上限以上          → exit 1（GitHub Actions が失敗し通知される）
 *   - 上限の 80% 以上   → 警告（ジョブは成功のまま）
 *   - それ未満          → 情報ログのみ
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";

const DEFAULT_LIMIT_USD = 50;
const WARN_RATIO = 0.8;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** JST での当月月初と翌月月初を UTC instant として返す */
function currentMonthRangeJst(now: Date): { from: Date; to: Date } {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const from = new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - JST_OFFSET_MS
  );
  const to = new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() + 1, 1) - JST_OFFSET_MS
  );
  return { from, to };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY が必要です");
  }

  // GitHub Actions で Repository Variable 未設定の場合は空文字が渡るため、falsy はデフォルト扱い
  const rawLimit = process.env.AI_COST_MONTHLY_LIMIT_USD;
  const limitUsd = rawLimit ? Number(rawLimit) : DEFAULT_LIMIT_USD;
  if (!Number.isFinite(limitUsd) || limitUsd <= 0) {
    throw new Error(
      `AI_COST_MONTHLY_LIMIT_USD が不正です: ${process.env.AI_COST_MONTHLY_LIMIT_USD}`
    );
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { from, to } = currentMonthRangeJst(new Date());
  const { data, error } = await supabase.rpc("sum_chat_usage_cost", {
    from_iso: from.toISOString(),
    to_iso: to.toISOString(),
  });
  if (error) throw new Error(`コスト集計に失敗: ${error.message}`);

  const spentUsd = Number(data ?? 0);
  const ratio = spentUsd / limitUsd;
  const summary = `当月(JST)の AI コスト: $${spentUsd.toFixed(4)} / 上限 $${limitUsd}（${(ratio * 100).toFixed(1)}%）`;

  if (ratio >= 1) {
    console.error(`❌ ${summary} — 月次上限を超過しました`);
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::error title=ai-cost::${summary} 月次上限を超過`);
    }
    process.exitCode = 1;
  } else if (ratio >= WARN_RATIO) {
    console.warn(`⚠️  ${summary} — 上限の ${WARN_RATIO * 100}% を超えています`);
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::warning title=ai-cost::${summary}`);
    }
  } else {
    console.log(`✅ ${summary}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
