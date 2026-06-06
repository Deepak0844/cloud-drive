# =============================================================================
# Dockerfile.web
# React/Vite SPA — multi-stage build
#   Stage 1 (builder): node:alpine — Vite has no native addons, alpine is fine
#   Stage 2 (serve):   nginx:alpine — serves the built static dist
#
# Build args (override at build time):
#   docker build \
#     --build-arg NODE_VERSION=22-alpine \
#     --build-arg NGINX_VERSION=1.27-alpine .
# =============================================================================

ARG NODE_VERSION=22-alpine
ARG NGINX_VERSION=alpine

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Layer 1: workspace manifests (cached unless package files change)
# Must copy ALL workspace package.json files — the root lockfile references every workspace.
# apps/server/package.json is needed for npm ci workspace resolution even though we only build web.
COPY package.json package-lock.json turbo.json ./
COPY shared/ ./shared/
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/

# npm ci strictly respects the lockfile without mutating it.
# --ignore-scripts is intentionally omitted: esbuild and rollup require their postinstall
# hooks to select the correct Linux native binary; without them, npm run build fails.
RUN npm ci --workspace=cloud-drive-web --include-workspace-root


# Layer 2: application source (only web — don't copy server source)
COPY apps/web/ ./apps/web/

# Build the Vite app → outputs to apps/web/dist
RUN npm run build --workspace=cloud-drive-web

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:${NGINX_VERSION}

# Install openssl and generate a self-signed certificate for LAN HTTPS
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=US/ST=State/L=City/O=CloudDrive/CN=localhost"

# Copy built assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy Nginx config (handles SPA routing + API proxy to server container)
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
