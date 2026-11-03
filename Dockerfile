# =======================================================
# DigiPost Full-Stack Application - Root Dockerfile
# Optimized for Dokploy, Coolify, and Container Deployments
# Multi-stage build: React SPA (Vite) + Node.js API (Express)
# =======================================================

# -------------------------------------------------------
# Stage 1: Build Frontend & Backend
# -------------------------------------------------------
FROM node:24.22.2-bookworm-slim AS builder

WORKDIR /app

# Install native compilation dependencies for argon2 and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests for workspace dependency resolution
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy full source tree
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY database ./database

# Build frontend (Vite -> apps/web/dist) and backend (tsc -> apps/api/dist)
RUN npm run build --workspace=apps/web && \
    npm run build --workspace=apps/api

# -------------------------------------------------------
# Stage 2: Production Runtime
# -------------------------------------------------------
FROM node:24.22.2-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY database ./database
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh

# Setup upload folder, entrypoint permissions, and ownership
RUN chmod +x /usr/local/bin/api-entrypoint.sh && \
    mkdir -p /app/uploads/documents && \
    chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4000}/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
CMD ["node", "apps/api/dist/server.js"]
