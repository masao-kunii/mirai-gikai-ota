/**
 * トップページの注目タグを、区政テーマのタグ（テーマ名と同じ名前）に揃えるスクリプト。
 *
 * 以前の注目タグ（例:「福祉・医療」）はテーマ名（「福祉・健康」）とずれていて、
 * 議案のテーマ付け（tag:bills-by-theme）で付くタグと一致しなかった。
 * tags.label は unique で、テーマ名のタグは既にあるため、名前の変更ではなく
 * 注目の設定（featured_priority）をテーマのタグへ移す。
 *
 *   - 移し先（テーマのタグ）: featured_priority を引き継ぎ、説明をテーマの説明から作る
 *   - 移し元（以前のタグ）  : featured_priority を外す。議案が1件も付いていなければ削除する
 *
 * 既定は dry-run。書き込むときは --apply を付ける。
 *
 * 実行方法:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
 *   pnpm --filter @mirai-gikai/seed align:featured-tags [--apply]
 */

import type { Database } from "@mirai-gikai/supabase";
import { createClient } from "@supabase/supabase-js";

/** 以前の注目タグ → テーマのタグ（テーマ名）。 */
const MOVES: { from: string; to: string }[] = [
  { from: "まちづくり・環境", to: "まちづくり・住まい" },
  { from: "福祉・医療", to: "福祉・健康" },
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY が必要です");
  }
  const apply = process.argv.includes("--apply");
  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log(
    `⭐ 注目タグをテーマ名に揃える → ${new URL(url).host}（${apply ? "APPLY" : "DRY-RUN"}）`
  );

  const { data: tags, error: tErr } = await supabase
    .from("tags")
    .select("id, label, featured_priority, bills_tags(count)");
  if (tErr) throw new Error(`tags 取得: ${tErr.message}`);
  const byLabel = new Map((tags ?? []).map((t) => [t.label, t]));

  const { data: themes, error: thErr } = await supabase
    .from("themes")
    .select("name, lead");
  if (thErr) throw new Error(`themes 取得: ${thErr.message}`);
  const leadByName = new Map((themes ?? []).map((t) => [t.name, t.lead]));

  for (const { from, to } of MOVES) {
    const source = byLabel.get(from);
    const target = byLabel.get(to);
    if (!target) {
      throw new Error(
        `タグ「${to}」がありません。先に tag:bills-by-theme を実行してください`
      );
    }
    if (!source) {
      console.log(`- 「${from}」は既にありません（スキップ）`);
      continue;
    }
    const priority = source.featured_priority;
    const lead = leadByName.get(to);
    const description = lead ? `${lead}に関する議案` : null;
    const sourceBills = source.bills_tags[0]?.count ?? 0;
    console.log(
      `- 「${from}」(注目 ${priority ?? "なし"}・議案 ${sourceBills}件) → 「${to}」(議案 ${target.bills_tags[0]?.count ?? 0}件)`
    );
    if (!apply) continue;

    // unique ではないが、同じ順位が2つ並ばないよう先に移し元を外す
    const { error: e1 } = await supabase
      .from("tags")
      .update({ featured_priority: null })
      .eq("id", source.id);
    if (e1) throw new Error(`「${from}」の更新: ${e1.message}`);
    const { error: e2 } = await supabase
      .from("tags")
      .update({ featured_priority: priority, description })
      .eq("id", target.id);
    if (e2) throw new Error(`「${to}」の更新: ${e2.message}`);
    if (sourceBills === 0) {
      const { error: e3 } = await supabase
        .from("tags")
        .delete()
        .eq("id", source.id);
      if (e3) throw new Error(`「${from}」の削除: ${e3.message}`);
      console.log(`  削除: 「${from}」（議案が付いていないため）`);
    }
  }
  if (!apply) console.log("\n（DRY-RUN のため書き込んでいません）");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
