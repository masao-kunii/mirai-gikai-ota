/**
 * 指定会期の「下書き（draft）」議案だけを公開する運用スクリプト。
 *
 * 背景: 定例会同期（import:teirei）は新規議案を publish_status="draft" で取り込む。
 * 会期まるごと公開したいとき、admin の一括公開は会期で絞れず全議案に効いてしまう
 * （既公開分の published_at まで上書きされる）ため、会期を限定できる本スクリプトを使う。
 *
 * 安全策:
 *   - 既定はドライラン（--apply を付けたときだけ書き込む）。
 *   - 対象は「指定会期（正規化名一致）かつ publish_status='draft'」の議案のみ。
 *     他会期・既に published/coming_soon の議案には一切触れない。
 *   - published_at は今（実行時刻）をセット（公開日順の並びのため）。
 *   - 会期名の表記ゆれ・重複行に備え、正規化名が一致する会期を「すべて」対象にする。
 *
 * 実行:
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=sb_secret_... \
 *     pnpm --filter @mirai-gikai/seed run publish:session "令和8年第2回定例会"        # ドライラン
 *   ...同上... publish:session "令和8年第2回定例会" --apply                            # 実公開
 *
 * 必要な権限: SUPABASE_SECRET_KEY（service key。RLS を越えて更新する）。
 */
import type { Database } from "@mirai-gikai/supabase";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SESSION_NAME = "令和8年第2回定例会";
type PublishStatus = Database["public"]["Enums"]["bill_publish_status"];

/** 空白差を無視して会期名を比較するための正規化（import:teirei と同方針） */
function normalize(name: string): string {
  return name.replace(/\s+/g, "");
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const sessionName =
    args.find((a) => !a.startsWith("--")) ?? DEFAULT_SESSION_NAME;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY が必要です");
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(
    `${apply ? "🚀 公開" : "🔎 ドライラン"}: 会期「${sessionName}」の draft 議案 @ ${url}`
  );

  // 会期・議案を全件取得して JS 側で集計（会期数・議案数とも小さい）
  const { data: sessions, error: sessErr } = await supabase
    .from("council_sessions")
    .select("id, name, is_active, start_date")
    .order("start_date", { ascending: false });
  if (sessErr) throw new Error(`会期取得に失敗: ${sessErr.message}`);

  const { data: allBills, error: billErr } = await supabase
    .from("bills")
    .select("id, name, status, bill_number, council_session_id, publish_status")
    .order("bill_number", { ascending: true });
  if (billErr) throw new Error(`議案取得に失敗: ${billErr.message}`);
  const bills = allBills ?? [];

  // 会期ごとの公開状態内訳（診断用に全会期を表示）
  type Counts = Record<PublishStatus, number>;
  const emptyCounts = (): Counts => ({
    draft: 0,
    published: 0,
    coming_soon: 0,
  });
  const bySession = new Map<string, Counts>();
  for (const b of bills) {
    if (!b.council_session_id) continue;
    const c = bySession.get(b.council_session_id) ?? emptyCounts();
    c[b.publish_status] += 1;
    bySession.set(b.council_session_id, c);
  }

  console.log("\n=== 全会期の公開状態内訳 ===");
  for (const s of sessions ?? []) {
    const c = bySession.get(s.id) ?? emptyCounts();
    const total = c.draft + c.published + c.coming_soon;
    console.log(
      `  ${s.name} (${s.id.slice(0, 8)}) active=${s.is_active} start=${s.start_date ?? "-"}: 計${total} [draft ${c.draft} / published ${c.published} / coming_soon ${c.coming_soon}]`
    );
  }

  // 正規化名が一致する会期をすべて対象にする（表記ゆれ・重複行対策）
  const target = normalize(sessionName);
  const matched = (sessions ?? []).filter((s) => normalize(s.name) === target);
  if (matched.length === 0) {
    throw new Error(`会期「${sessionName}」が見つかりません（上の一覧を参照）。`);
  }
  const matchedIds = new Set(matched.map((s) => s.id));
  console.log(
    `\n✓ 対象会期: ${matched.map((s) => `${s.name}(${s.id.slice(0, 8)})`).join(", ")}`
  );

  // 対象会期の全議案（status 分布・一覧）。審議ステータス表示の差分調査用。
  const sessionBills = bills.filter(
    (b) => b.council_session_id && matchedIds.has(b.council_session_id)
  );
  const statusDist = new Map<string, number>();
  for (const b of sessionBills) {
    statusDist.set(b.status, (statusDist.get(b.status) ?? 0) + 1);
  }
  console.log(`\n=== 対象会期の審議 status 分布（計 ${sessionBills.length}）===`);
  for (const [st, n] of [...statusDist.entries()].sort()) {
    console.log(`  ${st}: ${n} 件`);
  }
  console.log("\n--- 一覧（[番号] 名称 / status）---");
  for (const b of sessionBills) {
    console.log(`  [${b.bill_number ?? "-"}] ${b.name} / ${b.status}`);
  }

  // 対象会期の draft 議案
  const drafts = sessionBills.filter((b) => b.publish_status === "draft");
  console.log(`\n対象 draft 議案: ${drafts.length} 件`);
  for (const b of drafts) {
    console.log(`  - [${b.bill_number ?? "-"}] ${b.name}（審議: ${b.status}）`);
  }

  if (drafts.length === 0) {
    console.log("\n公開対象がありません（既に公開済みか、会期に draft なし）。");
    return;
  }

  if (!apply) {
    console.log(
      `\nドライランのため書き込みはしていません。実行するには末尾に --apply を付けてください。`
    );
    return;
  }

  // 公開（対象会期の draft のみ。published_at を今にセット）
  const nowIso = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from("bills")
    .update({ publish_status: "published", published_at: nowIso })
    .in("council_session_id", [...matchedIds])
    .eq("publish_status", "draft")
    .select("id");
  if (updErr) throw new Error(`公開更新に失敗: ${updErr.message}`);

  console.log(
    `\n✅ 公開しました: ${updated?.length ?? 0} 件（published_at=${nowIso}）`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
