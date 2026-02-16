# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                 # Run Tauri app in development (Vite HMR + Rust backend)
pnpm build               # Build production Tauri app (.dmg/.exe/.AppImage)
pnpm build:vite          # Build frontend only (tsc + vite build)
pnpm typecheck           # TypeScript check (tsc --noEmit)
pnpm lint                # ESLint (.ts, .tsx)
pnpm test                # Vitest (no tests exist yet)
cd src-tauri && cargo check  # Check Rust backend compiles
```

## Architecture

Tauri v2 app with Rust backend + React frontend:

```
Rust Backend (src-tauri/)  ←→  invoke()  ←→  React Frontend (src/)
  DB, settings, export           Tauri IPC       Components, stores, AI client
```

**Shared code** lives in `src/shared/` (types, constants) and is imported via the `@shared` path alias. The `@/` alias points to `src/`.

### Tauri IPC

Frontend calls Rust backend via `invoke()` from `@tauri-apps/api/core`. All invoke wrappers are in `src/api/commands.ts`. There are 28 commands total:
- 6 decision commands, 3 each for options/evidence/assumptions/stakeholders
- 6 AI conversation commands (CRUD + threads)
- 4 settings commands (SQLite-based API key management)
- 1 export command

### Database

SQLite via `rusqlite` (Rust) with bundled FTS5. Schema in `src-tauri/src/db/schema.rs`. DB file is stored at `{appDataDir}/pmhub.db`.

Tables are created via raw SQL in `schema.rs` (`create_tables()`). Migrations use `run_migrations()` with error matching for idempotency (catches "duplicate column" / "already exists"). When adding columns, follow this pattern.

JSON columns are used for complex data (pros/cons arrays, metadata objects). DB uses snake_case; Rust models use `#[serde(rename_all = "camelCase")]` for automatic conversion to frontend camelCase.

### State Management

Three Zustand stores in `src/stores/`:
- `decisions.store` — Decision list + current decision CRUD
- `ai.store` — AI conversations, streaming state, canvas state
- `settings.store` — API key, dark mode

### AI Integration

Anthropic Claude API with **frontend-side streaming** via `@anthropic-ai/sdk` + `@tauri-apps/plugin-http` (bypasses CORS). No IPC streaming events — the AI store directly calls the Anthropic SDK.

Architecture in `src/api/`:
- `ai-client.ts` — SDK wrapper with Tauri HTTP fetch, API key validation
- `stream-parser.ts` — Tag parsing for `[CANVAS]` and `[TITLE]` extraction
- `prompts/` — System prompt generators per AI mode (tuner, brainstorm, freeform)

AI responses embed structured data via custom tags parsed during streaming:
- `[CANVAS]JSON[/CANVAS]` — Structured idea canvas (options, assumptions, evidence, etc.)
- `[TITLE]text[/TITLE]` — Auto-generated idea title

### API Key Storage

Stored in the `app_settings` SQLite table (previously used `keyring` crate, but macOS keychain silently fails for unsigned Tauri apps). The `get_api_key` command returns a masked version for display; `get_api_key_raw` returns the full key. The frontend settings store caches the raw key in memory to avoid repeated DB reads.

### Idea Phases

Ideas progress through phases (stored in `decisions.phase` column):
1. **spark** — Initial idea capture, full-width TunerChat
2. **shaping** — Split view: TunerChat (60%) + Canvas (40%). Auto-transitions from spark after 3+ insights.

The Tuner prompt (`src/api/prompts/tuner.ts`) is phase-adaptive: it generates different system prompts based on the current phase.

### UI

- React 19, react-router-dom v7 with HashRouter
- Tailwind CSS 4 (new @theme syntax), dark mode via class-based theming
- Radix UI primitives, Lucide icons, Tiptap rich text editor
- Tauri `data-tauri-drag-region` for window dragging (not CSS `-webkit-app-region`)
- Routes: `/` (home), `/ideas` (list), `/ideas/:id` (workspace), `/settings`

## Conventions

- User-facing text says "Idea" not "Decision" (internal code still uses `Decision` types/tables)
- The primary AI mode is "tuner" — other modes (brainstorm, freeform) are secondary
- All AI modes are defined in `src/shared/constants/index.ts` (`AI_MODE`)
- Frontend uses `pnpm` as package manager

# currentDate
Today's date is 2026-02-15.
