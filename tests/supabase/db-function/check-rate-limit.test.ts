import { afterEach, describe, expect, it } from "vitest";
import { adminClient } from "../utils";

/**
 * check_rate_limit RPC の統合テスト。
 * 固定ウィンドウ内で上限回数まで true、超過で false を返すこと、
 * キーごとに独立してカウントされることを検証する。
 */
describe("check_rate_limit", () => {
  const keys: string[] = [];

  function uniqueKey(prefix: string): string {
    const k = `test:${prefix}:${Math.random().toString(36).slice(2)}`;
    keys.push(k);
    return k;
  }

  afterEach(async () => {
    for (const k of keys) {
      await adminClient
        .from("rate_limit_counters")
        .delete()
        .eq("bucket_key", k);
    }
    keys.length = 0;
  });

  async function call(key: string, limit: number): Promise<boolean> {
    const { data, error } = await adminClient.rpc("check_rate_limit", {
      p_key: key,
      p_window_seconds: 60,
      p_limit: limit,
    });
    if (error) throw new Error(error.message);
    return data as boolean;
  }

  it("上限回数までは true、超過すると false を返す", async () => {
    const key = uniqueKey("limit");
    expect(await call(key, 3)).toBe(true); // 1
    expect(await call(key, 3)).toBe(true); // 2
    expect(await call(key, 3)).toBe(true); // 3
    expect(await call(key, 3)).toBe(false); // 4 → 超過
    expect(await call(key, 3)).toBe(false); // 5 → 超過
  });

  it("キーごとに独立してカウントされる", async () => {
    const keyA = uniqueKey("a");
    const keyB = uniqueKey("b");
    expect(await call(keyA, 1)).toBe(true);
    expect(await call(keyA, 1)).toBe(false); // A は超過
    expect(await call(keyB, 1)).toBe(true); // B は独立して許可
  });
});
