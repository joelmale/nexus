# Nexus File Structure Guide

## Key Directories
```
nexus/
├── src/
│   ├── components/          # React components
│   │   ├── GameLayout.tsx   # Main layout with header + resizable sidebar
│   │   ├── ContextPanel.tsx # Right sidebar with panel content
│   │   ├── GameToolbar.tsx  # Floating draggable toolbar
│   │   ├── AssetBrowser.tsx # Asset browser for maps and tokens
│   │   ├── Assets.tsx       # Logo and icon components
│   │   ├── DiceRoller.tsx   # Dice rolling panel
│   │   ├── Icons.tsx        # SVG icons
│   │   ├── Layout.tsx       # Main layout wrapper
│   │   ├── Lobby.tsx        # Lobby and session management
│   │   ├── Placeholder.tsx  # Placeholder for unimplemented features
│   │   ├── PlayerBar.tsx    # Floating player bar
│   │   ├── Settings.tsx     # Settings panel
│   │   ├── Scene/          # Scene management components
│   │   │   ├── SceneCanvas.tsx
│   │   │   └── SceneTabs.tsx
│   │   └── Tokens/         # Token-related components
│   ├── stores/             # Zustand state management
│   │   └── gameStore.ts    # Main game state
│   ├── styles/             # CSS files
│   │   ├── main.css        # Global styles + CSS variables
│   │   ├── game-layout.css # Layout-specific styles
│   │   └── toolbar.css     # Toolbar styling
│   ├── types/              # TypeScript type definitions
│   └── services/           # API and WebSocket services
├── server/                 # Node.js backend
├── shared/                 # Shared types between client/server
├── asset-server/          # Static asset serving
└── .claude-context/       # AI assistant context files
```

## Key Files to Read for Context
1. `src/components/GameLayout.tsx` - Main layout structure
2. `src/components/ContextPanel.tsx` - Panel system
3. `src/components/Lobby.tsx` - Session management
4. `src/stores/gameStore.ts` - Application state
5. `src/styles/main.css` - Design system variables
6. `package.json` - Dependencies and scripts

## Component Hierarchy
```
Layout
└── GameLayout (main container, if connected)
    ├── Header
    │   ├── SceneTabs (left)
    │   └── HorizontalPanelTabs (right)
    ├── SceneCanvas
    │   ├── PlayerBar
    │   └── GameToolbar
    └── ContextPanel (resizable/draggable sidebar)
        ├── DiceRoller
        ├── Settings
        ├── LobbyPanel
        └── Placeholder (for other panels)
Lobby (if not connected)
```