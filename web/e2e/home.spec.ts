import { expect, test } from "@playwright/test";

test.describe("トップページ", () => {
  test("読み込めて議案が表示される", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    // サイト名がタイトルに含まれる
    await expect(page).toHaveTitle(/みらい議会/);

    // 議案カードへのリンクが1件以上ある
    const billLinks = page.locator('a[href^="/bills/"]');
    expect(await billLinks.count()).toBeGreaterThan(0);
  });

  test("運営表記(非公式フォーク)が表示される", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("非公式プロジェクト", { exact: false }).first()
    ).toBeVisible();
  });

  test("チームみらいの promo は表示されない（Phase1 リグレッションガード）", async ({
    page,
  }) => {
    await page.goto("/");
    // 削除済みの promo セクション見出し・寄附ボタン
    await expect(page.getByText("チームみらいについて")).toHaveCount(0);
    await expect(page.getByText("寄附で応援する")).toHaveCount(0);
  });
});
