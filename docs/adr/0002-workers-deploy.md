# ADR 0002: Cloudflare Workers デプロイと IaC

- ステータス: 提案（apps/api 分は実装済み・未デプロイ）
- 日付: 2026-07-06
- 関連: [TARGET_ARCHITECTURE.md](../TARGET_ARCHITECTURE.md) §1 / §5 / §0.5-4、[ADR 0001](./0001-current-state.md) Phase 5

## 背景

新スタック（apps/api = Hono、apps/web = TanStack Start SSR）を Cloudflare Workers 上で並走させ、プレビュードメインで検証してから本番へカットオーバーする。現行 Cloud Run（web/admin）はカットオーバーまで無変更で残す。

## 決定

### 1. ランタイム構成: api と web を別 Worker にする
- **api Worker**（`mirai-gikai-api`）: Hono。DB アクセスを担う。
- **web Worker**（`mirai-gikai-web`、次段）: TanStack Start の SSR。
- 1 Worker に混ぜない。理由: 独立デプロイ・独立スケール、責務分離（web は SSR とアセット、api は DB）、`apps/web` から `apps/api` へは型のみ依存（TARGET §6）という境界をランタイムでも保つ。

### 2. 同一ドメイン・パスルーティング
プレビュー/本番ゾーン（例 `ota-preview.example.jp`）で:
- `…/api/*` → **api Worker**
- `…/*`（それ以外） → **web Worker**

これにより、ブラウザからは相対 `/api` が同一オリジンで api に届く（`apps/web/lib/api.ts` のブラウザ相対パスが機能し、匿名クッキー `mg_anon` も同一オリジンで一貫する）。SSR ローダーはサーバー内部 URL（`API_URL_INTERNAL`、web Worker → api Worker の Service Binding もしくは内部ホスト）で api を叩く。

### 3. DB 接続: Hyperdrive 経由
- Workers から Postgres への直 TCP を避け、**Hyperdrive**（接続プール + キャッシュ）を経由する。
- 接続先は **Supabase の pooler（Supavisor）session mode**。Hyperdrive がさらにプールするため、`postgres.js` は `prepare: false`（既定・実装済み。Supavisor 互換）。
- Worker エントリ（`apps/api/src/worker.ts`）が `env.HYPERDRIVE.connectionString` を `setDbConnectionString()` に橋渡しするだけで、ルート/ハンドラは Node 版と同一コードで動く。**公開境界の3ロール（`SET LOCAL ROLE`）はそのまま機能する。**

### 4. 設定・機密の供給
- DB 以外の設定（`ANON_COOKIE_SECRET` / `GEMINI_API_KEY` / `CHAT_*` / `NODE_ENV`）は `nodejs_compat` により wrangler の vars/secrets が `process.env` に供給される。コードの追加橋渡しは不要。
- 機密（`ANON_COOKIE_SECRET`、`GEMINI_API_KEY`）は `wrangler secret put`。非機密は `wrangler.jsonc` の `vars`。

### 5. IaC（次段）
- Workers / Hyperdrive / Routes / DNS / secrets を **Terraform**（`cloudflare` provider）で管理する。当面は `wrangler.jsonc` をソース・オブ・トゥルースにし、Terraform 化は段階的に進める（TARGET §0.5-4「テキストの外に真実を置かない」の到達点）。
- `wrangler secret` の値は Terraform state に置かない（`wrangler secret put` を手順として残す）。

## 段階（この ADR に紐づく PR）
1. **apps/api の Workers 化**（本 PR）: worker エントリ / Hyperdrive 橋渡し / `wrangler.jsonc`。`wrangler deploy --dry-run` でバンドル成功を確認済み。
2. **apps/web の Workers 化**（次 PR）: TanStack Start の Cloudflare ターゲット、`wrangler.jsonc`、Service Binding or 内部 URL 設定。
3. **Terraform + DNS + Routes**（次 PR）: プレビュードメイン確定、`infra/` に定義。デプロイ後スモーク（`E2E_BASE_URL` 指定の Playwright）を接続。

## デプロイ手順（apps/api・ユーザーが手元で実行）

> 実リソース作成・認証・DNS はアカウント操作を伴うため、以下はユーザーが実行する。

```bash
# 0. 認証
npx wrangler login

# 1. Hyperdrive を作成（Supabase の pooler session-mode 接続文字列を登録）
#    Supabase ダッシュボード → Project Settings → Database → Connection string → "Session pooler"
npx wrangler hyperdrive create mirai-gikai-db \
  --connection-string="postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres"
#    → 出力された id を apps/api/wrangler.jsonc の hyperdrive[0].id に設定

# 2. 機密を登録
cd apps/api
npx wrangler secret put ANON_COOKIE_SECRET   # openssl rand -hex 32 等で生成した値
npx wrangler secret put GEMINI_API_KEY        # 公開チャット用（コスト天井を効かせる）
#    CHAT_* の上限を既定から変える場合は vars か secret で

# 3. デプロイ
pnpm --filter api deploy

# 4. Routes（ダッシュボード or 次段の Terraform）で
#    <preview-zone>/api/* を mirai-gikai-api にルーティング
```

### ローカルでの Workers ランタイム確認（任意）
```bash
# ローカル Supabase(:54432) を localConnectionString で参照して workerd で起動
cd apps/api && npx wrangler dev
```

## 検証（この PR 時点）
- `wrangler deploy --dry-run`: バンドル成功（2.5 MiB / gzip 452 KiB）。`postgres.js` / Hono / Drizzle が `nodejs_compat` で Workers 向けにビルド可能。
- `apps/api` typecheck 緑（`@cloudflare/workers-types` 追加）。
- 既存の Node dev（`pnpm --filter api dev`）と統合テストは無変更で維持（`setDbConnectionString` は Workers エントリからのみ呼ばれる）。

## 却下・保留した選択肢
- **api/web を1 Worker に統合**: デプロイ単純化の利はあるが、責務・スケール・型のみ依存境界が曖昧になるため却下。
- **Workers から Postgres 直 TCP（Hyperdrive なし）**: 接続確立コストとプール枯渇のリスク。Hyperdrive を採用。
- **Neon への即時移行**（TARGET §1 の将来形）: 移行リスクを増やすだけなので保留（Phase 5 で別 ADR）。Hyperdrive + 素の Postgres 扱いを貫いていれば載せ替え可能。
