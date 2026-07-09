/**
 * 指定会期の「下書き（draft）」議案だけを公開する運用スクリプト。
 *
 * 背景: 定例会同期（import:teirei）は新規議案を publish_status="draft" で取り込む。
 * 会期まるごと公開したいとき、admin の一括公開は会期で絞れず全議案に効いてしまう
 * （既公開分の published_at まで上書きされる）ため、会期を限定できる本スクリプトを使う。
 *
 * 安全策:
 *   - 既定はドライラン（--apply を付けたときだけ書き込む）。
 *   - 対象は「指定会期 かつ publish_status='draft'」の議案のみ。
 *     他会期・既に published/coming_soon の議案には一切触れない。
 *   - published_at は今（実行時刻）をセット（公開日順の並びのため）。
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

  // 1. 会期を名称（空白無視）で照合
  const { data: sessions, error: sessErr } = await supabase
    .from("council_sessions")
    .select("id, name");
  if (sessErr) throw new Error(`会期取得に失敗: ${sessErr.message}`);
  const target = normalize(sessionName);
  const session = (sessions ?? []).find((s) => normalize(s.name) === target);
  if (!session) {
    const names = (sessions ?? []).map((s) => s.name).join(" / ");
    throw new Error(
      `会期「${sessionName}」が見つかりません。DB の会期: ${names || "(なし)"}`
    );
  }
  console.log(`✓ 会期: ${session.name} (${session.id})`);

  // 2. 対象（この会期 かつ draft）を列挙
  const { data: drafts, error: draftErr } = await supabase
    .from("bills")
    .select("id, name, status, bill_number")
    .eq("council_session_id", session.id)
    .eq("publish_status", "draft")
    .order("bill_number", { ascending: true });
  if (draftErr) throw new Error(`議案取得に失敗: ${draftErr.message}`);

  const targets = drafts ?? [];
  console.log(`\n対象 draft 議案: ${targets.length} 件`);
  for (const b of targets) {
    console.log(`  - [${b.bill_number ?? "-"}] ${b.name}（審議: ${b.status}）`);
  }

  if (targets.length === 0) {
    console.log("\n公開対象がありません（既に公開済みか、会期に draft なし）。");
    return;
  }

  if (!apply) {
    console.log(
      `\nドライランのため書き込みはしていません。実行するには末尾に --apply を付けてください。`
    );
    return;
  }

  // 3. 公開（この会期の draft のみ。published_at を今にセット）
  const nowIso = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from("bills")
    .update({ publish_status: "published", published_at: nowIso })
    .eq("council_session_id", session.id)
    .eq("publish_status", "draft")
    .select("id");
  if (updErr) throw new Error(`公開更新に失敗: ${updErr.message}`);

  console.log(`\n✅ 公開しました: ${updated?.length ?? 0} 件（published_at=${nowIso}）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
