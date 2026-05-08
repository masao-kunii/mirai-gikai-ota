import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * PDF を markitdown で Markdown に変換する。
 *
 * 内部で `uvx --from 'markitdown[pdf]' markitdown <file>` を呼ぶ。
 * uv（https://docs.astral.sh/uv/）が事前にインストールされている前提。
 *
 * Cloud Run など Python ランタイムが無い環境では Dockerfile に
 *   RUN apt-get install -y python3 pipx && pipx install 'markitdown[pdf]'
 * のような一行を追加し、`MARKITDOWN_BIN=markitdown` を渡す運用も可能。
 *
 * @param pdfBytes PDF のバイト列
 * @returns Markdown テキスト
 */
export async function extractPdfToMarkdown(pdfBytes: Buffer): Promise<string> {
  const tmpDir = await mkdtemp(path.join(tmpdir(), "ota-minutes-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  try {
    await writeFile(pdfPath, pdfBytes);

    const bin = process.env.MARKITDOWN_BIN;
    const { command, args } = bin
      ? { command: bin, args: [pdfPath] }
      : {
          command: "uvx",
          args: ["--from", "markitdown[pdf]", "markitdown", pdfPath],
        };

    // 議事録は数百KB→Markdownで100-300KB程度。10MB あれば十分。
    const { stdout } = await execFileAsync(command, args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });
    return stdout;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
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
