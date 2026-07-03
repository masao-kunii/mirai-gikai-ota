/**
 * 区長提出議案の原文 PDF から AI 要約を生成し、Cloud の bill_contents を
 * 「事実定型文」から「中身の要約」に差し替えるスクリプト。
 *
 * 実行方法:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
 *   GOOGLE_VERTEX_PROJECT=mirai-gikai-ota GOOGLE_VERTEX_LOCATION=asia-northeast1 \
 *   [DRY_RUN=1] [LIMIT_PDFS=1] [SESSION=令和8年第1回定例会] \
 *   npx tsx packages/seed/main/enrich-bill-summaries.ts
 *
 * - DRY_RUN=1: DB を書き換えず、生成結果を表示するだけ（品質確認用）
 * - LIMIT_PDFS=N: 先頭 N 個の PDF グループのみ処理（テスト用）
 * - SESSION: 対象会期名（未指定なら TARGETS 全部）
 *
 * 対象は区長提出議案（グループPDFがある）のみ。報告・請願は対象外。
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";
import * as parseNs from "../../../admin/src/features/bills-import/server/utils/parse-teirei-pages";
import * as mapNs from "../../../admin/src/features/bills-import/server/utils/teirei-mapping";
import * as genNs from "../../../admin/src/features/bills-import/server/utils/generate-summaries-from-pdf";

// CJS/ESM interop（tsx は admin の .ts を CJS 解決するため default 経由になりうる）
const parse = (
  "parseTeireiIndex" in parseNs
    ? parseNs
    : (parseNs as { default: typeof parseNs }).default
) as typeof parseNs;
const mapping = (
  "formatGianBillNumber" in mapNs
    ? mapNs
    : (mapNs as { default: typeof mapNs }).default
) as typeof mapNs;
const gen = (
  "generateBillSummariesFromPdf" in genNs
    ? genNs
    : (genNs as { default: typeof genNs }).default
) as typeof genNs;

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

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT_PDFS = process.env.LIMIT_PDFS
  ? Number(process.env.LIMIT_PDFS)
  : Infinity;
const SESSION_FILTER = process.env.SESSION;
// CATEGORY=報告 などでカテゴリーを絞る（テスト用。未指定なら全カテゴリー）
const CATEGORY_FILTER = process.env.CATEGORY;

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "user-agent": "mirai-gikai-ota/enrich" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.text();
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY が必要です");

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log(`📝 Enrich bill summaries (${DRY_RUN ? "DRY-RUN" : "WRITE"}) → ${url}`);

  const { data: sessions } = await supabase
    .from("council_sessions")
    .select("id, name");
  const sessionIdByName = new Map(
    (sessions ?? []).map((s) => [s.name.replace(/\s+/g, ""), s.id])
  );

  const targets = SESSION_FILTER
    ? TARGETS.filter((t) => t.sessionName === SESSION_FILTER)
    : TARGETS;

  let pdfCount = 0;
  let updated = 0;

  for (const target of targets) {
    const councilSessionId = sessionIdByName.get(
      target.sessionName.replace(/\s+/g, "")
    );
    if (!councilSessionId) {
      console.warn(`⚠️ 会期未登録: ${target.sessionName}`);
      continue;
    }

    const indexHtml = await fetchText(target.indexUrl);
    const index = parse.parseTeireiIndex(indexHtml, target.indexUrl);

    // 原文PDFを持つカテゴリーごとに処理（区長提出議案・報告）
    const categories: {
      label: string;
      sourceLabel: string;
      pageUrl: string | null;
      pdfParser: (
        html: string,
        base: string
      ) => ReturnType<typeof parse.parseGianPdfLinks>;
      formatNumber: (raw: string) => string;
    }[] = [
      {
        label: "区長提出議案",
        sourceLabel: "区長提出議案",
        pageUrl: index.kuchogianUrl,
        pdfParser: parse.parseGianPdfLinks,
        formatNumber: mapping.formatGianBillNumber,
      },
      {
        label: "議員提出議案",
        sourceLabel: "議員提出議案",
        pageUrl: index.giingianUrl,
        pdfParser: parse.parseGianPdfLinks,
        formatNumber: mapping.formatMemberBillNumber,
      },
      {
        label: "報告",
        sourceLabel: "区から議会への報告（専決処分等）",
        pageUrl: index.hokokuUrl,
        pdfParser: parse.parseHokokuPdfLinks,
        formatNumber: mapping.formatHokokuBillNumber,
      },
    ];

    for (const cat of categories) {
      if (CATEGORY_FILTER && cat.label !== CATEGORY_FILTER) continue;
      if (!cat.pageUrl) {
        console.warn(`⚠️ ${cat.label}ページなし: ${target.sessionName}`);
        continue;
      }
      const html = await fetchText(cat.pageUrl);
      const rows = parse.parseGianTable(html);
      const pdfLinks = cat.pdfParser(html, cat.pageUrl);

      // PDF ごとに、含まれる案件（番号→件名）をまとめる
      const byPdf = new Map<
        string,
        { url: string; bills: genNs.PdfBillInput[] }
      >();
      for (const r of rows) {
        const n = Number(r.number);
        const pdf = Number.isFinite(n)
          ? parse.findPdfForNumber(pdfLinks, n)
          : undefined;
        if (!pdf) continue;
        const entry = byPdf.get(pdf.url) ?? { url: pdf.url, bills: [] };
        entry.bills.push({
          billNumber: cat.formatNumber(r.number),
          title: r.title,
        });
        byPdf.set(pdf.url, entry);
      }

      console.log(
        `\n=== ${target.sessionName} / ${cat.label}: ${byPdf.size} PDF グループ ===`
      );

      for (const [pdfUrl, entry] of byPdf) {
        if (pdfCount >= LIMIT_PDFS) break;
        pdfCount++;
        console.log(
          `\n[PDF] ${pdfUrl.split("/").pop()} (${entry.bills.length}件)`
        );

        const res = await fetch(pdfUrl, {
          headers: { "user-agent": "mirai-gikai-ota/enrich" },
        });
        if (!res.ok) {
          console.warn(`  PDF取得失敗 HTTP ${res.status}`);
          continue;
        }
        const pdfBytes = Buffer.from(await res.arrayBuffer());

        let generated: genNs.GeneratedPdfSummaries;
        try {
          generated = await gen.generateBillSummariesFromPdf(
            pdfBytes,
            entry.bills,
            target.sessionName,
            cat.sourceLabel
          );
        } catch (e) {
          console.warn(`  AI生成失敗: ${e instanceof Error ? e.message : e}`);
          continue;
        }

        for (const b of generated.bills) {
          if (!b.found || !b.normal.summary.trim()) {
            console.log(`  - ${b.billNumber}: (PDFから読み取れず / スキップ)`);
            continue;
          }
          console.log(`  - ${b.billNumber}: ${b.normal.summary.slice(0, 60)}`);

          if (DRY_RUN) continue;

          const { data: bill } = await supabase
            .from("bills")
            .select("id")
            .eq("council_session_id", councilSessionId)
            .eq("bill_number", b.billNumber)
            .maybeSingle();
          if (!bill) {
            console.warn(`    ⚠️ DB未一致: ${b.billNumber}`);
            continue;
          }

          const title =
            entry.bills.find((x) => x.billNumber === b.billNumber)?.title ??
            b.billNumber;
          const rows2 = [
            {
              bill_id: bill.id,
              difficulty_level: "normal" as const,
              title,
              summary: b.normal.summary.slice(0, 500),
              content: b.normal.content,
            },
            {
              bill_id: bill.id,
              difficulty_level: "hard" as const,
              title,
              summary: b.hard.summary.slice(0, 500),
              content: b.hard.content,
            },
          ];
          const { error } = await supabase
            .from("bill_contents")
            .upsert(rows2, { onConflict: "bill_id,difficulty_level" });
          if (error) {
            console.warn(`    ⚠️ 更新失敗: ${error.message}`);
          } else {
            updated++;
          }
        }
      }
    }

    // その他（議員派遣等）はタイトル単位の PDF なので別処理（番号が無い）
    if (
      (!CATEGORY_FILTER || CATEGORY_FILTER === "その他") &&
      index.sonotaUrl
    ) {
      const html = await fetchText(index.sonotaUrl);
      const sonotaRows = parse.parseSonotaTable(html);
      const sonotaPdfs = parse.parseSonotaPdfLinks(html, index.sonotaUrl);
      console.log(
        `\n=== ${target.sessionName} / その他: ${sonotaPdfs.length} PDF ===`
      );
      for (let i = 0; i < sonotaRows.length; i++) {
        if (pdfCount >= LIMIT_PDFS) break;
        const row = sonotaRows[i];
        if (!row) continue;
        const billNumber = mapping.formatSonotaBillNumber(i + 1);
        const pdf =
          sonotaPdfs.find((p) => p.title === row.title) ??
          sonotaPdfs.find(
            (p) => row.title.includes(p.title) || p.title.includes(row.title)
          );
        if (!pdf) {
          console.log(`  - ${billNumber}: PDF無し（${row.title.slice(0, 20)}）`);
          continue;
        }
        pdfCount++;
        console.log(`\n[PDF] ${pdf.url.split("/").pop()} (その他)`);
        const res = await fetch(pdf.url, {
          headers: { "user-agent": "mirai-gikai-ota/enrich" },
        });
        if (!res.ok) {
          console.warn(`  PDF取得失敗 HTTP ${res.status}`);
          continue;
        }
        const pdfBytes = Buffer.from(await res.arrayBuffer());
        let generated: genNs.GeneratedPdfSummaries;
        try {
          generated = await gen.generateBillSummariesFromPdf(
            pdfBytes,
            [{ billNumber, title: row.title }],
            target.sessionName,
            "議会のその他の議決事項（議員派遣等）"
          );
        } catch (e) {
          console.warn(`  AI生成失敗: ${e instanceof Error ? e.message : e}`);
          continue;
        }
        const b = generated.bills[0];
        if (!b || !b.found || !b.normal.summary.trim()) {
          console.log(`  - ${billNumber}: (PDFから読み取れず)`);
          continue;
        }
        console.log(`  - ${billNumber}: ${b.normal.summary.slice(0, 60)}`);
        if (DRY_RUN) continue;
        const { data: bill } = await supabase
          .from("bills")
          .select("id")
          .eq("council_session_id", councilSessionId)
          .eq("bill_number", billNumber)
          .maybeSingle();
        if (!bill) {
          console.warn(`    ⚠️ DB未一致: ${billNumber}`);
          continue;
        }
        const rows2 = [
          {
            bill_id: bill.id,
            difficulty_level: "normal" as const,
            title: row.title,
            summary: b.normal.summary.slice(0, 500),
            content: b.normal.content,
          },
          {
            bill_id: bill.id,
            difficulty_level: "hard" as const,
            title: row.title,
            summary: b.hard.summary.slice(0, 500),
            content: b.hard.content,
          },
        ];
        const { error } = await supabase
          .from("bill_contents")
          .upsert(rows2, { onConflict: "bill_id,difficulty_level" });
        if (error) {
          console.warn(`    ⚠️ 更新失敗: ${error.message}`);
        } else {
          updated++;
        }
      }
    }
  }

  console.log(
    `\n🎉 完了 (PDF処理 ${pdfCount} / ${DRY_RUN ? "DRY-RUN（書込なし）" : `更新議案 ${updated}件`})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
