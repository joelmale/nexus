# Repository Guidelines

## Project Structure & Modules
- App entry in `src/main.tsx`; UI split into `src/components`, `src/actions`, `src/hooks`, `src/stores`, `src/services`, and `src/utils`.
- Backend runtime lives in `server/` (Express, WebSocket, PostgreSQL helpers) with build output in `dist/server`.
- Assets in `public/` and `src/assets`; tests under `tests/unit` and `tests/integration`.
- Docs and ops notes in `docs/`, `DEPLOYMENT.md`, and `LOCAL-DEV-GUIDE.md`.

## Build, Test, and Dev Commands
- `npm install` — install deps (Node 20+ required).
- `npm run dev` — Vite dev server for the client.
- `npm run server:dev` — watch and run the Node server locally.
- `npm run start:all` — orchestrates client + server and ensures Postgres is up (uses Docker).
- `npm run build` / `npm run build:server` / `npm run build:all` — production builds.
- `npm run lint`, `npm run type-check` — static checks.
- `npm run test`, `npm run test:unit`, `npm run test:integration`, `npm run test:coverage`, `npm run test:ci` — Vitest suites.

## Coding Style & Naming
- TypeScript everywhere; prefer functional React components and hooks.
- Follow ESLint + Prettier defaults (`npm run lint` to autofix staged files via lint-staged).
- Keep Zustand stores per domain (`src/stores`) and colocate feature utilities.
- Components and stores use descriptive names (`CharacterLibrary`, `campaignStore`); avoid abbreviations.
- Glassmorphism styling via existing CSS variables; keep new styles scoped and theme-consistent.

## Testing Guidelines
- Unit tests in `tests/unit/**`; integration flows in `tests/integration/**`.
- Name tests after the unit under test (e.g., `CharacterLibrary.test.tsx`).
- Use Vitest + Testing Library; favor realistic user interactions and clear expectations.
- Run `npm run test:ci` before PRs to mirror pipeline coverage + lint + types.

## Commit & Pull Request Practices
- Commit messages follow simplified Conventional Commits: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, etc. (see `CONTRIBUTING.md`).
- Prefer small, focused commits describing intent and key changes.
- PRs should include: summary of changes, testing performed, screenshots/GIFs for UI, and linked issues/tickets.
- Keep PRs scoped to one feature/fix; update docs when behavior or commands change.
