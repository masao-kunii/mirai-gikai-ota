import { describe, expect, it } from "vitest";
import {
  formatDurationJa,
  formatJstDateTime,
  toIsoTimestamp,
} from "./format-for-display";

describe("toIsoTimestamp", () => {
  it("Postgres の timestamptz 文字列を ISO 8601 に直す", () => {
    expect(toIsoTimestamp("2026-09-19 10:40:47.669039+00")).toBe(
      "2026-09-19T10:40:47.669+00:00"
    );
  });

  it("小数秒が無い・時差が +0900 の形も扱う", () => {
    expect(toIsoTimestamp("2026-09-19 19:40:47+0900")).toBe(
      "2026-09-19T19:40:47+09:00"
    );
  });

  it("小数秒が3桁未満なら0で埋める", () => {
    expect(toIsoTimestamp("2026-09-19 10:40:47.5+00")).toBe(
      "2026-09-19T10:40:47.500+00:00"
    );
  });

  it("ISO 8601 はそのまま通す", () => {
    expect(toIsoTimestamp("2026-09-19T10:40:47.669Z")).toBe(
      "2026-09-19T10:40:47.669Z"
    );
    expect(toIsoTimestamp("2026-09-19T10:40:47+09:00")).toBe(
      "2026-09-19T10:40:47+09:00"
    );
  });

  it("時差が無ければ UTC とみなす", () => {
    expect(toIsoTimestamp("2026-09-19 10:40:47")).toBe("2026-09-19T10:40:47Z");
  });

  it("日時として読めない文字列はそのまま返す", () => {
    expect(toIsoTimestamp("昨日")).toBe("昨日");
  });
});

describe("formatJstDateTime", () => {
  it("UTC の日時を日本時間で表す", () => {
    expect(formatJstDateTime("2026-09-19 10:40:47.669039+00")).toBe(
      "2026/09/19 19:40"
    );
  });

  it("日本時間で日付が変わる時刻も正しく表す", () => {
    expect(formatJstDateTime("2026-12-31T15:30:00Z")).toBe("2027/01/01 00:30");
  });

  it("読めない値は元の文字列を返す", () => {
    expect(formatJstDateTime("不明")).toBe("不明");
  });
});

describe("formatDurationJa", () => {
  it("1分未満は秒だけ", () => {
    expect(formatDurationJa(45)).toBe("45秒");
    expect(formatDurationJa(0)).toBe("0秒");
  });

  it("1時間未満は分と秒", () => {
    expect(formatDurationJa(193)).toBe("3分13秒");
  });

  it("1時間以上は時間と分", () => {
    expect(formatDurationJa(3725)).toBe("1時間2分");
  });

  it("小数は四捨五入する", () => {
    expect(formatDurationJa(59.6)).toBe("1分0秒");
  });

  it("null・負数・非有限値は「—」", () => {
    expect(formatDurationJa(null)).toBe("—");
    expect(formatDurationJa(-1)).toBe("—");
    expect(formatDurationJa(Number.NaN)).toBe("—");
  });
});
