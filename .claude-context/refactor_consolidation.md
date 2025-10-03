# Project Cleanup & Refactoring Log

This document logs the actions taken to clean up and refactor the Nexus project structure based on the user-provided plan.

## 1. File Archiving

To declutter the project root without permanently deleting potentially useful files, a number of files and directories were moved into a `_delete` directory. A `restore_log.md` was created within it to facilitate restoration if needed.

**Items Moved to `_delete`:**
- `.eslintrc.cjs.backup`
- `playwright-report/`
- `test-results/`
- `src/styles/scenes.textClipping`
- `character-creation-demo.md`
- `tailwind-performance-plugin.md`
- `test-lifecycle.html`
- `test-migration.js`

*Note: `.claude-context` was preserved at the user's request during the initial cleanup, though this log is now being added to it.*

## 2. Directory Reorganization

To improve project structure and organization, several files were consolidated into their appropriate directories.

### Script Consolidation
- **Action:** Moved shell scripts (`check-ports.sh`, `organize-assets.sh`, `setup.sh`, `start-dev.sh`) from the project root into the `/scripts` directory.
- **Follow-up:** Updated all corresponding script paths in `package.json` to prevent breaking npm commands.

### Docker Configuration Consolidation
- **Action:** Moved `docker-compose.yml`, `docker-compose.dev.yml`, and `docker-compose.test.yml` from the project root into the `/docker` directory.
- **Follow-up:** Updated all `docker-compose` command paths in both `package.json` and the `Makefile` to point to the new locations.

## 3. CSS Refactoring (Phase 1: Foundation)

Based on the `CSS_AUDIT_REPORT.md`, the foundational phase of the CSS refactoring was completed to establish a modern, maintainable stylesheet architecture.

### Key Actions:
1.  **Created `src/styles/reset.css`:** A dedicated file for all CSS reset/normalization rules was created. The old reset rules were removed from `critical.css`.
2.  **Created `src/styles/accessibility.css`:** Consolidated all accessibility-related rules (`:focus-visible`, `.sr-only`, `@media (prefers-contrast)` etc.) into a single, dedicated stylesheet. Redundant rules were removed from `critical.css` and `main.css`.
3.  **Implemented CSS Layers:** `main.css` was completely rewritten to act as a pure entry point for all stylesheets. It now defines a clear cascade layer order (`@layer reset, tokens, base, ...`) and imports every stylesheet into its designated layer. This provides robust control over specificity and follows modern best practices as recommended by the audit.

This completes the foundational CSS refactoring, creating a solid base for any future CSS work.
