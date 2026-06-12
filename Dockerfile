# ============================================================
# WhelpWise — Multi-stage Docker build
# Stage 1: build frontend (Vite → dist/public)
# Stage 2: build API server bundle (esbuild → dist/index.mjs)
# Stage 3: production image — bundle + prod node_modules
# ============================================================

# ── Stage 1: Frontend build ───────────────────────────────────
FROM node:24-slim AS frontend-builder

RUN npm install -g pnpm@latest

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/api-client-react lib/api-client-react
COPY lib/api-zod lib/api-zod
COPY lib/object-storage-web lib/object-storage-web
COPY artifacts/whelpwise artifacts/whelpwise

# VITE_ vars are baked into the JS bundle at build time
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
ENV PORT=5173
ENV NODE_ENV=production

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/whelpwise run build


# ── Stage 2: API server build ─────────────────────────────────
FROM node:24-slim AS api-builder

RUN npm install -g pnpm@latest

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/db lib/db
COPY lib/api-zod lib/api-zod
COPY artifacts/api-server artifacts/api-server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

# pnpm deploy creates a self-contained dir with all runtime deps properly flattened
RUN pnpm deploy --legacy --filter @workspace/api-server --prod /app/deploy


# ── Stage 3: Production runtime ───────────────────────────────
FROM node:24-slim AS production

WORKDIR /app

# Compiled API server (ESM bundle)
COPY --from=api-builder /app/artifacts/api-server/dist ./dist

# Built frontend static files — served by Express as /public
COPY --from=frontend-builder /app/artifacts/whelpwise/dist/public ./dist/public

# Production node_modules from pnpm deploy — flat structure, all externals accessible
COPY --from=api-builder /app/deploy/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.mjs"]
