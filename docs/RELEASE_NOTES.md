# Release Notes

## Version 0.3.0

### Highlights

- **Modern React Single Page Application (SPA):**
  - Replaced legacy HTML templates with a unified React 19 + TypeScript frontend (`web/`).
  - Feature-Based Architecture (`features/dashboard`, `features/handoff`, `features/chat`, `features/tools`, `shared/ui`, `shared/lib`).
  - Enforced architectural boundaries via `eslint-plugin-boundaries` and `typescript-eslint`.
  - Global Command Palette (`Ctrl+K` / `Cmd+K`), dark mode persistency, and custom HSL design tokens.

- **Gmail Cloud Pub/Sub Webhook (Task 4.4):**
  - Added `POST /webhooks/gmail` supporting Google Cloud Pub/Sub push notification payloads.
  - Base64 payload decoding, verification token check via `GMAIL_PUBSUB_VERIFICATION_TOKEN`, and automatic background processing of inbound email events.
  - Outbound email delivery integration via `send_gmail` in `app/channels.py`.

- **Lightweight Multi-Tenancy:**
  - Tenant context isolation across conversation sessions (`tenant:{tenant_id}:session:{session_id}`).
  - Semantic vector search in PostgreSQL `pgvector` partitioned by `tenant_id`.
  - Escalation ticket isolation supporting filtering and querying by `tenant_id` (`X-Tenant-ID` header and query parameters).

- **Operational Business Telemetry:**
  - Added `GET /metrics/business` endpoint providing high-level operational metrics.
  - Histogram instrumentation for per-tool execution latency (`agent_tool_duration_seconds`).
  - Counter tracking for total handoffs partitioned by channel and tenant (`agent_handoffs_total`).
  - Top most-used tools ranking and 24h handoff activity summary.

- **OpenAPI Schema Examples & API Collections:**
  - Added comprehensive `json_schema_extra` examples to Pydantic models.
  - Published Postman Collection v2.1.0 ([`docs/postman_collection.json`](postman_collection.json)) and Insomnia Collection v4 ([`docs/insomnia_collection.json`](insomnia_collection.json)).

- **Security & Quality Hardening:**
  - Verification of production secret variables against default dev values in readiness probes.
  - 100% test pass rate across 127 automated backend tests and 8 frontend unit tests.

---

## Version 0.2.0

- Modular router extraction into `app/routers/` (`chat`, `voice`, `tools`, `dashboard`).
- Conditional tool registration based on presence of API credentials.
- Real PostgreSQL and Redis integration test support.
- Temporal workflow worker and durable workflows.
- Playwright headless browser tool with anti-SSRF protection.
