import { expect, test } from "@playwright/test";

/**
 * AIチャットのスモーク。AI 呼び出し（課金・遅延・レート制限）を伴うため、
 * 既定では skip し `E2E_CHAT=1` を指定したときだけ実行する。
 * ローカルで動かす場合はチャットに Gemini キーが必要（`pnpm dev:secrets`）。
 */
const chatEnabled = process.env.E2E_CHAT === "1";

test.describe("AIチャット", () => {
  test.skip(
    !chatEnabled,
    "E2E_CHAT=1 のときのみ実行（AI課金・レート制限のため既定skip）"
  );

  test("議案詳細でチャットを送信すると応答が返る", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href^="/bills/"]').first().click();
    await expect(page).toHaveURL(/\/bills\/[0-9a-f-]{36}/);

    // チャットを開く
    await page
      .getByRole("button", { name: "議案について質問する" })
      .first()
      .click();

    const input = page.getByPlaceholder("わからないことをAIに質問する");
    await expect(input).toBeVisible();
    await input.fill("この議案の目的を一言で教えてください");

    // 送信と同時に /api/chat の応答(200)を待つ
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/chat") && r.request().method() === "POST",
        { timeout: 30_000 }
      ),
      input.press("Enter"),
    ]);
    expect(response.status()).toBe(200);
  });
});
