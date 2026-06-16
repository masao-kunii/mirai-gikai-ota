-- ============================================================
-- 地方議会版スキーマ変換マイグレーション
-- upstream（国会版）→ ota（大田区議会版）への一括変換。
-- 元: GondoTakashi/mirai-gikai-kawasaki の同等変換 + 後続改善（請願ステータス追加・
--     bill_number・council_session.end_date nullable・factions.alternative_names）を統合。
-- ============================================================

-- ----------------------------------------
-- 1. status_order の GENERATED COLUMN を一旦DROP（あとで新 enum 値で再作成）
-- ----------------------------------------
DROP INDEX IF EXISTS idx_bills_status_order;
ALTER TABLE bills DROP COLUMN IF EXISTS status_order;

-- ----------------------------------------
-- 2. originating_house と house_enum を削除（一院制）
-- ----------------------------------------
DROP INDEX IF EXISTS idx_bills_originating_house;
ALTER TABLE bills DROP COLUMN IF EXISTS originating_house;
DROP TYPE IF EXISTS house_enum;

-- ----------------------------------------
-- 3. shugiin_url 削除（衆議院特有）
-- ----------------------------------------
ALTER TABLE bills DROP COLUMN IF EXISTS shugiin_url;

-- ----------------------------------------
-- 4. bill_status_enum を地方議会用に置換
--    introduced              → submitted
--    in_originating_house    → in_committee
--    in_receiving_house      → plenary_session
--    enacted                 → approved
--    （新規）adopted, partially_adopted を請願・陳情用に追加
-- ----------------------------------------
ALTER TABLE bills ALTER COLUMN status TYPE text;
UPDATE bills SET status = CASE status
    WHEN 'introduced' THEN 'submitted'
    WHEN 'in_originating_house' THEN 'in_committee'
    WHEN 'in_receiving_house' THEN 'plenary_session'
    WHEN 'enacted' THEN 'approved'
    ELSE status
END;

ALTER TYPE bill_status_enum RENAME TO bill_status_enum_old;
CREATE TYPE bill_status_enum AS ENUM (
    'preparing',
    'submitted',
    'in_committee',
    'plenary_session',
    'approved',
    'rejected',
    'adopted',
    'partially_adopted'
);
ALTER TABLE bills
  ALTER COLUMN status TYPE bill_status_enum
  USING status::bill_status_enum;
DROP TYPE bill_status_enum_old;

-- ----------------------------------------
-- 5. status_order を新 enum で再作成
-- ----------------------------------------
ALTER TABLE bills ADD COLUMN status_order INT GENERATED ALWAYS AS (
  CASE status
    WHEN 'approved'          THEN 0
    WHEN 'adopted'           THEN 0
    WHEN 'partially_adopted' THEN 1
    WHEN 'rejected'          THEN 2
    WHEN 'plenary_session'   THEN 3
    WHEN 'in_committee'      THEN 4
    WHEN 'submitted'         THEN 5
    WHEN 'preparing'         THEN 6
  END
) STORED;
CREATE INDEX idx_bills_status_order ON bills(status_order);

-- ----------------------------------------
-- 6. diet_sessions → council_sessions リネーム + 関連カラム/インデックス
-- ----------------------------------------
ALTER TABLE diet_sessions RENAME TO council_sessions;
ALTER TABLE council_sessions RENAME COLUMN shugiin_url TO council_url;
ALTER TABLE bills RENAME COLUMN diet_session_id TO council_session_id;

ALTER INDEX IF EXISTS idx_bills_diet_session_id RENAME TO idx_bills_council_session_id;
ALTER INDEX IF EXISTS idx_diet_sessions_date_range RENAME TO idx_council_sessions_date_range;

-- set_active_diet_session → set_active_council_session
DROP FUNCTION IF EXISTS set_active_diet_session(uuid);
CREATE OR REPLACE FUNCTION set_active_council_session(target_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE council_sessions
  SET is_active = (id = target_session_id)
  WHERE id IS NOT NULL;
END;
$$;

-- end_date を nullable に（地方議会では会期途中で end_date が決まらない場合がある）
ALTER TABLE council_sessions ALTER COLUMN end_date DROP NOT NULL;

-- ----------------------------------------
-- 7. mirai_stances テーブルを削除
--    地方議会では「会派ごとの賛否」を faction_stances で扱うため、特定政党専用
--    の mirai_stances は不要。
-- ----------------------------------------
DROP TABLE IF EXISTS mirai_stances;

-- ----------------------------------------
-- 8. 委員会マスター
-- ----------------------------------------
CREATE TABLE committees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_committees_updated_at
    BEFORE UPDATE ON committees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE bills ADD COLUMN committee_id UUID REFERENCES committees(id);
CREATE INDEX idx_bills_committee_id ON bills(committee_id);

-- ----------------------------------------
-- 9. 会派マスター（alternative_names で議事録上の正式名と紐付け可能）
-- ----------------------------------------
CREATE TABLE factions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    alternative_names TEXT[] NOT NULL DEFAULT '{}',
    logo_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_factions_updated_at
    BEFORE UPDATE ON factions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- 10. 会派見解（1議案に複数会派の賛否を登録可能）
-- ----------------------------------------
CREATE TABLE faction_stances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    faction_id UUID NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
    type stance_type_enum NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(bill_id, faction_id)
);
ALTER TABLE faction_stances ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_faction_stances_bill_id ON faction_stances(bill_id);
CREATE INDEX idx_faction_stances_faction_id ON faction_stances(faction_id);
CREATE TRIGGER set_faction_stances_updated_at
    BEFORE UPDATE ON faction_stances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- 11. bills.bill_number（議案番号、TEXT）と部分一意制約
--     例: "第42号議案"、"報告第1号"、"意見書案第3号"
--     空文字は重複OKにするため WHERE 句で部分一意化
-- ----------------------------------------
ALTER TABLE bills ADD COLUMN bill_number TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX bills_bill_number_unique_idx
ON bills (bill_number)
WHERE bill_number IS NOT NULL AND bill_number <> '';
