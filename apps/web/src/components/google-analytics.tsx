import { useEffect } from "react";

/**
 * Google Analytics(GA4)。ビルド時に VITE_GA_ID が設定されているときだけ
 * gtag を読み込む（未設定なら何もしない＝計測無効）。測定 ID は運用側で設定する。
 */
const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

export function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_ID) return;
    if (document.getElementById("ga-gtag")) return;

    const gtag = document.createElement("script");
    gtag.id = "ga-gtag";
    gtag.async = true;
    gtag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(gtag);

    const inline = document.createElement("script");
    inline.id = "ga-init";
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`;
    document.head.appendChild(inline);
  }, []);

  return null;
}
