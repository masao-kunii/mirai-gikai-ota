import "server-only";

import { AI_MODELS } from "@mirai-gikai/shared/ai/models";
import { generateText } from "@mirai-gikai/shared/ai/sdk";

/**
 * PDF を Vertex AI Gemini に直接渡して Markdown 化する。
 *
 * 以前は markitdown (Python 製ツール) を `uvx --from 'markitdown[pdf]' markitdown`
 * 経由で呼んでいたが、Cloud Run コンテナに Python ランタイムを入れたくないため、
 * Gemini の multimodal 機能 (PDF を直接 file part として受け取れる) で代替する。
 *
 * 議事録 PDF は数十〜数百ページのテキスト中心の文書なので、Flash モデルで
 * 十分処理可能。コスト抑制のため flash を使う。
 */
export async function extractPdfToMarkdown(pdfBytes: Buffer): Promise<string> {
  const { text } = await generateText({
    model: AI_MODELS.flash,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "添付された PDF は大田区議会の本会議録 (速報版) です。",
              "本文を読み取り、見出し・段落構造を保ったまま Markdown 形式で",
              "出力してください。次のルールに従ってください:",
              "",
              "- 会議の議題、議案名、議員の発言を区別できるよう適切な見出し階層",
              "  (## 議題, ### 議案番号 など) で構造化する",
              "- 表は Markdown table で再現する",
              "- ページ番号や柱見出しなどの装飾的情報は省く",
              "- 文字起こしを行うのみで、要約・補足解説は加えない",
              "- 議事録に存在しない情報を勝手に補わない",
              "",
              "Markdown 本体のみを返してください (前置きや「以下が抽出結果です」",
              "のようなメタコメントは不要)。",
            ].join("\n"),
          },
          {
            type: "file",
            mediaType: "application/pdf",
            data: pdfBytes,
          },
        ],
      },
    ],
  });
  return text;
}

/**
 * 公開 PDF URL をダウンロードして Markdown に変換するヘルパー。
 */
export async function fetchAndExtractPdfToMarkdown(
  pdfUrl: string
): Promise<string> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download PDF: ${response.status} ${response.statusText} (${pdfUrl})`
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return extractPdfToMarkdown(buffer);
}
