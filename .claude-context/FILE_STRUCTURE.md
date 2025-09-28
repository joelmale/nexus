# Nexus File Structure Guide

## Key Directories
```
nexus/
├── src/
│   ├── components/          # React components
│   │   ├── GameLayout.tsx   # Main layout with header + resizable sidebar
│   │   ├── ContextPanel.tsx # Right sidebar with panel content
│   │   ├── PlayerPanel.tsx  # Player and character management
│   │   ├── GameToolbar.tsx  # Floating draggable toolbar
│   │   ├── AssetBrowser.tsx # Asset browser for maps and tokens
│   │   ├── DiceRoller.tsx   # Dice rolling panel
│   │   ├── Scene/          # Scene management components
│   │   └── ...
│   ├── stores/             # Zustand state management
│   │   └── gameStore.ts    # Main game state
│   ├── styles/             # CSS files
│   │   └── main.css        # Global styles + CSS variables
│   ├── types/              # TypeScript type definitions
│   ├── services/           # API and WebSocket services
│   │   └── sessionPersistence.ts # Handles all client-side logic for saving and recovering game sessions using localStorage.
│   └── ...
├── server/                 # Node.js backend
├── shared/                 # Shared types between client/server
│   └── types.ts            # Contains TypeScript interfaces used by both the Node.js backend and the React frontend to ensure type safety in real-time communication.
├── asset-server/          # Static asset serving
└── .claude-context/       # AI assistant context files
```

## Key Files to Read for Context
1. `src/components/GameLayout.tsx` - Main layout structure
2. `src/components/ContextPanel.tsx` - Panel system
3. `src/components/PlayerPanel.tsx` - Player and character management
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
        ├── PlayerPanel
        └── ...
Lobby (if not connected)
```
