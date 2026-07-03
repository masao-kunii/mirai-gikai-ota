-- ----------------------------------------
-- 公開境界のロール分離と RLS ポリシー（TARGET_ARCHITECTURE §3 / ADR 0001 Phase 2）
--
-- 守るべき境界は「公開データ / 未公開データ / 住民の声」の3階級。
-- DB 接続ロールを分離し、公開系の接続からは未公開データへ構造的に
-- 到達できなくする（多重防御の DB 層）。
--
--   public_reader   : 公開データのみ SELECT（行条件は各ポリシー）
--   resident_writer : 住民の声テーブルのみ、自分（app.anon_id）の行を読み書き
--   app_admin       : 全テーブル読み書き（管理 API・パイプライン用。RLS は適用される）
--
-- 現行アプリは service_role（BYPASSRLS）のまま動作し、本マイグレーションの
-- 影響を受けない。新ロールは今後の apps/api（Hono）から使用する。
--
-- 備考:
-- - FORCE ROW LEVEL SECURITY は付与しない。テーブルオーナー（postgres 系）は
--   スーパーユーザー相当で FORCE の効果が無く、新ロールはオーナーでないため
--   通常の ENABLE だけで RLS が適用される。
-- - bills.knowledge_source は AI 用の内部参照資料で公開対象外のため、
--   public_reader にはカラムレベル GRANT で読ませない
--   （公開系コードは SELECT * ではなく明示的なカラム指定を強制される）。
-- - 新テーブルを追加する際は、tests/supabase/public-boundary/classification.ts の
--   分類宣言と、本ファイルと同様の GRANT / ポリシーを必ず追加すること
--   （追加漏れは integration test が検出する）。
-- ----------------------------------------

-- 1. ロール作成（ロールはクラスタ共有のため存在チェック付き）
do $$
begin
  if not exists (select from pg_roles where rolname = 'public_reader') then
    create role public_reader nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'resident_writer') then
    create role resident_writer nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'app_admin') then
    create role app_admin nologin;
  end if;
end $$;

grant usage on schema public to public_reader, resident_writer, app_admin;

-- マイグレーション実行ロール（postgres）が SET ROLE で各ロールとして
-- 振る舞えるようにする（漏洩テスト・運用調査のため）
grant public_reader, resident_writer, app_admin to postgres;

-- ----------------------------------------
-- 2. app_admin: 全テーブル・シーケンス・関数
-- （行アクセスは各テーブルの app_admin_all ポリシーで許可する）
-- ----------------------------------------
grant all privileges on all tables in schema public to app_admin;
grant all privileges on all sequences in schema public to app_admin;
grant execute on all functions in schema public to app_admin;
alter default privileges in schema public grant all on tables to app_admin;
alter default privileges in schema public grant all on sequences to app_admin;
alter default privileges in schema public grant execute on functions to app_admin;

create policy app_admin_all on bill_contents for all to app_admin using (true) with check (true);
create policy app_admin_all on bills for all to app_admin using (true) with check (true);
create policy app_admin_all on bills_tags for all to app_admin using (true) with check (true);
create policy app_admin_all on chat_usage_events for all to app_admin using (true) with check (true);
create policy app_admin_all on chats for all to app_admin using (true) with check (true);
create policy app_admin_all on committees for all to app_admin using (true) with check (true);
create policy app_admin_all on council_session_minutes for all to app_admin using (true) with check (true);
create policy app_admin_all on council_sessions for all to app_admin using (true) with check (true);
create policy app_admin_all on expert_registrations for all to app_admin using (true) with check (true);
create policy app_admin_all on faction_stances for all to app_admin using (true) with check (true);
create policy app_admin_all on factions for all to app_admin using (true) with check (true);
create policy app_admin_all on interview_configs for all to app_admin using (true) with check (true);
create policy app_admin_all on interview_messages for all to app_admin using (true) with check (true);
create policy app_admin_all on interview_questions for all to app_admin using (true) with check (true);
create policy app_admin_all on interview_rating_feedbacks for all to app_admin using (true) with check (true);
create policy app_admin_all on interview_report for all to app_admin using (true) with check (true);
create policy app_admin_all on interview_sessions for all to app_admin using (true) with check (true);
create policy app_admin_all on preview_tokens for all to app_admin using (true) with check (true);
create policy app_admin_all on rate_limit_counters for all to app_admin using (true) with check (true);
create policy app_admin_all on report_reactions for all to app_admin using (true) with check (true);
create policy app_admin_all on tags for all to app_admin using (true) with check (true);
create policy app_admin_all on topic_analysis_classifications for all to app_admin using (true) with check (true);
create policy app_admin_all on topic_analysis_topics for all to app_admin using (true) with check (true);
create policy app_admin_all on topic_analysis_versions for all to app_admin using (true) with check (true);

-- ----------------------------------------
-- 3. public_reader: 公開データのみ SELECT
-- ----------------------------------------

-- 3.1 マスタデータ（無条件公開）
grant select on council_sessions, factions, committees, tags to public_reader;
create policy public_read on council_sessions for select to public_reader using (true);
create policy public_read on factions for select to public_reader using (true);
create policy public_read on committees for select to public_reader using (true);
create policy public_read on tags for select to public_reader using (true);

-- 3.2 議案（published と coming_soon のみ。knowledge_source カラムは除外）
grant select (
  id, name, status, status_note, published_at, created_at, updated_at,
  thumbnail_url, publish_status, is_featured, share_thumbnail_url,
  council_session_id, publish_status_order, is_review_completed,
  submitted_date, slug, use_knowledge_source_in_chat, status_order,
  committee_id, bill_number, proposal_type
) on bills to public_reader;
create policy public_read on bills for select to public_reader
  using (publish_status in ('published', 'coming_soon'));

-- 3.3 議案の従属データ（published な議案のもののみ。
--      bills_tags は coming_soon のティザーカードでも使うため coming_soon を含む）
grant select on bill_contents to public_reader;
create policy public_read on bill_contents for select to public_reader
  using (exists (
    select 1 from bills b
    where b.id = bill_contents.bill_id and b.publish_status = 'published'
  ));

grant select on bills_tags to public_reader;
create policy public_read on bills_tags for select to public_reader
  using (exists (
    select 1 from bills b
    where b.id = bills_tags.bill_id
      and b.publish_status in ('published', 'coming_soon')
  ));

grant select on faction_stances to public_reader;
create policy public_read on faction_stances for select to public_reader
  using (exists (
    select 1 from bills b
    where b.id = faction_stances.bill_id and b.publish_status = 'published'
  ));

-- 3.4 インタビュー設定（published な議案の LP 表示用）
grant select on interview_configs to public_reader;
create policy public_read on interview_configs for select to public_reader
  using (exists (
    select 1 from bills b
    where b.id = interview_configs.bill_id and b.publish_status = 'published'
  ));

grant select on interview_questions to public_reader;
create policy public_read on interview_questions for select to public_reader
  using (exists (
    select 1 from interview_configs c
    join bills b on b.id = c.bill_id
    where c.id = interview_questions.interview_config_id
      and b.publish_status = 'published'
  ));

-- 3.5 公開レポート（本人同意 AND 管理側公開判定）とそのチャットログ
grant select on interview_report to public_reader;
create policy public_read on interview_report for select to public_reader
  using (is_public_by_admin and is_public_by_user);

grant select on interview_sessions to public_reader;
create policy public_read on interview_sessions for select to public_reader
  using (exists (
    select 1 from interview_report r
    where r.interview_session_id = interview_sessions.id
      and r.is_public_by_admin and r.is_public_by_user
  ));

grant select on interview_messages to public_reader;
create policy public_read on interview_messages for select to public_reader
  using (exists (
    select 1 from interview_report r
    where r.interview_session_id = interview_messages.interview_session_id
      and r.is_public_by_admin and r.is_public_by_user
  ));

-- ----------------------------------------
-- 4. resident_writer: 住民の声（自分の行のみ）
--
-- 行スコープは app.anon_id（新 API がトランザクション毎に
-- set_config('app.anon_id', <匿名ID>, true) で注入する。TARGET_ARCHITECTURE §3.2）。
-- current_setting(..., true) は未設定時に NULL/空文字を返すため NULLIF で吸収し、
-- 未注入の接続では何も読めない・書けない。
-- ----------------------------------------

grant select, insert, update on interview_sessions to resident_writer;
create policy resident_own on interview_sessions for all to resident_writer
  using (user_id = nullif(current_setting('app.anon_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.anon_id', true), '')::uuid);

grant select, insert on interview_messages to resident_writer;
create policy resident_own on interview_messages for all to resident_writer
  using (exists (
    select 1 from interview_sessions s
    where s.id = interview_messages.interview_session_id
      and s.user_id = nullif(current_setting('app.anon_id', true), '')::uuid
  ))
  with check (exists (
    select 1 from interview_sessions s
    where s.id = interview_messages.interview_session_id
      and s.user_id = nullif(current_setting('app.anon_id', true), '')::uuid
  ));

grant select, insert on interview_rating_feedbacks to resident_writer;
create policy resident_own on interview_rating_feedbacks for all to resident_writer
  using (exists (
    select 1 from interview_sessions s
    where s.id = interview_rating_feedbacks.interview_session_id
      and s.user_id = nullif(current_setting('app.anon_id', true), '')::uuid
  ))
  with check (exists (
    select 1 from interview_sessions s
    where s.id = interview_rating_feedbacks.interview_session_id
      and s.user_id = nullif(current_setting('app.anon_id', true), '')::uuid
  ));

grant select, insert on chats to resident_writer;
create policy resident_own on chats for all to resident_writer
  using (user_id = nullif(current_setting('app.anon_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.anon_id', true), '')::uuid);

grant select, insert, delete on report_reactions to resident_writer;
create policy resident_own on report_reactions for all to resident_writer
  using (user_id = nullif(current_setting('app.anon_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.anon_id', true), '')::uuid);
