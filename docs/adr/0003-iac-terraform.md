# ADR 0003: IaC（Terraform）とプレビュー環境の立ち上げ

- ステータス: 提案（定義は `terraform validate` 済み・未 apply）
- 日付: 2026-07-06
- 関連: [ADR 0002](./0002-workers-deploy.md)、[TARGET_ARCHITECTURE.md](../TARGET_ARCHITECTURE.md) §0.5-4 / §1

## 背景

Workers 化した api/web（ADR 0002）を実際に立ち上げる。まず **workers.dev サブドメイン**で先行し、独自ドメインは後から Routes/DNS を足す。インフラ設定はコードで管理する（TARGET §0.5-4「テキストの外に真実を置かない」）。

## 決定

### 1. Terraform と wrangler の分担
- **Terraform（`infra/`）**: Hyperdrive（DB 接続プール）、および独自ドメイン移行時の Routes/DNS。
- **wrangler**: Worker スクリプト本体のデプロイ（ビルド成果物のアップロードは wrangler が最適。Terraform で Worker script を持つと二重管理になるため管理外）。
- **secrets**（`ANON_COOKIE_SECRET` / `GEMINI_API_KEY`）: `wrangler secret put`。Terraform state には置かない。

### 2. workers.dev 先行
- `custom_domain_enabled = false`（既定）で Routes/DNS を作らず、`mirai-gikai-api.<account>.workers.dev` / `mirai-gikai-web.<account>.workers.dev` で先行する。
- 独自ドメインに移す時は `custom_domain_enabled = true` + `zone_id` / `preview_hostname` を設定して `apply`。

### 3. state
- ローカル state（`infra/*.tfstate`、gitignore）。一人運営の先行段階では十分。
- 複数環境・共同作業が必要になれば Cloudflare R2 バックエンドへ移行する（本 ADR を更新）。

### 4. 同一オリジン問題（重要・2c-2 で解消）
workers.dev では api/web が**別オリジン**になる。ブラウザからのチャット/詳細遷移は相対 `/api` を叩くため、そのままでは別オリジンの api に届かず、匿名クッキー（`SameSite=Lax`）も送られない。

→ **web Worker が `/api/*` を api Worker へプロキシ**して単一オリジンを保つ（次 PR 2c-2、`apps/web` の Nitro routeRules）。それまでは web の初回 SSR（`API_URL_INTERNAL` 経由）は動くが、ブラウザ側の SPA 遷移・チャットは api へ届かない。

## apply 手順（ユーザーが手元で実行）

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # account_id / supabase host,user を記入
export TF_VAR_cloudflare_api_token="<Cloudflare API Token>"    # Workers/Hyperdrive 編集権限
export TF_VAR_supabase_db_password="<Supabase DB password>"

terraform init
terraform plan
terraform apply
# → 出力 hyperdrive_id を apps/api/wrangler.jsonc の hyperdrive[0].id に設定
```

その後は ADR 0002 の「デプロイ手順」で api/web を `wrangler deploy`。

## デプロイ後スモーク
`apps/web` の Playwright は外部 URL に転用できる（`E2E_BASE_URL` 指定時は webServer を起動せずその URL を叩く）:
```bash
E2E_BASE_URL="https://mirai-gikai-web.<account>.workers.dev" pnpm --filter public-web test:e2e
```
※ 「詳細への SPA 遷移」まで通すには 2c-2（web の `/api` プロキシ）が前提。それ以前は初回 SSR ページの確認に留まる。

## 検証（この PR 時点）
- `terraform validate` 成功（cloudflare provider `~> 5.0` のリソース名・スキーマが妥当）。
- apply は未実行（実リソース・認証・課金はユーザー領域）。
