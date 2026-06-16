import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

function h(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("getClientIp", () => {
  it("x-forwarded-for の先頭IPを返す", () => {
    expect(getClientIp(h({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe(
      "203.0.113.5"
    );
  });
  it("空白をトリムする", () => {
    expect(getClientIp(h({ "x-forwarded-for": "  203.0.113.9  " }))).toBe(
      "203.0.113.9"
    );
  });
  it("x-forwarded-for が無ければ x-real-ip を使う", () => {
    expect(getClientIp(h({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2"
    );
  });
  it("どちらも無ければ unknown", () => {
    expect(getClientIp(h({}))).toBe("unknown");
  });
});
