-- 議案を区政テーマに振り分けた日時（tag:bills-by-theme が記録する）。
-- 「どのテーマにも当てはまらない」と判定した議案も記録し、毎日の取り込みで
-- 振り分け直さないようにする（AI の判断の揺れでタグが少しずつ増えるのを防ぐ）。
-- null の議案だけが振り分けの対象になる。振り分け直したいときは null に戻す。
--
-- 公開境界: public_reader の bills への select は列単位で付与しているため、
-- この列は公開 API からは読めない（運用用の内部情報）。
alter table bills add column theme_classified_at timestamptz;

comment on column bills.theme_classified_at is
  '区政テーマへの振り分けを行った日時（null=未振り分け）';

-- 既存の議案は 2026-09-28/29 に振り分け済み（テーマ付け 123 件＋当てはまらない 56 件）。
update bills set theme_classified_at = now();
