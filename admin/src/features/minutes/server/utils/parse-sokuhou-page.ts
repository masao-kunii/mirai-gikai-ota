/**
 * 大田区議会の本会議録 (速報版) ページから PDF リンクを抽出する。
 *
 * 対象ページ:
 *   https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.html
 *
 * リンクパターン (例):
 *   <a href="./honkaigirokusokuhouban.files/080213.pdf">令和8年第1回定例会（第1日）</a>
 *
 * ファイル名 080213.pdf は「元号略 + YYMMDD」(例 080213 = 令和8年2月13日)。
 * 元号略は 1 桁目に元号 (8=令和、7=平成という意味ではない、令和なら8/7/6...) が
 * 入る形式ではなく、ここでは「下2桁=令和の年、続く4桁=MMDD」と解釈する。
 * (大田区議会のファイル命名規則。令和7年 = 070...、令和8年 = 080...)
 */

export type ScrapedMinute = {
  /** 表示用ラベル (リンクテキスト) */
  label: string;
  /** 絶対 URL */
  pdfUrl: string;
  /** 議事録の本会議日 (YYYY-MM-DD) */
  meetingDate: string;
  /** 第N日 (リンクテキストから抽出、抽出できなければ null) */
  dayNumber: number | null;
  /** 定例会名 (例: 令和8年第1回定例会)。リンクテキストから抽出 */
  sessionName: string | null;
};

const REIWA_EPOCH_YEAR = 2018; // 令和元年 = 2019、令和N年 = 2018 + N

/** 「080325」のようなファイル名から meetingDate (YYYY-MM-DD) を導く */
function parseFilenameToDate(filename: string): string | null {
  const m = filename.match(/^0?(\d)(\d{2})(\d{2})/);
  if (!m) return null;
  const reiwaYear = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (reiwaYear < 1 || month < 1 || month > 12 || day < 1 || day > 31)
    return null;
  const year = REIWA_EPOCH_YEAR + reiwaYear;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 「令和8年第1回定例会（第3日）」のような表記から各要素を抽出 */
function parseLinkLabel(label: string): {
  sessionName: string | null;
  dayNumber: number | null;
} {
  const sessionMatch = label.match(/(令和\d+年第\d+回(?:定例|臨時)会)/);
  const dayMatch = label.match(/[（(]第(\d+)日[）)]/);
  return {
    sessionName: sessionMatch ? sessionMatch[1] : null,
    dayNumber: dayMatch ? Number(dayMatch[1]) : null,
  };
}

/** ページ HTML から PDF リンク一覧を抽出 (HTML パーサに依存せず正規表現で軽く) */
export function parseSokuhouHtml(
  html: string,
  baseUrl: string
): ScrapedMinute[] {
  const anchorRe = /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  const results: ScrapedMinute[] = [];
  for (const match of html.matchAll(anchorRe)) {
    const hrefRaw = match[1];
    const inner = match[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (!inner) continue;

    const pdfUrl = new URL(hrefRaw, baseUrl).toString();
    const filenameMatch = pdfUrl.match(/\/([^/]+)\.pdf$/i);
    if (!filenameMatch) continue;
    const meetingDate = parseFilenameToDate(filenameMatch[1]);
    if (!meetingDate) continue;
    const { sessionName, dayNumber } = parseLinkLabel(inner);

    results.push({
      label: inner,
      pdfUrl,
      meetingDate,
      dayNumber,
      sessionName,
    });
  }
  return results;
}

/** 速報版ページの URL から ScrapedMinute[] を取得 */
export async function fetchSokuhouMinutes(
  pageUrl = "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.html"
): Promise<ScrapedMinute[]> {
  const res = await fetch(pageUrl, {
    headers: { "user-agent": "mirai-gikai-ota/minutes-import" },
  });
  if (!res.ok) {
    throw new Error(
      `公式ページの取得に失敗しました (HTTP ${res.status}): ${pageUrl}`
    );
  }
  const html = await res.text();
  return parseSokuhouHtml(html, pageUrl);
}
