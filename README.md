# AI Agent 24/7

AI Agent 24/7 is a Python service for conversational support across a REST API, WebSocket, Slack, WhatsApp, Gmail Pub/Sub, and voice endpoints. It uses a LangGraph agent with an NVIDIA NIM compatible language model, optional tools, short and long term memory, rate limiting, analytics, and human handoff. A React web application provides chat, dashboard, analytics, handoff, and tool management screens.

## Features

- FastAPI endpoints for chat, voice, health, analytics, tool management, and webhooks.
- LangGraph orchestration with pluggable registered tools and an NVIDIA NIM provider.
- Redis sessions and ticket storage, with in-memory fallback; PostgreSQL and pgvector for optional long term memory.
- API key or JWT authentication, webhook signature checks, rate limiting, and SSRF protection for web browsing tools.
- Optional Temporal workflows and Prometheus/Grafana monitoring.
- React 19, TypeScript, Vite frontend served by the backend after a frontend build.

## Stack

- Python 3.11+, FastAPI, Pydantic Settings, LangGraph, HTTPX, Redis, asyncpg, Prometheus client.
- Node.js 20.19+ or 22.12+, React 19, TypeScript, Vite 8, Vitest.
- Docker Compose for local dependencies and deployment examples.

## Local setup

Create and activate a virtual environment, then install the backend and development tools:

```bash
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,tools,workflows,observability]"
```

Copy `.env.example` to `.env` and configure the model endpoint and credentials. The default model URL expects a local NVIDIA NIM compatible service at `http://localhost:8000/v1`. Configure Redis and PostgreSQL URLs if you want persistent sessions and long term memory; the app degrades to in-memory sessions and disables long term memory when those stores are unavailable. In `APP_ENV=dev`, API routes allow local unauthenticated development when no credentials are configured. Set `API_KEYS` or JWT settings for authenticated access.

Run the backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

Run the web client in another terminal:

```bash
cd web
npm ci
npm run dev
```

Vite serves the UI at `http://localhost:5173` and proxies API requests to port 8080. Build the frontend with `npm run build`; the backend serves `web/dist` when present.

## Docker Compose

From `infra/`, start the local data services and application:

```bash
docker compose --env-file ../.env up --build
```

Compose profiles enable optional services: `docker compose --env-file ../.env --profile gpu up` for NVIDIA NIM, `--profile workflows` for Temporal, and `--profile monitoring` for Prometheus and Grafana. The production example in `infra/docker-compose.prod.yml` expects Docker secret files under `secrets/` (including `api_keys.txt`) and a unique `GRAFANA_ADMIN_PASSWORD` in the environment file. Production Prometheus and Grafana ports bind to localhost. Review secret files and environment values before deploying it.

## Quality checks

```bash
python -m pytest
python -m ruff check .
python -m black --check .
python -m isort --check-only .
```

The frontend commands are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` from `web/`. `scripts/check.sh` and `scripts/check.ps1` provide combined backend checks.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Contribution guide](CONTRIBUTING.md)
- [Frontend guide](web/README.md)
- [Release notes](docs/RELEASE_NOTES.md)
- [API collection](docs/postman_collection.json)

## License

MIT. See [LICENSE](LICENSE).
