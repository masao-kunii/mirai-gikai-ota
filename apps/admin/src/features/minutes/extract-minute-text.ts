import { normalizeMinutesPdfText } from "@mirai-gikai/shared/minutes/normalize-pdf-text";
import { adminMinutesApi as minutesApi } from "../../lib/api";

/**
 * 議事録の元 PDF から本文を抽出して保存し、保存した文字数を返す。
 *
 * PDF の解析はブラウザで行う（Workers の CPU 時間に載せないため）。元 PDF は
 * 市のサイトが CORS を返さないので api 経由で取得する。
 */
export async function extractAndSaveMinuteText(id: string): Promise<number> {
  const res = await minutesApi[":id"]["source-pdf"].$get({ param: { id } });
  if (!res.ok) throw new Error(sourcePdfErrorMessage(res.status));
  const pdf = new Uint8Array(await res.arrayBuffer());

  // unpdf（pdf.js）は大きいので、抽出するときだけ読み込む。
  const { extractText, getDocumentProxy } = await import("unpdf");
  const document = await getDocumentProxy(pdf);
  const { text: pages } = await extractText(document, { mergePages: false });
  const text = normalizeMinutesPdfText(pages);
  if (text === "") {
    throw new Error(
      "PDF から文字を読み取れませんでした（画像だけの PDF の可能性があります）"
    );
  }

  const saved = await minutesApi[":id"]["extracted-text"].$put({
    param: { id },
    json: { text },
  });
  if (!saved.ok) throw new Error("抽出した本文の保存に失敗しました");
  return text.length;
}

function sourcePdfErrorMessage(status: number): string {
  switch (status) {
    case 404:
      return "議事録が見つかりません";
    case 413:
      return "PDF が大きすぎます";
    case 422:
      return "PDF の URL が不正です（https の URL を登録してください）";
    case 502:
      return "PDF を取得できませんでした（URL が正しいか確認してください）";
    default:
      return "PDF の取得に失敗しました";
  }
}
