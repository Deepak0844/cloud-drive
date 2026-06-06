# =============================================================================
# Dockerfile.server
# Node.js/Express API — uses node:22 (Debian) for native addon compatibility
# (@tensorflow/tfjs-node and canvas require glibc, not available on Alpine)
#
# Build args (override at build time):
#   docker build --build-arg NODE_VERSION=20 --build-arg SERVER_PORT=9001 .
# =============================================================================

ARG NODE_VERSION=22-bookworm-slim
ARG SERVER_PORT=9000

FROM node:${NODE_VERSION}

# Re-declare after FROM (ARGs before FROM are not available after it)
ARG SERVER_PORT=9000

WORKDIR /app

# ── Layer 1: workspace manifests (cached unless package files change) ─────────
COPY package.json package-lock.json turbo.json ./
COPY shared/ ./shared/
COPY apps/server/package.json ./apps/server/

# ── Layer 2: install deps ─────────────────────────────────────────────────────
# npm ci --ignore-scripts strictly respects the lockfile without mutating it.
# npm rebuild then explicitly compiles the required Linux native binaries.
RUN npm ci --workspace=cloud-drive-server --include-workspace-root --ignore-scripts \
 && npm rebuild canvas @tensorflow/tfjs-node sharp


# ── Layer 3: application source ───────────────────────────────────────────────
COPY apps/server/ ./apps/server/

WORKDIR /app/apps/server

EXPOSE ${SERVER_PORT}

CMD ["node", "bin/www.js"]
