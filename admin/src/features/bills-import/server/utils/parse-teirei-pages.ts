/**
 * 大田区議会の定例会ページ群を HTML から構造化データへ変換する純粋パーサ。
 *
 * 外部依存（DB・fetch）を持たない純粋関数のみを置く。
 * fetch を伴う取得は server/actions 側で行い、ここには文字列 → 構造化の
 * 変換ロジックだけを集約する（テスト容易性と再利用性のため）。
 *
 * HTML パーサライブラリには依存せず、正規表現で軽量に抽出する。
 * 対象ページは行数が限られた静的テーブルであり、正規表現で十分安定して扱える。
 */

import type {
  GianPdfLink,
  GianRow,
  SeiganRow,
  SonotaRow,
  StanceCell,
  TaidoRow,
  TaidoTable,
  TeireiIndex,
  TeireiPageLink,
} from "../../shared/types";

/** HTML エンティティをデコードする（最小限の対応） */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * セル内 HTML からプレーンテキストを得る。
 * <br> は区切りとして扱わず単純に除去し、ruby のふりがな（rt）は読みなので落とす。
 */
function cellText(htmlFragment: string): string {
  return decodeEntities(
    htmlFragment
      .replace(/<rt[^>]*>[\s\S]*?<\/rt>/gi, "") // ふりがな除去
      .replace(/<rp[^>]*>[\s\S]*?<\/rp>/gi, "")
      .replace(/<br\s*\/?>/gi, "") // 改行は連結
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\s+/g, "")
    .trim();
}

/** テーブル HTML から各行のセルテキスト配列を得る */
function extractRows(tableHtml: string): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: string[] = [];
    for (const cellMatch of (rowMatch[1] ?? "").matchAll(
      /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi
    )) {
      cells.push(cellText(cellMatch[1] ?? ""));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/** HTML から最初の <table> ブロックを取り出す */
function firstTable(html: string): string | null {
  const m = html.match(/<table[\s\S]*?<\/table>/i);
  return m ? m[0] : null;
}

/**
 * index ページから各カテゴリーページの URL を抽出する。
 *
 * リンクテキストでカテゴリーを判定する。請願・陳情は会期固有ページと
 * 区の汎用ページ（/gikai/segan_chinjo/...）の 2 種が並ぶことがあるため、
 * 会期パス（baseUrl のディレクトリ）配下のものを優先する。
 */
export function parseTeireiIndex(html: string, baseUrl: string): TeireiIndex {
  const links: TeireiPageLink[] = [];
  for (const m of html.matchAll(
    /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  )) {
    const [, href, inner] = m;
    if (href === undefined || inner === undefined) continue;
    const url = new URL(href, baseUrl).toString();
    const label = cellText(inner);
    if (label) links.push({ label, url });
  }

  // baseUrl のディレクトリ（会期パス）。会期固有ページの判定に使う。
  const sessionDir = baseUrl.replace(/\/[^/]*$/, "/");
  const inSession = (l: TeireiPageLink) => l.url.startsWith(sessionDir);

  const pick = (
    pred: (label: string) => boolean,
    excludePred?: (label: string) => boolean
  ): string | null => {
    const candidates = links.filter(
      (l) => pred(l.label) && !(excludePred?.(l.label) ?? false)
    );
    if (candidates.length === 0) return null;
    // 会期固有ページを優先、無ければ先頭
    const chosen = candidates.find(inSession) ?? candidates[0];
    return chosen?.url ?? null;
  };

  return {
    kuchogianUrl: pick(
      (l) => l.includes("区長提出議案"),
      (l) => l.includes("委員会") || l.includes("議員")
    ),
    iinkaigianUrl: pick((l) => l.includes("委員会提出議案")),
    giingianUrl: pick((l) => l.includes("議員提出議案")),
    hokokuUrl: pick(
      (l) => l.includes("報告"),
      (l) => l.includes("議案")
    ),
    seiganUrl: pick((l) => l.includes("請願") || l.includes("陳情")),
    sonotaUrl: pick(
      (l) => l === "その他" || l.startsWith("その他（"),
      (l) => l.includes("案内")
    ),
    taidoUrl: pick((l) => l.includes("態度")),
  };
}

/** ヘッダー行かどうか（番号列が数値でない＝見出し）を判定 */
function isHeaderRow(firstCell: string): boolean {
  return !/^[0-9０-９委]/.test(firstCell);
}

/** 全角数字を半角へ */
function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
}

/**
 * 区長提出議案・委員会提出議案・報告ページのテーブルをパースする。
 * いずれも「番号 | 件名 | 議決日(報告日) | 議決内容 | 付託委員会」の構造。
 */
export function parseGianTable(html: string): GianRow[] {
  const table = firstTable(html);
  if (!table) return [];
  const rows = extractRows(table);
  const result: GianRow[] = [];
  for (const cells of rows) {
    const [first, title] = cells;
    if (first === undefined || title === undefined) continue;
    if (isHeaderRow(first)) continue;
    result.push({
      number: toHalfWidthDigits(first),
      title,
      resultDate: (cells[2] ?? "").replace(/[()（）]/g, ""),
      result: (cells[3] ?? "").replace(/^-$/, ""),
      committee: (cells[4] ?? "").replace(/^なし$/, ""),
    });
  }
  return result;
}

/**
 * 議案ページ内の PDF グループリンクを抽出する。
 * 例: 「第59号議案から第66号議案（PDF：405KB）」→ numberFrom=59, numberTo=66
 */
export function parseGianPdfLinks(
  html: string,
  baseUrl: string
): GianPdfLink[] {
  const links: GianPdfLink[] = [];
  for (const m of html.matchAll(
    /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi
  )) {
    const [, href, inner] = m;
    if (href === undefined || inner === undefined) continue;
    const url = new URL(href, baseUrl).toString();
    const label = cellText(inner);
    const nums = toHalfWidthDigits(label).match(/(\d+)\s*号議案/g);
    if (!nums || nums.length === 0) continue;
    const parsed = nums.map((n) => Number(n.match(/(\d+)/)?.[1]));
    const numberFrom = parsed[0];
    const numberTo = parsed[parsed.length - 1];
    if (numberFrom === undefined || numberTo === undefined) continue;
    links.push({ label, url, numberFrom, numberTo });
  }
  return links;
}

/**
 * 報告ページの PDF グループリンクを抽出する。
 * 例: 「報告第26号から第29号（PDF：4,859KB）」→ numberFrom=26, numberTo=29
 *     「報告第35号（PDF：72KB）」→ numberFrom=35, numberTo=35
 *
 * 区長提出議案は「N号議案」表記だが報告は「第N号」表記のため別関数にする。
 * ファイルサイズ（KB）などの数字を拾わないよう「第(\d+)号」のみ対象にする。
 */
export function parseHokokuPdfLinks(
  html: string,
  baseUrl: string
): GianPdfLink[] {
  const links: GianPdfLink[] = [];
  for (const m of html.matchAll(
    /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi
  )) {
    const [, href, inner] = m;
    if (href === undefined || inner === undefined) continue;
    const url = new URL(href, baseUrl).toString();
    const label = cellText(inner);
    const nums = [...toHalfWidthDigits(label).matchAll(/第(\d+)号/g)].map((x) =>
      Number(x[1])
    );
    const numberFrom = nums[0];
    const numberTo = nums[nums.length - 1];
    if (numberFrom === undefined || numberTo === undefined) continue;
    links.push({ label, url, numberFrom, numberTo });
  }
  return links;
}

/**
 * 議案番号（数値）から、それを含む PDF グループリンクを返す。
 */
export function findPdfForNumber(
  links: GianPdfLink[],
  number: number
): GianPdfLink | undefined {
  return links.find((l) => number >= l.numberFrom && number <= l.numberTo);
}

/**
 * 請願・陳情ページのテーブルをパースする。
 * 「受理番号 | 件名 | 付託日 | 付託委員会 | 議決日 | 結果」の構造。
 */
export function parseSeiganTable(html: string): SeiganRow[] {
  const table = firstTable(html);
  if (!table) return [];
  const rows = extractRows(table);
  const result: SeiganRow[] = [];
  for (const cells of rows) {
    const [acceptNumber, title] = cells;
    if (acceptNumber === undefined || title === undefined) continue;
    // ヘッダー行（受理番号 で始まる）をスキップ
    if (acceptNumber.includes("受理番号") || acceptNumber === "件名") continue;
    if (!/第?\d+号/.test(toHalfWidthDigits(acceptNumber))) continue;
    result.push({
      acceptNumber,
      title,
      referredDate: cells[2] ?? "",
      committee: (cells[3] ?? "").replace(/^なし$/, ""),
      resultDate: cells[4] ?? "",
      result: cells[5] ?? "",
    });
  }
  return result;
}

/**
 * その他ページのテーブルをパースする。
 * 「件名 | 議決日 | 議決内容 | 付託委員会」の構造（番号列が無い）。
 */
export function parseSonotaTable(html: string): SonotaRow[] {
  const table = firstTable(html);
  if (!table) return [];
  const rows = extractRows(table);
  const result: SonotaRow[] = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    // ヘッダー行をスキップ（先頭セルが「件名」）
    if (cells[0] === "件名" || cells[0] === "議題") continue;
    if (!cells[0]) continue;
    result.push({
      title: cells[0],
      resultDate: (cells[1] ?? "").replace(/[()（）]/g, ""),
      result: (cells[2] ?? "").replace(/^-$/, ""),
      committee: (cells[3] ?? "").replace(/^なし$/, ""),
    });
  }
  return result;
}

/**
 * その他ページの PDF リンクを抽出する（番号が無いためタイトルで対応付ける）。
 * 例: 「セーラム市親善訪問に伴う議員の派遣について（PDF：77KB）」
 *     → title="セーラム市親善訪問に伴う議員の派遣について"（（PDF…）以降を除去）
 */
export function parseSonotaPdfLinks(
  html: string,
  baseUrl: string
): { title: string; url: string }[] {
  const links: { title: string; url: string }[] = [];
  for (const m of html.matchAll(
    /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi
  )) {
    const [, href, inner] = m;
    if (href === undefined || inner === undefined) continue;
    const url = new URL(href, baseUrl).toString();
    const title = cellText(inner)
      .replace(/[（(]PDF[：:][^）)]*[）)]\s*$/i, "")
      .trim();
    if (title) links.push({ title, url });
  }
  return links;
}

/**
 * 会派態度セルをパースする。
 * 例: "賛成欠席１" → { main: "賛成", note: "欠席１" }
 *     "賛成"       → { main: "賛成", note: "" }
 */
export function parseStanceCell(raw: string): StanceCell {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(賛成|反対|棄権|退席|欠席)(.*)$/);
  if (m && m[1] !== undefined && m[2] !== undefined) {
    return { raw: trimmed, main: m[1], note: m[2].trim() };
  }
  return { raw: trimmed, main: trimmed, note: "" };
}

/**
 * 会派態度ページのテーブルをパースする。
 * レイアウトは会期により2種類:
 *   A) 「議案番号 | 件名 | (会派列...) | 結果」（番号あり）
 *   B) 「件名 | (会派列...) | 結果」（番号なし。その他の議決等で出現）
 * ヘッダー先頭セルが「番号」を含むかで判定する。会派列はヘッダーから動的取得。
 */
export function parseTaidoTable(html: string): TaidoTable {
  const table = firstTable(html);
  if (!table) return { factionColumns: [], rows: [] };
  const rows = extractRows(table);
  if (rows.length === 0) return { factionColumns: [], rows: [] };

  const header = rows[0];
  const headerFirst = header?.[0];
  if (!header || headerFirst === undefined) {
    return { factionColumns: [], rows: [] };
  }
  const hasNumberColumn = headerFirst.includes("番号");
  const titleIdx = hasNumberColumn ? 1 : 0;
  const factionStart = hasNumberColumn ? 2 : 1;
  const factionColumns = header.slice(factionStart, header.length - 1);

  const dataRows: TaidoRow[] = [];
  for (const cells of rows.slice(1)) {
    if (cells.length < header.length) continue;
    const firstCell = cells[0] ?? "";
    // ヘッダー再掲行をスキップ
    if (firstCell === headerFirst) continue;
    const title = cells[titleIdx];
    if (!title) continue;
    const stancesByFactionColumn: Record<string, StanceCell> = {};
    factionColumns.forEach((col, i) => {
      const cell = cells[factionStart + i] ?? "";
      if (cell) stancesByFactionColumn[col] = parseStanceCell(cell);
    });
    dataRows.push({
      number: hasNumberColumn ? toHalfWidthDigits(firstCell) : "",
      title,
      stancesByFactionColumn,
      result: cells[cells.length - 1] ?? "",
    });
  }

  return { factionColumns, rows: dataRows };
}
