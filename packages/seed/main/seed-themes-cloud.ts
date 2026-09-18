/**
 * Supabase Cloud（本番）に区政テーマ（themes / theme_contents / theme_initiatives）
 * を投入するスクリプト。
 *
 * `pnpm seed` は clearAllData で全消去してから開発用データを入れるため本番では
 * 使えない。ここでは themes-data.ts の内容のうち**本番に無いものだけ**を足す。
 * 既存行は更新しない（管理画面などで編集された内容を上書きしないため）。
 *
 *   - themes            : slug が無いテーマだけ insert
 *   - theme_contents    : 本文が無いテーマだけ insert（theme_id は unique）
 *   - theme_initiatives : 取り組みが1件も無いテーマだけ insert（自然キーが無いため）
 *
 * 既定は dry-run（件数を表示するだけ）。書き込むときは --apply を付ける。
 *
 * 実行方法:
 *   SUPABASE_URL=https://<project-ref>.supabase.co \
 *   SUPABASE_SECRET_KEY=<sb_secret_xxx> \
 *   pnpm --filter @mirai-gikai/seed seed:themes-cloud [--apply]
 */

import type { Database } from "@mirai-gikai/supabase";
import { createClient } from "@supabase/supabase-js";
import {
  createThemeContents,
  createThemeInitiatives,
  themes,
} from "./themes-data";

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
    `🌱 区政テーマ投入 → ${new URL(url).host}（${apply ? "APPLY" : "DRY-RUN"}）`
  );

  // 1. themes
  const { data: existingThemes, error: exErr } = await supabase
    .from("themes")
    .select("id, slug");
  if (exErr) throw new Error(`themes 取得: ${exErr.message}`);
  const existingSlugs = new Set((existingThemes ?? []).map((t) => t.slug));
  const newThemes = themes.filter((t) => !existingSlugs.has(t.slug));
  console.log(
    `themes            : 既存 ${existingSlugs.size} / 追加 ${newThemes.length}`
  );

  let allThemes = existingThemes ?? [];
  if (apply && newThemes.length > 0) {
    const { data: inserted, error } = await supabase
      .from("themes")
      .insert(newThemes)
      .select("id, slug");
    if (error) throw new Error(`themes insert: ${error.message}`);
    allThemes = [...allThemes, ...(inserted ?? [])];
  }

  // dry-run では新規テーマに id が無いので、仮 id で行数だけ数える。
  const resolvable = apply
    ? allThemes
    : [
        ...allThemes,
        ...newThemes.map((t) => ({ id: `(new:${t.slug})`, slug: t.slug })),
      ];

  // 2. theme_contents（本文が無いテーマだけ）
  const { data: existingContents, error: ecErr } = await supabase
    .from("theme_contents")
    .select("theme_id");
  if (ecErr) throw new Error(`theme_contents 取得: ${ecErr.message}`);
  const themesWithContent = new Set(
    (existingContents ?? []).map((c) => c.theme_id)
  );
  const newContents = createThemeContents(resolvable).filter(
    (c) => !themesWithContent.has(c.theme_id)
  );
  console.log(
    `theme_contents    : 既存 ${themesWithContent.size} / 追加 ${newContents.length}`
  );
  if (apply && newContents.length > 0) {
    const { error } = await supabase
      .from("theme_contents")
      .insert(newContents);
    if (error) throw new Error(`theme_contents insert: ${error.message}`);
  }

  // 3. theme_initiatives（取り組みが1件も無いテーマだけ）
  const { data: existingInitiatives, error: eiErr } = await supabase
    .from("theme_initiatives")
    .select("theme_id");
  if (eiErr) throw new Error(`theme_initiatives 取得: ${eiErr.message}`);
  const themesWithInitiatives = new Set(
    (existingInitiatives ?? []).map((i) => i.theme_id)
  );
  const newInitiatives = createThemeInitiatives(resolvable).filter(
    (i) => !themesWithInitiatives.has(i.theme_id)
  );
  console.log(
    `theme_initiatives : 既存 ${existingInitiatives?.length ?? 0} / 追加 ${newInitiatives.length}`
  );
  if (apply && newInitiatives.length > 0) {
    const { error } = await supabase
      .from("theme_initiatives")
      .insert(newInitiatives);
    if (error) throw new Error(`theme_initiatives insert: ${error.message}`);
  }

  console.log(
    apply ? "✅ 投入完了" : "（DRY-RUN のため書き込みなし。--apply で実行）"
  );
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
