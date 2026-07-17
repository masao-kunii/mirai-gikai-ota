import { describe, expect, it } from "vitest";
import {
  type ReportRow,
  summarizeReports,
  TOP_REPORT_COUNT,
} from "./summarize-reports";

function row(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: crypto.randomUUID(),
    summary: "要約",
    stance: "for",
    role: "general_citizen",
    roleTitle: "区民",
    richness: 50,
    ...overrides,
  };
}

describe("summarizeReports", () => {
  it("空配列なら total 0・分布空・代表意見なし", () => {
    expect(summarizeReports([])).toEqual({
      total: 0,
      stances: {},
      roles: {},
      reports: [],
    });
  });

  it("スタンス・立場の分布を数える（null は無視）", () => {
    const result = summarizeReports([
      row({ stance: "for", role: "general_citizen" }),
      row({ stance: "for", role: "subject_expert" }),
      row({ stance: "against", role: "general_citizen" }),
      row({ stance: null, role: null }),
    ]);
    expect(result.total).toBe(4);
    expect(result.stances).toEqual({ for: 2, against: 1 });
    expect(result.roles).toEqual({ general_citizen: 2, subject_expert: 1 });
  });

  it("代表意見は充実度の高い順で、richness/createdAt を含まない", () => {
    const low = row({ richness: 10, summary: "低" });
    const high = row({ richness: 90, summary: "高" });
    const mid = row({ richness: 50, summary: "中" });
    const result = summarizeReports([low, high, mid]);
    expect(result.reports.map((r) => r.summary)).toEqual(["高", "中", "低"]);
    expect(result.reports[0]).not.toHaveProperty("richness");
    expect(result.reports[0]).not.toHaveProperty("createdAt");
  });

  it("代表意見は最大 TOP_REPORT_COUNT 件に絞る", () => {
    const rows = Array.from({ length: TOP_REPORT_COUNT + 4 }, (_, i) =>
      row({ richness: i })
    );
    const result = summarizeReports(rows);
    expect(result.total).toBe(TOP_REPORT_COUNT + 4);
    expect(result.reports).toHaveLength(TOP_REPORT_COUNT);
  });

  it("richness が null でも並び替えで落ちない", () => {
    const result = summarizeReports([
      row({ richness: null, summary: "null" }),
      row({ richness: 5, summary: "5" }),
    ]);
    expect(result.reports.map((r) => r.summary)).toEqual(["5", "null"]);
  });

  it("groupRolesByTitle=true は立場を roleTitle で集計する（テーマ用）", () => {
    const result = summarizeReports(
      [
        row({ role: "general_citizen", roleTitle: "子育て中" }),
        row({ role: "subject_expert", roleTitle: "子育て中" }),
        row({ role: "general_citizen", roleTitle: "子育てに関わる専門家" }),
        row({ role: "general_citizen", roleTitle: null }),
      ],
      { groupRolesByTitle: true }
    );
    // role(enum) ではなく roleTitle でまとまる。null は無視。
    expect(result.roles).toEqual({ 子育て中: 2, 子育てに関わる専門家: 1 });
  });
});
