# syntax=docker/dockerfile:1.6
#
# Cloud Run 用 web アプリ Dockerfile
# ビルドコンテキストは monorepo のルート（mirai-gikai-ota/）を想定。
# build & run:
#   docker build -f web/Dockerfile -t mirai-gikai-ota-web .
#   docker run -p 3010:3010 -e PORT=3010 mirai-gikai-ota-web

ARG NODE_VERSION=22-bookworm-slim
ARG PNPM_VERSION=10.32.1

# ---------- Stage 1: deps ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# 依存解決に必要なファイルだけ先にコピーして layer cache を効かせる
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/seed/package.json packages/seed/
COPY packages/supabase/package.json packages/supabase/
COPY web/package.json web/
COPY admin/package.json admin/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- Stage 2: builder ----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/supabase/node_modules ./packages/supabase/node_modules

# ソース全部
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

# ---------- Stage 3: runtime ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run は PORT を渡してくる（デフォルト 8080）。Next standalone は HOSTNAME と PORT を読む。
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

# 非 root ユーザーを作る
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# next standalone 出力一式（monorepo 構造を保ったまま）
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public

USER nextjs
EXPOSE 8080
CMD ["node", "web/server.js"]
