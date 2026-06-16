-- ----------------------------------------
-- AIチャットの回数レートリミット（固定ウィンドウ・カウンタ方式）
--
-- 公開チャット/インタビューの濫用（連打・並列フラッド）を防ぐため、
-- per-IP などのキー単位で「ウィンドウ秒あたり N 回」を制限する。
-- コスト上限（chat_usage_events 集計）はリクエスト完了後の集計でラグが
-- あるため、その前段で即時に弾く第一防御線として用いる。
--
-- アクセスは createAdminClient（Secret Key）経由の RPC のみ。RLS は有効化し
-- ポリシーは定義しない（デフォルト全拒否）。
-- ----------------------------------------

CREATE TABLE rate_limit_counters (
    bucket_key TEXT NOT NULL,
    window_started_at TIMESTAMPTZ NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket_key, window_started_at)
);

ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- 古いウィンドウの掃除用（保持期間外を効率的に削除するため）
CREATE INDEX idx_rate_limit_counters_window
    ON rate_limit_counters (window_started_at);

-- ----------------------------------------
-- check_rate_limit: 固定ウィンドウのカウンタを 1 増やし、上限内なら true。
--
-- 単一の UPSERT ... RETURNING で原子的にインクリメントするため、並列リクエスト
-- でもカウントが競合しない。ウィンドウは epoch を p_window_seconds で量子化する。
-- 同一キーの古いウィンドウ行は都度掃除して肥大化を防ぐ。
--
-- 返り値: true = 許可（上限内）、false = 拒否（上限超過）
-- ----------------------------------------
CREATE FUNCTION check_rate_limit(
    p_key TEXT,
    p_window_seconds INT,
    p_limit INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_window TIMESTAMPTZ := to_timestamp(
        floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
    );
    v_count INT;
BEGIN
    INSERT INTO rate_limit_counters (bucket_key, window_started_at, request_count)
    VALUES (p_key, v_window, 1)
    ON CONFLICT (bucket_key, window_started_at)
    DO UPDATE SET request_count = rate_limit_counters.request_count + 1
    RETURNING request_count INTO v_count;

    -- 同一キーの過去ウィンドウを掃除（肥大化防止）
    DELETE FROM rate_limit_counters
    WHERE bucket_key = p_key AND window_started_at < v_window;

    RETURN v_count <= p_limit;
END;
$$;
