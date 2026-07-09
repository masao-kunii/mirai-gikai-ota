/**
 * 選択テキスト → 常設チャットへの受け渡し。
 *
 * 議案本文を選択して「AIに質問」を押すと、ルートに常設された SiteChat に
 * 質問を注入する。詳細ページのツールチップとチャットは別コンポーネント／別ルート
 * のため、モジュールレベルの軽量な購読で橋渡しする（現行 chatButtonRef.openWithText 相当）。
 */
type Listener = (text: string) => void;

const listeners = new Set<Listener>();

/** 選択テキストについて質問する。購読中の SiteChat が受け取って送信する。 */
export function askAboutSelection(text: string): void {
  for (const listener of listeners) {
    listener(text);
  }
}

/** SiteChat から購読する。返り値で解除。 */
export function subscribeSelection(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
