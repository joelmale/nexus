# Nexus File Structure Guide

## Key Directories
```
nexus/
├── src/
│   ├── components/          # React components
│   │   ├── GameLayout.tsx   # Main layout with header + resizable sidebar
│   │   ├── ContextPanel.tsx # Right sidebar with panel content
│   │   ├── GameToolbar.tsx  # Floating draggable toolbar
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
3. `src/stores/gameStore.ts` - Application state
4. `src/styles/main.css` - Design system variables
5. `src/styles/game-layout.css` - Layout styling
6. `package.json` - Dependencies and scripts

## Component Hierarchy
```
GameLayout (main container)
├── Header
│   ├── SceneTabs (left side)
│   └── HorizontalPanelTabs (right side)
├── SceneCanvas (main area)
│   ├── PlayerBar (floating bottom-left)
│   └── GameToolbar (floating bottom-center, draggable)
└── ContextPanel (resizable right sidebar)
    └── Panel content based on active tab
```