/**
 * サイト設定ファイル（Admin）
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 */
export const siteConfig = {
  siteName: "みらい議会＠大田区",
  cityName: "大田区",
  councilName: "大田区議会",
  councilBaseUrl: "https://www.city.ota.tokyo.jp/gikai/",
  councilBillsDetailUrl:
    "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/index.html",
  councilFactionExamples:
    "自由民主党大田区議団・無所属の会、大田区議会公明党、つばさ大田区議団等",
} as const;
