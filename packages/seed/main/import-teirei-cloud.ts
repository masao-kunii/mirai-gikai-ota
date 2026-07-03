/**
 * 大田区議会の定例会ページから議案・報告・請願陳情・会派見解を取り込み、
 * 指定した Supabase（ローカル or Cloud）へ投入するスクリプト。
 *
 * admin の Server Action と同じコアサービス（importTeireiBills）を再利用する。
 *
 * 実行方法（Cloud 本番へ投入する例）:
 *   SUPABASE_URL=https://<project-ref>.supabase.co \
 *   SUPABASE_SECRET_KEY=<sb_secret_xxx> \
 *   npx tsx packages/seed/main/import-teirei-cloud.ts
 *
 * 取り込みはデフォルト下書き（draft）。会期は council_sessions の name で照合する。
 * 取り込み対象の定例会は TARGETS 配列で定義する。
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";
// admin の Server Action と同一のコアサービスを再利用する。
// tsx は admin の .ts を CJS として解決するため、ESM からの取り込みでは
// 名前付き export が default 経由になることがある。両方の形に対応する。
import * as importServiceNs from "../../../admin/src/features/bills-import/server/services/import-teirei-bills";

const importService = (
  "importTeireiBills" in importServiceNs
    ? importServiceNs
    : (importServiceNs as { default: typeof importServiceNs }).default
) as typeof importServiceNs;
const { importTeireiBills } = importService;

/** 取り込み対象の定例会（会期名は council_sessions.name と一致させる） */
const TARGETS: { sessionName: string; indexUrl: string }[] = [
  {
    sessionName: "令和8年第1回定例会",
    indexUrl:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/r_8/1teirei/index.html",
  },
  {
    sessionName: "令和8年第2回定例会",
    indexUrl:
      "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/r_8/2teirei/index.html",
  },
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY が必要です");
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`📥 Importing teirei bills into ${url}`);

  const fetchText = async (u: string): Promise<string> => {
    const res = await fetch(u, {
      headers: { "user-agent": "mirai-gikai-ota/bills-import-script" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${u}`);
    return res.text();
  };

  // 会期名 → id を解決（空白差異を吸収）
  const { data: sessions, error: sErr } = await supabase
    .from("council_sessions")
    .select("id, name");
  if (sErr) throw new Error(`council_sessions 取得失敗: ${sErr.message}`);
  const sessionIdByNormalizedName = new Map(
    (sessions ?? []).map((s) => [s.name.replace(/\s+/g, ""), s.id])
  );

  let totalWarnings = 0;
  let failedTargets = 0;

  for (const target of TARGETS) {
    const normalized = target.sessionName.replace(/\s+/g, "");
    const councilSessionId = sessionIdByNormalizedName.get(normalized);
    if (!councilSessionId) {
      totalWarnings += 1;
      console.warn(
        `⚠️  会期「${target.sessionName}」が DB に未登録のためスキップ`
      );
      continue;
    }

    console.log(`\n--- ${target.sessionName} ---`);
    const result = await importTeireiBills(supabase, fetchText, {
      indexUrl: target.indexUrl,
      councilSessionId,
      sessionName: normalized,
      publishStatus: "draft",
    });

    if (!result.ok) {
      failedTargets += 1;
      console.error(`❌ 取り込み失敗: ${result.error}`);
    } else {
      console.log(
        `✅ 議案 ${result.billsUpserted} 件 / 会派見解 ${result.stancesUpserted} 件`
      );
    }
    if (result.warnings.length > 0) {
      totalWarnings += result.warnings.length;
      console.log(`  警告 ${result.warnings.length} 件:`);
      for (const w of result.warnings) {
        console.log(`   - ${w}`);
        // GitHub Actions 上では警告アノテーションとして実行ページに表示する
        if (process.env.GITHUB_ACTIONS) {
          console.log(`::warning title=sync-teirei::${w}`);
        }
      }
    }
  }

  // 静かなスキップ禁止（TARGET_ARCHITECTURE §8-4）:
  // 取り込み失敗・警告があれば非ゼロ終了し、GitHub Actions の失敗通知で気づけるようにする。
  // upsert は全会期分完了した後なので、失敗扱いでもデータ同期自体は最新化されている。
  if (failedTargets > 0) {
    console.error(`\n❌ ${failedTargets} 会期の取り込みに失敗しました`);
    process.exitCode = 1;
  } else if (totalWarnings > 0) {
    console.error(
      `\n⚠️  警告 ${totalWarnings} 件。照合失敗やスキップが発生しています。上記ログを確認してください。`
    );
    process.exitCode = 1;
  } else {
    console.log("\n🎉 完了（警告なし）");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
