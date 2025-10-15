Project Summary
Nexus VTT is a feature-rich virtual tabletop for Dungeons & Dragons 5th Edition. The project has successfully completed its foundational phase (Phase 0), including Dockerization, a robust CI/CD pipeline, and a modern CSS architecture built on design tokens. The team is currently in Phase 1, implementing core gameplay features.

Recent major accomplishments include a complete character sheet and creation wizard, a fully functional 3D dice rolling system, and a critical fix for session persistence that prevents data loss on refresh. The most urgent issue is a broken drag-and-drop feature on the main game toolbar. The project's architecture is well-documented, but a significant technical challenge remains: game scenes are stored globally in IndexedDB without being tied to specific game rooms, causing data leakage between sessions.

Immediate Task List (Action Items)
🔴 URGENT: Fix Toolbar Drag Functionality

Issue: The drag handle on the GameToolbar does not work correctly, causing the toolbar to jump to an incorrect position.

Location: src/components/GameToolbar.tsx

Next Step: Previous attempts have failed. The consensus is to try a proven library like react-draggable to resolve this issue quickly.

🟡 High Priority: Implement Props Panel

Status: In the planning phase, ready for implementation.

Action: Begin work on the core data layer (gameStore.ts) and scene rendering (PropRenderer.tsx) as outlined in the Props Panel Implementation Plan.

🟡 High Priority: Address Global Scene Storage

Issue: Scenes are not isolated between game rooms, causing scenes from old games to appear in new ones.

Action: Refactor the storage model to associate scenes with a roomCode. This will involve schema migration for the Scene entity in IndexedDB and updating all data-fetching logic to filter by the current room.

Recently Completed Actions
🎲 3D Dice Box Integration: Successfully integrated the @3d-dice/dice-box library for animated 3D dice rolls, resolving complex CSS positioning and API usage issues.

✅ Zustand Store Refactor: Merged the duplicative appFlowStore into gameStore, creating a single source of truth for application state and eliminating manual synchronization.

🎨 CSS Architecture Overhaul: Completed a massive 4-week migration to a modern CSS system using design tokens, atomic utilities, and a critical-path loading strategy, resulting in a 40% CSS size reduction.

👤 Advanced Character Creation Wizard: Implemented a full-featured, multi-step wizard for D&D 5e character creation with randomization and IndexedDB persistence.

🔄 Session Persistence System: Fixed a critical bug preventing session recovery. The system now robustly saves game state to the server and recovers it on page refresh.

🖱️ Unified Selection Model: Refactored the canvas interaction logic to use a single, unified selection state (selectedObjectIds) for all object types (tokens, drawings, etc.), fixing numerous selection bugs.

⚔️ Initiative Tracker: A complete D&D 5e initiative tracker has been implemented and is fully functional.

Key Architectural Patterns & Decisions
State Management:

Zustand: The primary state management library.

Single Store: The project has been refactored to use a single, unified gameStore for all application state. Other stores like characterStore and initiativeStore handle specific domains.

Styling:

Design Tokens: A comprehensive system of over 500 CSS custom properties (src/styles/design-tokens.css) governs all styling (colors, spacing, typography).

Glassmorphism: The default theme for UI panels.

Z-Index System: A documented layering system (Z-Index Layer System) using CSS variables (--z-panel, --z-toolbar, etc.) must be followed to prevent UI stacking issues.

Data Storage: The application uses a three-layer storage model:

Zustand (In-Memory): For live application state.

localStorage: For quick session recovery data (e.g., roomCode, userId).

IndexedDB: For persistent game data like characters and scenes.

KNOWN ISSUE: The IndexedDB implementation lacks session isolation, making it the most significant piece of technical debt.

Asynchronous Operations:

Server Discovery: In development, the frontend uses an HTTP health check to automatically discover which port (5000-5003) the WebSocket server is running on, making local setup much smoother.

Future Roadmap & Planned Features
Core Features:

Chat System with whispers, roll integration, and markdown support.

Enhanced Token Panel with a library browser and stat block overlays.

Medium-Term Goals:

Sound Effects Panel for DMs.

Props Panel for placing objects like furniture and traps on the map.

Dynamic Lighting and Fog of War controls.

Long-Term Goals:

Import/Export System: Integrate with D&D Beyond, Roll20, and PDFs.

Mob Management: A monster database and encounter builder for DMs.

Full Multiplayer Enhancements: Move from in-memory server state to a persistent PostgreSQL database to support horizontal scaling and robust host migration.

Visual Character Builder: An avatar system for creating custom character portraits and tokens.
