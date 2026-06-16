-- ----------------------------------------
-- 議案・報告・請願・陳情を区別する proposal_type を bills テーブルに追加
--
-- 大田区議会の本会議では「区長提出議案」だけでなく、
-- 「委員会提出議案」「報告」「請願・陳情」なども取り扱われる。
-- いずれも議題として bills テーブルで管理し、proposal_type で区別する。
--
-- 出典: https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigi/
-- ----------------------------------------

CREATE TYPE proposal_type_enum AS ENUM (
    'mayor_bill',       -- 区長提出議案（条例案・予算案など）
    'committee_bill',   -- 委員会提出議案
    'report',           -- 区から議会への報告事項
    'petition'          -- 請願・陳情（区民から議会への要望）
);

ALTER TABLE bills
    ADD COLUMN proposal_type proposal_type_enum NOT NULL DEFAULT 'mayor_bill';

COMMENT ON COLUMN bills.proposal_type IS
    '議題の種別。mayor_bill=区長提出議案, committee_bill=委員会提出議案, report=報告, petition=請願・陳情';

CREATE INDEX idx_bills_proposal_type ON bills(proposal_type);
