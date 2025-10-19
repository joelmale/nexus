# Agent Guidelines for Nexus VTT

## Build/Lint/Test Commands

- **Build**: `npm run build` (TypeScript + Vite)
- **Lint**: `npm run lint` (ESLint)
- **Type Check**: `npm run type-check` (TypeScript noEmit)
- **All Tests**: `npm run test` (Vitest)
- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration`
- **E2E Tests**: `npm run test:e2e`
- **Single Test**: `vitest run <path-to-test-file>`
- **Test Watch**: `npm run test:watch`

## Code Style Guidelines

- **Language**: TypeScript (strict mode)
- **Framework**: React (react-jsx)
- **Imports**: `@/` alias for src/ absolute imports
- **Formatting**: Prettier (semi, trailingComma: "all", singleQuote, printWidth: 80, tabWidth: 2)
- **Editor**: 2-space indentation, LF line endings, UTF-8, trim trailing whitespace
- **Linting**: ESLint + TypeScript recommended + React hooks
- **Naming**: camelCase vars/functions, PascalCase components, UPPER_SNAKE_CASE constants
- **Types**: Strict typing, interfaces for objects, avoid `any` (warn)
- **Error Handling**: try/catch with console.error
- **Unused Vars**: Error level, ignore `_` prefixed args
- **Commits**: Conventional commits max 72 chars
