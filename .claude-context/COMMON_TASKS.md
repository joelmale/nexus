# Common Development Tasks

## Layout & Styling
- Modifying component layouts in `src/components/`
- Updating styles in `src/styles/`
- Adding new CSS custom properties to `main.css`
- Responsive design adjustments in media queries
- Glassmorphism effect updates (backdrop-filter, glass surfaces)
- The right-side context panel automatically resizes to fit its content. This is handled in `ContextPanel.tsx` (measuring) and `GameLayout.tsx` (setting the `--sidebar-width` variable).

## Component Development
- Creating new React components with TypeScript interfaces
- Adding to existing components (GameLayout, ContextPanel, etc.)
- Managing component state with Zustand hooks
- Adding new panel types to ContextPanel system
- Creating reusable UI components with consistent styling
- Player management in Lobby panel (kick, DM permissions, connection status)
- **Enhanced dice rolling system**: advantage/disadvantage, modifiers, roll history
- **Chat system development**: message types, whispers, auto-scroll, timestamps
- **Sound effects integration**: volume control, categorized sound libraries
- **Mock player system**: development testing, connection simulation

## D&D VTT Feature Development
- **5e Dice Rolling**: Implementing advantage/disadvantage mechanics
- **Chat Features**: Adding message types, whisper targeting, roll integration
- **Sound Management**: Adding new sound categories and volume controls
- **Player Management**: Connection status, permission systems, mock testing
- **Initiative Tracking**: Turn order, combat rounds (planned)
- **Character Integration**: Character sheets, stats, abilities (planned)

## State Management
- Modifying game state in `src/stores/gameStore.ts`
- Adding new Zustand stores for different features
- Managing real-time state synchronization with WebSocket
- Creating custom hooks for state access
- Implementing state persistence for user preferences in `src/components/Settings.tsx`

## Asset Management
- Adding new game assets to `asset-server/`
- Configuring asset loading and caching in `src/components/AssetBrowser.tsx`
- Token and scene asset integration
- Optimizing asset delivery for performance
- Managing asset metadata and organization in `src/utils/assetManager.ts`

## Settings
- Adding new settings to `src/components/Settings.tsx`
- Creating new color schemes in `src/utils/colorSchemes.ts`
- Applying settings to components based on `useSettings` hook.

## Canvas & Scene Development
- Canvas rendering optimization
- Scene background and grid system
- Token positioning and movement
- Drag-and-drop interactions
- Zoom and pan controls

## Real-time Features
- WebSocket event handling in `src/utils/websocket.ts`
- State synchronization between players
- Conflict resolution for concurrent updates
- Player connection management in `src/components/Lobby.tsx`
- Game session persistence

## Common File Locations
- **Add new styles**: `src/styles/` 
- **Modify main layout**: `src/components/GameLayout.tsx`
- **Add panel content**: `src/components/ContextPanel.tsx` (includes Lobby, Dice, Chat, Sounds, Settings panels)
- **Update floating toolbar**: `src/components/GameToolbar.tsx`
- **Manage game state**: `src/stores/gameStore.ts`
- **Manage assets**: `src/components/AssetBrowser.tsx` and `src/utils/assetManager.ts`
- **Manage settings**: `src/components/Settings.tsx`
- **Add new scenes**: `src/components/Scene/`
- **Token functionality**: `src/components/Tokens/`
- **Type definitions**: `src/types/`
- **WebSocket services**: `src/utils/websocket.ts`

## Development Workflow
1. **Start dev server**: `npm run dev`
2. **Check types**: `npm run type-check`
3. **Lint code**: `npm run lint`
4. **Build for production**: `npm run build`

## Common CSS Classes to Use
- `.glass-surface` - Standard glassmorphism background
- `.glass-surface-strong` - More opaque glass surface
- `.glass-surface-hover` - Hover state for interactive elements
- `.glass-border` - Consistent border styling
- `.glass-text` - Primary text color
- `.glass-text-muted` - Secondary text color
- **Dice System**: `.dice-panel`, `.advantage-toggle`, `.dice-btn`, `.roll-result`
- **Chat System**: `.chat-panel`, `.message`, `.message-type-selector`
- **Sound System**: `.sounds-panel`, `.sound-btn`, `.volume-control`
- **Development**: `.dev-controls`, `.dev-btn` for testing features

## Design System Variables
- `--color-primary` - Primary brand color
- `--glass-surface` - Base glass surface
- `--glass-border` - Standard border color
- `--border-radius` - Standard border radius
- `--shadow-glass-lg` - Large glass shadow
- `--sidebar-width` - Dynamic sidebar width