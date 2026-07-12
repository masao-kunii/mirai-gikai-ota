/**
 * SNS シェアのハンドラ（現行 web の share-handlers 相当）。
 * いずれもクライアントで呼ぶ。url は呼び出し時の window.location.href を渡す。
 */
export function shareOnTwitter(message: string, url: string): void {
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    message
  )}&url=${encodeURIComponent(url)}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

export function shareOnFacebook(url: string): void {
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

export function shareOnLine(message: string, url: string): void {
  const shareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
    `${message} ${url}`
  )}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

export function shareOnThreads(message: string, url: string): void {
  const shareUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(
    `${message} ${url}`
  )}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

export async function shareNative(message: string, url: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "みらい議会＠大田区",
        text: message,
        url,
      });
    } catch (error) {
      // キャンセルは無視
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("share failed", error);
      }
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${message} ${url}`);
  } catch {
    // クリップボード不可時は何もしない
  }
}
