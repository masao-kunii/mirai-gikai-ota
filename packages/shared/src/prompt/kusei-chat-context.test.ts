import { describe, expect, it } from "vitest";
import {
  formatKuseiOverview,
  formatKuseiThemeDetail,
  type KuseiThemeDetail,
} from "./kusei-chat-context";

describe("formatKuseiOverview", () => {
  it("テーマ名と一行説明を箇条書きにする", () => {
    expect(
      formatKuseiOverview([
        { name: "子育て・教育", lead: "保育・学童、学びの環境づくり" },
        { name: "防災・安全", lead: null },
      ])
    ).toBe("- 子育て・教育: 保育・学童、学びの環境づくり\n- 防災・安全");
  });

  it("テーマが無ければその旨を返す", () => {
    expect(formatKuseiOverview([])).toBe(
      "（現在公開中の区政テーマはありません）"
    );
  });
});

describe("formatKuseiThemeDetail", () => {
  const base: KuseiThemeDetail = {
    name: "子育て・教育",
    lead: "保育・学童、学びの環境づくり",
    overview: "区は切れ目のない支援を進めています。",
    policies: [{ title: "保育・学童の整備", body: "定員を増やします。" }],
    numbers: [{ label: "待機児童", value: "0人", note: "令和7年4月" }],
    plans: [
      {
        name: "かがやきプラン",
        url: "https://example.jp/plan",
        description: "子ども・子育て支援事業計画",
      },
    ],
    initiatives: [
      { title: "学校給食費の無償化", body: "無償にしました。", dateLabel: "実施中" },
    ],
  };

  it("概要・取り組み・数字・最近の取り組み・公式ページを見出しごとにまとめる", () => {
    const text = formatKuseiThemeDetail(base);
    expect(text).toContain("## 子育て・教育");
    expect(text).toContain("### 概要\n区は切れ目のない支援を進めています。");
    expect(text).toContain("- 保育・学童の整備: 定員を増やします。");
    expect(text).toContain("- 待機児童: 0人（令和7年4月）");
    expect(text).toContain("- 学校給食費の無償化（実施中）: 無償にしました。");
    expect(text).toContain(
      "- かがやきプラン（https://example.jp/plan）: 子ども・子育て支援事業計画"
    );
  });

  it("中身が無い項目の見出しは出さない", () => {
    const text = formatKuseiThemeDetail({
      ...base,
      overview: null,
      policies: [],
      numbers: null,
      plans: [],
      initiatives: [],
    });
    expect(text).toBe("## 子育て・教育\n\n保育・学童、学びの環境づくり");
  });

  it("JSON 列の形が崩れた要素は捨てる", () => {
    const text = formatKuseiThemeDetail({
      ...base,
      policies: [
        { title: "正しい", body: "本文" },
        { title: "本文なし" },
        "文字列",
        null,
      ],
      numbers: "配列ではない",
    });
    expect(text).toContain("- 正しい: 本文");
    expect(text).not.toContain("本文なし");
    expect(text).not.toContain("### 数字で見る");
  });
});
