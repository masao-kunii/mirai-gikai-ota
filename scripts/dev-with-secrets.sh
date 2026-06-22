#!/usr/bin/env bash
#
# ローカル開発サーバー起動ラッパー。
#
# 公開チャットは getModel() が GEMINI_API_KEY（Gemini Developer API）を優先し、
# 未設定なら Vertex AI（ADC）にフォールバックする。本番では Secret Manager の
# `gemini-api-key` を注入しているため、ローカルでも同じキー・モデルで動かせるよう、
# GEMINI_API_KEY が未設定なら Secret Manager から実行時取得して環境変数に入れる。
#
# 取得できない場合（gcloud 未認証・権限なし等）はキー無しで起動し、チャットは
# Vertex AI（要 `gcloud auth application-default login`）にフォールバックする。
#
# 使い方:
#   pnpm dev:secrets                          # web + admin + packages をまとめて起動
#   ./scripts/dev-with-secrets.sh --filter web dev   # 引数はそのまま pnpm に渡る
#
# 環境変数:
#   GCP_PROJECT         参照する GCP プロジェクト（既定: mirai-gikai-ota）
#   GEMINI_SECRET_NAME  Secret Manager のシークレット名（既定: gemini-api-key）
#
set -euo pipefail
cd "$(dirname "$0")/.."

GCP_PROJECT="${GCP_PROJECT:-mirai-gikai-ota}"
GEMINI_SECRET_NAME="${GEMINI_SECRET_NAME:-gemini-api-key}"

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  if command -v gcloud >/dev/null 2>&1; then
    echo "🔑 Secret Manager から ${GEMINI_SECRET_NAME} を取得中 (project=${GCP_PROJECT})..."
    if key="$(gcloud secrets versions access latest \
      --secret="${GEMINI_SECRET_NAME}" --project="${GCP_PROJECT}" 2>/dev/null)" \
      && [[ -n "$key" ]]; then
      export GEMINI_API_KEY="$key"
      echo "✅ GEMINI_API_KEY を注入しました（チャットは Gemini Developer API を使用）"
    else
      echo "⚠️  取得失敗。GEMINI_API_KEY 無しで起動します"
      echo "   （チャットは Vertex AI/ADC にフォールバック。要 gcloud auth application-default login）"
    fi
  else
    echo "⚠️  gcloud が見つかりません。GEMINI_API_KEY 無しで起動します（Vertex AI/ADC にフォールバック）"
  fi
fi

# dotenv はローカル bin のため pnpm exec 経由で起動する。
# 引数があれば pnpm にそのまま渡す（例: --filter web dev）。無ければ全パッケージの dev。
if [[ $# -gt 0 ]]; then
  exec pnpm exec dotenv -e .env -- pnpm "$@"
else
  exec pnpm exec dotenv -e .env -- pnpm -r --stream --parallel run dev
fi
