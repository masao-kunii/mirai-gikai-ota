# ADR 0001: 現状調査と移行提案（Phase 0）

- ステータス: レビュー待ち
- 日付: 2026-07-03
- 関連: [TARGET_ARCHITECTURE.md](../TARGET_ARCHITECTURE.md) §12 Phase 0

## 背景

目標アーキテクチャ（以下「本書」）への移行に先立ち、現状のスタック・公開境界の実態・認証・パイプラインを記録し、本書とのギャップとリスク順の移行提案をまとめる。本 ADR の事実は 2026-07-03 時点のコードベース（`ota/develop`）と本番環境の調査に基づく。

## 1. 現状スタック

| レイヤ | 現状 |
|---|---|
| モノレポ | pnpm workspace: `web/`（公開・Next.js 15 App Router）, `admin/`（管理・Next.js 15 App Router）, `packages/{supabase,shared,seed}`, `tests/{supabase,mcp}` |
| DB アクセス | supabase-js + 生成型（`packages/supabase/types/supabase.types.ts`）。ORM なし |
| AI | Vertex AI Gemini（ADC）+ Gemini Developer API（公開チャット用 `gemini3_1_flash_lite`）。AI SDK 経由。モデルは論理名 `AI_MODELS.{flash,pro,flash_lite,gemini3_1_flash_lite}` に集約済み（PR #25） |
| AI 観測 | Langfuse（プロンプト管理・トレース）+ `chat_usage_events`（コスト記録） |
| lint/format | Biome。pre-commit（lint-staged + simple-git-hooks） |
| テスト | Vitest（unit + integration）、Playwright（E2E smoke） |
| Node | 22（`.nvmrc`） |

### デプロイ・インフラ

| 要素 | 現状 |
|---|---|
| 実行環境 | Cloud Run（asia-northeast1, GCP project `mirai-gikai-ota`）に web / admin の2サービス |
| デプロイ | **手動** `gcloud builds submit --config cloudbuild.{web,admin}.yaml`。CD なし |
| 前段 | web: Cloudflare CDN/WAF。admin: Cloud IAP（Google, `app.masao-kunii.jp` org） |
| DB | Supabase Cloud（prod ref `sqjoswnprerzdkhcneni`）。マイグレーションの本番適用はユーザーが手動実行 |
| IaC | **なし**。GCP/Cloudflare/Supabase の設定はダッシュボード・gcloud 手動（本書 §0.5-4 違反状態） |
| 定期実行 | GitHub Actions `sync_teirei.yml`（daily 01:38 UTC ≈ 10:38 JST） |

## 2. 公開境界の実態（本書 §3 との対比・最重要）

- **RLS**: 全テーブルで有効・**ポリシーなし**（= default deny）。anon/authenticated キーからの直接読み書きは全テーブルで不可（integration テスト `rls/default-deny.test.ts` で検証済み）。
- **サーバ側は service_role 一本**: 全読み書きが `createAdminClient()`（`SUPABASE_SECRET_KEY`、RLS 全バイパス）経由。GRANT は migration `20260624170000` で管理。
- **draft 除外はアプリ層 WHERE のみ**: 公開クエリの `publish_status = 'published'` フィルタはリポジトリ層の手書き。**単層防御**であり、フィルタ漏れ = draft 誤公開が構造的に可能（本書が3ロール分離で解消しようとしている核心）。
- **ブラウザへの anon キー露出**: 3用途のみ。(a) web チャット/interview の匿名認証 `signInAnonymously`、(b) admin の Google ログイン、(c) admin サムネイルの Storage 直接アップロード（`bill-thumbnails` バケット）。DB 直クエリには使われていない（default deny のため事実上不可能）。
- **preview_tokens**: draft 議案の限定共有はトークン方式で実装済み。

**評価**: 「公開データはすべてサーバ経由」という本書の前提構造は実は既に成立している。欠けているのは DB 側の多重防御（ロール分離・公開ポリシー）のみ。

## 3. 認証・セッションの現状

| 主体 | 現状 | 本書の目標 |
|---|---|---|
| 管理者 | 2段: Cloud IAP（前段）+ Supabase Auth Google ログイン（`@app.masao-kunii.jp` → `apply_admin_role_if_eligible` で admin ロール付与） | Cloudflare Access 1段 + JWT 検証ミドルウェア |
| 住民 | Supabase 匿名認証（`signInAnonymously`）。チャット・interview・レート制限（`rate_limit_counters` + DB 関数）の主体 | 署名付き匿名 ID クッキー |
| セッション | Supabase Auth クッキー。web/admin 両方に `middleware.ts`（セッションリフレッシュ） | 管理者: Access に委譲 / 住民: ステートレス署名クッキー |

## 4. データとパイプライン

### テーブルの3階級分類（本書 §2.1 の分類を現行スキーマに適用）

| 階級 | テーブル |
|---|---|
| 公開データ | bills, bill_contents, council_sessions, factions, faction_stances, committees, tags, bills_tags（各 published 条件付き）、公開済み interview_report, topic_analysis_*（公開機能は未実装） |
| 未公開データ | draft の bills/bill_contents、council_session_minutes、preview_tokens、ai-collection 系の実行履歴 |
| 住民の声（個人スコープ） | interview_sessions/messages/rating_feedbacks、chats、report_reactions、expert_registrations、rate_limit_counters、chat_usage_events |

### sync パイプライン

- `sync_teirei.yml`（GH Actions cron）→ `import-teirei-cloud.ts` → `parse-teirei-pages.ts`（**大田区固有パーサ**）→ 冪等 upsert。令和8年第1回・第2回を毎日再取込。
- AI 平易化は別ステップ（`enrich-bill-summaries.ts`、手動・Vertex）。事実と生成の分離は既に実践されている（bills = 事実 / bill_contents = AI 生成）。
- **ギャップ**: (a) 取得した HTML/PDF のソース保存なし（区サイト改編時に再処理不能）(b) 照合失敗は警告ログのみで**通知なし**（補聴器条例の会派見解欠落が3週間潜伏した実績。PR #26 で修正したが、検出の仕組み自体は未整備）。

### interview サブシステム

温存決定済み（削除しない）。本番データ 0 件。可視化（topic-analysis の公開）は実施決定時に着手。

## 5. Next.js 固有依存の棚卸し（移行コストの実態）

| 依存 | 規模 | 移行時の対応 |
|---|---|---|
| `unstable_cache` / `revalidateTag` / `revalidatePath` | **49 ファイル** | 最大のマジック依存。admin → web への revalidate POST 連携も含む。TanStack Start + CDN 明示キャッシュへ設計置換（機械置換不可） |
| Server Actions（`"use server"`） | **55 ファイル** | Hono RPC のドメイン別ルートへ移植 |
| Route Handlers | web 5 + admin 11 | 同上（chat SSE、OGP、MCP、topic-analysis、ai-collection 等） |
| OGP 動的生成 | `/api/og/report`（ImageResponse） | Workers 上の OG 画像生成（satori 等）へ |
| `next/image` | 34 ファイル | Cloudflare Images/自前最適化 or `<img>` + CDN へ |
| `middleware.ts` | web/admin 各1 | 認証方式変更（§3）に伴い消滅見込み |

## 6. テスト・CI 資産（Phase 1 の土台。すべて維持する）

- integration: tests/supabase **134** + tests/mcp **38** + web **93**（ローカル Supabase、CI 常設・Node 22）
- unit: web **753** / admin **470** / shared **44**
- E2E: Playwright smoke **7**（ローカル/本番 URL 両対応）
- TS strict: 全 workspace で有効。**`noUncheckedIndexedAccess` は未設定**
- 境界を強制するカスタム lint はなし

## 7. ギャップ一覧（リスク順）

| # | 領域 | 現状 | 目標 | 放置リスク |
|---|---|---|---|---|
| 1 | 公開境界 | service_role 一本 + アプリ層 WHERE 単層 | 3ロール分離 + 公開 RLS + 漏洩テスト | **高**: フィルタ漏れ1つで draft/住民の声が公開応答に乗る |
| 2 | パイプライン監視 | 警告はログのみ・通知なし | 警告通知 + ソース保存 | **高**: 静かな欠落の再発（実績あり） |
| 3 | IaC | なし（手動設定） | wrangler + Terraform | 中: 再現不能インフラ。事故時の復旧が記憶頼み |
| 4 | フロント | Next.js App Router ×2（キャッシュ依存 49 ファイル） | TanStack Start + SPA | 中: マジック起因の不具合・AI 作業効率の低下が継続 |
| 5 | API | Server Actions 55 + Route Handlers 16 が散在 | Hono RPC ドメイン分割 | 中: 契約が暗黙的で検証器が効かない |
| 6 | 認証 | IAP + Supabase Auth の2段 + 匿名認証 | CF Access + 署名クッキー | 低〜中: 動いてはいる。複雑さが移行の足かせ |
| 7 | DB アクセス | supabase-js + 生成型 | Drizzle | 低: 動くが、RLS/ロールの宣言的管理ができない |
| 8 | 型の厳しさ | `noUncheckedIndexedAccess` 未設定 | 有効 | 低 |
| 9 | AI コスト | 記録のみ・上限アラートなし | 月次上限アラート | 低（現状トラフィック小） |

## 8. 決定: リスク順の移行提案

本書 §12 の Phase 構成を、上記ギャップに対応づけて具体化する。**#1 と #2 を先に潰す**のが方針（フルリライトの完了を待たずに、現行アプリのまま多重防御と監視を得る）。

### Phase 1（検証器・挙動不変）— 直近
1. sync 警告の**通知化**（実行サマリに警告件数、警告>0 で GitHub Actions を可視的に失敗 or 通知）← ギャップ#2 の前半。小さく即効
2. `noUncheckedIndexedAccess` の段階有効化（packages → web/admin）
3. AI 月次コストチェックを CI/cron に追加

### Phase 2（公開境界・現行アプリは無変更）
4. `public_reader` / `resident_writer` / `app_admin` ロールと公開 RLS ポリシーをマイグレーションで導入。**現行アプリは service_role のまま動かし続け**、DB 側の防御だけ先に足す
5. 公開境界漏洩テストを CI に常設（スキーマからテーブル機械列挙 + 3階級の分類宣言）
   - 検証事項: Supabase pooler 経由のカスタムロール接続の可否・接続文字列形式（実装時に確認し、本 ADR に追記）

### Phase 3 以降（新築の開始）
6. `packages/db`（Drizzle introspect、スキーマ変更なし）→ `apps/api`（Hono・公開読み取り + chat SSE）→ `apps/web`（TanStack Start）。プレビュードメイン並走 → E2E 合格 → DNS 切替
7. ソース HTML/PDF の R2 保存（ギャップ#2 後半）は pipeline 移植（Phase 4）に含める
8. IaC（ギャップ#3）は新規リソース（Workers/R2/Access）から適用開始し、既存 GCP は Phase 5 の縮退時に Terraform 化 or 廃止

### やらないこと（再確認）
- マルチ自治体対応・organization_id 導入（本書 §7）
- interview の可視化実装（実施決定まで凍結。ただし Phase 2 のロール分離では住民の声テーブルを resident_writer スコープに含めて設計する）

## 帰結

- 上記 Phase 1（項目 1〜3）は独立した小 PR として即着手可能。
- Phase 2 の RLS 設計は、現行スキーマの3階級分類（§4）をそのまま宣言に落とす。
- 本 ADR の承認をもって Phase 0 完了とする。
