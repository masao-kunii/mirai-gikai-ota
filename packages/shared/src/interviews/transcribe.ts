/**
 * 音声インタビューの文字起こし。住民が声で答えられるようにするための前段で、
 * 起こした文字は入力欄に入れて本人が直してから送る（誤変換のまま記録に残さない）。
 *
 * ここには外部依存のない部分だけを置く（受け付ける形式・上限・プロンプト・後始末）。
 */

/** 受け付ける音声の形式。ブラウザの MediaRecorder が出すものに合わせる。 */
export const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;

/** 1回に送れる音声の大きさ（バイト）。おおよそ数分ぶん。 */
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/**
 * Content-Type から形式を取り出して検証する（`audio/webm;codecs=opus` のように
 * パラメータが付くため、`;` の前だけを見る）。
 */
export function normalizeAudioType(contentType: string | null): string | null {
  const type = contentType?.split(";")[0]?.trim().toLowerCase();
  if (!type) return null;
  return (ALLOWED_AUDIO_TYPES as readonly string[]).includes(type)
    ? type
    : null;
}

export const TRANSCRIBE_SYSTEM = `あなたは日本語の音声を文字に起こす担当です。
聞こえたとおりに書き起こし、それ以外は何も書かないでください。

- 요약・言い換え・敬語への直し・返事はしない
- 「えー」「あのー」などの言いよどみと、言い直して消えた語は省く
- 句読点と改行は読みやすいように補う
- 固有名詞は大田区の区政・区議会の文脈で解釈する（例: 蒲田、大森、糀谷、区議会、陳情）
- 聞き取れない部分は ... と書く
- 音声に声が入っていなければ、何も書かずに空で返す`;

/**
 * モデルの出力を入力欄に入れられる形に整える。指示に反して前置きや引用符を
 * 付けてくることがあるため、その分を落とす。
 */
export function cleanTranscript(raw: string): string {
  let text = raw.trim();
  // コードフェンス（```…```）で囲んで返すことがある
  const fenced = text.match(/^```[a-z]*\n([\s\S]*?)\n?```$/i);
  if (fenced?.[1] !== undefined) text = fenced[1].trim();
  // 全体が引用符で囲まれている場合だけ外す（本文中の引用は残す）
  const quoted = text.match(/^["'「『](.*)["'」』]$/s);
  if (quoted?.[1] !== undefined) text = quoted[1].trim();
  // 「（無音）」「(聞き取れませんでした)」だけの応答は空とみなす
  if (/^[（(][^）)]*[）)]$/.test(text)) return "";
  return text;
}

/**
 * MediaRecorder に渡す形式を選ぶ。ブラウザによって出せる形式が違う（Chrome は
 * webm/opus、Safari は mp4）ため、対応しているものを上から選ぶ。
 * どれも対応していなければ undefined を返し、ブラウザの既定に任せる。
 */
export function pickRecordingMimeType(
  isTypeSupported: (type: string) => boolean
): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => isTypeSupported(type));
}

/**
 * 起こした文字を入力欄に足す。すでに書いてある内容は消さない（声と手入力を
 * 混ぜて使えるようにする）。
 */
export function appendTranscript(current: string, text: string): string {
  const addition = text.trim();
  if (!addition) return current;
  const base = current.trimEnd();
  if (!base) return addition;
  return `${base}\n${addition}`;
}
