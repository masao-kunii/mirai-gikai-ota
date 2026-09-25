/**
 * 大田区議会の本会議録（速報版）を Supabase Cloud（本番）に同期する。
 * GitHub Actions（.github/workflows/sync_minutes.yml）から毎日実行する。
 *
 * 大田区の公式サイトは Cloudflare Workers からのアクセスを 403 で拒否するため、
 * 管理画面（api Worker）ではなく GitHub Actions 側で取得する。
 *
 * 処理:
 *   1. 速報版ページから議事録 PDF の一覧を読む
 *   2. 会期（council_sessions.name と空白を無視して照合）が DB にあり、まだ登録
 *      されていないものを council_session_minutes に追加する
 *   3. 本文（markdown_text）が空の議事録について、PDF から文字を抜き出して保存する
 *      （管理画面の抽出と同じ unpdf + normalizeMinutesPdfText を使う）
 *
 * 既存の本文は上書きしない（手で直した本文を守るため）。
 *
 * 実行方法:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
 *   pnpm --filter @mirai-gikai/seed sync:minutes [--dry-run]
 */

import { normalizeMinutesPdfText } from "@mirai-gikai/shared/minutes/normalize-pdf-text";
import {
  parseSokuhouPage,
  type SokuhouMinute,
} from "@mirai-gikai/shared/minutes/parse-sokuhou-page";
import type { Database } from "@mirai-gikai/supabase";
import { createClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";

const SOKUHOU_URL =
  "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.html";

/** 公式サイトへの負荷を抑えるため、1回の実行で抽出する PDF の上限。 */
const MAX_EXTRACT_PER_RUN = 10;

/** 取得の間隔（公式サイトへの配慮） */
const FETCH_INTERVAL_MS = 1000;

const USER_AGENT = "mirai-gikai-ota/sync-minutes (+https://ota.aix.tokyo)";

type Stats = {
  listed: number;
  inserted: number;
  alreadyRegistered: number;
  noSession: number;
  extracted: number;
  /** ジョブを失敗させる警告（定例会の会期が無い・本文抽出の失敗） */
  warnings: number;
};

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY が必要です");
  }
  const dryRun = process.argv.includes("--dry-run");
  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stats: Stats = {
    listed: 0,
    inserted: 0,
    alreadyRegistered: 0,
    noSession: 0,
    extracted: 0,
    warnings: 0,
  };

  console.log(
    `📥 議事録の同期 → ${new URL(url).host}${dryRun ? "（DRY-RUN）" : ""}`
  );

  // 1. 速報版ページ
  const page = await fetchOk(SOKUHOU_URL);
  const scraped = parseSokuhouPage(await page.text(), SOKUHOU_URL);
  stats.listed = scraped.length;
  console.log(`速報版ページ: ${scraped.length} 件`);

  // 2. 未登録のものを追加
  const { data: sessions, error: sErr } = await supabase
    .from("council_sessions")
    .select("id, name");
  if (sErr) throw new Error(`council_sessions 取得失敗: ${sErr.message}`);
  const sessionIdByName = new Map(
    (sessions ?? []).map((s) => [normalizeName(s.name), s.id])
  );

  const { data: existing, error: eErr } = await supabase
    .from("council_session_minutes")
    .select("council_session_id, meeting_date, source_pdf_url");
  if (eErr) throw new Error(`議事録の取得失敗: ${eErr.message}`);
  const registeredUrls = new Set((existing ?? []).map((m) => m.source_pdf_url));
  const registeredKeys = new Set(
    (existing ?? []).map((m) => `${m.council_session_id}:${m.meeting_date}`)
  );

  for (const minute of scraped) {
    const sessionId = minute.sessionName
      ? sessionIdByName.get(normalizeName(minute.sessionName))
      : undefined;
    if (!sessionId) {
      stats.noSession++;
      if (reportMissingSession(minute)) stats.warnings++;
      continue;
    }
    if (
      registeredUrls.has(minute.pdfUrl) ||
      registeredKeys.has(`${sessionId}:${minute.meetingDate}`)
    ) {
      stats.alreadyRegistered++;
      continue;
    }
    console.log(`➕ 追加: ${minute.title}`);
    stats.inserted++;
    if (dryRun) continue;
    const { error } = await supabase.from("council_session_minutes").insert({
      council_session_id: sessionId,
      meeting_date: minute.meetingDate,
      day_number: minute.dayNumber,
      title: minute.title,
      source_pdf_url: minute.pdfUrl,
    });
    if (error) throw new Error(`議事録の追加失敗（${minute.title}）: ${error.message}`);
  }

  // 3. 本文が空のものを抽出
  const { data: empty, error: mErr } = await supabase
    .from("council_session_minutes")
    .select("id, title, meeting_date, source_pdf_url, markdown_text")
    .or("markdown_text.is.null,markdown_text.eq.")
    .order("meeting_date", { ascending: true })
    .limit(MAX_EXTRACT_PER_RUN);
  if (mErr) throw new Error(`未抽出の議事録の取得失敗: ${mErr.message}`);

  for (const minute of empty ?? []) {
    const label = minute.title ?? minute.meeting_date;
    try {
      await sleep(FETCH_INTERVAL_MS);
      const text = await extractMinutesText(minute.source_pdf_url);
      console.log(`📝 抽出: ${label}（${text.length.toLocaleString()} 文字）`);
      stats.extracted++;
      if (dryRun) continue;
      const { error } = await supabase
        .from("council_session_minutes")
        .update({ markdown_text: text, extracted_at: new Date().toISOString() })
        .eq("id", minute.id);
      if (error) throw new Error(error.message);
    } catch (e) {
      stats.warnings++;
      const message = e instanceof Error ? e.message : String(e);
      console.log(`::warning title=sync-minutes::${label} の本文抽出に失敗: ${message}`);
    }
  }

  console.log(
    `\n一覧 ${stats.listed} 件 / 追加 ${stats.inserted} / 登録済み ${stats.alreadyRegistered} / 会期なし ${stats.noSession} / 抽出 ${stats.extracted} / 警告 ${stats.warnings}`
  );
  // 静かなスキップ禁止（sync_teirei と同じ方針）。警告があればジョブを失敗させる。
  if (stats.warnings > 0) process.exit(1);
}

/** PDF を取得し、管理画面の抽出と同じ手順で本文にする。 */
async function extractMinutesText(pdfUrl: string): Promise<string> {
  const res = await fetchOk(pdfUrl);
  const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
  const { text: pages } = await extractText(pdf, { mergePages: false });
  const text = normalizeMinutesPdfText(pages);
  if (text === "") {
    throw new Error("文字を読み取れませんでした（画像だけの PDF の可能性）");
  }
  return text;
}

/**
 * 会期が DB に無い議事録の扱い。定例会は会期の作り忘れなので警告（ジョブ失敗）
 * にし、臨時会は会期を登録しない運用のため情報表示にとどめる。
 * 警告にしたときは true を返す。
 */
function reportMissingSession(minute: SokuhouMinute): boolean {
  const name = minute.sessionName ?? "（会期名なし）";
  if (!name.includes("臨時会")) {
    console.log(
      `::warning title=sync-minutes::会期「${name}」が DB に無いため「${minute.title}」を追加しませんでした。管理画面で会期を作成してください`
    );
    return true;
  }
  console.log(`ℹ️  スキップ（臨時会は対象外）: ${minute.title}`);
  return false;
}

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res;
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
