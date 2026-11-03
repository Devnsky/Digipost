# =======================================================
# Stage 1: Build Frontend Assets
# =======================================================
FROM node:24.22.2-bookworm-slim AS builder

WORKDIR /app

# Copy package manifests for workspace resolution
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN npm ci

# Copy web source code
COPY apps/web ./apps/web

# Build static bundle with Vite
RUN npm run build --workspace=apps/web

# =======================================================
# Stage 2: Nginx Web Server
# =======================================================
FROM nginx:alpine

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

