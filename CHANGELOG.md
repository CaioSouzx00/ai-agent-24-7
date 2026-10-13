# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato segue as diretrizes do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Planejado
- Conectores nativos para Salesforce e Zendesk.
- Streaming de áudio bidirecional via protocolo WebRTC.
- Módulo de auditoria e anonimização de dados pessoais (LGPD/GDPR).

---

## [0.3.0] - 2026-10-13

### Added
- **Single Page Application em React:** Interface web moderna desenvolvida com React 19, TypeScript, Tailwind CSS, Radix UI e TanStack Router em `web/`, estruturada sob arquitetura feature-based (`dashboard`, `handoff`, `chat`, `tools`).
- **Webhook Gmail Cloud Pub/Sub:** Ingress em `POST /webhooks/gmail` para notificações push do Google Cloud Pub/Sub com autenticação via token Bearer/query parameter, decodificação base64 e réplica assíncrona por email.
- **Isolamento Multi-Tenancy Leve:** Suporte a `tenant_id` em toda a plataforma, garantindo isolamento de contexto de histórico em Redis, persistência semântica no PostgreSQL (`pgvector`) e filas de tickets de transbordo.
- **Telemetria e Métricas de Negócio:** Endpoint dedicado `GET /metrics/business`, contadores Prometheus de transbordo (`agent_handoffs_total`), histograma de latência por ferramenta (`agent_tool_duration_seconds`) e agregador analítico em memória com janela deslizante.
- **Coleções de API e Exemplos OpenAPI:** Exportação de coleções completas em `docs/postman_collection.json` e `docs/insomnia_collection.json`, além de exemplos interativos adicionados aos esquemas do OpenAPI (`/docs`).
- **Pipeline de Integração Contínua (CI):** Configuração de workflow no GitHub Actions (`.github/workflows/ci.yml`) validando formatação com Black/Ruff/isort, tipagem estática e execução do pytest e vitest.
- **Orquestração e Testes de Resiliência:** Testes de integração com instâncias reais de PostgreSQL (pgvector) e Redis, além de validação ponta a ponta de workflows duráveis com Temporal.

---

## [0.2.0] - 2026-10-13

### Added
- **Registro Condicional de Ferramentas:** Ferramentas que dependem de credenciais externas (`github`, `gmail`, `google_calendar`, `image_analysis`) agora só são registradas no catálogo de tools se as credenciais correspondentes estiverem configuradas no ambiente.
- **Automação Headless com Playwright:** Introdução da ferramenta `playwright_browser` (`app/tools/browser.py`) com suporte a renderização de JavaScript, navegação, preenchimento de formulários e captura de telas.
- **Pipeline de Voz em Tempo Real (STT + TTS):** Módulo de processamento de áudio (`app/voice/`) e endpoint dedicado `POST /voice/chat`, integrando transcrição (Whisper, Deepgram, Riva) e sintetização vocal (ElevenLabs, OpenAI, Riva).
- **Internacionalização e Detecção de Idioma:** Módulo `app/i18n.py` com detecção heurística multilingue (Português, Inglês, Espanhol, Francês e Alemão) e injeção automática de diretrizes no prompt do sistema.
- **Controle de Vazão (Rate Limiting):** Middleware de limitação de requisições baseado no algoritmo de janela deslizante em Redis com fallback em memória volátil e cabeçalhos padrão IETF (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).
- **Síntese Dinâmica de Ferramentas:** Ferramenta `create_tool` (`app/tools/dynamic.py`) permitindo a criação e o registro em tempo de execução de novas ferramentas Python pelo próprio agente.
- **Painel Executivo de Métricas Grafana:** Dashboard pré-configurado (`infra/grafana/dashboards/ai-agent-overview.json`) e métricas Prometheus enriquecidas com labels de canal, código de status e latência.
- **Gestão de Segredos de Produção:** Suporte para carregamento seguro de credenciais via sistema de arquivos (`*_FILE`) compatível com Docker Secrets e Kubernetes Secrets (`app/production.py`).
- **Suíte de Testes Expandida:** Novos testes unitários e de integração cobrindo registro condicional de ferramentas, pipeline de voz, Playwright, i18n, rate limiting e criação dinâmica de ferramentas.

### Changed
- **Desacoplamento do Orquestrador de Execução:** Criação do módulo `app/runner.py` centralizando a lógica de invocação do grafo LangGraph e emissão de telemetria Prometheus.
- **Atualização da Documentação:** Reescrita completa do `README.md` e do `docs/ROADMAP.md` em padrão corporativo formal e objetivo.

### Refactored
- **Modularização de Routers FastAPI:** Extração dos endpoints contidos em `app/main.py` para sub-roteadores dedicados em `app/routers/`:
  - `app/routers/chat.py`: Endpoints REST (`POST /chat`) e WebSocket (`/ws/{session_id}`).
  - `app/routers/voice.py`: Endpoint de processamento de áudio (`POST /voice/chat`).
  - `app/routers/tools.py`: Descoberta e gerenciamento dinâmico de ferramentas (`/tools`, `/tools/dynamic`).
  - `app/routers/dashboard.py`: Console operacional para atendimento humano (`/dashboard`).

### Security
- **Proteção SSRF Ativa:** Validação estrita em ferramentas de navegação web bloqueando faixas de IP privadas (RFC 1918) e endereços de metadados de provedores cloud.
- **Validação de Assinaturas Criptográficas:** Verificação HMAC-SHA256 estrita para webhooks do Slack e WhatsApp.
- **Modo Estrito de Produção:** Bloqueio de inicialização em caso de credenciais inseguras ou ausentes quando `APP_ENV=production`.

---

## [0.1.0] - 2026-04-15

### Added
- Estrutura inicial do projeto com suporte básico a FastAPI e NVIDIA NIM.
- Grafo preliminar em LangGraph com detecção inicial de palavras-chave.
- Memória de sessão em Redis e armazenamento vetorial com pgvector.
- Ferramentas fundamentais: busca web, navegação básica e integração com Slack.
- Endpoints de probe de saúde e métricas iniciais de Prometheus.
