# Agent Guidelines for Nexus VTT

## Build/Lint/Test Commands

- **Build**: `npm run build` (TypeScript + Vite)
- **Lint**: `npm run lint` (ESLint with TypeScript)
- **Type Check**: `npm run type-check` (TypeScript noEmit)
- **All Tests**: `npm run test` (Vitest)
- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration`
- **E2E Tests**: `npm run test:e2e` or `npm run test:playwright`
- **Single Test**: `vitest run <path-to-test-file>`
- **Test Watch**: `npm run test:watch`
- **Test Coverage**: `npm run test:coverage`

## Code Style Guidelines

- **Language**: TypeScript with strict mode enabled
- **Framework**: React with JSX (react-jsx)
- **Imports**: Use `@/` alias for absolute imports from src/
- **Formatting**: Prettier (semi: true, trailingComma: "all", singleQuote: true, printWidth: 80, tabWidth: 2)
- **Linting**: ESLint with TypeScript recommended + React hooks rules
- **Naming**: camelCase variables/functions, PascalCase components/classes, UPPER_SNAKE_CASE constants
- **Types**: Strict typing required, use interfaces for complex objects, avoid `any` (warn level)
- **Error Handling**: try/catch blocks with console.error logging
- **Unused Vars**: Error level, ignore args prefixed with `_`
- **Commits**: Conventional commits (feat, fix, improvement, docs, style, test, chore, ci) max 72 chars
