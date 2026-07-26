# =============================================================================
# Dockerfile.server
# Node.js/Express API — uses node:22 (Debian) for native addon compatibility
# (@tensorflow/tfjs-node and canvas require glibc, not available on Alpine)
#
# Build args (override at build time):
#   docker build --build-arg NODE_VERSION=20 --build-arg SERVER_PORT=9001 .
#   docker build --build-arg ENABLE_FACE_API=false .   # Pi Zero 2W / ARM32
# =============================================================================

ARG NODE_VERSION=22-bookworm-slim
ARG SERVER_PORT=9000

FROM node:${NODE_VERSION}

# Re-declare after FROM (ARGs before FROM are not available after it)
ARG SERVER_PORT=9000
ARG ENABLE_FACE_API=true

WORKDIR /app

# System libraries required by canvas (node-canvas does not ship prebuilt binaries).
# build-essential + python3 are needed at build time for node-gyp compilation.
# The *-dev packages pull in their runtime counterparts (libcairo2, libpango-1.0-0,
# etc.) as dependencies, so one install covers both build-time and runtime needs.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# ── Layer 1: workspace manifests (cached unless package files change) ─────────
COPY package.json package-lock.json turbo.json ./
COPY shared/ ./shared/
COPY apps/server/package.json ./apps/server/

# ── Layer 2: install deps ─────────────────────────────────────────────────────
# npm ci --ignore-scripts strictly respects the lockfile without mutating it.
# npm rebuild then explicitly compiles the required Linux native binaries.
# Splitting into two RUN layers keeps the npm ci cache intact when only
# ENABLE_FACE_API changes (e.g. switching between x86 and Pi builds).
RUN npm ci --workspace=cloud-drive-server --include-workspace-root --ignore-scripts

# Skip canvas + @tensorflow/tfjs-node on ARM32 (Pi Zero 2W) — no prebuilt
# ARMv7 binary exists and source compilation OOMs on 512 MB.
RUN if [ "$ENABLE_FACE_API" = "true" ]; then \
      npm rebuild canvas @tensorflow/tfjs-node sharp; \
    else \
      npm rebuild sharp; \
    fi

# Pass the flag through to the runtime so faceService.js can skip TF imports.
ENV ENABLE_FACE_API=${ENABLE_FACE_API}

# ── Layer 3: application source ───────────────────────────────────────────────
COPY apps/server/ ./apps/server/

WORKDIR /app/apps/server

EXPOSE ${SERVER_PORT}

CMD ["node", "bin/www.js"]
