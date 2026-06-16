import { describe, expect, it } from "vitest";
import { shouldAutoCloseInterviewOnBillStatus } from "./should-auto-close-interview";

describe("shouldAutoCloseInterviewOnBillStatus", () => {
  it("enacted のときは true を返す", () => {
    expect(shouldAutoCloseInterviewOnBillStatus("approved")).toBe(true);
  });

  it.each([
    ["preparing"],
    ["submitted"],
    ["in_committee"],
    ["plenary_session"],
    ["rejected"],
  ] as const)("%s のときは false を返す", (status) => {
    expect(shouldAutoCloseInterviewOnBillStatus(status)).toBe(false);
  });
});
