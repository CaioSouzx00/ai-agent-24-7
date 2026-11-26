# Web application

The `web/` directory contains the React single page application for AI Agent 24/7. It provides the editorial landing page, chat, operational dashboard, analytics, human handoff, and dynamic tool management screens. The backend serves the production bundle from `web/dist/` after a build.

## Stack

- React 19 and TypeScript in strict mode
- Vite 8 for development and production builds
- TanStack Query for server state; Zustand for local state
- React Hook Form and Zod for dynamic tool forms and input schemas
- Recharts for analytics visualizations
- Vitest, React Testing Library, and JSDOM for frontend tests

Navigation is implemented in `src/app/router.tsx` with the browser History API. Features are organized under `src/features/`; shared UI, API access, state, and motion utilities live under `src/shared/`.

## Setup and commands

Use Node.js 20.19+ or 22.12+. From this directory:

```bash
npm ci
npm run dev
```

Vite serves the application at `http://localhost:5173` and proxies backend requests to `http://127.0.0.1:8080`. Start the backend separately for API-backed screens.

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript compiler
npm test           # Vitest
npm run build      # Typecheck and production bundle in dist/
npm run preview    # Serve the built bundle locally
npm run gen:api    # Regenerate API types from openapi.json
```

## Module boundaries

- `src/app/` owns providers, application layout, navigation, and command palette.
- `src/features/` owns each user-facing feature and its API, schemas, state, and components.
- `src/shared/` contains reusable UI and utilities. Shared modules must not import application or feature modules; features must not import the application root. ESLint enforces these boundaries.
- `src/test/` contains test setup and application smoke tests.
