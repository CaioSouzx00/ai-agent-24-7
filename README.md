# AI Agent 24/7

Autonomous enterprise artificial intelligence platform for conversational customer service, process orchestration, and hardened tool execution in mission-critical environments.

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. System Architecture](#2-system-architecture)
- [3. State Machine & Decision Graph (LangGraph)](#3-state-machine--decision-graph-langgraph)
- [4. Core Modules & Capabilities](#4-core-modules--capabilities)
  - [4.1 Real-Time Voice Processing (STT + TTS)](#41-real-time-voice-processing-stt--tts)
  - [4.2 Headless Browser Automation (Playwright)](#42-headless-browser-automation-playwright)
  - [4.3 Runtime Dynamic Tool Synthesis](#43-runtime-dynamic-tool-synthesis)
  - [4.4 Automatic Language Detection & Internationalization](#44-automatic-language-detection--internationalization)
  - [4.5 Throughput Control & Rate Limiting](#45-throughput-control--rate-limiting)
  - [4.6 Two-Tier Memory Architecture](#46-two-tier-memory-architecture)
  - [4.7 Human Handoff Escalation Protocol](#47-human-handoff-escalation-protocol)
- [5. Security & Infrastructure Hardening](#5-security--infrastructure-hardening)
- [6. Observability & Telemetry](#6-observability--telemetry)
- [7. Tool Catalog (Tool Calling)](#7-tool-catalog-tool-calling)
- [8. Supported Integration Channels](#8-supported-integration-channels)
- [9. Installation & Deployment](#9-installation--deployment)
  - [9.1 Prerequisites](#91-prerequisites)
  - [9.2 Local Execution with Python](#92-local-execution-with-python)
  - [9.3 Modern SPA Frontend (React + TypeScript)](#93-modern-spa-frontend-react--typescript)
  - [9.4 Docker Compose Orchestration](#94-docker-compose-orchestration)
  - [9.5 Monitoring Stack (Grafana + Prometheus)](#95-monitoring-stack-grafana--prometheus)
  - [9.6 Unified Environment Variables Reference](#96-unified-environment-variables-reference)
- [10. REST API & WebSocket Specification](#10-rest-api--websocket-specification)
- [11. Test Suite & Quality Assurance](#11-test-suite--quality-assurance)
- [12. Repository Structure](#12-repository-structure)
- [13. License](#13-license)

---

## 1. Overview

**AI Agent 24/7** is an enterprise-grade autonomous system engineered for uninterrupted execution with high availability, fault tolerance, and strict context isolation. The architecture pairs local, accelerated Large Language Model (LLM) inference via **NVIDIA NIM** (or any OpenAI-compatible provider) with deterministic cyclic graph orchestration powered by **LangGraph**.

### Architectural Highlights

- **Zero Vendor Lock-in:** Native support for on-premises deployment via NVIDIA NIM GPU microservices or hosted OpenAI-compatible APIs.
- **Security Hardening:** Proactive Server-Side Request Forgery (SSRF) prevention, cryptographic webhook signature validation (HMAC-SHA256), and filesystem-based secrets resolution (`_FILE` mounts).
- **Graceful Degradation:** Automatic failover to volatile in-memory storage if external dependencies (Redis or PostgreSQL) become unreachable, maintaining conversational continuity with operational health warnings.
- **Continuous Human-in-the-Loop:** Automated escalation detection with agent self-silencing, transactional ticket queues, and a real-time operator workspace.
- **Enterprise Web Experience:** Unified Single Page Application (SPA) built with React 19, TypeScript, shadcn/ui, Tailwind CSS, and TanStack Router, providing dashboards, chat playgrounds, tool management, and handoff consoles.

---

## 2. System Architecture

Data flow across system layers is decoupled into modular tiers:

```mermaid
flowchart TB
    subgraph INGRESS["Ingress Layer"]
        direction TB
        C_REST["REST API (/chat)"]
        C_WS["WebSocket (/ws/{session})"]
        C_VOICE["Audio Stream (/voice/chat)"]
        C_SLACK["Slack Webhook"]
        C_WA["WhatsApp Cloud API"]
    end

    subgraph GATEWAY["API Gateway & Control Plane (FastAPI)"]
        direction TB
        AUTH["Authentication (API Key / JWT)"]
        HMAC["HMAC Signature Verification"]
        RATELIMIT["Rate Limiter (Sliding Window)"]
        PROBES["Health Probes (/live, /ready)"]
        METRICS_EP["Metrics Exporter (/metrics)"]
        DASH_EP["Operations Console (/dashboard)"]
    end

    subgraph CORE["Decision Engine (LangGraph Engine)"]
        direction TB
        I18N["Heuristic Language Analyzer"]
        INTENT["Intent & Criticality Classifier"]
        MEM_RETRIEVE["Semantic Retriever"]
        LLM_NODE["Reasoning & Inference (NVIDIA NIM)"]
        TOOL_EXEC["Secure Tool Dispatcher"]
        PERSIST["Turn Persistence"]
    end

    subgraph STORAGE["Persistence Tier"]
        direction TB
        REDIS[("Redis\nShort-Term Sessions")]
        PGVEC[("PostgreSQL + pgvector\nPermanent Semantic Memory")]
        TICKETS[("Ticket Store\nHandoff Queue")]
    end

    subgraph EXTERNAL["External Services & Tooling"]
        direction TB
        PLAYWRIGHT["Playwright Headless Browser"]
        DYNAMIC["Runtime Tool Synthesis Engine"]
        INTEGRATIONS["Google APIs, GitHub, Slack"]
        WHISPER["Speech Recognition & Synthesis (STT/TTS)"]
    end

    INGRESS --> AUTH
    AUTH --> HMAC
    HMAC --> RATELIMIT
    RATELIMIT --> CORE

    CORE --> STORAGE
    CORE --> EXTERNAL
    CORE -.-> TICKETS
```

---

## 3. State Machine & Decision Graph (LangGraph)

The conversational lifecycle operates as a finite state machine with guarded cyclic iterations for multi-round tool calling:

```mermaid
stateDiagram-v2
    [*] --> ClassifyIntent: Inbound Message Received

    state ClassifyIntent {
        description: Evaluates active ticket presence or critical legal/churn vocabulary
    }

    ClassifyIntent --> PausedSession: Active Ticket Assigned to Human Operator
    ClassifyIntent --> HumanHandoff: Criticality Violation Detected
    ClassifyIntent --> RetrieveMemory: Standard Operational Dialogue

    state PausedSession {
        description: Appends message to session log without triggering LLM inference
    }
    PausedSession --> [*]

    state HumanHandoff {
        description: Generates transactional ticket, notifies Slack webhook, pauses agent
    }
    HumanHandoff --> PersistTurn

    state RetrieveMemory {
        description: Executes cosine distance vector search (<=>) in pgvector
    }
    RetrieveMemory --> PrepareContext

    state PrepareContext {
        description: Identifies client language and injects context into prompt
    }
    PrepareContext --> InferLLM

    state InferLLM {
        description: Executes NVIDIA NIM inference with tool schema definitions
    }

    InferLLM --> ExecuteTools: Tool Call Requested (rounds <= 5)
    InferLLM --> PersistTurn: Final User Response Produced

    state ExecuteTools {
        description: Validates parameters, executes tool with SSRF check and output limits
    }
    ExecuteTools --> InferLLM: Returns tool output to LLM context

    state PersistTurn {
        description: Updates Redis session buffer and commits embeddings to PostgreSQL
    }
    PersistTurn --> [*]: Dispatches Response to Origin Channel
```

---

## 4. Core Modules & Capabilities

### 4.1 Real-Time Voice Processing (STT + TTS)

Implemented in [`app/voice.py`](app/voice.py), the voice pipeline enables end-to-end spoken communication:
- **Speech-to-Text (STT):** The `POST /voice/chat` endpoint accepts multipart audio streams (`audio/mpeg`, `audio/wav`, `audio/ogg`). Audio payloads are processed via Whisper-compatible neural transcription.
- **Dialogue Processing:** The resulting transcript flows through the primary LangGraph agent, retaining session memory, tool calling, and handoff protections.
- **Text-to-Speech (TTS):** The generated text is synthesized into neural audio and encoded in Base64 within the JSON response, enabling immediate playback on client applications.

### 4.2 Headless Browser Automation (Playwright)

The [`PlaywrightBrowserTool`](app/tools/browser.py) provides full web automation beyond plain HTTP scrapers:
- **Dynamic Client Rendering:** Executes complete JavaScript runtimes using headless Chromium.
- **Granular Actions:** Supports structured text extraction (`extract_text`), selector clicking (`click`), form entry and submission (`fill_form`), and full-page screenshots (`screenshot`).
- **Anti-SSRF Protection:** Every target URL is validated via DNS resolution in `assert_public_url`, blocking loopback addresses, private networks (RFC 1918), link-local addresses, and cloud provider metadata endpoints (`169.254.169.254`).

### 4.3 Runtime Dynamic Tool Synthesis

The [`app/tools/dynamic.py`](app/tools/dynamic.py) engine allows the agent or operators to register new HTTP REST integrations without restarting the service:
- **`create_tool` Command:** Registers a new REST endpoint by providing its name, operational description, target URL, HTTP method, authentication headers, and JSON Schema parameters.
- **Dynamic Registration:** The synthesized tool is wrapped in a `DynamicHttpTool` instance and registered into the central registry (`app.tools.base.registry`), immediately available for subsequent inference rounds.
- **Protected Core:** Core tools (such as browser, search, and dynamic creation) are protected against accidental or malicious override.

### 4.4 Automatic Language Detection & Internationalization

Implemented in [`app/i18n.py`](app/i18n.py), ensuring consistent communication across multinational deployments:
- **Deterministic Detection:** Fast heuristic analysis based on vocabulary frequency and diacritical marks, supporting English (`en`), Portuguese (`pt`), Spanish (`es`), French (`fr`), German (`de`), and Italian (`it`).
- **Response Consistency:** The detected language is injected as a system constraint into the agent context, guaranteeing that the model responds in the user's language.
- **Localized System Messages:** System-level responses (rate limits, service errors, handoff notices) feature pre-computed translations in all supported languages.

### 4.5 Throughput Control & Rate Limiting

The sliding window rate limiter in [`app/ratelimit.py`](app/ratelimit.py) protects computational resources against denial-of-service and inference quota exhaustion:
- **Sliding Window Algorithm:** Uses timestamped queues with automated cleanup of expired windows and asynchronous concurrency locks.
- **Identity Hierarchy:** Identifies consumers by:
  1. API Key or JWT token (`Authorization: Bearer` or `X-API-Key`);
  2. Session identifier (`session_id`);
  3. Client IP address (`X-Forwarded-For` or network socket).
- **Standards Compliance:** In case of violation, returns `429 Too Many Requests` accompanied by `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.

### 4.6 Two-Tier Memory Architecture

Context retention combines low latency with long-term semantic persistence:

| Tier | Technology | Data Structure | Retention Policy | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Short-Term** | Redis | Session-indexed lists | 24-hour rolling TTL | Immediate dialogue buffer holding the last 20 messages of the active turn. |
| **Long-Term** | PostgreSQL + pgvector | 1024-dimension vectors with HNSW index | Permanent | Cosine distance search (`<=>`) retrieving historical facts, profile data, and preferences. |

When Redis or PostgreSQL is unavailable, the agent activates memory fallback adapters (`InMemorySessionStore` and `InMemoryTicketStore`), keeping services online in degraded mode with health warnings.

### 4.7 Human Handoff Escalation Protocol

When intent classification detects high churn risk, legal terminology, or explicit operator requests:
1. The agent creates a persistent transactional ticket in the ticket store;
2. An alert is dispatched via webhook (Slack or Microsoft Teams) containing ticket ID, channel origin, summary, and action URL;
3. The session is marked with `paused: true`, silencing automatic agent replies on that session;
4. Human operators claim and handle the conversation via the Web Console (`/handoff/ui`). Resolving the ticket restores automated agent operation.

---

## 5. Security & Infrastructure Hardening

- **Enterprise Secrets Management (`app/secrets.py`):** Transparent resolution of sensitive credentials via Docker Secrets / Kubernetes volume mounts (`/run/secrets/<name>`) or environment file paths (`<VAR>_FILE`). Blocks production startup if insecure default credentials are detected.
- **Hybrid Authentication:** Supports static API keys alongside enterprise JWT tokens (Clerk, Auth0, Okta), validating symmetric signatures (HS256) and asymmetric public key sets (RS256 via JWKS).
- **Cryptographic Webhook Verification (HMAC-SHA256):**
  - **Slack:** Validates `X-Slack-Signature` with timestamp validation (rejecting requests older than 300 seconds to stop replay attacks).
  - **WhatsApp Cloud API:** Validates `X-Hub-Signature-256` against the Meta App Secret.
- **SSRF Prevention:** Pre-flight DNS resolution blocks loopback, RFC 1918 private subnets, and cloud metadata IPs before dispatching outbound HTTP tool requests.

---

## 6. Observability & Telemetry

### 6.1 Prometheus Metrics

Exported at `/metrics` via [`app/metrics.py`](app/metrics.py):

- `agent_requests_total`: Total conversation turns partitioned by channel (`rest`, `ws`, `voice`, `slack`, `whatsapp`).
- `agent_request_duration_seconds`: Histogram of turn latency per channel (buckets: 50ms to 10s).
- `agent_tool_calls_total`: Tool invocations partitioned by tool name and status (`success`, `error`).
- `agent_ratelimit_exceeded_total`: Rejected requests partitioned by identity tier (`api_key`, `session`, `ip`).
- `agent_tickets_active`: Gauge of active tickets awaiting human resolution.
- `agent_dynamic_tools_total`: Number of dynamic tools registered at runtime.

### 6.2 Web Operations Console (`/dashboard`)

Built-in Single Page Application (SPA) serving real-time system metrics, responsive design tokens, and dark mode:
- Visual counters for requests, active tickets, registered tools, and rate limits;
- Dynamic inspection of registered tool schemas;
- Prometheus telemetry snapshot viewer and direct links to Grafana dashboards.

### 6.3 Pre-Provisioned Grafana Dashboards

Located in [`infra/grafana/`](infra/grafana/):
- **Datasource:** Automated mapping to the Prometheus instance (`http://prometheus:9090`).
- **Dashboard "AI Agent 24/7 Operations":** Visualizes channel throughput, latency quantiles (p50, p90, p95), tool success rates, and handoff ticket volumes.

---

## 7. Tool Catalog (Tool Calling)

| Identifier | Implementing Class | Primary Parameters | Description |
| :--- | :--- | :--- | :--- |
| `playwright_browser` | `PlaywrightBrowserTool` | `url`, `action`, `selector`, `text` | Full browser automation with JS execution, clicking, form submission, and text extraction. |
| `create_tool` | `CreateToolTool` | `name`, `description`, `url`, `method`, `parameters` | Synthesizes and registers a new REST API tool at runtime. |
| `web_search` | `WebSearchTool` | `query`, `max_results` | Performs live DuckDuckGo searches returning titles, snippets, and URLs. |
| `web_browse` | `WebBrowseTool` | `url` | Lightweight public HTML document extraction with anti-SSRF validation. |
| `slack_send_message` | `SlackTool` | `channel`, `text` | Posts corporate messages to Slack channels or direct messages via Bot Token. |
| `gmail` | `GmailTool` | `action`, `query`, `to`, `subject`, `body` | Reads, searches, and sends emails via Google Workspace REST API. |
| `google_calendar` | `CalendarTool` | `action`, `summary`, `start_time`, `end_time` | Manages appointments and checks schedules via Google Calendar. |
| `github` | `GitHubTool` | `action`, `repo`, `issue_number`, `title`, `body` | Lists, inspects, and creates issues across GitHub repositories. |
| `image_analysis` | `ImageAnalysisTool` | `image_url`, `prompt` | Multimodal analysis of images and documents via vision-enabled LLMs. |

---

## 8. Supported Integration Channels

1. **REST API (`POST /chat`):** Synchronous request-response endpoint for web applications and mobile clients.
2. **WebSocket (`ws://.../ws/{session_id}`):** Full-duplex connection supporting real-time streaming dialogue.
3. **Voice Audio (`POST /voice/chat`):** Multipart audio upload returning transcription and neural audio synthesis in Base64.
4. **Slack App (`POST /webhooks/slack`):** Listens to mentions and direct messages with automated challenge verification.
5. **WhatsApp Cloud API (`POST /webhooks/whatsapp`):** Official Meta Cloud API integration with verify token handshake and async delivery.

---

## 9. Installation & Deployment

### 9.1 Prerequisites

- Python 3.11 or higher
- Node.js 20+ and npm 10+ (for frontend development)
- Git
- Docker Engine and Docker Compose (recommended for local containerization)
- NVIDIA GPU with CUDA and NVIDIA Container Toolkit (optional, for local NIM inference)

---

### 9.2 Local Execution with Python

```bash
# 1. Clone repository
git clone https://github.com/CaioSouzx00/ai-agent-24-7.git
cd ai-agent-24-7

# 2. Configure environment file
cp .env.example .env

# 3. Create and activate virtual environment
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate

# 4. Install dependencies with development and tool extras
pip install -e ".[dev,tools]"

# 5. Install Playwright browser binaries
playwright install chromium

# 6. Start backend via Uvicorn
uvicorn app.main:app --reload --port 8080
```

---

### 9.3 Modern SPA Frontend (React + TypeScript)

The legacy HTML template system has been completely replaced with a high-performance **Single Page Application (SPA)** in [`web/`](web/), built with **React 19**, **TypeScript** (strict mode), **Vite**, **shadcn/ui**, **Tailwind CSS**, **TanStack Router**, **TanStack Query**, and **Zustand**.

The frontend enforces strict **Feature-Based** architectural boundaries checked by `eslint-plugin-boundaries`:
- `src/features/dashboard`: Operational metrics, latency/throughput KPIs, and Prometheus live snapshots.
- `src/features/handoff`: Human escalation workspace (status filtering, ticket claiming, live chat, and resolution).
- `src/features/chat`: Interactive conversational playground with channel selection and audio file upload.
- `src/features/tools`: Interactive tool registry catalog and dynamic tool creation modal.
- `src/shared/`: Reusable UI primitives (`shared/ui`), typed HTTP client (`shared/lib/api-client`), Zustand store, and formatters.
- `src/app/`: Application layout, dark mode provider, TanStack router, and global Command Palette (`Ctrl+K` / `Cmd+K`).

#### Frontend Workflow (`web/`)

```bash
# 1. Navigate to frontend workspace
cd web

# 2. Install dependencies
npm install

# 3. Start development server with HMR (runs on http://localhost:5173 with proxy to backend on :8080)
npm run dev

# 4. Regenerate TypeScript types from backend OpenAPI schema
npm run gen:api

# 5. Run typechecking, boundary linting, and unit test suite
npm run typecheck
npm run lint
npm test

# 6. Build production bundle (generates web/dist/)
npm run build
```

> **Production Integration:** When compiled with `npm run build`, FastAPI automatically discovers `web/dist/` and serves the SPA on `/`, `/dashboard`, and `/handoff/ui`, with static assets mounted on `/assets/`.

---

### 9.4 Docker Compose Orchestration

#### Standard Development Stack
Starts the agent with Redis and PostgreSQL (`pgvector`):

```bash
docker compose -f infra/docker-compose.yml up --build -d
```

#### Local GPU Inference (NVIDIA NIM)
Runs local LLM inference on host NVIDIA GPUs:

```bash
export NGC_API_KEY="your-nvidia-ngc-key"
docker compose -f infra/docker-compose.yml --profile gpu up -d
```

#### Production Hardened Profile
Uses [`infra/docker-compose.prod.yml`](infra/docker-compose.prod.yml) with resource quotas, replicas, internal network isolation, and filesystem secret mounts:

```bash
docker compose -f infra/docker-compose.prod.yml up -d
```

---

### 9.5 Monitoring Stack (Grafana + Prometheus)

Starts Prometheus and pre-configured Grafana dashboards:

```bash
docker compose -f infra/docker-compose.yml --profile monitoring up -d
```

- **Operations Dashboard & SPA Console:** `http://localhost:8080/dashboard` or `http://localhost:8080/`
- **Human Handoff Console (SPA):** `http://localhost:8080/handoff/ui`
- **Prometheus Server:** `http://localhost:9090`
- **Grafana Dashboard:** `http://localhost:3000` (Default credentials: `admin` / `admin`)
- **Interactive OpenAPI Documentation:** `http://localhost:8080/docs`

---

### 9.6 Unified Environment Variables Reference

All application settings are managed through environment variables or `.env` files. In containerized environments, any sensitive secret can be mounted from the filesystem using the `_FILE` suffix (e.g. `NIM_API_KEY_FILE=/run/secrets/nim_key`).

| Variable | Type | Default (Dev) | Required in Prod? | Description & Purpose |
| :--- | :---: | :---: | :---: | :--- |
| `APP_ENV` | `string` | `dev` | No | Target environment (`dev`, `prod`, `test`). Enforces strict production validation in `prod`. |
| `LLM_PROVIDER` | `string` | `nim` | No | LLM inference backend (`nim` or `openai`). |
| `NIM_BASE_URL` | `string` | `http://localhost:8000/v1` | Yes | Base URL for OpenAI-compatible LLM endpoint or NVIDIA NIM microservice. |
| `NIM_MODEL` | `string` | `meta/llama-3.1-8b-instruct` | No | Model identifier used in reasoning graphs. |
| `NIM_EMBED_MODEL` | `string` | `nvidia/nv-embedqa-e5-v5` | No | Embedding model used for pgvector semantic retrieval. |
| `NIM_API_KEY` | `string` | `not-needed-locally` | Yes (Cloud) | NVIDIA API key. Rejects placeholder strings in `prod`. |
| `REDIS_URL` | `string` | `redis://localhost:6379/0` | Recommended | Redis connection URI for session memory, ticket queues, and rate limiting. |
| `DATABASE_URL` | `string` | `postgresql://agent:agent@localhost:5432/agent` | Recommended | PostgreSQL connection URI with `pgvector` extension for long-term memory. |
| `API_KEYS` | `string` | `""` | Yes (or JWT) | Comma-separated list of static API keys for client authorization. |
| `JWT_SECRET` | `string` | `""` | Yes (or API_KEYS) | Shared HMAC-SHA256 secret for validating JWT client tokens. |
| `JWT_JWKS_URL` | `string` | `""` | Optional | JWKS URL for asymmetric public key verification (Clerk, Auth0, Okta). |
| `JWT_AUDIENCE` | `string` | `""` | Optional | Expected JWT `aud` audience claim. |
| `JWT_ISSUER` | `string` | `""` | Optional | Expected JWT `iss` issuer claim. |
| `SLACK_BOT_TOKEN` | `string` | `""` | Conditional | Slack bot token (`xoxb-...`) for posting messages via the Slack tool. |
| `SLACK_SIGNING_SECRET` | `string` | `""` | Conditional | Slack HMAC secret for validating inbound webhook signatures. |
| `SLACK_HANDOFF_WEBHOOK`| `string` | `""` | Optional | Incoming webhook URL (Slack/Teams) for immediate human escalation alerts. |
| `PUBLIC_URL` | `string` | `""` | Recommended | Public URL of the agent used for direct action links in escalation alerts. |
| `GITHUB_TOKEN` | `string` | `""` | Conditional | GitHub personal access token for issues and repository management tools. |
| `GOOGLE_ACCESS_TOKEN` | `string` | `""` | Conditional | Google OAuth access token for Gmail and Google Calendar tools. |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | `string` | `""` | Conditional | Path to Google Cloud Service Account JSON credentials file. |
| `GOOGLE_OAUTH_CREDENTIALS_FILE` | `string` | `""` | Conditional | Path to Google OAuth client credentials JSON file. |
| `WHATSAPP_TOKEN` | `string` | `""` | Conditional | Meta Graph / WhatsApp Cloud API Bearer access token. |
| `WHATSAPP_VERIFY_TOKEN`| `string` | `""` | Conditional | Verification token configured in Meta developer portal for webhook handshake. |
| `WHATSAPP_APP_SECRET` | `string` | `""` | Conditional | Meta App Secret for validating incoming payload HMAC signatures. |
| `VISION_MODEL` | `string` | `""` | Conditional | Multimodal model name for image analysis (activates `ImageAnalysisTool`). |
| `STT_MODEL` | `string` | `whisper-1` | Optional | Transcription model identifier for the `/voice/chat` pipeline. |
| `TTS_MODEL` | `string` | `tts-1` | Optional | Speech synthesis model identifier for the `/voice/chat` pipeline. |
| `TTS_VOICE` | `string` | `alloy` | Optional | Voice profile name (`alloy`, `echo`, `nova`, `onyx`, etc.). |
| `RATE_LIMIT_ENABLED` | `bool` | `true` | No | Enables the sliding window rate-limiting middleware. |
| `RATE_LIMIT_PER_MINUTE`| `int` | `60` | No | Maximum allowed requests per minute per key, session, or IP. |
| `TEMPORAL_ADDRESS` | `string` | `localhost:7233` | Conditional | Host address for Temporal workflow orchestrator and background worker. |
| `SENTRY_DSN` | `string` | `""` | Optional | Sentry DSN for centralized exception tracing in production. |

---

## 10. REST API & WebSocket Specification

| Endpoint | Method | Description | Authentication |
| :--- | :---: | :--- | :--- |
| `/health` | `GET` | Lightweight liveness probe. | Public |
| `/live` | `GET` | Container orchestrator liveness probe (Kubernetes/Docker). | Public |
| `/ready` | `GET` | Deep readiness probe verifying LLM, Redis, Postgres, and circuit breakers. | Public |
| `/metrics` | `GET` | Prometheus-formatted metrics scrape endpoint. | Public |
| `/dashboard` | `GET` | Single Page Application operations console and telemetry dashboard. | Public |
| `/tools` | `GET` | Dynamically generated Markdown documentation of registered tools. | Public |
| `/chat` | `POST` | Synchronous conversational turn with rate limiting. | API Key or JWT |
| `/voice/chat` | `POST` | Multipart audio upload returning transcription and neural speech audio. | API Key or JWT |
| `/ws/{session_id}` | `WS` | Full-duplex real-time WebSocket connection. | API Key or JWT |
| `/tools/dynamic` | `GET` | Lists schemas of all dynamic tools created at runtime. | API Key or JWT |
| `/tools/dynamic` | `POST` | Registers a new HTTP REST dynamic tool at runtime. | API Key or JWT |
| `/tools/dynamic/{name}` | `DELETE` | Removes and unregisters a dynamic tool from the registry. | API Key or JWT |
| `/handoff/ui` | `GET` | Human operator console workspace (SPA). | Public (Workspace) |
| `/handoff/tickets` | `GET` | Lists escalated tickets with optional status filtering. | API Key or JWT |
| `/handoff/tickets/{id}/claim` | `POST` | Claims a ticket assigning it to an operator. | API Key or JWT |
| `/handoff/tickets/{id}/reply` | `POST` | Sends a message from the operator to the client channel. | API Key or JWT |
| `/handoff/tickets/{id}/resolve` | `POST` | Resolves the ticket, re-enabling automatic agent operation. | API Key or JWT |
| `/webhooks/slack` | `POST` | Inbound event and mention webhook for Slack App. | Slack HMAC Signature |
| `/webhooks/whatsapp` | `GET/POST`| Verification handshake and inbound message webhook for Meta. | Meta HMAC Signature |

---

## 11. Test Suite & Quality Assurance

The codebase enforces strict quality gates through automated tests and static analysis.

### Running Automated Tests

The backend test suite includes **127 passing automated tests** across unit, integration, and end-to-end flows:

```bash
# Execute full test suite with verbose output
pytest -v

# Run test coverage analysis
pytest --cov=app --cov-report=term-missing

# Run frontend test suite
cd web && npm test
```

### Demonstration & Validation Utilities

```bash
# Terminal-based interactive dialogue demo with session persistence
python scripts/demo_chat.py

# Automated end-to-end human handoff lifecycle demonstration
python scripts/demo_handoff.py

# LLM smoke test verifying real model inference against configured endpoints
python scripts/smoke_llm.py

# Temporal worker for durable workflows
python scripts/temporal_worker.py
```

### Style & Static Analysis Compliance

The pre-commit pipeline enforces strict PEP 8 formatting and linting:

```bash
pre-commit run --all-files
```

- **Black:** Deterministic code formatting.
- **Ruff:** High-speed static analysis and linting.
- **isort:** Consistent import sorting.
- **ESLint & Boundaries:** Architecture boundary enforcement for the React SPA.

---

## 12. Repository Structure

```
ai-agent-24-7/
├── app/                                 # Backend application source code
│   ├── agent/                           # Agent core logic and graph definition
│   │   ├── graph.py                     # LangGraph state machine and routing nodes
│   │   └── handoff.py                   # Escalation detection and intent heuristics
│   ├── llm/                             # Inference abstraction layer
│   │   ├── base.py                      # LLMProvider, ToolCall, and LLMResponse protocols
│   │   └── nim.py                       # NVIDIA NIM and OpenAI-compatible client
│   ├── routers/                         # Modular REST API routers
│   │   ├── chat.py                      # Synchronous and WebSocket chat endpoints
│   │   ├── dashboard.py                 # Operations console router
│   │   ├── tools.py                     # Tool documentation and dynamic tool management
│   │   └── voice.py                     # Audio streaming and voice pipeline
│   ├── tools/                           # Executable agent tools
│   │   ├── base.py                      # Central tool registry and BaseTool contract
│   │   ├── browser.py                   # Playwright headless browser with SSRF protection
│   │   ├── dynamic.py                   # Runtime dynamic tool synthesis engine
│   │   ├── github.py                    # GitHub issues and repository integration
│   │   ├── google.py                    # Gmail and Google Calendar tools
│   │   ├── slack.py                     # Slack workspace messaging tool
│   │   ├── vision.py                    # Multimodal visual analysis tool
│   │   ├── web.py                       # Search and secure web content readers
│   │   └── integrations.py              # Tool registration and initialization
│   ├── channels.py                      # Dispatchers for Slack and WhatsApp delivery
│   ├── config.py                        # Pydantic settings and environment management
│   ├── dashboard.py                     # SPA serving and fallback handler
│   ├── handoff_api.py                   # Human handoff REST API endpoints
│   ├── health.py                        # Deep readiness checks and circuit breakers
│   ├── i18n.py                          # Heuristic language detector and localized copy
│   ├── main.py                          # FastAPI initialization, routing, and lifecycle
│   ├── memory.py                        # Redis session cache and pgvector semantic storage
│   ├── metrics.py                       # Prometheus metric instruments
│   ├── ratelimit.py                     # Sliding window throughput limiter
│   ├── secrets.py                       # Docker and filesystem secret resolution
│   ├── security.py                      # HMAC signature and JWT token validation
│   ├── tickets.py                       # Ticket persistence and escalation alerts
│   └── voice.py                         # Voice pipeline (Whisper STT + neural TTS)
│
├── web/                                 # Modern SPA Frontend (React 19, TypeScript, Tailwind)
│   ├── src/
│   │   ├── app/                         # Application layer (Router, Layout, Command Palette)
│   │   ├── features/                    # Feature-based domain modules
│   │   │   ├── dashboard/               # Live telemetry, KPI counters, Prometheus snapshots
│   │   │   ├── handoff/                 # Human operator workspace (tickets, claim, chat)
│   │   │   ├── chat/                    # Conversational playground with audio upload
│   │   │   └── tools/                   # Tool catalog and dynamic tool modal
│   │   ├── shared/                      # Shared reusable primitives
│   │   │   ├── ui/                      # Accessible design system (Radix UI + Tailwind CSS)
│   │   │   └── lib/                     # Typed OpenAPI client, Zustand store, formatters
│   │   └── styles/                      # CSS design tokens, typography, and dark mode theme
│   ├── package.json                     # Scripts (dev, build, lint, typecheck, test, gen:api)
│   └── vite.config.ts                   # Vite configuration with reverse proxy to backend
│
├── infra/                               # Infrastructure as Code and deployment assets
│   ├── Dockerfile                       # Hardened multi-stage production container
│   ├── docker-compose.yml               # Development composition (Redis, Postgres, pgvector)
│   ├── docker-compose.prod.yml          # Production composition with resource limits and replicas
│   ├── grafana/                         # Declarative Grafana provisioning
│   │   ├── dashboards/                  # Pre-configured operations dashboard JSON
│   │   └── provisioning/                # Datasource and provider mappings
│   └── prometheus/                      # Prometheus scraper configuration
│
├── scripts/                             # Operational and demonstration utilities
│   ├── demo_chat.py                     # Interactive CLI chat utility
│   ├── demo_handoff.py                  # End-to-end human handoff demonstration script
│   ├── google_oauth_setup.py            # Assistant for generating Google OAuth tokens
│   ├── smoke_llm.py                     # Inference smoke test against live LLMs
│   └── temporal_worker.py               # Worker for durable background workflows
│
├── docs/                                # Technical documentation and guides
│   ├── examples/                        # Prompts and reference implementations
│   │   └── prompts.md                   # Curated prompt catalog for tools
│   ├── architecture.md                  # Detailed architectural specification
│   └── ROADMAP.md                       # Project delivery roadmap and changelog
│
├── tests/                               # Comprehensive automated test suite (127 passing)
│   ├── test_browser_tool.py             # Playwright browser unit tests
│   ├── test_channels.py                 # Outbound channel delivery tests
│   ├── test_conditional_tools.py        # Conditional tool registration tests
│   ├── test_core.py                     # FastAPI router and core graph flow tests
│   ├── test_dashboard_and_dynamic_api.py# Dashboard endpoint and dynamic tools API tests
│   ├── test_dynamic_tools.py            # Dynamic tool synthesis engine tests
│   ├── test_github_tool.py              # GitHub API integration tests
│   ├── test_google_tools.py             # Gmail and Google Calendar tool tests
│   ├── test_handoff.py                  # Handoff lifecycle and escalation tests
│   ├── test_health.py                   # Health and readiness diagnostics tests
│   ├── test_i18n.py                     # Language detection and localization tests
│   ├── test_integration_real.py         # Real PostgreSQL and Redis integration tests
│   ├── test_jwt_auth.py                 # JWT validation (HS256/RS256) tests
│   ├── test_nim_client.py               # NVIDIA NIM client unit tests
│   ├── test_production.py               # Secrets resolution and production readiness tests
│   ├── test_ratelimit.py                # Sliding window rate limiter tests
│   ├── test_security.py                 # HMAC signature and API key security tests
│   ├── test_session_memory.py           # Redis session and pgvector memory tests
│   ├── test_temporal_e2e.py             # Temporal durable workflow and worker tests
│   ├── test_tools_loop.py               # Multi-round tool loop tests
│   ├── test_vision_tool.py              # Multimodal vision tool tests
│   └── test_voice.py                    # Voice pipeline (STT + TTS) end-to-end tests
│
├── .env.example                         # Documented sample environment variables
├── pyproject.toml                       # Project metadata, dependencies, and tooling configs
├── CONTRIBUTING.md                      # Contribution guidelines and engineering standards
└── LICENSE                              # Project license (MIT)
```

---

## 13. License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for terms of use and redistribution.
