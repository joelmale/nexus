# Common Development Tasks

## Layout & Styling
- Modifying component layouts in `src/components/`
- Updating styles in `src/styles/`
- Adding new CSS custom properties to `main.css`
- Responsive design adjustments in media queries
- Glassmorphism effect updates (backdrop-filter, glass surfaces)

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
- Implementing state persistence for user preferences

## Asset Management
- Adding new game assets to `asset-server/`
- Configuring asset loading and caching
- Token and scene asset integration
- Optimizing asset delivery for performance
- Managing asset metadata and organization

## Canvas & Scene Development
- Canvas rendering optimization
- Scene background and grid system
- Token positioning and movement
- Drag-and-drop interactions
- Zoom and pan controls

## Real-time Features
- WebSocket event handling
- State synchronization between players
- Conflict resolution for concurrent updates
- Player connection management
- Game session persistence

## Common File Locations
- **Add new styles**: `src/styles/` 
- **Modify main layout**: `src/components/GameLayout.tsx`
- **Add panel content**: `src/components/ContextPanel.tsx` (includes Lobby, Dice, Chat, Sounds panels)
- **Update floating toolbar**: `src/components/GameToolbar.tsx`
- **Manage game state**: `src/stores/gameStore.ts`
- **Add new scenes**: `src/components/Scene/`
- **Token functionality**: `src/components/Tokens/`
- **Type definitions**: `src/types/`
- **WebSocket services**: `src/services/`

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