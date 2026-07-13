import { useEffect } from "react";

/**
 * Google Analytics(GA4)。現行 ota.aix.tokyo と同一プロパティで計測する。
 *
 * 測定IDの解決:
 *   1. ビルド時に VITE_GA_ID が指定されていればそれを最優先。
 *   2. 無ければ、本番ドメイン(ota.aix.tokyo)でのみ既定IDを使う。
 * これにより localhost / workers.dev のプレビュー等には計測を送らず、
 * 本番ドメインに切り替わった時点で自動的に計測が始まる。
 */
const EXPLICIT_GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
// 現行サイトと同じ GA4 プロパティ（公開値）。
const PRODUCTION_GA_ID = "G-Z1TBETQCTC";
const PRODUCTION_HOST = "ota.aix.tokyo";

export function GoogleAnalytics() {
  useEffect(() => {
    const gaId =
      EXPLICIT_GA_ID ??
      (window.location.hostname === PRODUCTION_HOST
        ? PRODUCTION_GA_ID
        : undefined);
    if (!gaId) return;
    if (document.getElementById("ga-gtag")) return;

    const gtag = document.createElement("script");
    gtag.id = "ga-gtag";
    gtag.async = true;
    gtag.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(gtag);

    const inline = document.createElement("script");
    inline.id = "ga-init";
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
    document.head.appendChild(inline);
  }, []);

  return null;
}
