# Agent Guidelines for Nexus VTT

## Build/Lint/Test Commands

- **Build**: `npm run build` (TypeScript + Vite)
- **Lint**: `npm run lint` (ESLint with max 100 warnings)
- **Type Check**: `npm run type-check` (TypeScript strict mode)
- **All Tests**: `npm run test` (Vitest)
- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration`
- **E2E Tests**: `npm run test:e2e` (Playwright)
- **Single Test**: `vitest run <path-to-test-file>`
- **Test Watch**: `npm run test:watch`
- **Test Coverage**: `npm run test:coverage` (80% thresholds)
- **Layout Tests**: `npm run test:layout`

## Code Style Guidelines

- **Language**: TypeScript (strict mode enabled)
- **Framework**: React (react-jsx transform)
- **Imports**: `@/` for src/, additional aliases: `@/components`, `@/stores`, `@/types`, `@/utils`, `@/services`
- **Formatting**: Prettier (semi: true, trailingComma: "all", singleQuote: true, printWidth: 80, tabWidth: 2)
- **Editor**: 2-space indentation, LF line endings, UTF-8, trim trailing whitespace, insert final newline
- **Linting**: ESLint + TypeScript recommended + React hooks + React refresh
- **Naming**: camelCase vars/functions, PascalCase components/classes, UPPER_SNAKE_CASE constants
- **Types**: Strict typing required, interfaces for objects, `@typescript-eslint/no-explicit-any`: warn
- **Error Handling**: try/catch blocks with console.error logging
- **Unused Vars**: Error level, ignore args prefixed with `_`
- **Commits**: Conventional commits, max 72 characters

## Additional Rules

- No Cursor rules (.cursor/ or .cursorrules not found)
- No Copilot rules (.github/copilot-instructions.md not found)
