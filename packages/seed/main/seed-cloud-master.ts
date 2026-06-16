/**
 * Supabase Cloud (本番) に投入する**最小限のマスターデータ**を流すスクリプト。
 *
 * `pnpm seed` のローカル開発用 seed には議案・インタビュー・demo データなど
 * 本番に入れたくないものが多数含まれるため、別スクリプトとして切り出す。
 *
 * 実行方法:
 *   SUPABASE_URL=https://<project-ref>.supabase.co \
 *   SUPABASE_SECRET_KEY=<sb_secret_xxx> \
 *   npx tsx packages/seed/main/seed-cloud-master.ts
 *
 * 投入対象:
 *   - factions   : 11会派
 *   - committees : 6委員会
 *   - tags       : 3タグ
 *   - councilSessions : 直近2会期
 *
 * 既にデータが入っている場合はスキップする (idempotent ではないが、
 * UNIQUE 制約に引っかかった行はエラーログで知らせるだけ)。
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";
import {
  councilSessions,
  factions,
  committees,
  tags,
} from "./data";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY が必要です");
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🌱 Seeding master data into ${url}`);

  // factions (UNIQUE 制約は無いので「既存 name は skip」で insert)
  const { data: existingFactions } = await supabase
    .from("factions")
    .select("name");
  const existingFactionNames = new Set(
    (existingFactions ?? []).map((f) => f.name)
  );
  const newFactions = factions.filter(
    (f) => !existingFactionNames.has(f.name)
  );
  if (newFactions.length > 0) {
    const { error: fErr } = await supabase.from("factions").insert(newFactions);
    if (fErr) throw new Error(`factions: ${fErr.message}`);
  }
  console.log(`✅ factions: inserted ${newFactions.length} new rows`);

  // committees (UNIQUE 制約は無いので insert + 既存スキップ)
  const { data: existingCommittees } = await supabase
    .from("committees")
    .select("name");
  const existingNames = new Set(
    (existingCommittees ?? []).map((c) => c.name)
  );
  const newCommittees = committees.filter((c) => !existingNames.has(c.name));
  if (newCommittees.length > 0) {
    const { error: cErr } = await supabase
      .from("committees")
      .insert(newCommittees);
    if (cErr) throw new Error(`committees: ${cErr.message}`);
  }
  console.log(`✅ committees: inserted ${newCommittees.length} new rows`);

  // tags
  const { data: existingTags } = await supabase.from("tags").select("label");
  const existingLabels = new Set((existingTags ?? []).map((t) => t.label));
  const newTags = tags.filter((t) => !existingLabels.has(t.label));
  if (newTags.length > 0) {
    const { error: tErr } = await supabase.from("tags").insert(newTags);
    if (tErr) throw new Error(`tags: ${tErr.message}`);
  }
  console.log(`✅ tags: inserted ${newTags.length} new rows`);

  // council_sessions (slug が UNIQUE のはずだが念のため skip 方式で)
  const { data: existingSessions } = await supabase
    .from("council_sessions")
    .select("slug");
  const existingSlugs = new Set(
    (existingSessions ?? []).map((s) => s.slug)
  );
  const newSessions = councilSessions.filter(
    (s) => !existingSlugs.has(s.slug ?? "")
  );
  if (newSessions.length > 0) {
    const { error: sErr } = await supabase
      .from("council_sessions")
      .insert(newSessions);
    if (sErr) throw new Error(`council_sessions: ${sErr.message}`);
  }
  console.log(`✅ council_sessions: inserted ${newSessions.length} new rows`);

  console.log("🎉 Master data seeding completed.");
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
