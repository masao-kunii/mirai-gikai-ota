import { describe, expect, it } from "vitest";
import {
  factionColumnToDisplayName,
  formatGianBillNumber,
  formatHokokuBillNumber,
  formatIinkaiBillNumber,
  formatMemberBillNumber,
  formatSonotaBillNumber,
  mapGianResultToStatus,
  mapSeiganResultToStatus,
  mapStanceMainToType,
  normalizeCommitteeName,
  taidoNumberToGianBillNumber,
} from "./teirei-mapping";

describe("mapGianResultToStatus", () => {
  it("未議決（空）は submitted", () => {
    expect(mapGianResultToStatus("")).toBe("submitted");
  });
  it("原案可決は approved", () => {
    expect(mapGianResultToStatus("原案可決（賛成者多数）")).toBe("approved");
  });
  it("同意は approved", () => {
    expect(mapGianResultToStatus("同意")).toBe("approved");
  });
  it("否決は rejected", () => {
    expect(mapGianResultToStatus("否決")).toBe("rejected");
  });
  it("継続審査は in_committee", () => {
    expect(mapGianResultToStatus("継続審査")).toBe("in_committee");
  });
});

describe("mapSeiganResultToStatus", () => {
  it("採択は adopted", () => {
    expect(mapSeiganResultToStatus("採択")).toBe("adopted");
  });
  it("不採択は rejected", () => {
    expect(mapSeiganResultToStatus("不採択")).toBe("rejected");
  });
  it("継続審査は in_committee", () => {
    expect(mapSeiganResultToStatus("継続審査")).toBe("in_committee");
  });
  it("空は submitted", () => {
    expect(mapSeiganResultToStatus("")).toBe("submitted");
  });
});

describe("mapStanceMainToType", () => {
  it("賛成は for", () => {
    expect(mapStanceMainToType("賛成")).toBe("for");
  });
  it("反対は against", () => {
    expect(mapStanceMainToType("反対")).toBe("against");
  });
  it("棄権は neutral", () => {
    expect(mapStanceMainToType("棄権")).toBe("neutral");
  });
  it("退席は neutral", () => {
    expect(mapStanceMainToType("退席")).toBe("neutral");
  });
  it("欠席のみは null（態度なし）", () => {
    expect(mapStanceMainToType("欠席")).toBeNull();
  });
});

describe("factionColumnToDisplayName", () => {
  it("略称を display_name へ変換", () => {
    expect(factionColumnToDisplayName("自民・無所属")).toBe(
      "自民党・無所属の会"
    );
    expect(factionColumnToDisplayName("共産")).toBe("共産党");
    expect(factionColumnToDisplayName("れ新")).toBe("れいわ新選組");
    expect(factionColumnToDisplayName("創志")).toBe("未来創志会");
  });
  it("マップに無い場合はそのまま返す", () => {
    expect(factionColumnToDisplayName("つばさ")).toBe("つばさ");
    expect(factionColumnToDisplayName("未知会派")).toBe("未知会派");
  });
});

describe("formatGianBillNumber", () => {
  it("数値は第N号議案", () => {
    expect(formatGianBillNumber("58")).toBe("第58号議案");
  });
  it("委員会提出議案は委員会第N号議案", () => {
    expect(formatGianBillNumber("委1")).toBe("委員会第1号議案");
  });
});

describe("formatHokokuBillNumber", () => {
  it("数値は報告第N号", () => {
    expect(formatHokokuBillNumber("1")).toBe("報告第1号");
  });
});

describe("formatIinkaiBillNumber", () => {
  it("委員会提出議案は区長議案と衝突しない接頭辞を付ける", () => {
    // "1"（委員会ページの番号）→ 委員会第1号議案（区長 第1号議案 と区別）
    expect(formatIinkaiBillNumber("1")).toBe("委員会第1号議案");
  });
  it("委N 形式も同じ結果（taido の委1 参照と一致）", () => {
    expect(formatIinkaiBillNumber("委1")).toBe("委員会第1号議案");
    expect(formatGianBillNumber("委1")).toBe("委員会第1号議案");
  });
});

describe("formatMemberBillNumber", () => {
  it("議員提出議案は専用接頭辞（区長/委員会と衝突しない）", () => {
    expect(formatMemberBillNumber("1")).toBe("議員提出第1号議案");
  });
});

describe("formatSonotaBillNumber", () => {
  it("番号無しの連番から bill_number を作る", () => {
    expect(formatSonotaBillNumber(1)).toBe("その他第1号");
    expect(formatSonotaBillNumber(2)).toBe("その他第2号");
  });
});

describe("taidoNumberToGianBillNumber", () => {
  it("態度ページの番号を議案番号形式に正規化", () => {
    expect(taidoNumberToGianBillNumber("1")).toBe("第1号議案");
    expect(taidoNumberToGianBillNumber("委1")).toBe("委員会第1号議案");
  });
});

describe("normalizeCommitteeName", () => {
  it("委員会接尾辞を補う", () => {
    expect(normalizeCommitteeName("総務財政")).toBe("総務財政委員会");
  });
  it("既に委員会で終わる場合はそのまま", () => {
    expect(normalizeCommitteeName("総務財政委員会")).toBe("総務財政委員会");
  });
  it("空文字は空文字", () => {
    expect(normalizeCommitteeName("")).toBe("");
  });
});
