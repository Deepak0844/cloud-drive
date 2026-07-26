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
ARG SERVER_NAME=localhost
ARG HSTS_MAX_AGE=300

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
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build --workspace=cloud-drive-web

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:${NGINX_VERSION}

# Re-declare build args — ARGs before FROM are not available after it.
ARG SERVER_NAME=localhost
ARG HSTS_MAX_AGE=300

# Install openssl; generate a self-signed cert with SERVER_NAME as CN.
# To use a real cert (Let's Encrypt, custom CA): mount it over
# /etc/nginx/ssl at runtime via a compose volume (see staging/prod compose files).
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=US/ST=State/L=City/O=CloudDrive/CN=${SERVER_NAME}"

# Copy built assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Substitute SERVER_NAME and HSTS_MAX_AGE into the nginx config template.
# The explicit variable list '${SERVER_NAME} ${HSTS_MAX_AGE}' tells envsubst to
# substitute only those two — nginx runtime variables ($uri, $host, etc.) are untouched.
COPY apps/web/nginx.conf /tmp/nginx.conf.template
RUN SERVER_NAME="${SERVER_NAME}" HSTS_MAX_AGE="${HSTS_MAX_AGE}" \
    envsubst '${SERVER_NAME} ${HSTS_MAX_AGE}' \
    < /tmp/nginx.conf.template \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443
