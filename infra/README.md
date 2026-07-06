# infra — Cloudflare インフラ定義（Terraform）

みらい議会のインフラを管理する。設計は [ADR 0003](../docs/adr/0003-iac-terraform.md)、
デプロイ全体像は [ADR 0002](../docs/adr/0002-workers-deploy.md) を参照。

## 管理範囲
- **Terraform（ここ）**: Hyperdrive（DB 接続プール）、独自ドメイン移行時の Routes/DNS。
- **Terraform 管理外**: Worker スクリプト本体（`wrangler deploy`）、secrets（`wrangler secret put`）。

## 使い方
```bash
cp terraform.tfvars.example terraform.tfvars   # 値を記入
export TF_VAR_cloudflare_api_token="..."        # Workers/Hyperdrive 編集権限のトークン
export TF_VAR_supabase_db_password="..."

terraform init
terraform plan
terraform apply
terraform output hyperdrive_id                  # apps/api/wrangler.jsonc に設定
```

## 変数
| 変数 | 説明 |
|---|---|
| `cloudflare_api_token` | Cloudflare API トークン（`TF_VAR_` 環境変数推奨） |
| `cloudflare_account_id` | アカウント ID |
| `supabase_db_host` / `_user` / `_password` | Supabase pooler(session mode) の接続情報 |
| `custom_domain_enabled` | 独自ドメインで Routes/DNS を作るか（workers.dev 先行では `false`） |
| `zone_id` / `preview_hostname` | 独自ドメイン移行時に必要 |

## 注意
- `terraform.tfvars` と `*.tfstate` は **gitignore**（機密・状態）。
- `state` はローカル。R2 バックエンドへの移行は必要時に（ADR 0003）。
