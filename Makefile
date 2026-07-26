# =============================================================================
# Makefile — Docker Compose convenience targets
#
# Requires: docker compose v2 (the `docker compose` plugin, not docker-compose v1).
# Project names (-p) isolate networks and volumes so dev/staging/prod can run
# simultaneously on the same machine without network or volume name collisions.
# =============================================================================

DEV_COMPOSE     := docker compose -p cloud-drive-dev \
                   -f docker-compose.yml -f docker-compose.dev.yml \
                   --env-file .env.dev

STAGING_COMPOSE := docker compose -p cloud-drive-staging \
                   -f docker-compose.yml -f docker-compose.staging.yml \
                   --env-file .env.staging

PROD_COMPOSE    := docker compose -p cloud-drive-prod \
                   -f docker-compose.yml -f docker-compose.prod.yml \
                   --env-file .env.prod

PI_COMPOSE      := docker compose -p cloud-drive-pi \
                   -f docker-compose.yml -f docker-compose.pi.yml \
                   --env-file .env.prod

.PHONY: dev dev-build dev-down logs-dev \
        staging staging-down logs-staging \
        prod prod-down logs-prod \
        pi-build pi-save pi pi-down logs-pi

# ── Dev ───────────────────────────────────────────────────────────────────────
dev:
	$(DEV_COMPOSE) up -d

dev-build:
	$(DEV_COMPOSE) up -d --build

dev-down:
	$(DEV_COMPOSE) down

logs-dev:
	$(DEV_COMPOSE) logs -f

# ── Staging ───────────────────────────────────────────────────────────────────
staging:
	$(STAGING_COMPOSE) up -d --build

staging-down:
	$(STAGING_COMPOSE) down

logs-staging:
	$(STAGING_COMPOSE) logs -f

# ── Prod ──────────────────────────────────────────────────────────────────────
prod:
	$(PROD_COMPOSE) up -d --build

prod-down:
	$(PROD_COMPOSE) down

logs-prod:
	$(PROD_COMPOSE) logs -f

# ── Pi Zero 2W ────────────────────────────────────────────────────────────────
# pi-build and pi-save run on Mac.
# pi / pi-down / logs-pi run on the Pi after: docker load < cloud-drive-pi.tar.gz
pi-build:
	docker buildx build --platform linux/arm/v7 \
	  --build-arg ENABLE_FACE_API=false \
	  --build-arg NODE_VERSION=22-bookworm-slim \
	  -t cloud-drive-server:pi \
	  -f apps/server/Dockerfile \
	  --load .

pi-save:
	docker save cloud-drive-server:pi | gzip > cloud-drive-pi.tar.gz

pi:
	$(PI_COMPOSE) up -d

pi-down:
	$(PI_COMPOSE) down

logs-pi:
	$(PI_COMPOSE) logs -f
