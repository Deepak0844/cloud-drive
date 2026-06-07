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

.PHONY: dev dev-build dev-down logs-dev \
        staging staging-down logs-staging \
        prod prod-down logs-prod

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
