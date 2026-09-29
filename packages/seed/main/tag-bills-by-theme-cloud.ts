/**
 * 議案を区政テーマに振り分け、テーマのタグを付けるスクリプト（本番向け）。
 *
 * 議会（議案）と区政（テーマ）は、テーマの theme_contents.bill_tag_label と
 * 同じ名前の議案タグでつながる。テーマ詳細の「関連する議案」と、議案詳細の
 * 「関連する区政テーマ」はどちらもこのタグを見る。
 *
 * 処理:
 *   1. bill_tag_label を持つテーマごとに、同じ名前のタグが無ければ作る
 *   2. テーマのタグがまだ1つも付いていない議案を、AI で最大2テーマに振り分ける
 *   3. 振り分けたテーマのタグを bills_tags に追加する
 *
 * 既に付いているタグは変えない（管理画面で直したタグを上書きしないため）。
 * どのテーマにも当てはまらなかった議案は、次の実行でもう一度分類される。
 *
 * 既定は dry-run（分類結果を表示するだけ。AI は呼ぶ）。書き込むときは --apply。
 *
 * 実行方法:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... GEMINI_API_KEY=... \
 *   pnpm --filter @mirai-gikai/seed tag:bills-by-theme [--apply] [--limit=N]
 */

import {
  type BillForClassification,
  classifyBillsIntoThemes,
  type ThemeForClassification,
} from "@mirai-gikai/shared/bills/classify-themes";
import type { Database } from "@mirai-gikai/supabase";
import { createClient } from "@supabase/supabase-js";

/** 1回の AI 呼び出しで分類する議案の数。 */
const BATCH_SIZE = 20;

type ThemeWithTag = ThemeForClassification & { tagLabel: string };

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY が必要です");
  }
  // GitHub Actions では Vertex（ADC）が使えないため、キーが無ければ最初に止める
  if (process.env.CI && !process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY が必要です（GitHub Secrets を確認）");
  }
  const apply = process.argv.includes("--apply");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log(
    `🏷  議案のテーマ付け → ${new URL(url).host}（${apply ? "APPLY" : "DRY-RUN"}）`
  );

  // 1. テーマと、テーマのタグ
  const { data: themeRows, error: tErr } = await supabase
    .from("themes")
    .select("slug, name, lead, theme_contents(bill_tag_label)")
    .eq("is_active", true)
    .order("sort_order");
  if (tErr) throw new Error(`themes 取得: ${tErr.message}`);
  const themes: ThemeWithTag[] = (themeRows ?? []).flatMap((t) => {
    const content = Array.isArray(t.theme_contents)
      ? t.theme_contents[0]
      : t.theme_contents;
    const tagLabel = content?.bill_tag_label;
    return tagLabel
      ? [{ slug: t.slug, name: t.name, lead: t.lead, tagLabel }]
      : [];
  });
  if (themes.length === 0) {
    console.log("bill_tag_label を持つテーマがありません");
    return;
  }

  const { data: tagRows, error: gErr } = await supabase
    .from("tags")
    .select("id, label");
  if (gErr) throw new Error(`tags 取得: ${gErr.message}`);
  const tagIdByLabel = new Map((tagRows ?? []).map((t) => [t.label, t.id]));

  for (const theme of themes) {
    if (tagIdByLabel.has(theme.tagLabel)) continue;
    console.log(`➕ タグを作成: ${theme.tagLabel}`);
    if (!apply) continue;
    const { data, error } = await supabase
      .from("tags")
      .insert({
        label: theme.tagLabel,
        description: `区政テーマ「${theme.name}」に関係する議案`,
      })
      .select("id")
      .single();
    if (error) throw new Error(`タグ作成（${theme.tagLabel}）: ${error.message}`);
    tagIdByLabel.set(theme.tagLabel, data.id);
  }

  // 2. まだテーマのタグが無い議案
  const themeTagIds = new Set(
    themes.flatMap((t) => tagIdByLabel.get(t.tagLabel) ?? [])
  );
  const { data: billTagRows, error: btErr } = await supabase
    .from("bills_tags")
    .select("bill_id, tag_id");
  if (btErr) throw new Error(`bills_tags 取得: ${btErr.message}`);
  const alreadyTagged = new Set(
    (billTagRows ?? [])
      .filter((r) => themeTagIds.has(r.tag_id))
      .map((r) => r.bill_id)
  );

  const { data: billRows, error: bErr } = await supabase
    .from("bills")
    .select("id, name, bill_contents(summary, difficulty_level)")
    .order("created_at");
  if (bErr) throw new Error(`bills 取得: ${bErr.message}`);
  const targets: BillForClassification[] = (billRows ?? [])
    .filter((b) => !alreadyTagged.has(b.id))
    .slice(0, limit)
    .map((b) => ({
      id: b.id,
      name: b.name,
      summary:
        b.bill_contents.find((c) => c.difficulty_level === "normal")?.summary ??
        null,
    }));
  console.log(
    `議案 ${billRows?.length ?? 0} 件 / タグ付け済み ${alreadyTagged.size} 件 / 今回の対象 ${targets.length} 件`
  );

  // 3. 分類して保存
  const themeBySlug = new Map(themes.map((t) => [t.slug, t]));
  const counts = new Map<string, number>();
  let none = 0;
  let missing = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const result = await classifyBillsIntoThemes(themes, batch);
    const inserts: { bill_id: string; tag_id: string }[] = [];
    for (const bill of batch) {
      const slugs = result.get(bill.id);
      if (!slugs) {
        missing++;
        console.log(`⚠️  結果なし: ${bill.name}`);
        continue;
      }
      if (slugs.length === 0) none++;
      const names = slugs.map((s) => themeBySlug.get(s)?.name ?? s);
      console.log(`${bill.name} → ${names.join("、") || "（なし）"}`);
      for (const slug of slugs) {
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
        const theme = themeBySlug.get(slug);
        const tagId = theme && tagIdByLabel.get(theme.tagLabel);
        if (tagId) inserts.push({ bill_id: bill.id, tag_id: tagId });
      }
    }
    if (apply && inserts.length > 0) {
      const { error } = await supabase.from("bills_tags").insert(inserts);
      if (error) throw new Error(`bills_tags 追加: ${error.message}`);
    }
  }

  console.log("\nテーマ別の件数:");
  for (const theme of themes) {
    console.log(`  ${theme.name}: ${counts.get(theme.slug) ?? 0}`);
  }
  console.log(`  どれにも当てはまらない: ${none}`);
  if (missing > 0) {
    // 静かなスキップ禁止（sync_teirei と同じ方針）。次回の実行で再分類される。
    console.log(
      `::warning title=tag-bills-by-theme::AI の結果が返らなかった議案が ${missing} 件あります`
    );
    process.exitCode = 1;
  }
  if (!apply) console.log("\n（DRY-RUN のため書き込んでいません）");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
