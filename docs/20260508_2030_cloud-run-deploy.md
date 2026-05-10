# Cloud Run デプロイ手順

みらい議会ー大田区版を Vertex AI Gemini + Cloud Run で動かすための初期セットアップと
デプロイ手順をまとめる。

## 前提

- GCP プロジェクトと請求アカウントの紐付けが済んでいる
- `gcloud` CLI がインストール済み（`gcloud components install beta` も）
- Docker Desktop または Finch（macOS）でローカルビルド可能

## 1. GCP プロジェクトの初期設定

### 1-1. 必要な API を有効化

```bash
PROJECT_ID=mirai-gikai-ota         # 任意のプロジェクトID
REGION=asia-northeast1              # 東京（大田区ユーザーの近接）

gcloud config set project $PROJECT_ID
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com
```

### 1-2. Artifact Registry リポジトリ作成

```bash
gcloud artifacts repositories create mirai-gikai-ota \
  --repository-format=docker \
  --location=$REGION \
  --description="mirai-gikai-ota の Docker イメージ"
```

### 1-3. サービスアカウントを作成

```bash
# web 用
gcloud iam service-accounts create mirai-gikai-ota-web \
  --display-name="mirai-gikai-ota web (Cloud Run)"

# admin 用
gcloud iam service-accounts create mirai-gikai-ota-admin \
  --display-name="mirai-gikai-ota admin (Cloud Run)"
```

### 1-4. Vertex AI 権限を付与

```bash
for SA in mirai-gikai-ota-web mirai-gikai-ota-admin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
done
```

### 1-5. Supabase Cloud プロジェクトを作成

DB / Auth / Storage は Supabase Cloud（マネージド SaaS）を使う。Cloud Run と
Supabase Cloud は別 SaaS だが HTTPS で接続するだけなので統合は難しくない。

#### a. プロジェクト作成

1. https://app.supabase.com にログイン
2. New Project
   - Name: `mirai-gikai-ota`
   - Region: `Northeast Asia (Tokyo)` を選ぶ（Cloud Run と同リージョンで往復レイテンシ最小）
   - Database password は強固なものを生成（パスワード自体は使わないが復旧時に必要）
3. プロジェクト作成完了後、左メニュー > Settings > API から以下を控える:
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **service_role key**: `eyJ...`（Secret Manager に入れる）
   - **anon (public) key**: `eyJ...`（クライアント側、NEXT_PUBLIC で配布される）

#### b. ローカルから本番DBへ migration を適用

ローカルで開発した migration を Supabase Cloud に push する。

```bash
# Supabase CLI に Supabase Cloud をリンク
npx supabase link --project-ref <project-ref>
# DB password を聞かれるので a で設定したものを入力

# migration を全て適用（supabase/migrations/*.sql が順に流れる）
npx supabase db push

# 適用後、本番DBから型を再生成しておく（任意）
npx supabase gen types typescript --project-id <project-ref> \
  > packages/supabase/types/supabase.types.production.ts
```

#### c. 本番用初期データの投入（任意）

`pnpm seed` のローカル開発用データはサンプル議案・テストインタビューを含む
ため**本番には投入しない**。本番投入が必要なのは下記の「マスターデータ」のみ:

- `factions`（11会派）
- `committees`（6委員会）
- `tags`（3タグ）
- 最初の `council_session`（現在の定例会）

これらを `packages/seed/main/data.ts` から抜粋した最小スクリプトを書くか、
admin UI（/factions, /committees, /tags, /council-sessions）から手動で
登録する。

#### d. 管理者ユーザーの作成

Supabase Cloud 上で:

1. Authentication > Users > Add User > Create new user
   - Email: 管理者のメール
   - Password: 任意（後でパスワードリセットも可）
   - Auto Confirm User: ON
2. SQL Editor で以下を実行して admin role を付与:
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = raw_app_meta_data || '{"roles": ["admin"]}'::jsonb
   WHERE email = '<上で作成したメール>';
   ```

### 1-6. Secret Manager に機密値を登録

```bash
PROJECT_REF=<your-supabase-project-ref>   # 1-5 で控えた値

# Supabase 関連の値を Secret Manager に登録
echo -n "https://${PROJECT_REF}.supabase.co" | \
  gcloud secrets create mirai-gikai-ota-supabase-url --data-file=-

echo -n "<service_role_key>" | \
  gcloud secrets create mirai-gikai-ota-supabase-service-key --data-file=-

echo -n "<anon_key>" | \
  gcloud secrets create mirai-gikai-ota-supabase-anon --data-file=-

# Web 用の任意シークレット（キャッシュ無効化トークン）
echo -n "$(openssl rand -hex 32)" | \
  gcloud secrets create mirai-gikai-ota-revalidate-secret --data-file=-

# サービスアカウントに Secret Manager アクセス権を付与
for SA in mirai-gikai-ota-web mirai-gikai-ota-admin; do
  for SECRET in supabase-url supabase-service-key supabase-anon revalidate-secret; do
    gcloud secrets add-iam-policy-binding mirai-gikai-ota-$SECRET \
      --member="serviceAccount:${SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor"
  done
done
```

> **公開アクセス**: Supabase Cloud のデフォルト構成では DB へのインターネット
> アクセスは Anon Key + RLS で守られる。本リポジトリは `createAdminClient()`
> で service_role key を使ってアプリ層から認可しているため、RLS は有効化のみ
> （ポリシー無し = デフォルト全拒否）。service_role key は **絶対に
> NEXT_PUBLIC_** にせず Secret Manager 経由で server side のみに渡す。

## 2. ローカルでの動作確認

### 2-1. Vertex AI を使うための ADC ログイン

```bash
gcloud auth application-default login
gcloud config set project $PROJECT_ID
```

### 2-2. .env を準備（ローカル開発はローカル Supabase）

```bash
cp .env.example .env
# .env を編集:
#   GOOGLE_VERTEX_PROJECT=$PROJECT_ID
#   GOOGLE_VERTEX_LOCATION=asia-northeast1
#   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL は npx supabase status の値
```

### 2-3. ローカル起動

```bash
npx supabase start
pnpm install
pnpm db:reset
pnpm dev   # web: 3010, admin: 3011
```

### 2-4. ローカルから Supabase Cloud に接続して動作確認（任意）

本番デプロイ前に、ローカル Next.js から Supabase Cloud に接続して挙動確認
したい場合は `.env.production` を作成して `pnpm dev:admin:prod-db` を使う:

```bash
cp .env.production.example .env.production
# .env.production を編集:
#   SUPABASE_URL=https://<project-ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
#   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>

pnpm dev:admin:prod-db   # admin だけ本番DBに繋いで起動
```

## 3. Cloud Run へのデプロイ

### 3-1. Cloud Build でビルド & デプロイ（推奨）

```bash
# web
gcloud builds submit --config=cloudbuild.web.yaml

# admin
gcloud builds submit --config=cloudbuild.admin.yaml
```

`cloudbuild.web.yaml` / `cloudbuild.admin.yaml` で以下が一気に走る:

1. Dockerfile をビルド
2. Artifact Registry に push
3. Cloud Run に deploy（Vertex AI 環境変数 + Secret Manager マウント）

### 3-2. ローカルからの直接デプロイ（暫定検証用）

Cloud Build を使わずに Mac からビルドする場合:

```bash
# Mac (Apple Silicon) → x86_64 でビルド
docker buildx build \
  --platform linux/amd64 \
  -f web/Dockerfile \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/mirai-gikai-ota/mirai-gikai-ota-web:dev \
  --push \
  .

gcloud run deploy mirai-gikai-ota-web \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/mirai-gikai-ota/mirai-gikai-ota-web:dev \
  --region=$REGION \
  --service-account=mirai-gikai-ota-web@${PROJECT_ID}.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars=GOOGLE_VERTEX_PROJECT=${PROJECT_ID},GOOGLE_VERTEX_LOCATION=${REGION}
```

## 4. 運用上の注意

- **コールドスタート**: `--min-instances=1` を付ければ常時 1 インスタンス起動でレイテンシ
  改善できるが課金が増える。トラフィック次第で調整。
- **AI ストリーミング切断**: Cloud Run の `--timeout=3600`（最大 60 分）で AI チャットの
  長時間ストリーミングは耐える。HTTP/2 が必要。Cloud Run はデフォルト HTTP/2 OK。
- **画像最適化**: Vercel の Image Optimization は使えない。Cloud CDN + Cloud Storage
  への移行か、`unoptimized: true` で Next.js の最適化を無効化する。
- **Supabase**: ローカル開発以外は Supabase Cloud（Free / Pro plan）を使う。Cloud Run
  と同リージョン（`asia-northeast1` / Tokyo）を選ぶとレイテンシが小さい。新しい
  migration を作ったら **必ず `npx supabase db push` で Supabase Cloud に反映** してから
  Cloud Run をデプロイする。順序を逆にするとアプリが期待するカラムがDBに無くて 500 が出る。
- **Supabase の課金**: Free plan は DB 500MB、月間 Egress 5GB、Auth MAU 50,000 まで。
  議事録 markdown を全件保存すると数MB〜数十MB なので Free でも入るが、AI チャットの
  ログ蓄積が増えると Pro（$25/月〜）への移行を検討。
- **Admin の保護**: `--no-allow-unauthenticated` のままにし、IAP / Identity-Aware Proxy
  経由で限定アクセスにすると安全。組織内ユーザーだけアクセス許可するよう IAM 設定する。
- **コスト管理**: `pnpm seed` の chat_usage_events と AI コスト計算は Vertex AI 単価
  （`web/src/lib/ai/calculate-ai-cost.ts`）を反映済。月次ダッシュボードで監視推奨。

## 5. トラブルシューティング

### `Unable to detect a Project Id in the current environment`

→ `GOOGLE_VERTEX_PROJECT` が未設定か、ADC がない。Cloud Run 上ではメタデータサーバから
取得されるので、必ず service account をアタッチすること。

### `Permission denied on resource project xxx (or it may not exist)`

→ サービスアカウントに `roles/aiplatform.user` が付いていない。1-4 を再実行。

### Next.js standalone build がモジュール解決に失敗する

→ `web/next.config.ts` / `admin/next.config.ts` の `outputFileTracingRoot` が monorepo
ルートを指していることを確認。pnpm workspace 配下のパッケージをトレースに含めるため必須。

### Supabase Cloud で `npx supabase db push` がエラーになる

→ ローカルの migration 履歴と Supabase Cloud のそれが食い違っている可能性。
`npx supabase db remote commit`（既に Supabase Cloud にあるスキーマをローカルにDLして
履歴を整合させる）か、`--include-all` で全部適用しなおす。

### `permission denied for relation xxx` が本番で出る

→ Cloud Run から service_role key 経由でアクセスしているはずなのに anon key を
使っている可能性。Cloud Run 環境変数の `SUPABASE_SERVICE_ROLE_KEY` が Secret から
正しく注入されているか確認（`gcloud run services describe ... --format=yaml | grep -A 2 SERVICE_ROLE`）。
