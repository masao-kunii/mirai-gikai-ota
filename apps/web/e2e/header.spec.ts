import { expect, test } from "@playwright/test";

/**
 * ヘッダーの描画スモーク（難易度トグル・メニューボタンが SSR で出る）。
 *
 * NOTE: トグルのON/OFFやメニュー開閉などクライアント操作の検証は、dev サーバーの
 * hydration が重く不安定なためこのスモークには含めない（chat 送信 E2E と同方針）。
 * 難易度切替・メニュー遷移の実挙動はローカルの手動/一時テストで確認済み。
 */
test.describe("ヘッダー（新 web / SSR）", () => {
  test("難易度トグルとメニューボタンが表示される", async ({ page }) => {
    await page.goto("/");
    // 難易度トグル（Desktop 幅で表示）
    await expect(
      page.getByRole("button", { name: "説明をもっと詳しく" })
    ).toBeVisible();
    // メニューボタン
    await expect(page.getByRole("button", { name: "メニュー" })).toBeVisible();
  });
});
