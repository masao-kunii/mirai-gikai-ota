import { expect, test } from "@playwright/test";

/**
 * 議案詳細ページのスモーク。トップから最初の議案へ遷移して検証する
 * （特定 id に依存せず、シードの実データで動く）。
 */
test.describe("議案詳細（新 web / SSR）", () => {
  test("詳細に本文・審議ステータス・チャット UI が SSR で出る", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('a[href^="/bills/"]').first().click();
    await expect(page).toHaveURL(/\/bills\//);

    // 議案名（h1）
    await expect(page.locator("h1")).toBeVisible();

    // 審議のステータス見出し
    await expect(
      page.getByRole("heading", { name: "審議のステータス" })
    ).toBeVisible();

    // 常設 AI チャット（議案詳細では「この議案について」の文脈に切り替わる）。
    // Desktop 幅では右カラムのサイドバーとして常時表示される。
    await expect(
      page.getByText("この議案について、AIに質問してください。")
    ).toBeVisible();
    await expect(page.getByLabel("質問を入力")).toBeVisible();
    await expect(page.getByRole("button", { name: "送信" })).toBeVisible();
  });

  // NOTE: 「チャット送信 → /api/chat POST 到達」のブラウザ結合は、dev サーバーの
  // client bundle(@ai-sdk/react) hydration が重く不安定なため、この E2E スモークには
  // 含めない。送信ロジックとサーバー側の結合は apps/api の統合テスト（chat 7件）で
  // 担保し、ブラウザ→API の実結合はデプロイ後の外部 URL スモーク（本番ビルド）で確認する。
});
