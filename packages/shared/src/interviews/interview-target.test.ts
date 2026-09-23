import { describe, expect, it } from "vitest";
import {
  type InterviewTargetColumns,
  resolveInterviewTarget,
} from "./interview-target";

const empty: InterviewTargetColumns = {
  billId: null,
  billName: null,
  themeId: null,
  themeName: null,
  themeInitiativeId: null,
  initiativeTitle: null,
};

describe("resolveInterviewTarget", () => {
  it("議案が対象ならその名前を返す", () => {
    expect(
      resolveInterviewTarget({ ...empty, billId: "b", billName: "第1号議案" })
    ).toEqual({ type: "bill", name: "第1号議案" });
  });

  it("区政テーマが対象ならその名前を返す", () => {
    expect(
      resolveInterviewTarget({
        ...empty,
        themeId: "t",
        themeName: "子育て・教育",
      })
    ).toEqual({ type: "theme", name: "子育て・教育" });
  });

  it("取り組みが対象ならその題名を返す", () => {
    expect(
      resolveInterviewTarget({
        ...empty,
        themeInitiativeId: "i",
        initiativeTitle: "学校給食費の無償化",
      })
    ).toEqual({ type: "initiative", name: "学校給食費の無償化" });
  });

  it("対象の名前が取れないときは種類ごとの仮の名前にする", () => {
    expect(resolveInterviewTarget({ ...empty, billId: "b" })).toEqual({
      type: "bill",
      name: "(不明な議案)",
    });
    expect(resolveInterviewTarget({ ...empty, themeId: "t" })).toEqual({
      type: "theme",
      name: "(不明なテーマ)",
    });
    expect(
      resolveInterviewTarget({ ...empty, themeInitiativeId: "i" })
    ).toEqual({ type: "initiative", name: "(不明な取り組み)" });
  });

  it("どの対象も無ければ null", () => {
    expect(resolveInterviewTarget(empty)).toBeNull();
  });
});
