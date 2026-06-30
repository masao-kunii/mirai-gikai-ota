import { expect, test } from "@playwright/test";

test.describe("会期ページ（過去の議案一覧）", () => {
  test("トップの会期リンクから /sessions/ へ遷移できる", async ({ page }) => {
    await page.goto("/");

    const sessionLink = page.locator('a[href*="/sessions/"]').first();
    const hasSessionLink = (await sessionLink.count()) > 0;
    // 過去会期が無い場合（Archive セクション非表示）はスキップ
    test.skip(!hasSessionLink, "トップに会期リンクが無いためスキップ");

    const href = await sessionLink.getAttribute("href");
    expect(href).toMatch(/\/sessions\/.+\/bills/);

    const response = await page.goto(href as string);
    expect(response?.ok()).toBeTruthy();
    // 会期ページに議案リンクがある
    expect(await page.locator('a[href^="/bills/"]').count()).toBeGreaterThan(0);
  });

  test("旧 /kokkai ルートは廃止されている（Phase1 ガード）", async ({
    page,
  }) => {
    const response = await page.goto("/kokkai/r8-1/bills", {
      waitUntil: "domcontentloaded",
    });
    // リネーム済みのため 404（または / へのリダイレクト）。200で旧ページが出ないこと。
    const status = response?.status() ?? 0;
    const url = page.url();
    const servedOldPage = status === 200 && url.includes("/kokkai/");
    expect(servedOldPage).toBeFalsy();
  });
});
