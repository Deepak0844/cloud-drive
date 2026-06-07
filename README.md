# Cloud Drive

A self-hosted personal cloud storage application with file management, photo organisation, video streaming, and real-time features. Built as a monorepo with a React frontend and a Node.js/Express backend, designed to run on a Raspberry Pi or any Linux server.

---

## Features

- **File management** — upload, download, rename, move, copy, and organise files into folders
- **Chunked uploads** — large files upload in resumable chunks with MIME magic-byte verification
- **Photo library** — automatic categorisation, EXIF metadata extraction, HEIC/HEIF conversion
- **Face recognition** — face detection and grouping powered by face-api.js and TensorFlow.js
- **Video streaming** — HLS adaptive streaming served through nginx; MP4 Fast-Start optimisation on upload
- **Audio playback** — music metadata extraction, in-browser playback
- **Trash** — soft-delete with configurable expiry (default 30 days)
- **Duplicate detection** — hash-based deduplication across your library
- **Storage quotas** — per-user quota enforcement with admin override
- **Real-time notifications** — Socket.io powered; push notifications via Expo
- **Admin dashboard** — user management, quota management, system stats
- **Encrypted storage** — files encrypted at rest on the NAS/storage volume
- **Email** — password reset and notification emails via SMTP

---

## Tech Stack

### Frontend (`apps/web`)

| Layer     | Technology                           |
| --------- | ------------------------------------ |
| Framework | React 19, Vite 7                     |
| Routing   | React Router v7                      |
| State     | Redux Toolkit, RTK Query             |
| UI        | shadcn/ui, Radix UI, Tailwind CSS v4 |
| Animation | Framer Motion                        |
| Video     | Vidstack, hls.js                     |
| Forms     | React Hook Form, Zod                 |
| Real-time | Socket.io client                     |

### Backend (`apps/server`)

| Layer             | Technology                          |
| ----------------- | ----------------------------------- |
| Runtime           | Node.js 22 (ES Modules)             |
| Framework         | Express 4                           |
| Database          | MongoDB 7 via Mongoose              |
| Auth              | JWT (httpOnly cookies), bcryptjs    |
| File processing   | sharp, ffmpeg, canvas, heic-convert |
| AI / ML           | TensorFlow.js (Node), face-api.js   |
| Real-time         | Socket.io                           |
| Email             | Nodemailer                          |
| Push              | Expo Server SDK                     |
| Schema validation | Zod                                 |
| Logging           | Pino + pino-pretty                  |

### Infrastructure

| Layer         | Technology                                         |
| ------------- | -------------------------------------------------- |
| Monorepo      | npm workspaces, Turbo                              |
| Reverse proxy | nginx (alpine) with SSL termination                |
| Containers    | Docker Compose (multi-environment overlay pattern) |
| Code quality  | ESLint 9, Prettier, Husky, lint-staged             |

---

## Project Structure

```
cloud-drive/
├── apps/
│   ├── web/                  # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── pages/        # Route-level page components
│   │   │   ├── components/   # Feature components
│   │   │   ├── store/        # Redux slices and RTK Query APIs
│   │   │   ├── hooks/        # Custom hooks
│   │   │   └── services/     # Axios API clients
│   │   ├── nginx.conf        # nginx config template (envsubst)
│   │   └── Dockerfile        # Multi-stage: node builder → nginx
│   └── server/               # Node.js/Express API
│       ├── bin/www.js         # Entry point
│       ├── config/           # Env validation (Zod), database, app config
│       ├── routes/           # Express routers per resource
│       ├── services/         # Business logic (file, folder, auth, ...)
│       ├── utils/            # MIME detection, encryption, media helpers
│       ├── models/           # Mongoose schemas
│       ├── middleware/        # Auth, rate-limit, error handling
│       ├── env/              # .env files (gitignored) + .example templates
│       └── Dockerfile        # node:22-bookworm-slim with canvas/native libs
├── shared/
│   ├── components/           # Shared React components (@shared-components)
│   ├── constants/            # Shared constants (@shared-constants)
│   ├── hooks/                # Shared hooks (@shared-hooks)
│   ├── utils/                # Shared utilities (@shared-utils)
│   ├── eslint-config/        # Shared ESLint config
│   └── js-config/            # Shared JS/TS config
├── docker-compose.yml        # Base Compose (server + shared network)
├── docker-compose.dev.yml    # Dev overlay (hot-reload, mongo-express)
├── docker-compose.staging.yml# Staging overlay (web nginx + mongo)
├── docker-compose.prod.yml   # Prod overlay (web nginx, NAS volume)
├── Makefile                  # Convenience targets per environment
└── .env.*.example            # Environment variable templates
```

---

## Docker Setup

Three environments are supported. All use a **base + overlay** Compose pattern and are isolated by Docker project name so they can run simultaneously on the same machine.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with the Compose v2 plugin (`docker compose`)
- `make`

### Environment files

Each environment needs its own env file. Copy from the provided templates:

```bash
# Root-level (Docker build args, ports, NAS path)
cp .env.dev.example     .env.dev
cp .env.staging.example .env.staging
cp .env.prod.example    .env.prod

# Server secrets (JWT, MongoDB URI, SMTP, encryption key)
cp apps/server/env/.env.development.example apps/server/env/.env.development
cp apps/server/env/.env.staging.example     apps/server/env/.env.staging
cp apps/server/env/.env.production.example  apps/server/env/.env.production
```

Fill in all values marked `REQUIRED` before running. At minimum you need:

| Variable                 | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `NAS_HOST_PATH`          | Absolute path on the host to mount as the storage volume |
| `JWT_SECRET`             | Random 64-character hex string                           |
| `STORAGE_ENCRYPTION_KEY` | Random 64-character hex string (32 bytes)                |
| `MONGODB_URI`            | MongoDB connection string (staging/prod only)            |

### Development

In dev, the server runs with hot-reload (`--watch`). The web app runs locally with Vite (not in Docker).

```bash
make dev          # Start server + MongoDB + mongo-express (no build)
make dev-build    # Same, but rebuilds the server image first
make dev-down     # Stop and remove containers
make logs-dev     # Tail logs
```

| Service        | Host address                                             |
| -------------- | -------------------------------------------------------- |
| API server     | http://localhost:9000                                    |
| Web app (Vite) | http://localhost:3000 (run `npm run web:dev` separately) |
| MongoDB        | localhost:27018                                          |
| mongo-express  | http://localhost:8081                                    |

### Staging

Full-stack Docker deployment — nginx serves the built frontend and proxies the API.

```bash
make staging      # Build and start (web nginx + server + MongoDB)
make staging-down # Stop and remove
make logs-staging # Tail logs
```

| Service     | Host address                    |
| ----------- | ------------------------------- |
| Web (HTTP)  | http://localhost:8080           |
| Web (HTTPS) | https://localhost:8443          |
| API         | Internal only (via nginx proxy) |
| MongoDB     | Internal only                   |

> Staging uses a self-signed TLS certificate baked into the nginx image. Set `SERVER_NAME` in `.env.staging` to your machine's hostname or IP so the cert CN matches.

### Production

Designed to run on a Raspberry Pi (or any Linux host) with a NAS/external drive mounted at `NAS_HOST_PATH`.

```bash
make prod         # Build and start (web nginx + server; external MongoDB)
make prod-down    # Stop and remove
make logs-prod    # Tail logs
```

| Service                     | Host address                    |
| --------------------------- | ------------------------------- |
| Web (HTTP → HTTPS redirect) | :80                             |
| Web (HTTPS)                 | :443                            |
| API                         | Internal only (via nginx proxy) |

> Set `SERVER_NAME` in `.env.prod` to your server's hostname (e.g. `raspberrypi.local`). This is used as the nginx `server_name`, the HTTP-to-HTTPS redirect target, and the self-signed certificate CN.
>
> For a trusted certificate, mount your cert/key into `/etc/nginx/ssl` via the volume section commented out in `docker-compose.prod.yml` and remove the `openssl` self-sign step from the web Dockerfile.

### Running environments side-by-side

The Makefile uses `-p cloud-drive-<env>` project names to isolate networks and volumes, so dev, staging, and prod can run simultaneously without conflicts.

---

## Local Development (without Docker)

```bash
npm install          # Install all workspace dependencies

npm run dev          # Start both web and server in watch mode
npm run web:dev      # Web app only  → http://localhost:3000
npm run server:dev   # Server only   → http://localhost:9000
```

You still need a running MongoDB instance. Point `MONGODB_URI` in `apps/server/env/.env.development` at it.

---

## Available Scripts

| Script                 | Description                        |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Start all apps in development mode |
| `npm run web:dev`      | Start web app only                 |
| `npm run server:dev`   | Start server only                  |
| `npm run build`        | Build all packages for production  |
| `npm run lint`         | Lint all packages                  |
| `npm run format`       | Format all files with Prettier     |
| `npm run format:check` | Check formatting without writing   |
| `npm run type-check`   | Run JS type checking               |

---

## API Overview

All routes are prefixed `/api/v1/`.

| Router        | Path             | Description                                          |
| ------------- | ---------------- | ---------------------------------------------------- |
| Auth          | `/auth`          | Register, login, logout, password reset              |
| Files         | `/files`         | Upload (standard + chunked), download, rename, move  |
| Folders       | `/folders`       | Create, rename, move, list contents                  |
| Items         | `/items`         | Unified file+folder operations (copy, delete, share) |
| Trash         | `/trash`         | Soft-delete, restore, permanent delete               |
| Quota         | `/quota`         | User quota info                                      |
| Notifications | `/notifications` | In-app notifications                                 |
| Admin         | `/admin`         | User management, quota overrides, system stats       |

---

## License

ISC
