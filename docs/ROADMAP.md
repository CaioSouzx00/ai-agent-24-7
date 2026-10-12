# Roadmap / Board

Legend: ✅ done · 🟡 skeleton (TODO) · ⬜ pending

| Phase | Task | Status |
|---|---|---|
| 0 | 0.1–0.5 Repo, structure, .gitignore/LICENSE/pyproject, pre-commit, CONTRIBUTING/CoC | ✅ |
| 1 | 1.1 Install NIM (see README) | 🟡 |
| 1 | 1.2 Python client (`app/llm/nim.py`) | ✅ |
| 1 | 1.3 Function calling: mocked tests ✅; real LLM via `scripts/smoke_llm.py` | 🟡 needs API key/GPU |
| 1 | 1.4 `LLMProvider` | ✅ |
| 1 | 1.5 Local LLM docs | ✅ |
| 2 | 2.1 FastAPI + health | ✅ |
| 2 | 2.2 LangGraph | ✅ |
| 2 | 2.3 Redis sessions (`SessionStore`, in-memory fallback) | ✅ wired into graph |
| 2 | 2.4 pgvector (`LongTermMemory`) | ✅ unit-tested; not run against a live Postgres yet |
| 2 | 2.5 Core tests | ✅ |
| 3 | 3.1 BaseTool / 3.8 Registry | ✅ |
| 3 | 3.2 Web (fetch+search), 3.5 Slack | ✅ (no headless browser) |
| 3 | 3.3 Gmail, 3.4 Calendar, 3.6 GitHub, 3.7 Vision | 🟡 stubs (not exposed to LLM) |
| 4 | 4.1 REST+WS (API-key auth), 4.2 Slack, 4.3 WhatsApp (signature verified) | ✅ |
| 4 | 4.4 Pub/Sub, 4.5 user auth (Clerk/Auth0) | ⬜ API keys only for now |
| 5 | 5.1 Temporal | 🟡 `app/workflows.py` |
| 5 | 5.2 DLQ, 5.3 ✅ readiness (`/ready`) + compose healthcheck, 5.4 logs/Sentry | 🟡 Sentry via DSN |
| 5 | 5.5 Prometheus (`/metrics`) | ✅ |
| 6 | 6.1 Detection | ✅ (keywords) |
| 6 | 6.2–6.4 Ticket, alerting, human UI | ⬜ |
| 7 | 7.1 Docker | ✅ |
| 7 | 7.2, 7.3, 7.4 (CI/CD removed for now), 7.5 Deploy/secrets | ⬜ |
| 8 | 8.2 Diagrams | ✅ `docs/architecture.md` |
| 8 | 8.1, 8.3, 8.4, 8.5 | 🟡 / ⬜ |
