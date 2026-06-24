-- service_role(Secret Key)に public スキーマの全オブジェクトへの権限を付与する。
--
-- 本プロジェクトは RLS 有効・ポリシー無しで、データアクセスは createAdminClient()
-- (service_role)に一本化している(AGENTS.md「RLSとアクセスパターン」参照)。
-- service_role は RLS をバイパスするが、テーブル等への GRANT は別途必要。
-- ローカル/本番では手動で付与済みだが、新規DB(CI 等)でも再現できるよう
-- マイグレーションとして明文化する。GRANT/ALTER DEFAULT PRIVILEGES は冪等。

GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 今後 migration で作成されるオブジェクトにも自動付与する。
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
