/**
 * 大田区議会の定例会ページ群を取得し、議案・報告・請願陳情・会派見解を
 * DB へ取り込むコアサービス。
 *
 * Supabase クライアントと fetch を引数で受け取る（依存注入）ことで、
 * admin の Server Action からも、Cloud DB 投入用の tsx スクリプトからも
 * 同一ロジックを再利用できるようにしている。"server-only" は付けない。
 *
 * 取り込み方針:
 *   - 既存議案は (council_session_id, bill_number) で照合して UPDATE、
 *     無ければ INSERT（再実行で議決結果の追記ができる）。
 *   - bill_contents は公式情報のみの事実ベース（build-bill-content）。
 *   - publish_status はデフォルト draft（取り込み後に管理画面で確認して公開）。
 *   - 会派見解は会派態度ページから取り込み、(bill_id, faction_id) で upsert。
 */

import type { Database } from "@mirai-gikai/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
// 取り込みスクリプト（tsx）からも再利用するため、server-only を持たない
// 純粋ロジック（faction-matching-core）を相対パスで参照する。
import {
  type FactionRecord,
  findFactionByName,
} from "../../../ai-collection/server/utils/faction-matching-core";
import { buildBillContent } from "../utils/build-bill-content";
import {
  findPdfForNumber,
  parseGianPdfLinks,
  parseGianTable,
  parseSeiganTable,
  parseSonotaTable,
  parseTaidoTable,
  parseTeireiIndex,
} from "../utils/parse-teirei-pages";
import {
  factionColumnToDisplayName,
  formatGianBillNumber,
  formatHokokuBillNumber,
  formatIinkaiBillNumber,
  formatMemberBillNumber,
  formatSonotaBillNumber,
  mapGianResultToStatus,
  mapSeiganResultToStatus,
  mapStanceMainToType,
  normalizeCommitteeName,
  taidoNumberToGianBillNumber,
} from "../utils/teirei-mapping";

type DbClient = SupabaseClient<Database>;
type BillPublishStatus = Database["public"]["Enums"]["bill_publish_status"];
type ProposalType = Database["public"]["Enums"]["proposal_type_enum"];
type BillStatus = Database["public"]["Enums"]["bill_status_enum"];

export type FetchText = (url: string) => Promise<string>;

export type ImportTeireiOptions = {
  /** 定例会 index ページの URL */
  indexUrl: string;
  /** 紐付ける council_sessions.id */
  councilSessionId: string;
  /** 会期名（bill_contents の本文に使う。例: 令和8年第2回定例会） */
  sessionName: string;
  /** 取り込み時の公開状態（デフォルト draft） */
  publishStatus?: BillPublishStatus;
};

export type ImportTeireiResult = {
  ok: boolean;
  /** 取り込んだ議案・報告・請願陳情の件数 */
  billsUpserted: number;
  /** 取り込んだ会派見解の件数 */
  stancesUpserted: number;
  /** 各種スキップ・警告 */
  warnings: string[];
  /** 致命的エラー（ok=false のとき） */
  error?: string;
};

/** 内部用: パースした 1 議案の DB 投入前データ */
type PendingBill = {
  billNumber: string;
  title: string;
  proposalType: ProposalType;
  status: BillStatus;
  committee: string;
  resultDate: string;
  resultText: string;
  pdfUrl: string;
};

export async function importTeireiBills(
  supabase: DbClient,
  fetchText: FetchText,
  options: ImportTeireiOptions
): Promise<ImportTeireiResult> {
  const warnings: string[] = [];
  const publishStatus: BillPublishStatus = options.publishStatus ?? "draft";

  // 1. index ページを取得して各カテゴリーページ URL を解決
  let index: ReturnType<typeof parseTeireiIndex>;
  try {
    const indexHtml = await fetchText(options.indexUrl);
    index = parseTeireiIndex(indexHtml, options.indexUrl);
  } catch (e) {
    return {
      ok: false,
      billsUpserted: 0,
      stancesUpserted: 0,
      warnings,
      error: `index ページの取得に失敗: ${errMsg(e)}`,
    };
  }

  // 2. 委員会マスタを取得（付託委員会名 → id）
  const { data: committees } = await supabase
    .from("committees")
    .select("id, name");
  const committeeIdByName = new Map(
    (committees ?? []).map((c) => [c.name, c.id])
  );

  // 3. 各カテゴリーページをパースして PendingBill[] を構築
  const pending: PendingBill[] = [];

  if (index.kuchogianUrl) {
    pending.push(
      ...(await collectGianBills(
        fetchText,
        index.kuchogianUrl,
        "mayor_bill",
        formatGianBillNumber,
        mapGianResultToStatus,
        warnings
      ))
    );
  }
  if (index.iinkaigianUrl) {
    pending.push(
      ...(await collectGianBills(
        fetchText,
        index.iinkaigianUrl,
        "committee_bill",
        formatIinkaiBillNumber,
        mapGianResultToStatus,
        warnings
      ))
    );
  }
  if (index.giingianUrl) {
    pending.push(
      ...(await collectGianBills(
        fetchText,
        index.giingianUrl,
        "member_bill",
        formatMemberBillNumber,
        mapGianResultToStatus,
        warnings
      ))
    );
  }
  if (index.hokokuUrl) {
    pending.push(
      ...(await collectGianBills(
        fetchText,
        index.hokokuUrl,
        "report",
        formatHokokuBillNumber,
        () => "submitted", // 報告は議決対象外
        warnings
      ))
    );
  }
  if (index.seiganUrl) {
    pending.push(
      ...(await collectSeiganBills(fetchText, index.seiganUrl, warnings))
    );
  }
  if (index.sonotaUrl) {
    pending.push(
      ...(await collectSonotaBills(fetchText, index.sonotaUrl, warnings))
    );
  }

  // 4. 議案を upsert
  const billIdByNumber = new Map<string, string>();
  let billsUpserted = 0;
  for (const b of pending) {
    const committeeId =
      committeeIdByName.get(normalizeCommitteeName(b.committee)) ?? null;
    const billId = await upsertBill(
      supabase,
      options.councilSessionId,
      b,
      committeeId,
      options.sessionName,
      publishStatus,
      warnings
    );
    if (billId) {
      billIdByNumber.set(b.billNumber, billId);
      billsUpserted++;
    }
  }

  // 5. 会派見解（会派態度ページ）を upsert
  let stancesUpserted = 0;
  if (index.taidoUrl) {
    stancesUpserted = await importStances(
      supabase,
      fetchText,
      index.taidoUrl,
      billIdByNumber,
      warnings
    );
  }

  return { ok: true, billsUpserted, stancesUpserted, warnings };
}

/** 区長提出議案・委員会提出議案・報告ページから PendingBill[] を作る */
async function collectGianBills(
  fetchText: FetchText,
  url: string,
  proposalType: ProposalType,
  formatNumber: (raw: string) => string,
  mapStatus: (result: string) => BillStatus,
  warnings: string[]
): Promise<PendingBill[]> {
  let html: string;
  try {
    html = await fetchText(url);
  } catch (e) {
    warnings.push(`${proposalType} ページ取得失敗: ${errMsg(e)}`);
    return [];
  }
  const rows = parseGianTable(html);
  const pdfLinks = parseGianPdfLinks(html, url);
  return rows.map((r) => {
    const num = Number(r.number);
    const pdf = Number.isFinite(num)
      ? findPdfForNumber(pdfLinks, num)
      : undefined;
    return {
      billNumber: formatNumber(r.number),
      title: r.title,
      proposalType,
      status: mapStatus(r.result),
      committee: r.committee,
      resultDate: r.resultDate,
      resultText: r.result,
      pdfUrl: pdf?.url ?? "",
    };
  });
}

/** 請願・陳情ページから PendingBill[] を作る */
async function collectSeiganBills(
  fetchText: FetchText,
  url: string,
  warnings: string[]
): Promise<PendingBill[]> {
  let html: string;
  try {
    html = await fetchText(url);
  } catch (e) {
    warnings.push(`請願陳情ページ取得失敗: ${errMsg(e)}`);
    return [];
  }
  return parseSeiganTable(html).map((r) => ({
    billNumber: r.acceptNumber,
    title: r.title,
    proposalType: "petition" as const,
    status: mapSeiganResultToStatus(r.result),
    committee: r.committee,
    resultDate: r.resultDate,
    resultText: r.result,
    pdfUrl: "",
  }));
}

/** その他ページ（議員派遣等）から PendingBill[] を作る。番号が無いため連番を振る。 */
async function collectSonotaBills(
  fetchText: FetchText,
  url: string,
  warnings: string[]
): Promise<PendingBill[]> {
  let html: string;
  try {
    html = await fetchText(url);
  } catch (e) {
    warnings.push(`その他ページ取得失敗: ${errMsg(e)}`);
    return [];
  }
  return parseSonotaTable(html).map((r, i) => ({
    billNumber: formatSonotaBillNumber(i + 1),
    title: r.title,
    proposalType: "other" as const,
    status: mapGianResultToStatus(r.result),
    committee: r.committee,
    resultDate: r.resultDate,
    resultText: r.result,
    pdfUrl: "",
  }));
}

/**
 * 議案を (council_session_id, bill_number) で照合し、無ければ INSERT、
 * あれば UPDATE する。返り値は bill_id（失敗時 null）。
 *
 * 再実行（会期進行に合わせた定期同期）を安全にするため:
 *   - 議決結果に関わる status / committee_id は毎回 UPDATE する
 *     （公開中の「審議状況」バッジを最新に保つ）。
 *   - bill_contents は新規 INSERT 時のみ生成する。既存議案では上書きしない
 *     （管理画面での手動編集や AI で拡充した本文を保持するため）。
 *   - publish_status は新規 INSERT 時のみ設定する（既存の公開状態を維持）。
 */
async function upsertBill(
  supabase: DbClient,
  councilSessionId: string,
  bill: PendingBill,
  committeeId: string | null,
  sessionName: string,
  publishStatus: BillPublishStatus,
  warnings: string[]
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("bills")
    .select("id")
    .eq("council_session_id", councilSessionId)
    .eq("bill_number", bill.billNumber)
    .maybeSingle();

  const billFields = {
    name: bill.title,
    bill_number: bill.billNumber,
    proposal_type: bill.proposalType,
    status: bill.status,
    committee_id: committeeId,
    council_session_id: councilSessionId,
  };

  if (existing) {
    // 既存議案: 議決結果（status）・付託委員会のみ更新。本文は保持。
    const { error } = await supabase
      .from("bills")
      .update(billFields)
      .eq("id", existing.id);
    if (error) {
      warnings.push(`議案「${bill.title}」の更新に失敗: ${error.message}`);
      return null;
    }
    return existing.id;
  }

  // 新規議案: 挿入 + bill_contents（事実ベース）を生成
  const { data: inserted, error } = await supabase
    .from("bills")
    .insert({ ...billFields, publish_status: publishStatus })
    .select("id")
    .single();
  if (error || !inserted) {
    warnings.push(`議案「${bill.title}」の挿入に失敗: ${error?.message}`);
    return null;
  }
  const billId = inserted.id;

  const content = buildBillContent({
    title: bill.title,
    billNumber: bill.billNumber,
    proposalType: bill.proposalType,
    status: bill.status,
    sessionName,
    committee: normalizeCommitteeName(bill.committee),
    resultDate: bill.resultDate,
    resultText: bill.resultText,
    pdfUrl: bill.pdfUrl,
  });
  const contentRows = (["normal", "hard"] as const).map((level) => ({
    bill_id: billId,
    difficulty_level: level,
    title: content.title,
    summary: content.summary.slice(0, 500),
    content: content.content,
  }));
  const { error: contentErr } = await supabase
    .from("bill_contents")
    .insert(contentRows);
  if (contentErr) {
    warnings.push(
      `議案「${bill.title}」の本文挿入に失敗: ${contentErr.message}`
    );
  }

  return billId;
}

/**
 * 会派態度ページから会派見解を取り込む。
 * 議案番号を bill_number 形式に正規化して billIdByNumber と照合する。
 */
async function importStances(
  supabase: DbClient,
  fetchText: FetchText,
  taidoUrl: string,
  billIdByNumber: Map<string, string>,
  warnings: string[]
): Promise<number> {
  let html: string;
  try {
    html = await fetchText(taidoUrl);
  } catch (e) {
    warnings.push(`会派態度ページ取得失敗: ${errMsg(e)}`);
    return 0;
  }

  const { data: allFactions } = await supabase
    .from("factions")
    .select("id, display_name, alternative_names");
  const factions: FactionRecord[] = allFactions ?? [];

  const table = parseTaidoTable(html);
  let count = 0;
  for (const row of table.rows) {
    const billNumber = taidoNumberToGianBillNumber(row.number);
    const billId = billIdByNumber.get(billNumber);
    if (!billId) {
      warnings.push(
        `会派態度: 議案「${row.title}」(${billNumber}) が見つからずスキップ`
      );
      continue;
    }

    for (const [column, cell] of Object.entries(row.stancesByFactionColumn)) {
      const stanceType = mapStanceMainToType(cell.main);
      if (!stanceType) continue; // 欠席のみ等は登録しない

      const faction = findFactionByName(
        factions,
        factionColumnToDisplayName(column)
      );
      if (!faction) {
        warnings.push(`会派「${column}」が見つからずスキップ`);
        continue;
      }

      const comment = cell.note ? `（${cell.note}）` : null;
      const { error } = await supabase.from("faction_stances").upsert(
        {
          bill_id: billId,
          faction_id: faction.id,
          type: stanceType,
          comment,
        },
        { onConflict: "bill_id,faction_id" }
      );
      if (error) {
        warnings.push(
          `会派見解（${row.title} / ${column}）の upsert に失敗: ${error.message}`
        );
        continue;
      }
      count++;
    }
  }
  return count;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
