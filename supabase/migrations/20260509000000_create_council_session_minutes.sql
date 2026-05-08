-- 議事録（会議録）テーブル
-- 1つの定例会（council_session）の中で開催される複数の本会議それぞれに
-- 紐づく議事録PDFと、markitdown 等で抽出した markdown 全文を保持する。

CREATE TABLE council_session_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    council_session_id UUID NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL,
    -- 第N日（任意。一括取り込み時に未取得の場合は NULL）
    day_number INTEGER,
    -- 表示用タイトル（例: "令和8年第1回定例会（第5日）"）
    title TEXT,
    -- 元PDFのURL（区公式サイトの speed-up 版URL等）
    source_pdf_url TEXT NOT NULL,
    -- markitdown 等で抽出した markdown 本文（未抽出時は NULL）
    markdown_text TEXT,
    -- markdown_text を抽出/更新した時刻
    extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 同じセッション内で同じ日付の議事録は1つだけ
    UNIQUE(council_session_id, meeting_date)
);

ALTER TABLE council_session_minutes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_council_session_minutes_session_id
    ON council_session_minutes(council_session_id);
CREATE INDEX idx_council_session_minutes_meeting_date
    ON council_session_minutes(meeting_date DESC);

CREATE TRIGGER set_council_session_minutes_updated_at
    BEFORE UPDATE ON council_session_minutes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
