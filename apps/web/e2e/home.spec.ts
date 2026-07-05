import { expect, test } from "@playwright/test";

test.describe("トップpage（新 web / SSR）", () => {
  test("SSR で議案一覧が表示される", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/みらい議会/);

    // 議案カードへのリンクが1件以上ある
    const billLinks = page.locator('a[href^="/bills/"]');
    expect(await billLinks.count()).toBeGreaterThan(0);
  });

  test("議案カードから詳細へ遷移できる", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href^="/bills/"]').first().click();
    await expect(page).toHaveURL(/\/bills\//);
    // 詳細ページの見出し（h1）が存在する
    await expect(page.locator("h1")).toBeVisible();
  });
});
