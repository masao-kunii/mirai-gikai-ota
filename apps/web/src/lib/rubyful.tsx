import { useEffect, useState } from "react";

/**
 * ふりがな表示（Rubyful V2）。現行 web と同じ外部スクリプトを読み込み、本文 DOM に
 * ルビを自動付与する。プライバシー配慮のため「ふりがな ON のときだけ」外部スクリプトを
 * 読み込む（opt-in）。トグル切替時はリロードで反映する（現行と同挙動）。
 */
const STORAGE_KEY = "rubyful-enabled";
const SCRIPT_ID = "rubyful-v2-script";
const SCRIPT_URL =
  "https://rubyful-v2.s3.ap-northeast-1.amazonaws.com/v2/rubyful.js?t=20250507022654";
const RUBY_SELECTOR =
  "main p, main h1, main h2, main h3, main h4, main h5, main h6, main li, main td, main th, main span, main a";

declare global {
  interface Window {
    RubyfulV2?: {
      init: (config: {
        selector: string;
        defaultDisplay: boolean;
        observeChanges?: boolean;
        styles?: object;
      }) => void;
    };
  }
}

export function getRubyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function setRubyEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // localStorage 不可の環境では無視
  }
}

/** ふりがな有効時のみ Rubyful V2 を読み込み初期化する（SPA 遷移は observeChanges が追従） */
export function RubyfulInitializer() {
  useEffect(() => {
    if (!getRubyEnabled()) return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      window.RubyfulV2?.init({
        selector: RUBY_SELECTOR,
        defaultDisplay: true,
        observeChanges: true,
      });
    };
    document.body.appendChild(script);
  }, []);

  return null;
}

/** ふりがなトグルの状態と切替（切替後はリロードで反映） */
export function useRubyToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getRubyEnabled());
  }, []);

  const setRuby = (next: boolean) => {
    setRubyEnabled(next);
    window.location.reload();
  };

  return { enabled, setRuby };
}
