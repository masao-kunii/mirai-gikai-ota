-- ----------------------------------------
-- proposal_type_enum に「議員提出議案」「その他」を追加
--
-- 大田区議会の定例会ページは 区長提出議案 / 報告 / 議員提出議案 / 請願・陳情 /
-- その他 のカテゴリーで構成される。これらをすべて公開サイトに表示するため、
-- 既存の enum（mayor_bill/committee_bill/report/petition）に2値を追加する。
--   - member_bill : 議員提出議案（議員が提出する条例案等）
--   - other       : その他（議員派遣・選挙・人権擁護委員推薦 等の手続事項）
--
-- ALTER TYPE ... ADD VALUE は値の追加のみ（同一マイグレーション内で使用しない）。
-- ----------------------------------------

ALTER TYPE proposal_type_enum ADD VALUE IF NOT EXISTS 'member_bill';
ALTER TYPE proposal_type_enum ADD VALUE IF NOT EXISTS 'other';
