# Roadmap / Board

Legenda: ✅ esqueleto/feito · 🟡 esqueleto (TODO) · ⬜ pendente

| Fase | Task | Status |
|---|---|---|
| 0 | 0.1–0.5 Repo, estrutura, .gitignore/LICENSE/pyproject, pre-commit, CONTRIBUTING/CoC | ✅ (0.1: criar remoto no GitHub) |
| 1 | 1.1 Instalar NIM (ver README) | 🟡 |
| 1 | 1.2 Cliente Python (`app/llm/nim.py`) | ✅ |
| 1 | 1.3 Teste de function calling com LLM real | ⬜ |
| 1 | 1.4 `LLMProvider` | ✅ |
| 1 | 1.5 Docs de LLM local | ✅ |
| 2 | 2.1 FastAPI + health | ✅ |
| 2 | 2.2 LangGraph | ✅ |
| 2 | 2.3 Sessão Redis (`SessionStore`) | 🟡 não plugada |
| 2 | 2.4 pgvector (`LongTermMemory`) | 🟡 |
| 2 | 2.5 Testes do core | ✅ |
| 3 | 3.1 BaseTool / 3.8 Registry | ✅ |
| 3 | 3.2–3.7 Web, Gmail, Calendar, Slack, GitHub, Vision | 🟡 stubs |
| 4 | 4.1 REST+WS, 4.2 Slack, 4.3 WhatsApp | ✅ básico (sem assinatura) |
| 4 | 4.4 Pub/Sub, 4.5 Auth | ⬜ |
| 5 | 5.1 Temporal | 🟡 `app/workflows.py` |
| 5 | 5.2 DLQ, 5.3 readiness real, 5.4 logs/Sentry | 🟡 Sentry via DSN |
| 5 | 5.5 Prometheus (`/metrics`) | ✅ |
| 6 | 6.1 Detecção | ✅ (keywords) |
| 6 | 6.2–6.4 Ticket, alerta, UI humano | ⬜ |
| 7 | 7.1 Docker, 7.4 CI | ✅ |
| 7 | 7.2, 7.3, 7.5 Deploy/secrets | ⬜ |
| 8 | 8.2 Diagramas | ✅ `docs/architecture.md` |
| 8 | 8.1, 8.3, 8.4, 8.5 | 🟡 / ⬜ |
