import { describe, expect, it } from "vitest";
import {
  findPdfForNumber,
  parseGianPdfLinks,
  parseGianTable,
  parseHokokuPdfLinks,
  parseSeiganTable,
  parseStanceCell,
  parseTaidoTable,
  parseTeireiIndex,
} from "./parse-teirei-pages";

const BASE =
  "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/r_8/2teirei/index.html";

describe("parseTeireiIndex", () => {
  const html = `
    <a href="/gikai/kugikai_katsudou/honkaigi/r_8/2teirei/r0802teirei_kuchogian.html">区長提出議案</a>
    <a href="/gikai/kugikai_katsudou/honkaigi/r_8/2teirei/r0802teirei_hokoku.html">報告</a>
    <a href="/gikai/kugikai_katsudou/honkaigi/r_8/2teirei/r0802teirei_giingian.html">議員提出議案</a>
    <a href="/gikai/kugikai_katsudou/honkaigi/r_8/2teirei/r0802seigan20260219.html">請願・陳情</a>
    <a href="/gikai/segan_chinjo/index.html">請願・陳情</a>
    <a href="/gikai/kugikai_katsudou/honkaigi/r_8/1teirei/r0801teirei_taido.html">意見が異なった議案に対する各会派の態度</a>
  `;
  const idx = parseTeireiIndex(html, BASE);

  it("区長提出議案ページを抽出", () => {
    expect(idx.kuchogianUrl).toContain("r0802teirei_kuchogian.html");
  });
  it("報告ページを抽出（議案を含むものは除外）", () => {
    expect(idx.hokokuUrl).toContain("r0802teirei_hokoku.html");
  });
  it("請願・陳情は会期固有ページを優先（汎用 segan_chinjo を避ける）", () => {
    expect(idx.seiganUrl).toContain("r0802seigan20260219.html");
  });
  it("態度ページを抽出", () => {
    expect(idx.taidoUrl).toContain("r0801teirei_taido.html");
  });
});

describe("parseGianTable", () => {
  const html = `<table>
    <tr><th>番号</th><th>件名</th><th>議決日</th><th>議決内容</th><th>付託委員会</th></tr>
    <tr><td>58</td><td>令和８年度大田区一般会計補正予算（第２次）</td><td></td><td></td><td></td></tr>
    <tr><td>59</td><td>大田区特別区税条例の一部を改正する条例</td><td>令和8年3月25日</td><td><strong>原案<br>可決</strong></td><td>総務財政</td></tr>
  </table>`;
  const rows = parseGianTable(html);

  it("ヘッダー行を除いて全行を抽出", () => {
    expect(rows).toHaveLength(2);
  });
  it("未議決行は議決内容が空", () => {
    expect(rows[0]).toMatchObject({ number: "58", result: "" });
  });
  it("議決済み行は内容と委員会を抽出", () => {
    expect(rows[1]).toMatchObject({
      number: "59",
      result: "原案可決",
      committee: "総務財政",
    });
  });
});

describe("parseGianPdfLinks / findPdfForNumber", () => {
  const html = `
    <a href="r0802teirei_kuchogian.files/r0802kuchogian58.pdf">第58号議案（PDF：256KB）</a>
    <a href="r0802teirei_kuchogian.files/r0802kuchogian59_66.pdf">第59号議案から第66号議案（PDF：405KB）</a>
  `;
  const links = parseGianPdfLinks(html, BASE);

  it("単一議案 PDF は from=to", () => {
    expect(links[0]).toMatchObject({ numberFrom: 58, numberTo: 58 });
  });
  it("範囲 PDF は from/to を抽出", () => {
    expect(links[1]).toMatchObject({ numberFrom: 59, numberTo: 66 });
  });
  it("番号から該当 PDF を引ける", () => {
    expect(findPdfForNumber(links, 60)?.url).toContain("59_66.pdf");
    expect(findPdfForNumber(links, 58)?.url).toContain("kuchogian58.pdf");
    expect(findPdfForNumber(links, 99)).toBeUndefined();
  });
});

describe("parseHokokuPdfLinks", () => {
  const html = `
    <a href="r0802hokoku26_29.pdf">報告第26号から第29号（PDF：4,859KB）</a>
    <a href="r0802hokoku35.pdf">報告第35号（PDF：72KB）</a>
  `;
  const links = parseHokokuPdfLinks(html, BASE);
  it("範囲報告は from/to を抽出（KB等の数字は拾わない）", () => {
    expect(links[0]).toMatchObject({ numberFrom: 26, numberTo: 29 });
  });
  it("単一報告は from=to", () => {
    expect(links[1]).toMatchObject({ numberFrom: 35, numberTo: 35 });
  });
  it("番号から該当PDFを引ける", () => {
    expect(findPdfForNumber(links, 27)?.url).toContain("26_29");
    expect(findPdfForNumber(links, 35)?.url).toContain("hokoku35");
  });
});

describe("parseSeiganTable", () => {
  const html = `<table>
    <tr><th>受理番号</th><th>件名</th><th>付託日</th><th>付託委員会</th><th>議決日</th><th>結果</th></tr>
    <tr><td>8第1号</td><td>施設使用料金設定の考え方に関する陳情</td><td>令和8年2月24日</td><td>総務財政</td><td>令和8年3月4日</td><td>不採択</td></tr>
  </table>`;
  const rows = parseSeiganTable(html);

  it("受理番号・件名・結果を抽出", () => {
    expect(rows[0]).toMatchObject({
      acceptNumber: "8第1号",
      title: "施設使用料金設定の考え方に関する陳情",
      result: "不採択",
    });
  });
});

describe("parseStanceCell", () => {
  it("賛成のみ", () => {
    expect(parseStanceCell("賛成")).toMatchObject({ main: "賛成", note: "" });
  });
  it("賛成欠席１は主表記と補足に分離", () => {
    expect(parseStanceCell("賛成欠席１")).toMatchObject({
      main: "賛成",
      note: "欠席１",
    });
  });
  it("反対", () => {
    expect(parseStanceCell("反対")).toMatchObject({ main: "反対", note: "" });
  });
});

describe("parseTaidoTable", () => {
  const html = `<table>
    <tr><th>議案番号</th><th>件名</th><th>自民・無所属</th><th>公明</th><th>共産</th><th>結果</th></tr>
    <tr><td>1</td><td>令和８年度大田区一般会計予算</td><td>賛成</td><td>賛成</td><td>反対</td><td><strong>原案<br>可決</strong></td></tr>
  </table>`;
  const table = parseTaidoTable(html);

  it("会派列ヘッダーを動的に抽出（番号・件名・結果を除く）", () => {
    expect(table.factionColumns).toEqual(["自民・無所属", "公明", "共産"]);
  });
  it("行ごとに会派別スタンスを抽出", () => {
    const row = table.rows[0];
    expect(row.number).toBe("1");
    expect(row.stancesByFactionColumn["自民・無所属"].main).toBe("賛成");
    expect(row.stancesByFactionColumn["共産"].main).toBe("反対");
    expect(row.result).toBe("原案可決");
  });
});
