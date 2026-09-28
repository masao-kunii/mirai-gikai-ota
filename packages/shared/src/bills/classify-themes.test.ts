import { describe, expect, it } from "vitest";
import {
  buildClassifyPrompt,
  MAX_THEMES_PER_BILL,
  normalizeClassification,
} from "./classify-themes";

const themes = [
  { slug: "kosodate", name: "子育て・教育", lead: "保育・学童" },
  { slug: "fukushi", name: "福祉・健康", lead: null },
  { slug: "bousai", name: "防災・安全", lead: null },
];
const bills = [
  { id: "b1", name: "保育園条例の一部を改正する条例", summary: "定員を増やす" },
  { id: "b2", name: "人権擁護委員の推薦", summary: null },
];

describe("buildClassifyPrompt", () => {
  it("テーマの slug・名前・説明と、議案の id・名前・概要を並べる", () => {
    const prompt = buildClassifyPrompt(themes, bills);
    expect(prompt).toContain("- kosodate: 子育て・教育（保育・学童）");
    expect(prompt).toContain("- fukushi: 福祉・健康\n");
    expect(prompt).toContain(
      "### billId: b1\n議案名: 保育園条例の一部を改正する条例\n概要: 定員を増やす"
    );
    expect(prompt).toContain("### billId: b2\n議案名: 人権擁護委員の推薦");
    expect(prompt).not.toContain("概要: null");
  });
});

describe("normalizeClassification", () => {
  it("知らないテーマ・議案を捨て、重複を除く", () => {
    const result = normalizeClassification(
      {
        results: [
          { billId: "b1", themeSlugs: ["kosodate", "kosodate", "unknown"] },
          { billId: "zzz", themeSlugs: ["kosodate"] },
          { billId: "b2", themeSlugs: [] },
        ],
      },
      themes,
      bills
    );
    expect([...result]).toEqual([
      ["b1", ["kosodate"]],
      ["b2", []],
    ]);
  });

  it("1議案のテーマは上限までに切る", () => {
    const result = normalizeClassification(
      { results: [{ billId: "b1", themeSlugs: ["kosodate", "fukushi", "bousai"] }] },
      themes,
      bills
    );
    expect(result.get("b1")).toHaveLength(MAX_THEMES_PER_BILL);
    expect(result.get("b1")).toEqual(["kosodate", "fukushi"]);
  });

  it("同じ議案が二度返ったら最初の結果を使い、返らなかった議案は含めない", () => {
    const result = normalizeClassification(
      {
        results: [
          { billId: "b1", themeSlugs: ["fukushi"] },
          { billId: "b1", themeSlugs: ["kosodate"] },
        ],
      },
      themes,
      bills
    );
    expect(result.get("b1")).toEqual(["fukushi"]);
    expect(result.has("b2")).toBe(false);
  });
});
