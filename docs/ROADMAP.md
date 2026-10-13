# Plano de Desenvolvimento e Roadmap do Projeto

Este documento detalha o histórico de implementação, o estado atual das capacidades da plataforma e o planejamento estratégico para futuras versões do **AI Agent 24/7**.

Legenda de Status:
- `[Concluido]` Funcionalidade totalmente implementada, coberta por testes automatizados e validada.
- `[Em Andamento]` Funcionalidade em estágio avançado de desenvolvimento ou refinamento.
- `[Planejado]` Funcionalidade mapeada no planejamento estratégico para ciclos futuros.

---

## 1. Módulos Implementados e Estado Atual

### Fase 0: Governança, Estrutura e Infraestrutura de Qualidade
| Módulo | Descrição | Status |
|---|---|---|
| 0.1 Estrutura do Repositório | Definição da hierarquia de pacotes, arquivos de configuração e licença Apache 2.0 | `[Concluido]` |
| 0.2 Tooling de Qualidade | Configuração de Black, Ruff, isort e pre-commit hooks com limite estrito de estilo | `[Concluido]` |
| 0.3 Suíte de Testes | Configuração do Pytest com modo assíncrono nativo e cobertura de testes unitários | `[Concluido]` |

### Fase 1: Camada de Inferência e Provedores LLM
| Módulo | Descrição | Status |
|---|---|---|
| 1.1 NVIDIA NIM Client | Cliente assíncrono em `httpx` com suporte a streaming, parâmetros de geração e timeout configurável | `[Concluido]` |
| 1.2 Function Calling Estruturado | Parser e serializador de chamadas de função compatíveis com a especificação OpenAI | `[Concluido]` |
| 1.3 Abstração de Provedores | Interface base `LLMProvider` permitindo alternância entre NVIDIA NIM, OpenAI ou modelos locais | `[Concluido]` |
| 1.4 Modelo de Embeddings | Integração com `nvidia/nv-embedqa-e5-v5` para geração de vetores semânticos densos | `[Concluido]` |

### Fase 2: Orquestração de Agente e Persistência de Estado
| Módulo | Descrição | Status |
|---|---|---|
| 2.1 Grafo de Decisão (LangGraph) | Grafo com nós para detecção de transbordo, execução do modelo, chamada de ferramentas e finalização | `[Concluido]` |
| 2.2 Memória de Sessão de Curto Prazo | `SessionStore` baseado em Redis com fallback transparente para memória volátil em caso de indisponibilidade | `[Concluido]` |
| 2.3 Memória Semântica de Longo Prazo | `LongTermMemory` estruturado em PostgreSQL com extensão `pgvector` para recuperação de contexto histórico | `[Concluido]` |
| 2.4 Resiliência de Estado | Isolamento entre sessões de atendimento e corte configurável de histórico para controle de tokens | `[Concluido]` |

### Fase 3: Catálogo de Ferramentas e Integrações Externas
| Módulo | Descrição | Status |
|---|---|---|
| 3.1 Framework Base de Tools | Classes `BaseTool` e `ToolRegistry` com validação de esquema JSON Schema e execução assíncrona segura | `[Concluido]` |
| 3.2 Registro Condicional de Ferramentas | Exposição seletiva de integrações baseada na presença real de credenciais (GitHub, Gmail, Calendar, Vision) | `[Concluido]` |
| 3.3 Navegação e Busca Web | `web_browse` e `web_search` com proteção ativa contra requisições a redes privadas e metadados de nuvem (SSRF) | `[Concluido]` |
| 3.4 Automação com Playwright | `PlaywrightBrowserTool` para renderização completa de SPA/JavaScript, extração estruturada de DOM e screenshots | `[Concluido]` |
| 3.5 Integrações Colaborativas | `SlackTool` para envio de notificações e mensagens em canais operacionais | `[Concluido]` |
| 3.6 Ferramentas de Produtividade | `GmailTool` e `CalendarTool` para leitura/envio de emails e manipulação de eventos corporativos | `[Concluido]` |
| 3.7 Integração com GitHub | `GitHubTool` para consulta de repositórios, listagem e abertura automatizada de issues | `[Concluido]` |
| 3.8 Análise Visual Multimodal | `ImageAnalysisTool` com suporte a modelos de visão computacional da NVIDIA e OpenAI | `[Concluido]` |
| 3.9 Síntese Dinâmica de Ferramentas | `CreateToolTool` permitindo criação, registro em runtime e execução de novos utilitários pelo próprio agente | `[Concluido]` |

### Fase 4: Canais de Atendimento, Ingress e Segurança
| Módulo | Descrição | Status |
|---|---|---|
| 4.1 Arquitetura Modular de Routers | Separação do `main.py` em sub-roteadores dedicados (`chat`, `voice`, `tools`, `dashboard`) | `[Concluido]` |
| 4.2 API REST e WebSockets | Endpoint de conversação síncrona `POST /chat` e canal contínuo bidirecional `WebSocket /ws/{session_id}` | `[Concluido]` |
| 4.3 Webhook Slack | Suporte a recepção de eventos Slack com validação de assinatura criptográfica HMAC-SHA256 | `[Concluido]` |
| 4.4 Webhook WhatsApp / Meta | Endpoint de webhook com handshake de verificação e validação criptográfica de payload | `[Concluido]` |
| 4.5 Mecanismos de Autenticação | Suporte dual a tokens Bearer JWT (HS256) e API Keys estáticas, com modo estrito de produção | `[Concluido]` |
| 4.6 Controle de Vazão (Rate Limiting) | Middleware com algoritmo de janela deslizante em Redis e fallback local, emitindo cabeçalhos padrão IETF | `[Concluido]` |
| 4.7 Webhook Gmail Pub/Sub | Notificações push do Google Cloud Pub/Sub para processamento de emails recebidos e réplicas | `[Concluido]` |
| 4.8 Isolamento Multi-Tenancy | Isolamento de sessões, memória vetorial pgvector e tickets por `tenant_id` | `[Concluido]` |
| 4.9 Métricas de Negócio | Endpoint `/metrics/business`, telemetria de latência por ferramenta e contadores de transbordo | `[Concluido]` |

### Fase 5: Voz, Multimídia e Internacionalização
| Módulo | Descrição | Status |
|---|---|---|
| 5.1 Pipeline de Áudio (STT + TTS) | Endpoint unificado `POST /voice/chat` integrando transcrição, raciocínio do agente e síntese de voz | `[Concluido]` |
| 5.2 Provedores de STT | Suporte configurável a OpenAI Whisper, Deepgram e NVIDIA Riva | `[Concluido]` |
| 5.3 Provedores de TTS | Suporte configurável a ElevenLabs, OpenAI Audio e NVIDIA Riva | `[Concluido]` |
| 5.4 Internacionalização (i18n) | Detecção dinâmica de idioma (Português, Inglês, Espanhol, Francês e Alemão) com templates contextuais | `[Concluido]` |

### Fase 6: Protocolo de Transbordo Humano (Human Handoff)
| Módulo | Descrição | Status |
|---|---|---|
| 6.1 Detecção de Intenções Críticas | Interceptação em tempo real de mensagens que exigem suporte humano (jurídico, cancelamento, suporte avançado) | `[Concluido]` |
| 6.2 Persistência e Fila de Chamados | Armazenamento de tickets via `RedisTicketStore` com estados de ciclo de vida (`open`, `claimed`, `resolved`) | `[Concluido]` |
| 6.3 Silenciamento do Agente | Interrupção imediata de respostas automatizadas na sessão enquanto o ticket estiver em atendimento humano | `[Concluido]` |
| 6.4 Painel Administrativo Operacional | Interface web corporativa em `/dashboard` permitindo reivindicar chamados, responder clientes e resolver tickets | `[Concluido]` |

### Fase 7: Observabilidade, Monitoramento e Infraestrutura
| Módulo | Descrição | Status |
|---|---|---|
| 7.1 Probes de Saúde Kubernetes | Endpoints `/health`, `/live` e `/ready` com inspeção de conectividade de banco, cache e modelo | `[Concluido]` |
| 7.2 Métricas Prometheus | Coleta de métricas em tempo real (`/metrics`) com contadores de requisições, taxas de erro e latência | `[Concluido]` |
| 7.3 Dashboard Grafana | Painel de monitoramento executivo pré-configurado com visualizações de throughput, latência e status | `[Concluido]` |
| 7.4 Gestão de Segredos de Produção | Carregamento automático de credenciais a partir de arquivos montados (`*_FILE`) para conformidade em containers | `[Concluido]` |
| 7.5 Orquestração Temporal | Estrutura de workflows e worker assíncrono para tarefas de longa duração e tolerância a falhas | `[Concluido]` |

---

## 2. Planejamento Estratégico e Próximos Passos

### Versão 0.3.0 (Foco: Conectores Corporativos e Resiliência Distribuída)
- `[Planejado]` Conector nativo para sistemas de CRM (Salesforce Service Cloud e Zendesk Support).
- `[Planejado]` Suporte a streaming de áudio bidirecional em tempo real via WebRTC para chamadas telefônicas diretas.
- `[Planejado]` Camada de avaliação automatizada de qualidade de respostas (Ragas / TruLens) em pipeline de telemetria.
- `[Planejado]` Modo multi-inquilino (*multi-tenancy*) com isolamento de contexto de memória por organização.

### Versão 0.4.0 (Foco: Orquestração em Escala e Conformidade)
- `[Planejado]` Helm Charts oficiais e definições de Kubernetes Operator para implantação automatizada.
- `[Planejado]` Módulo de expurgo programado de dados e anonimização de dados pessoais para conformidade com LGPD e GDPR.
- `[Planejado]` Cache semântico de respostas de LLM baseado em similaridade vetorial para otimização de custos e latência.
- `[Planejado]` Suporte a modelos de raciocínio estendido (*Chain-of-Thought*) com exibição transparente de rastros analíticos.
