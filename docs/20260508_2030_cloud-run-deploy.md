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

### 1-5. Secret Manager に機密値を登録

```bash
# 例: Supabase の値を登録
echo -n "https://xxxxx.supabase.co" | \
  gcloud secrets create mirai-gikai-ota-supabase-url --data-file=-

echo -n "<service_role_key>" | \
  gcloud secrets create mirai-gikai-ota-supabase-service-key --data-file=-

echo -n "<anon_key>" | \
  gcloud secrets create mirai-gikai-ota-supabase-anon --data-file=-

echo -n "<random-revalidate-secret>" | \
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

## 2. ローカルでの動作確認

### 2-1. Vertex AI を使うための ADC ログイン

```bash
gcloud auth application-default login
gcloud config set project $PROJECT_ID
```

### 2-2. .env を準備

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
  と同リージョン（`asia-northeast1` / Tokyo）を選ぶとレイテンシが小さい。
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
