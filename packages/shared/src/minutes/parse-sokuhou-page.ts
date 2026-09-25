/**
 * 大田区議会の本会議録（速報版）ページから、議事録 PDF の一覧を取り出す。
 *
 * 対象ページ:
 *   https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.html
 *
 * リンクの例:
 *   <a href="honkaigirokusokuhouban.files/080625.pdf">
 *     令和8年第2回定例会（第3日）令和8年6月25日（PDF：630KB）
 *   </a>
 *
 * ファイル名は「令和の年（2桁）＋月（2桁）＋日（2桁）」（080625 = 令和8年6月25日）。
 * 旧 admin の parse-sokuhou-page.ts を移植した（GitHub Actions から使う）。
 */

export type SokuhouMinute = {
  /** リンク文字列から「（PDF：…）」を除いたもの。議事録のタイトルに使う */
  title: string;
  /** PDF の絶対 URL */
  pdfUrl: string;
  /** 会議日（YYYY-MM-DD） */
  meetingDate: string;
  /** 第N日。リンク文字列に無ければ null */
  dayNumber: number | null;
  /** 会期名（例: 令和8年第2回定例会）。リンク文字列に無ければ null */
  sessionName: string | null;
};

/** 令和元年 = 2019 年なので、令和 N 年 = 2018 + N 年 */
const REIWA_BASE_YEAR = 2018;

/** 「080625」のようなファイル名から会議日（YYYY-MM-DD）を求める。 */
export function parseSokuhouFilename(filename: string): string | null {
  const m = filename.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const reiwa = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (reiwa < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const year = REIWA_BASE_YEAR + reiwa;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** リンク文字列から会期名・第N日・タイトルを取り出す。 */
export function parseSokuhouLabel(label: string): {
  title: string;
  sessionName: string | null;
  dayNumber: number | null;
} {
  const normalized = label
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const title = normalized
    .replace(/[（(]\s*PDF\s*[：:][^）)]*[）)]/gi, "")
    .trim();
  const session = normalized.match(/令和\d+年第\d+回(?:定例|臨時)会/);
  const day = normalized.match(/[（(]第(\d+)日[）)]/);
  return {
    title,
    sessionName: session ? session[0] : null,
    dayNumber: day ? Number(day[1]) : null,
  };
}

/** ページの HTML から議事録 PDF の一覧を取り出す（正規表現のみ・依存なし）。 */
export function parseSokuhouPage(
  html: string,
  pageUrl: string
): SokuhouMinute[] {
  const anchorRe = /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  const results: SokuhouMinute[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(anchorRe)) {
    const href = match[1];
    const inner = match[2];
    if (href === undefined || inner === undefined) continue;
    const label = inner.replace(/<[^>]+>/g, "");
    const pdfUrl = new URL(href, pageUrl).toString();
    if (seen.has(pdfUrl)) continue;

    const filename = pdfUrl.match(/\/([^/]+)\.pdf$/i)?.[1];
    const meetingDate = filename ? parseSokuhouFilename(filename) : null;
    if (!meetingDate) continue;

    const { title, sessionName, dayNumber } = parseSokuhouLabel(label);
    if (!title) continue;
    seen.add(pdfUrl);
    results.push({ title, pdfUrl, meetingDate, dayNumber, sessionName });
  }
  return results;
}
