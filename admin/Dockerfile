# syntax=docker/dockerfile:1.6
#
# Cloud Run 用 admin アプリ Dockerfile
# ビルドコンテキストは monorepo のルート（mirai-gikai-ota/）を想定。
# build & run:
#   docker build -f admin/Dockerfile -t mirai-gikai-ota-admin .
#   docker run -p 3011:3011 -e PORT=3011 mirai-gikai-ota-admin

ARG NODE_VERSION=22-bookworm-slim
ARG PNPM_VERSION=10.32.1

# ---------- Stage 1: deps ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

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
COPY --from=deps /app/admin/node_modules ./admin/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/supabase/node_modules ./packages/supabase/node_modules

COPY . .

# NEXT_PUBLIC_* と prerender 用の SUPABASE_URL / SUPABASE_SECRET_KEY も build 時に必要
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_WEB_URL
ARG SUPABASE_URL
ARG SUPABASE_SECRET_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_WEB_URL=${NEXT_PUBLIC_WEB_URL}
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_SECRET_KEY=${SUPABASE_SECRET_KEY}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter admin build

# ---------- Stage 3: runtime ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/admin/.next/static ./admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/admin/public ./admin/public

USER nextjs
EXPOSE 8080
CMD ["node", "admin/server.js"]
