# AI Agent 24/7 - Web Frontend (SPA)

Enterprise Single Page Application (SPA) for the AI Agent 24/7 platform, delivering real-time telemetry, human handoff management, an interactive chat playground, and dynamic tool synthesis.

---

## 1. Technology Stack & Creative Design System

- **Art Direction:** Dark Editorial Brutalist com paleta **Acid Volt & Obsidian Carbon** (`#040405` e `#D4FF00`).
- **Core:** React 19 com TypeScript em modo estrito
- **Smooth Scroll & Motion:** Lenis smooth scroll, Framer Motion com easing editorial `[0.76, 0, 0.24, 1]`, cursor magnético contextual e malha topográfica 2D reativa em canvas.
- **Build Tool:** Vite com proxy dinâmico integrado para desenvolvimento
- **Routing:** TanStack Router & roteamento de rota SPA limpo
- **Server State:** TanStack Query (caching, background refetching, optimistic updates)
- **Client State:** Zustand (credenciais do operador e estado da UI em `localStorage`)
- **Forms & Schema Validation:** React Hook Form com esquemas Zod
- **Typography:** Instrument Serif (display), Syne (subtítulos e masthead), Space Grotesk (corpo) e JetBrains Mono (código e telemetria)
- **Command Palette:** cmdk (`Ctrl+K` / `Cmd+K` terminal de comandos rápido)
- **Unit Testing:** Vitest com React Testing Library e JSDOM (100% dos testes passando)

---

## 2. Visual Tour das Telas

| Tela / Módulo | Captura em Alta Resolução |
| :--- | :--- |
| **01. Início / Manifesto (`/`)** | ![Início](../docs/images/preview-hero.png) |
| **02. Telemetria (`/dashboard`)** | ![Telemetria](../docs/images/preview-dashboard.png) |
| **03. Chat do Agente (`/chat`)** | ![Chat](../docs/images/preview-chat.png) |
| **04. Atendimento Humano (`/handoff`)** | ![Handoff](../docs/images/preview-handoff.png) |
| **05. Ferramentas (`/tools`)** | ![Ferramentas](../docs/images/preview-tools.png) |

---

## 2. Feature-Based Architecture

The source code in `src/` enforces strict architectural boundaries to avoid coupling and circular dependencies:

```
src/
├── app/                  # Application layer: Layout, TanStack router, Command Palette, Providers
├── features/             # Domain modules (Feature-Based)
│   ├── dashboard/        # Operational metrics, KPI counters, Prometheus snapshots
│   ├── handoff/          # Operator ticket console (status filtering, claim, live chat, resolve)
│   ├── chat/             # Conversational playground (REST and audio streaming)
│   └── tools/            # Tool catalog and dynamic tool creation modal
├── shared/               # Cross-cutting reusable assets
│   ├── ui/               # Design system primitives (Button, Input, Badge, Card, Command, etc.)
│   ├── lib/              # Central typed api-client, auth-store, date/time formatters
│   └── config/           # Route paths, API endpoints, and configuration constants
└── styles/               # HSL theme variables, typography, and utility classes
```

### Boundary Rules Enforced by Linter

- `shared/` modules cannot import from `features/` or `app/`.
- `features/` modules cannot import from `app/`.
- Features communicate through well-defined exports.

---

## 3. Development & Build Commands

```bash
# Install dependencies
npm install

# Start development server with Hot Module Replacement (HMR)
# Runs on http://localhost:5173 with proxy to backend on http://localhost:8080
npm run dev

# Regenerate TypeScript API types from backend OpenAPI schema
npm run gen:api

# Type-check TypeScript files
npm run typecheck

# Run architecture boundary and code quality linter
npm run lint

# Run unit tests
npm test

# Build production bundle (outputs to web/dist/)
npm run build

# Preview production build locally
npm run preview
```

---

## 4. Production Integration with Backend

When built via `npm run build`, production assets are emitted to `web/dist/`.

The FastAPI backend automatically serves:
- `web/dist/index.html` on routes `/`, `/dashboard`, and `/handoff/ui`;
- Static bundles and stylesheets on `/assets/*`;
- Fallback content for headless environments where the front has not been pre-compiled.
