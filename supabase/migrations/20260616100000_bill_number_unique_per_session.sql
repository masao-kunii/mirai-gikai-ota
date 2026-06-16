-- ----------------------------------------
-- bill_number の一意制約を会期スコープへ変更する
--
-- 背景:
--   従来 bill_number はグローバル一意（bills_bill_number_unique_idx）だったが、
--   地方議会の議案番号は定例会ごとにリセットされる（例: 報告第1号 は
--   令和8年第1回にも第2回にも存在する、第1号議案 も毎会期出る）。
--   そのため複数会期を取り込むと bill_number が衝突して INSERT に失敗する。
--
-- 対応:
--   一意制約を (council_session_id, bill_number) の複合に変更する。
--   会期に紐づかない議案（council_session_id IS NULL）は一意制約の対象外とする
--   （NULL は一意インデックス上で互いに区別されるため）。
--   空文字 bill_number は従来どおり重複可（WHERE 句で除外）。
-- ----------------------------------------

-- 既存のグローバル一意インデックス（upstream: bills_bill_number_unique）を外す。
-- 旧 fork 版の名称（bills_bill_number_unique_idx）も念のため対象にする。
DROP INDEX IF EXISTS bills_bill_number_unique;
DROP INDEX IF EXISTS bills_bill_number_unique_idx;

CREATE UNIQUE INDEX bills_session_bill_number_unique_idx
ON bills (council_session_id, bill_number)
WHERE bill_number IS NOT NULL
  AND bill_number <> ''
  AND council_session_id IS NOT NULL;
