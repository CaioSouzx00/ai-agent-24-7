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
| 0.1 Estrutura do Repositório | Definição da hierarquia de pacotes, arquivos de configuração e licença MIT | `[Concluido]` |
| 0.2 Tooling de Qualidade | Configuração de Black, Ruff, isort e pre-commit hooks com limite estrito de estilo | `[Concluido]` |
| 0.3 Suíte de Testes | Configuração do Pytest com modo assíncrono nativo e 137 testes unitários/integração | `[Concluido]` |
| 0.4 Automação de Qualidade | Automação local com pre-commit e scripts de verificação rápida sem dependência de runners em nuvem | `[Concluido]` |

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
| 2.1 Grafo de Decisão (LangGraph) | Grafo cíclico com nós para detecção de transbordo, execução do modelo, chamada de ferramentas e finalização | `[Concluido]` |
| 2.2 Memória de Sessão de Curto Prazo | `SessionStore` baseado em Redis com fallback transparente para memória volátil em caso de indisponibilidade | `[Concluido]` |
| 2.3 Memória Semântica de Longo Prazo | `LongTermMemory` estruturado em PostgreSQL com extensão `pgvector` para recuperação de contexto histórico | `[Concluido]` |
| 2.4 Resiliência de Estado e Multi-Tenancy | Isolamento de histórico de conversação e contexto de memória particionado por `tenant_id` | `[Concluido]` |

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
| 3.9 Síntese Dinâmica de Ferramentas | `CreateToolTool` permitindo criação, registro em runtime e execução de novas ferramentas HTTP pelo agente | `[Concluido]` |

### Fase 4: Canais de Atendimento, Ingress, Segurança e Governança
| Módulo | Descrição | Status |
|---|---|---|
| 4.1 Arquitetura Modular de Routers | Separação do `main.py` em sub-roteadores dedicados (`chat`, `voice`, `tools`, `dashboard`) | `[Concluido]` |
| 4.2 API REST e WebSockets | Endpoint de conversação síncrona `POST /chat` e canal contínuo bidirecional `WebSocket /ws/{session_id}` | `[Concluido]` |
| 4.3 Webhook Slack | Suporte a recepção de eventos Slack com validação de assinatura criptográfica HMAC-SHA256 | `[Concluido]` |
| 4.4 Webhook WhatsApp / Meta | Endpoint de webhook com handshake de verificação e validação criptográfica de payload | `[Concluido]` |
| 4.5 Webhook Gmail Cloud Pub/Sub | Endpoint `POST /webhooks/gmail` com recepção de notificações push, verificação de token e réplica por email | `[Concluido]` |
| 4.6 Mecanismos de Autenticação | Suporte dual a tokens Bearer JWT (HS256) e API Keys estáticas, com modo estrito de validação em produção | `[Concluido]` |
| 4.7 Controle de Vazão (Rate Limiting) | Middleware com algoritmo de janela deslizante em Redis e fallback local, emitindo cabeçalhos padrão IETF | `[Concluido]` |
| 4.8 Isolamento Multi-Tenancy Leve | Particionamento e isolamento de sessões, memória vetorial pgvector e tickets por `tenant_id` | `[Concluido]` |
| 4.9 Métricas e Telemetria de Negócio | Endpoint `GET /metrics/business`, telemetria de latência p95/avg por ferramenta e taxas de transbordo 24h | `[Concluido]` |
| 4.10 Documentação Interativa e Coleções | Exemplos ricos OpenAPI e coleções completas exportadas para Postman v2.1 e Insomnia v4 | `[Concluido]` |

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
| 6.2 Persistência e Fila de Chamados | Armazenamento de tickets via `RedisTicketStore` e `InMemoryTicketStore` com estados de ciclo de vida (`open`, `claimed`, `resolved`) | `[Concluido]` |
| 6.3 Silenciamento do Agente | Interrupção imediata de respostas automatizadas na sessão enquanto o ticket estiver sob atendimento humano | `[Concluido]` |
| 6.4 API REST de Gestão de Tickets | Endpoints para listagem, claim, reply e resolve de chamados com suporte a filtragem por tenant | `[Concluido]` |

### Fase 7: Frontend Moderno (Single Page Application em React + TypeScript)
| Módulo | Descrição | Status |
|---|---|---|
| 7.1 Arquitetura Feature-Based | Organização modular em `web/` com isolamento estrito entre features (`dashboard`, `handoff`, `chat`, `tools`) | `[Concluido]` |
| 7.2 Design System Acessível | Interface em modo escuro nativo com Radix UI, Tailwind CSS, Lucide Icons e tipografia moderna | `[Concluido]` |
| 7.3 Painel Operacional em Tempo Real | Monitoramento visual de status dos nós, métricas de Prometheus e contadores de tickets | `[Concluido]` |
| 7.4 Console de Handoff Humano | Workspace de atendimento ao vivo permitindo aos operadores assumir conversas e responder aos clientes | `[Concluido]` |
| 7.5 Playground Conversacional | Chat interativo com suporte a texto, anexos, upload de áudio e visualização de chamadas de ferramentas | `[Concluido]` |
| 7.6 Catálogo e Gestão de Tools | Visualização de esquemas de ferramentas disponíveis e criação dinâmica de novas ferramentas HTTP | `[Concluido]` |

### Fase 8: Observabilidade, Resiliência e Infraestrutura
| Módulo | Descrição | Status |
|---|---|---|
| 8.1 Probes de Saúde Kubernetes | Endpoints `/health`, `/live` e `/ready` com inspeção de conectividade de banco, cache, modelo e segredos | `[Concluido]` |
| 8.2 Métricas Prometheus | Coleta de métricas em tempo real (`/metrics`) com contadores de requisições, taxas de erro e latência | `[Concluido]` |
| 8.3 Dashboard Grafana | Painel de monitoramento executivo pré-configurado com visualizações de throughput, latência e status | `[Concluido]` |
| 8.4 Gestão de Segredos de Produção | Carregamento automático de credenciais a partir de arquivos montados (`*_FILE`) para Docker e Kubernetes Secrets | `[Concluido]` |
| 8.5 Testes de Integração Real | Suíte de testes com instâncias reais de PostgreSQL (pgvector) e Redis validando persistência e cache | `[Concluido]` |
| 8.6 Orquestração Temporal E2E | Worker assíncrono e workflows duráveis integrados ao ecossistema Temporal para tarefas resilientes | `[Concluido]` |

---

## 2. Planejamento Estratégico e Próximos Passos

### Versão 0.3.x (Foco: Conectores Corporativos e Telefonia)
- `[Planejado]` Conectores nativos bidirecionais para plataformas de CRM (Salesforce Service Cloud e Zendesk Support).
- `[Planejado]` Streaming de áudio bidirecional em tempo real via WebRTC para integração com sistemas de telefonia (SIP/VoIP).
- `[Planejado]` Framework de avaliação automatizada de qualidade e alinhamento de respostas LLM (Ragas / DeepEval).

### Versão 0.4.0 (Foco: Orquestração em Escala, Otimização e Conformidade)
- `[Planejado]` Helm Charts oficiais e Kubernetes Operator para provisionamento e auto-scaling horizontal em clusters K8s.
- `[Planejado]` Cache semântico de inferência vetorial para redução de latência e consumo de tokens em perguntas frequentes.
- `[Planejado]` Módulo de anonimização e expurgo programado de dados para conformidade estrita com LGPD e GDPR.
- `[Planejado]` Suporte a modelos de raciocínio estendido (*Chain-of-Thought*) com exibição transparente de rastros analíticos.
