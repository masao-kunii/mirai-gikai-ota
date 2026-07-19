import { describe, expect, it } from "vitest";
import {
  AUTO_PUBLISH_MAX_MODERATION_SCORE,
  AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
  MIN_PUBLIC_REPORTS_FOR_DISPLAY,
  decideReportReview,
  isPublicReportVisible,
  isReportAutoPublishEligible,
  shouldDisplayPublicReports,
} from "./auto-publish";

describe("isReportAutoPublishEligible", () => {
  const baseInput = {
    isPublicByUser: true,
    moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE,
    totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
  };

  it("ユーザー公開許可済みで閾値を満たすレポートを自動公開対象にする", () => {
    expect(isReportAutoPublishEligible(baseInput)).toBe(true);
  });

  it("ユーザーが公開を許可していないレポートは対象外にする", () => {
    expect(
      isReportAutoPublishEligible({ ...baseInput, isPublicByUser: false })
    ).toBe(false);
  });

  it.each([
    {
      moderationScore: null,
      totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
    },
    {
      moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE + 1,
      totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
    },
    {
      moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE,
      totalContentRichness: null,
    },
    {
      moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE,
      totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS - 1,
    },
  ])(
    "未採点または閾値未達のレポートを対象外にする",
    ({ moderationScore, totalContentRichness }) => {
      expect(
        isReportAutoPublishEligible({
          ...baseInput,
          moderationScore,
          totalContentRichness,
        })
      ).toBe(false);
    }
  );
});

describe("decideReportReview", () => {
  const clean = {
    isPublicByUser: true,
    moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE,
    moderationCategories: [] as string[],
    faithful: true,
    totalContentRichness: AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
  };

  it("すべてクリアなら自動公開（auto_approved・公開）", () => {
    expect(decideReportReview(clean)).toEqual({
      reviewStatus: "auto_approved",
      isPublicByAdmin: true,
    });
  });

  it.each([
    { label: "モデレーション未評価", override: { moderationScore: null } },
    {
      label: "スコア超過",
      override: { moderationScore: AUTO_PUBLISH_MAX_MODERATION_SCORE + 1 },
    },
    {
      label: "カテゴリ該当あり",
      override: { moderationCategories: ["personal_info"] },
    },
    { label: "忠実性 false", override: { faithful: false } },
    { label: "忠実性 未確認(null)", override: { faithful: null } },
    { label: "充実度未達", override: { totalContentRichness: 0 } },
    { label: "同意なし", override: { isPublicByUser: false } },
  ])("$label なら承認待ち（pending・非公開）", ({ override }) => {
    expect(decideReportReview({ ...clean, ...override })).toEqual({
      reviewStatus: "pending",
      isPublicByAdmin: false,
    });
  });
});

describe("shouldDisplayPublicReports", () => {
  it.each([
    { count: 0, expected: false },
    { count: MIN_PUBLIC_REPORTS_FOR_DISPLAY - 1, expected: false },
    { count: MIN_PUBLIC_REPORTS_FOR_DISPLAY, expected: true },
    { count: MIN_PUBLIC_REPORTS_FOR_DISPLAY + 1, expected: true },
  ])("公開件数 $count の表示可否を判定する", ({ count, expected }) => {
    expect(shouldDisplayPublicReports(count)).toBe(expected);
  });
});

describe("isPublicReportVisible", () => {
  const baseInput = {
    isPublicByAdmin: true,
    isPublicByUser: true,
    publicReportCount: MIN_PUBLIC_REPORTS_FOR_DISPLAY,
  };

  it("両方の公開フラグがあり N 件以上揃っているレポートだけ表示する", () => {
    expect(isPublicReportVisible(baseInput)).toBe(true);
  });

  it.each([
    { isPublicByAdmin: false },
    { isPublicByUser: false },
    { publicReportCount: MIN_PUBLIC_REPORTS_FOR_DISPLAY - 1 },
  ])("公開条件が欠けるレポートを非表示にする", (override) => {
    expect(isPublicReportVisible({ ...baseInput, ...override })).toBe(false);
  });
});
