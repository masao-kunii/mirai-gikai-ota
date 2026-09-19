import { describe, expect, it } from "vitest";
import { normalizeMinutesPdfText } from "./normalize-pdf-text";

const HEADER = "令和８年第１回定例会 第３日（2/24） 大田区議会会議録 速報版";

/** 行幅 30 文字で折り返した本文行を作る（実データは約50文字幅）。 */
function wrapped(text: string): string {
  return text.padEnd(30, "あ").slice(0, 30);
}

function page(n: number, lines: string[]): string {
  return [HEADER, `-${n}-`, ...lines].join("\n");
}

describe("normalizeMinutesPdfText", () => {
  it("各ページ先頭の柱とページ番号を取り除く", () => {
    const result = normalizeMinutesPdfText([
      page(1, ["午前10時開議"]),
      page(2, ["午後５時散会"]),
    ]);
    expect(result).toBe("午前10時開議\n午後５時散会");
  });

  it("行幅いっぱいの行は次の行とつなげ、短い行で段落を終える", () => {
    const line1 = wrapped("初めに");
    const line2 = wrapped("次に");
    const result = normalizeMinutesPdfText([
      page(1, [line1, line2, "伺います。", "以上です。"]),
      page(2, [wrapped("別の段落"), "終わり。"]),
    ]);
    expect(result.split("\n")).toEqual([
      `${line1}${line2}伺います。`,
      "以上です。",
      `${wrapped("別の段落")}終わり。`,
    ]);
  });

  it("ページをまたいで続く段落をつなげる", () => {
    const tail = wrapped("東京都との");
    const result = normalizeMinutesPdfText([
      page(1, [wrapped("冒頭"), tail]),
      page(2, ["連携について。", wrapped("埋め"), "です。"]),
    ]);
    expect(result.split("\n")[0]).toBe(
      `${wrapped("冒頭")}${tail}連携について。`
    );
  });

  it("○・〔・～で始まる行は前の行が行幅いっぱいでも新しい段落にする", () => {
    const full = wrapped("質問します");
    const result = normalizeMinutesPdfText([
      page(1, [full, "○議長 答弁を求めます。", full, "〔拍手〕", full]),
      page(2, ["～～～～～～", wrapped("埋め"), "です。"]),
    ]);
    expect(result.split("\n")).toEqual([
      full,
      "○議長 答弁を求めます。",
      full,
      "〔拍手〕",
      full,
      "～～～～～～",
      `${wrapped("埋め")}です。`,
    ]);
  });

  it("柱と同じ文言でもページ先頭以外の行は本文として残す", () => {
    const result = normalizeMinutesPdfText([
      page(1, [HEADER]),
      page(2, ["本文"]),
    ]);
    expect(result).toBe(`${HEADER}\n本文`);
  });

  it("数字だけの行はページ番号とみなさず残す", () => {
    const result = normalizeMinutesPdfText([
      page(1, ["賛成", "32"]),
      page(2, ["本文"]),
    ]);
    expect(result).toBe("賛成\n32\n本文");
  });

  it("先頭行が半数以下のページでしか一致しないときは柱とみなさない", () => {
    const result = normalizeMinutesPdfText([
      "表紙\n本文1",
      "目次\n本文2",
      "表紙\n本文3",
      "付録\n本文4",
    ]);
    expect(result).toBe("表紙\n本文1\n目次\n本文2\n表紙\n本文3\n付録\n本文4");
  });

  it("1ページだけのときは柱を判定せず、折り返し幅が推定できなければ行をつなげない", () => {
    const result = normalizeMinutesPdfText([`${HEADER}\n-1-\n短い行\n短い行2`]);
    expect(result).toBe(`${HEADER}\n短い行\n短い行2`);
  });

  it("空白行と前後の空白を無視する", () => {
    const result = normalizeMinutesPdfText([
      page(1, ["  午前10時開議  ", "", "   "]),
      page(2, ["閉会"]),
    ]);
    expect(result).toBe("午前10時開議\n閉会");
  });

  it("本文が無ければ空文字を返す", () => {
    expect(normalizeMinutesPdfText([])).toBe("");
    expect(normalizeMinutesPdfText([page(1, []), page(2, [])])).toBe("");
  });
});
