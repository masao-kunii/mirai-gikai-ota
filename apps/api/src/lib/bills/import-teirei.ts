import type { DbTx } from "@mirai-gikai/db";
import { schema } from "@mirai-gikai/db";
import { buildBillContent } from "@mirai-gikai/shared/bills-import/build-bill-content";
import type {
  BillStatus,
  ProposalType,
} from "@mirai-gikai/shared/bills-import/enums";
import {
  findPdfForNumber,
  parseGianPdfLinks,
  parseGianTable,
  parseSeiganTable,
  parseSonotaTable,
  parseTaidoTable,
  parseTeireiIndex,
} from "@mirai-gikai/shared/bills-import/parse-teirei-pages";
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
} from "@mirai-gikai/shared/bills-import/teirei-mapping";
import { and, eq } from "drizzle-orm";
import { type FactionRecord, findFactionByName } from "./extract-from-minutes";

const { bills, billContents, committees, factions, factionStances } = schema;

/**
 * 大田区議会の定例会ページ群を取得し、議案・報告・請願陳情・会派見解を取り込む。
 *
 * HTML のパースとマッピングは純粋関数（@mirai-gikai/shared/bills-import）を使い、
 * ここでは取得（fetch）と DB 反映（app_admin の tx）だけを行う。fetch は引数で
 * 受け取るのでテスト・別ランタイムでも差し替えできる。
 *
 * 取り込み方針（旧 admin と同じ）:
 *   - 議案は (council_session_id, bill_number) で照合して UPDATE、無ければ INSERT
 *     （再実行で議決結果を追記できる）
 *   - bill_contents は公式情報のみの事実ベース（AI 推測はしない）
 *   - publish_status は既定 draft（取り込み後に管理画面で確認して公開）
 *   - 会派見解は会派態度ページから (bill_id, faction_id) で upsert
 */

export type FetchText = (url: string) => Promise<string>;

export type ImportTeireiOptions = {
  indexUrl: string;
  councilSessionId: string;
  /** bill_contents の本文に使う会期名（例: 令和8年第2回定例会） */
  sessionName: string;
};

export type ImportTeireiResult = {
  ok: boolean;
  billsUpserted: number;
  stancesUpserted: number;
  warnings: string[];
  error?: string;
};

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

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function importTeireiBills(
  tx: DbTx,
  fetchText: FetchText,
  options: ImportTeireiOptions
): Promise<ImportTeireiResult> {
  const warnings: string[] = [];

  // 1. index ページから各カテゴリーページ URL を解決
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

  // 2. 委員会マスタ（付託委員会名 → id）
  const committeeRows = await tx
    .select({ id: committees.id, name: committees.name })
    .from(committees);
  const committeeIdByName = new Map(
    committeeRows.map((c) => [c.name, c.id] as const)
  );

  // 3. 各カテゴリーページをパースして取り込み対象を作る
  const pending: PendingBill[] = [];

  const collectGian = async (
    url: string | null,
    proposalType: ProposalType,
    formatNumber: (n: string) => string
  ) => {
    if (!url) return;
    let html: string;
    try {
      html = await fetchText(url);
    } catch (e) {
      warnings.push(`${proposalType} ページ取得失敗: ${errMsg(e)}`);
      return;
    }
    const pdfLinks = parseGianPdfLinks(html, url);
    for (const row of parseGianTable(html)) {
      // PDF は「第59号議案から第66号議案」のようにまとめられているため、
      // 番号（数値）で該当 PDF を引く。
      const num = Number(row.number);
      const pdf = Number.isFinite(num)
        ? findPdfForNumber(pdfLinks, num)
        : undefined;
      pending.push({
        billNumber: formatNumber(row.number),
        title: row.title,
        proposalType,
        status: mapGianResultToStatus(row.result),
        committee: normalizeCommitteeName(row.committee),
        resultDate: row.resultDate,
        resultText: row.result,
        pdfUrl: pdf?.url ?? "",
      });
    }
  };

  await collectGian(index.kuchogianUrl, "mayor_bill", formatGianBillNumber);
  await collectGian(
    index.iinkaigianUrl,
    "committee_bill",
    formatIinkaiBillNumber
  );
  await collectGian(index.giingianUrl, "member_bill", formatMemberBillNumber);
  await collectGian(index.hokokuUrl, "report", formatHokokuBillNumber);

  // 請願・陳情（受理番号がそのまま bill_number になる）
  if (index.seiganUrl) {
    try {
      const html = await fetchText(index.seiganUrl);
      for (const row of parseSeiganTable(html)) {
        pending.push({
          billNumber: row.acceptNumber,
          title: row.title,
          proposalType: "petition",
          status: mapSeiganResultToStatus(row.result),
          committee: normalizeCommitteeName(row.committee),
          resultDate: row.resultDate,
          resultText: row.result,
          pdfUrl: "",
        });
      }
    } catch (e) {
      warnings.push(`請願・陳情ページ取得失敗: ${errMsg(e)}`);
    }
  }

  // その他（議員派遣等）。番号が無いため出現順で連番を振る。
  if (index.sonotaUrl) {
    try {
      const html = await fetchText(index.sonotaUrl);
      parseSonotaTable(html).forEach((row, i) => {
        pending.push({
          billNumber: formatSonotaBillNumber(i + 1),
          title: row.title,
          proposalType: "other",
          status: mapGianResultToStatus(row.result),
          committee: normalizeCommitteeName(row.committee),
          resultDate: row.resultDate,
          resultText: row.result,
          pdfUrl: "",
        });
      });
    } catch (e) {
      warnings.push(`その他ページ取得失敗: ${errMsg(e)}`);
    }
  }

  // 4. 議案を upsert（(会期, 議案番号) で照合）
  const billIdByNumber = new Map<string, string>();
  const billIdByTitle = new Map<string, string>();
  let billsUpserted = 0;

  for (const p of pending) {
    const committeeId = p.committee
      ? (committeeIdByName.get(p.committee) ?? null)
      : null;
    if (p.committee && !committeeId) {
      warnings.push(`委員会「${p.committee}」が見つかりません（${p.title}）`);
    }

    const [existing] = await tx
      .select({ id: bills.id })
      .from(bills)
      .where(
        and(
          eq(bills.councilSessionId, options.councilSessionId),
          eq(bills.billNumber, p.billNumber)
        )
      );

    let billId: string;
    let isNew = false;
    if (existing) {
      // 再実行（会期進行に合わせた同期）で議決結果を最新にする。
      // publish_status は既存の公開状態を尊重して触らない。
      await tx
        .update(bills)
        .set({
          name: p.title,
          status: p.status,
          proposalType: p.proposalType,
          committeeId,
        })
        .where(eq(bills.id, existing.id));
      billId = existing.id;
    } else {
      isNew = true;
      const [created] = await tx
        .insert(bills)
        .values({
          name: p.title,
          billNumber: p.billNumber,
          status: p.status,
          proposalType: p.proposalType,
          // 取り込みは常に下書き。公開は管理画面で人が判断する。
          publishStatus: "draft",
          councilSessionId: options.councilSessionId,
          committeeId,
        })
        .returning({ id: bills.id });
      if (!created) {
        warnings.push(`議案の作成に失敗: ${p.title}`);
        continue;
      }
      billId = created.id;
    }
    billsUpserted += 1;
    billIdByNumber.set(p.billNumber, billId);
    billIdByTitle.set(p.title, billId);

    // 本文（公式情報のみの事実ベース）は新規作成時だけ入れる。
    // 既存議案では上書きしない（手動編集や AI 生成で拡充した本文を保持するため）。
    if (isNew) {
      const content = buildBillContent({
        title: p.title,
        billNumber: p.billNumber,
        proposalType: p.proposalType,
        status: p.status,
        sessionName: options.sessionName,
        committee: p.committee,
        resultDate: p.resultDate,
        resultText: p.resultText,
        pdfUrl: p.pdfUrl,
      });
      await tx
        .insert(billContents)
        .values({
          billId,
          difficultyLevel: "normal",
          title: content.title,
          summary: content.summary,
          content: content.content,
        })
        .onConflictDoNothing();
    }
  }

  // 5. 会派見解（会派態度ページ）
  let stancesUpserted = 0;
  if (index.taidoUrl) {
    try {
      const html = await fetchText(index.taidoUrl);
      const factionRows = await tx
        .select({
          id: factions.id,
          displayName: factions.displayName,
          alternativeNames: factions.alternativeNames,
        })
        .from(factions);
      const factionList: FactionRecord[] = factionRows.map((f) => ({
        id: f.id,
        displayName: f.displayName,
        alternativeNames: f.alternativeNames ?? [],
      }));

      for (const row of parseTaidoTable(html).rows) {
        // 番号があれば番号で、無ければ件名で議案を特定する。
        const billId = row.number
          ? billIdByNumber.get(taidoNumberToGianBillNumber(row.number))
          : billIdByTitle.get(row.title);
        if (!billId) {
          warnings.push(`会派態度: 議案「${row.title}」が見つからずスキップ`);
          continue;
        }
        for (const [column, cell] of Object.entries(
          row.stancesByFactionColumn
        )) {
          const stanceType = mapStanceMainToType(cell.main);
          if (!stanceType) continue; // 欠席のみ等は登録しない
          const faction = findFactionByName(
            factionList,
            factionColumnToDisplayName(column)
          );
          if (!faction) {
            warnings.push(`会派「${column}」が見つからずスキップ`);
            continue;
          }
          await tx
            .insert(factionStances)
            .values({
              billId,
              factionId: faction.id,
              type: stanceType,
              comment: cell.note ? `（${cell.note}）` : null,
            })
            .onConflictDoUpdate({
              target: [factionStances.billId, factionStances.factionId],
              set: {
                type: stanceType,
                comment: cell.note ? `（${cell.note}）` : null,
              },
            });
          stancesUpserted += 1;
        }
      }
    } catch (e) {
      warnings.push(`会派態度ページ取得失敗: ${errMsg(e)}`);
    }
  }

  return { ok: true, billsUpserted, stancesUpserted, warnings };
}
