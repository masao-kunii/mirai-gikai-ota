# infra — Cloudflare インフラ定義（Terraform）

みらい議会のインフラを管理する。設計は [ADR 0003](../docs/adr/0003-iac-terraform.md)、
デプロイ全体像は [ADR 0002](../docs/adr/0002-workers-deploy.md) を参照。

## 管理範囲
- **Terraform（ここ）**: Hyperdrive（DB 接続プール）、独自ドメイン移行時の Routes/DNS、
  **管理画面（apps/admin）のホストと Cloudflare Access**。
- **Terraform 管理外**: Worker スクリプト本体（`wrangler deploy`）、secrets（`wrangler secret put`）。

## 使い方
```bash
cp terraform.tfvars.example terraform.tfvars   # 値を記入
export TF_VAR_cloudflare_api_token="..."        # Workers/Hyperdrive/Access 編集権限のトークン
export TF_VAR_supabase_db_password="..."

terraform init
terraform plan
terraform apply
terraform output hyperdrive_id                  # apps/api/wrangler.jsonc に設定
```

## 管理画面（admin）の立ち上げ
`admin_enabled = true` にすると、管理画面のホストと Access 一式を作る
（詳細は [カットオーバー準備](../docs/20260801_0758_adminカットオーバー準備.md)）。

作られるもの:

| リソース | 役割 |
|---|---|
| `cloudflare_dns_record.admin` | 管理ホストの DNS（プロキシ ON のダミー AAAA） |
| `cloudflare_workers_route.admin_api` | `admin.<zone>/api/*` → `mirai-gikai-api` |
| `cloudflare_workers_route.admin_spa` | `admin.<zone>/*` → `mirai-gikai-admin` |
| `cloudflare_zero_trust_access_application.admin` | ホスト全体を保護する Access アプリ |
| `cloudflare_zero_trust_access_policy.admin` | 許可メール／メールドメインの allow ポリシー |

```bash
terraform apply

# apply 後: api に Access の検証情報を渡す（secrets は Terraform 管理外）
terraform output -raw admin_access_aud | npx wrangler secret put CF_ACCESS_AUD --cwd ../apps/api
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN --cwd ../apps/api  # https://<team>.cloudflareaccess.com

# SPA をデプロイ
pnpm --filter admin-web deploy
```

> **管理者の追加・削除は `admin_allowed_emails` / `admin_allowed_email_domains` を変更して apply する。**
> アプリ側に管理者テーブルは無く、この Access ポリシーが唯一の管理者管理（2026-08-01 決定）。

> ⚠️ Access は**管理ホストにだけ**掛ける。公開サイト側の `/api/*`（チャット・インタビュー）に
> 掛けると住民が使えなくなる。api Worker は共用でよい（`requireAdminAccess` は `/api/admin/*` のみに効く）。

## 変数
| 変数 | 説明 |
|---|---|
| `cloudflare_api_token` | Cloudflare API トークン（`TF_VAR_` 環境変数推奨） |
| `cloudflare_account_id` | アカウント ID |
| `supabase_db_host` / `_user` / `_password` | Supabase pooler(session mode) の接続情報 |
| `custom_domain_enabled` | 独自ドメインで Routes/DNS を作るか（workers.dev 先行では `false`） |
| `zone_id` / `preview_hostname` | 独自ドメイン移行時に必要 |
| `admin_enabled` | 管理画面のホスト・Routes・Access を作るか |
| `admin_hostname` | 管理画面のホスト名（例 `admin.example.jp`）。`zone_id` も必要 |
| `admin_allowed_emails` / `admin_allowed_email_domains` | **管理者の許可リスト**（どちらか一方でも可） |
| `admin_session_duration` | Access セッションの有効期間（既定 `24h`） |

## 出力
| 出力 | 用途 |
|---|---|
| `hyperdrive_id` | `apps/api/wrangler.jsonc` の `hyperdrive[0].id` |
| `admin_access_aud` | api の `CF_ACCESS_AUD`（`wrangler secret put`） |

## 注意
- `terraform.tfvars` と `*.tfstate` は **gitignore**（機密・状態）。
- `state` はローカル。R2 バックエンドへの移行は必要時に（ADR 0003）。
