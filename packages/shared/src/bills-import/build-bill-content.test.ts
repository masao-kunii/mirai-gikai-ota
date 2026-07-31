import { describe, expect, it } from "vitest";
import { buildBillContent } from "./build-bill-content";

describe("buildBillContent", () => {
  it("区長提出議案（未議決）: 事実ベースの summary と content", () => {
    const c = buildBillContent({
      title: "令和８年度大田区一般会計補正予算（第２次）",
      billNumber: "第58号議案",
      proposalType: "mayor_bill",
      status: "submitted",
      sessionName: "令和8年第2回定例会",
      pdfUrl: "https://example.com/58.pdf",
    });
    expect(c.title).toBe("令和８年度大田区一般会計補正予算（第２次）");
    expect(c.summary).toContain("令和8年第2回定例会に提出された区長提出議案");
    // 未議決（submitted）は状況を付けない
    expect(c.summary).not.toContain("現在の状況");
    expect(c.content).toContain("種別: 区長提出議案");
    expect(c.content).toContain("番号: 第58号議案");
    expect(c.content).toContain("公式 PDF");
  });

  it("可決済み議案: 議決結果を content に含める", () => {
    const c = buildBillContent({
      title: "令和８年度大田区一般会計予算",
      billNumber: "第1号議案",
      proposalType: "mayor_bill",
      status: "approved",
      sessionName: "令和8年第1回定例会",
      committee: "予算特別委員会",
      resultDate: "令和8年3月25日",
      resultText: "原案可決（賛成者多数）",
    });
    expect(c.summary).toContain("現在の状況: 可決");
    expect(c.content).toContain("付託委員会: 予算特別委員会");
    expect(c.content).toContain("議決日: 令和8年3月25日");
    expect(c.content).toContain("議決結果: 原案可決（賛成者多数）");
  });

  it("請願・陳情: 審査された旨の文言", () => {
    const c = buildBillContent({
      title: "施設使用料金設定の考え方に関する陳情",
      billNumber: "8第1号",
      proposalType: "petition",
      status: "rejected",
      sessionName: "令和8年第1回定例会",
    });
    expect(c.summary).toContain("審査された請願・陳情");
    expect(c.summary).toContain("現在の状況: 否決");
  });

  it("PDF が無い場合は原文セクションを出さない", () => {
    const c = buildBillContent({
      title: "テスト報告",
      billNumber: "報告第1号",
      proposalType: "report",
      status: "submitted",
      sessionName: "令和8年第1回定例会",
    });
    expect(c.content).not.toContain("### 原文");
  });
});
