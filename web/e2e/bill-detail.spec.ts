import { expect, test } from "@playwright/test";

test.describe("議案詳細", () => {
  test("トップから議案詳細へ遷移し内容が表示される", async ({ page }) => {
    await page.goto("/");

    // 最初の議案リンクへ遷移
    const firstBill = page.locator('a[href^="/bills/"]').first();
    await expect(firstBill).toBeVisible();
    await firstBill.click();

    // /bills/<uuid> に遷移
    await expect(page).toHaveURL(/\/bills\/[0-9a-f-]{36}/);

    // 見出し(議案名)と審議ステータスが表示される
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(
      page.getByText("審議のステータス", { exact: false })
    ).toBeVisible();
  });

  test("『チームみらいの賛否』カードは表示されない（Phase1 ガード）", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('a[href^="/bills/"]').first().click();
    await expect(page).toHaveURL(/\/bills\/[0-9a-f-]{36}/);
    await expect(page.getByText("チームみらいの賛否")).toHaveCount(0);
  });
});
