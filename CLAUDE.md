# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Run Electron app in development (hot-reload)
npm run build            # Build all 3 bundles (main, preload, renderer)
npm run typecheck        # TypeScript check both node and web targets
npm run typecheck:node   # TypeScript check main + preload (tsconfig.node.json)
npm run typecheck:web    # TypeScript check renderer (tsconfig.web.json)
npm run lint             # ESLint (.ts, .tsx)
npm run test             # Vitest (no tests exist yet)
```

## Architecture

Electron app with three process layers communicating over IPC:

```
Main (Node.js)  ←→  Preload (context bridge)  ←→  Renderer (React/Vite)
src/main/            src/preload/                   src/renderer/src/
```

**Shared code** lives in `src/shared/` (types, Drizzle schema, constants) and is imported by both main and renderer via the `@shared` path alias. The renderer also has `@/` aliased to `src/renderer/src/`.

### IPC Communication

The full IPC contract is defined as `IpcApi` and `IpcEvents` in `src/shared/types/index.ts`. This is the source of truth for all main↔renderer communication.

- **Request/response** (`ipcMain.handle`/`ipcRenderer.invoke`): CRUD operations, AI requests, settings
- **Push events** (`webContents.send`/`ipcRenderer.on`): AI streaming deltas, suggestions, insights, mutation plans

IPC handlers are registered in `src/main/ipc/registry.ts`. The preload script (`src/preload/index.ts`) exposes `window.api` via `contextBridge`. The renderer accesses all main-process functionality through `window.api.*`.

### Database

SQLite via better-sqlite3 + Drizzle ORM. Schema in `src/shared/schema/index.ts`. DB file is stored at `{userData}/pmhub.db`.

Tables are created via raw SQL in `src/main/database/connection.ts` (`createTables()`). Schema migrations use a `runMigrations()` function with try/catch for idempotency (catches "duplicate column" errors). When adding columns, follow this pattern rather than using Drizzle's migration tooling.

JSON columns are used for complex data (pros/cons arrays, metadata objects). DB uses snake_case; TypeScript uses camelCase with mapping in service layers.

### State Management

Three Zustand stores in `src/renderer/src/stores/`:
- `decisions.store` — Decision list + current decision CRUD
- `ai.store` — AI conversations, streaming state, suggestions/insights, mutation plans
- `settings.store` — API key, dark mode

The AI store initializes IPC event listeners for streaming via `initAIStreamListeners()`.

### AI Integration

Anthropic Claude API with streaming. Architecture in `src/main/ai/`:
- `client.ts` — SDK wrapper, API key validation
- `stream-handler.ts` — Streaming with tag parsing for structured extraction
- `prompts/` — System prompt generators per AI mode (tuner, brainstorm, coach, etc.)

AI responses embed structured data via custom tags parsed during streaming:
- `[SUGGESTION type="..."]...[/SUGGESTION]` — Actionable suggestion chips
- `[INSIGHT type="..." option="..."]...[/INSIGHT]` — Brainstorm insights
- `[MUTATION]JSON[/MUTATION]` — Structured mutations
- `[SCHEMA]JSON[/SCHEMA]` — Full schema drafts (crystallization)

### Idea Phases

Ideas progress through phases (stored in `decisions.phase` column):
1. **spark** — Initial idea capture, full-width TunerChat
2. **shaping** — Split view: TunerChat (60%) + BrainstormPreview (40%). Auto-transitions from spark after 3+ insights.
3. **structured** — Form editor + collapsible AI pane. Reached via crystallization.

The Tuner prompt (`src/main/ai/prompts/tuner.ts`) is phase-adaptive: it generates different system prompts based on the current phase.

### UI

- React 19, react-router-dom v7 with HashRouter
- Tailwind CSS 4 (new @theme syntax), dark mode via class-based theming
- Radix UI primitives, Lucide icons, Tiptap rich text editor
- Routes: `/` (home), `/ideas` (list), `/ideas/:id` (workspace), `/settings`

## Conventions

- User-facing text says "Idea" not "Decision" (internal code still uses `Decision` types/tables)
- The primary AI mode is "tuner" — other modes (brainstorm, coach, analyst, etc.) are secondary
- All AI modes are defined in `src/shared/constants/index.ts` (`AI_MODE`)
