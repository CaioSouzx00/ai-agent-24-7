# AI Agent 24/7 - Web Frontend (SPA)

Enterprise Single Page Application (SPA) for the AI Agent 24/7 platform, delivering real-time telemetry, human handoff management, an interactive chat playground, and dynamic tool synthesis.

---

## 1. Technology Stack

- **Core:** React 19 with TypeScript in strict mode
- **Build Tool:** Vite
- **Routing:** TanStack Router (type-safe routing)
- **Server State:** TanStack Query (caching, background refetching, optimistic updates)
- **Client State:** Zustand (operator credentials and UI state persisted in `localStorage`)
- **Forms & Schema Validation:** React Hook Form with Zod schemas
- **Component Primitives:** Radix UI accessible headless primitives (shadcn/ui architecture)
- **Styling:** Tailwind CSS with custom HSL design tokens, native dark mode, and glassmorphism
- **Typography:** Space Grotesk (display), Inter (interface), JetBrains Mono (code/metrics)
- **Animations:** Framer Motion for micro-interactions and transitions
- **Notifications:** Sonner toasts
- **Command Palette:** cmdk (`Ctrl+K` / `Cmd+K` global quick launcher)
- **Type Generation:** openapi-typescript (fully typed client from backend OpenAPI specification)
- **Unit Testing:** Vitest with React Testing Library and JSDOM
- **Linter & Architecture Guard:** ESLint with `eslint-plugin-boundaries`

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
