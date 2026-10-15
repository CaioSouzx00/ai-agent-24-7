# Checklist de Qualidade, Segurança e Governança

Este documento consolida o checklist oficial de segurança, resiliência, validação de dados e experiência do usuário (UX) adotado no ecossistema **AI Agent 24/7**.

---

## 1. Autenticação e Sessão
- [x] **Rotas protegidas no front E no back**: APIs críticas (`/chat`, `/handoff/tickets`, `/tools/dynamic`, `/metrics/business`) exigem autenticação via JWT ou API Key.
- [x] **Tratamento de 401/403 e Auto-logout**: O cliente HTTP centralizado intercepta respostas 401/403, limpa as credenciais salvas no `localStorage`, encerra a sessão global e notifica o usuário via toast amigável.
- [x] **Logout completo**: A ação de logout limpa tokens, chaves de API, identificação de atendente e abre o modal de autenticação para reingresso.
- [x] **Navegação pós-logout**: O estado de sessão no frontend invalida o acesso a dados protegidos e limpa a memória temporária.

## 2. Formulários e Validação
- [x] **Validação no front E no back**: Backend valida via Pydantic com limites estritos (`min_length`, `max_length`), e o frontend valida via schemas Zod e React Hook Form.
- [x] **Mensagens de erro claras por campo**: Campos com formato inválido recebem feedback contextual inline com instruções claras para o usuário.
- [x] **Prevenção de duplo clique**: Botões de submit (envio de chat, resposta a chamados e cadastro de ferramentas) permanecem desabilitados durante o envio assíncrono (`isPending` / `isLoading`).
- [x] **Trim e normalização de inputs**: Remoção de espaços em branco antes do envio (`.trim()` no front e `@field_validator` com strip no backend).
- [x] **Limites de tamanho e tipo**: Textos possuem teto rígido (4.000 caracteres para mensagens de chat/atendimento, 64 caracteres para identificadores, 2.048 para URLs).

## 3. Tratamento de Erros e Resiliência
- [x] **Estados de loading, erro e vazio**: Toda tela que consulta o servidor possui skeletons de carregamento, cards de erro com botão de repetição (`Tentar novamente`) e mensagens amigáveis para listas vazias.
- [x] **Mensagens amigáveis para falha de rede**: Usuário é avisado em linguagem clara quando o servidor estiver temporariamente inacessível.
- [x] **Tratamento profissional de exceções**: Zero uso de `console.log` como substituto de tratamento de erro no frontend; erros são emitidos via Sonner toasts e painéis de estado.
- [x] **Página 404 e Error Boundary**:
  - `ErrorBoundary` no React captura exceções em tempo de execução evitando tela branca.
  - Página 404 editorial dedicada (`NotFoundView`) renderizada para rotas não mapeadas.
- [x] **Prevenção de vazamento de stack trace**: Middleware global do FastAPI captura exceções não tratadas retornando `{"detail": "Internal Server Error"}` limpo, logando o trace apenas internamente no servidor.

## 4. Segurança Básica
- [x] **Zero segredos em commits**: Arquivo `.env` ignorado no `.gitignore`. Arquivo `.env.example` restrito a valores demonstrativos/placeholders. O módulo `app/secrets.py` barra inicialização com credenciais padrão em produção.
- [x] **Queries parametrizadas**: Acesso a banco de dados PostgreSQL/pgvector via queries parametrizadas com `asyncpg` (`$1, $2, $3::vector`), eliminando riscos de injeção SQL.
- [x] **CORS restrito em produção**: `CORSMiddleware` configurado no FastAPI com verificação que bloqueia `*` em ambiente de produção (`APP_ENV=prod`).
- [x] **Rate limit deslizante**: Limitador sliding-window em memória ativo nas rotas sensíveis (`/chat`, `/ws/{session_id}`, `/tools/dynamic`, `/handoff/tickets`).
- [x] **Proteção de credenciais**: Comparação de chaves com `hmac.compare_digest` para mitigar ataques de timing; nenhuma senha em texto puro em logs.

## 5. Qualidade do Código
- [x] **Código limpo**: Zero `console.log`, zero `print()` e zero `TODO` esquecido no código ativo.
- [x] **Isolamento de ambientes**: Configurações divididas entre `dev`, `test` e `prod` via `app/config.py`.
- [x] **Suítes de Lint e Testes**: 100% dos testes aprovados (Pytest 137 testes, Vitest 8 testes, ESLint e Ruff sem violações).
- [x] **Commits Convencionais**: Histórico de commits no padrão `feat:`, `fix:`, `chore:`, `style:`, `docs:`.

## 6. Fluxo e UX
- [x] **Confirmação antes de ação destrutiva**:
  - Diálogo de confirmação antes de excluir ferramentas dinâmicas.
  - Diálogo de confirmação antes de finalizar chamados humanos.
- [x] **Feedback visual de sucesso**: Notificações toast ao salvar configurações, registrar ferramentas, enviar respostas e resolver chamados.
- [x] **Design Responsivo para Mobile**:
  - Menu hambúrguer móvel para navegação completa em telas menores que 1024px.
  - Alternância inteligente entre a lista de chamados e a tela de conversa no atendimento humano com botão de retorno.
- [x] **Paginação de listas**: Lista de tickets com paginação via botão `[CARREGAR MAIS (+20 CHAMADOS)]` e suporte a `limit`/`offset` na API do backend.
