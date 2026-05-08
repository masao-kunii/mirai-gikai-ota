-- 請願・意見書向けのステータスを追加
-- adopted: 採択（請願が採択された）
-- partially_adopted: 趣旨採択（請願の趣旨が採択された）

ALTER TYPE bill_status_enum ADD VALUE 'adopted';
ALTER TYPE bill_status_enum ADD VALUE 'partially_adopted';
