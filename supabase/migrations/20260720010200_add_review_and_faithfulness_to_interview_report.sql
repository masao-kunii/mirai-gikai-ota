-- インタビュー意見の公開に「承認ワークフロー」を導入する。
-- 事前同意で収集したレポートを、LLM モデレーション（基準＝カテゴリ）と
-- 要約忠実性チェックにかけ、いずれかに引っ掛かったものは自動公開せず
-- 「承認待ち（pending）」として人手レビューに回す。すべてクリアしたものだけ
-- 自動公開（auto_approved）する。

-- 公開承認の状態
create type report_review_status_enum as enum (
  'auto_approved', -- すべてのチェックを通過し自動公開
  'pending',       -- いずれかに引っ掛かり、人手の承認待ち（非公開）
  'approved',      -- 人手で承認（公開）
  'rejected'       -- 人手で却下（非公開・終了）
);

alter table interview_report
  -- 承認状態。既存行は下で is_public_by_admin から補正する。
  add column review_status report_review_status_enum not null default 'pending',
  -- モデレーションで検出した該当カテゴリのキー配列（空/なし＝問題なし）。
  add column moderation_categories jsonb,
  -- 要約・意見が対話ログに忠実か（LLM 判定）。false は承認待ちへ回す。
  add column faithfulness_ok boolean,
  -- 忠実性判定の根拠。
  add column faithfulness_reasoning text;

-- 既存行の補正: 既に公開済み(admin=true)は「承認済み」、それ以外は「承認待ち」。
update interview_report
  set review_status = case
    when is_public_by_admin then 'approved'::report_review_status_enum
    else 'pending'::report_review_status_enum
  end;

-- 承認待ちキューの絞り込み用インデックス。
create index idx_interview_report_review_status
  on interview_report(review_status);

comment on column interview_report.review_status is
  '公開承認の状態: auto_approved=自動公開, pending=承認待ち(要人手), approved=人手承認, rejected=却下';
comment on column interview_report.moderation_categories is
  'モデレーションで検出した該当カテゴリのキー配列（空/なし＝問題なし）';
comment on column interview_report.faithfulness_ok is
  '要約・意見が対話ログに忠実か（LLM 判定）。false は承認待ちへ';
comment on column interview_report.faithfulness_reasoning is
  '忠実性判定の根拠（200文字以内）';
