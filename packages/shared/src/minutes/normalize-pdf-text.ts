/**
 * 議事録 PDF から抜き出したページごとのテキストを、本文として保存できる形に整える。
 *
 * PDF のテキストはレイアウトどおりに行が切れているため、そのままだと
 * 「〜の構築に\nついて伺います」のように文の途中で改行が入る。また、各ページに
 * 柱（例: 「令和８年第１回定例会 第３日（2/24） 大田区議会会議録 速報版」）と
 * ページ番号（例: 「-3-」）が入る。これらを取り除き、折り返しを結合する。
 *
 * 段落の判定は行の長さで行う。本文は一定の幅で折り返されるので、典型的な行幅に
 * 近い行は「途中で折り返された行」とみなして次の行とつなげる。短い行は段落の終わり。
 * ただし発言者（○）・ト書き（〔）・区切り線（～）で始まる行は、必ず新しい段落にする。
 */

/** ページ番号だけの行（「-3-」「- 3 -」）。数字だけの行は本文の可能性があるので対象外。 */
const PAGE_NUMBER_RE = /^[-－]\s*\d{1,4}\s*[-－]$/;

/** この文字で始まる行は、前の行とつながっていても新しい段落として扱う。 */
const PARAGRAPH_START_RE = /^[○〔～〈◯●◎■□]/;

/** 典型的な行幅から、この文字数まで短い行も「折り返された行」とみなす。 */
const WRAP_TOLERANCE = 3;

/** 行幅の推定に使う行の最小文字数（見出しや短い行を除くため）。 */
const MIN_LINE_FOR_WIDTH = 20;

export function normalizeMinutesPdfText(pages: string[]): string {
  const header = findRepeatedHeader(pages);

  const lines: string[] = [];
  for (const page of pages) {
    const pageLines = page
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "");
    for (const [i, line] of pageLines.entries()) {
      // 柱は各ページの先頭にだけ現れる。本文中に同じ文言があっても消さない。
      if (i === 0 && header !== null && line === header) continue;
      if (PAGE_NUMBER_RE.test(line)) continue;
      lines.push(line);
    }
  }
  if (lines.length === 0) return "";

  const wrapWidth = estimateWrapWidth(lines);

  const paragraphs: string[] = [];
  let current = "";
  for (const [i, line] of lines.entries()) {
    current += line;
    const next = lines[i + 1];
    const wrapped =
      wrapWidth !== null && line.length >= wrapWidth - WRAP_TOLERANCE;
    const continues =
      next !== undefined && wrapped && !PARAGRAPH_START_RE.test(next);
    if (!continues) {
      paragraphs.push(current);
      current = "";
    }
  }
  return paragraphs.join("\n");
}

/**
 * 半数を超えるページの先頭行が同じなら、それを柱とみなして返す。
 * ページが1枚だけのときは判定できないので null。
 */
function findRepeatedHeader(pages: string[]): string | null {
  if (pages.length < 2) return null;
  const counts = new Map<string, number>();
  for (const page of pages) {
    const first = page
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line !== "");
    if (first === undefined) continue;
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  for (const [line, count] of counts) {
    if (count > pages.length / 2) return line;
  }
  return null;
}

/**
 * 本文の折り返し幅を、十分な長さの行で最も多い文字数として推定する。
 * 行数が少なく推定できないときは null（その場合は結合しない）。
 */
function estimateWrapWidth(lines: string[]): number | null {
  const counts = new Map<number, number>();
  for (const line of lines) {
    if (line.length < MIN_LINE_FOR_WIDTH) continue;
    counts.set(line.length, (counts.get(line.length) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 1; // 1回しか出ない長さは行幅とみなさない
  for (const [length, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && length > best)) {
      best = length;
      bestCount = count;
    }
  }
  return best;
}
