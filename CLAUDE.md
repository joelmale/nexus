# Nexus VTT - High-Level Architecture

## Overview

Nexus VTT is a lightweight, web-based virtual tabletop system featuring real-time multiplayer synchronization with a hybrid client-server architecture. The system prioritizes client-side authority with a minimal server for message routing and persistence.

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite + Zustand
- Backend: Node.js + Express + WebSocket (ws)
- Database: PostgreSQL (for session persistence)
- Local Storage: IndexedDB (unlimited storage for assets)
- Real-time Communication: WebSocket with fallback polling

---

## 1. State Management Architecture

### Zustand Stores (Single Source of Truth)

The application uses **Zustand** as the primary state management solution with the **Immer middleware** for immutable updates. All game state lives in a monolithic `useGameStore` hook.

**Location:** `/src/stores/`

#### Primary Stores:

1. **`gameStore.ts`** (97KB+) - Monolithic store containing:
   - User/Session state (authentication, room code, players)
   - Game state (scenes, tokens, drawings)
   - UI state (active tab, selection, camera)
   - Settings & preferences
   - Chat & voice state
   - Connection quality metrics

2. **`characterStore.ts`** - Character management:
   - Player character data
   - Character creation/editing
   - Character sheet state
   - Career/background data

3. **`documentStore.ts`** - Document management:
   - Campaign documents
   - Handouts
   - Document library state

4. **`initiativeStore.ts`** - Combat tracking:
   - Initiative order
   - Turn management
   - Combat state

5. **`tokenStore.ts`** - Token asset management:
   - Token libraries
   - Custom token uploads
   - Token customization state

### Store Architecture Pattern

All stores follow this pattern:
```typescript
// Create store with Immer middleware
const useXStore = create<StoreInterface>()(
  immer((set, get) => ({
    // State properties
    state: initialValue,
    
    // Actions that modify state via Immer
    action: (payload) => set((state) => {
      state.nested.property = payload; // Direct mutation (Immer handles immutability)
    })
  }))
);

// Custom hooks for subscriptions (prevent unnecessary re-renders)
const useSelector = () => useXStore((state) => state.property);
```

### Key Patterns:

- **Shallow equality checks**: Uses `useShallow` hook to prevent re-renders when selecting objects
- **Selector functions**: Multiple custom hooks (e.g., `useActiveScene`, `useIsHost`, `useCamera`) for fine-grained subscriptions
- **Async actions**: Store actions can be async and import services dynamically
- **localStorage sync**: Session state automatically saved to localStorage for refresh recovery

---

## 2. WebSocket/Networking Architecture

### Real-time Communication Flow

The WebSocket system provides bidirectional, real-time event synchronization between clients and server.

**Location:** `/src/utils/websocket.ts` (Client) + `/server/index.ts` (Server)

### Connection Lifecycle

```
Client connects with query parameters:
  ?join=ROOMCODE     (player joins existing game)
  ?reconnect=CODE    (host reconnects to game)
  ?campaignId=ID     (campaign context)

↓

Server accepts connection and routes based on parameters:
  - Creates/joins room
  - Broadcasts user join event
  - Loads game state from database
  - Sends session-joined event with current state

↓

Client receives session-joined event:
  - Updates gameStore with room code & players
  - Applies persisted game state from server
  - Syncs UI with current session
```

### Message Types

WebSocket messages use event-driven architecture:

1. **Heartbeat** (`type: 'heartbeat'`)
   - Ping/pong for connection quality monitoring
   - Tracked at server and client for latency calculation
   - Interval: 30 seconds

2. **Game Events** (`type: 'event'`)
   - Event name: `'session/created'`, `'session/joined'`, etc.
   - Structured with `data` payload
   - Examples:
     - `'token/move'` - Token position changed
     - `'token/update'` - Token properties (rotation, size, etc.)
     - `'token/delete'` - Token removed
     - `'scene/create'`, `'scene/update'`, `'scene/delete'`
     - `'drawing/create'`, `'drawing/update'`, `'drawing/delete'`
     - `'dice/roll-result'` - Dice roll result from server
     - `'chat-message'` - Chat message broadcast

3. **Update Confirmation** (`type: 'update-confirmed'`)
   - Confirms optimistic updates with updateId
   - Server echoes back the updateId

4. **Error Messages** (`type: 'error'`)
   - Server rejects invalid updates (version conflicts, permissions)
   - Contains error code and message

### Message Routing (Server)

**`/server/index.ts` - `routeMessage()` method:**

```
Message received from client
  ↓
If heartbeat → handle heartbeat pong
  ↓
Get connection & room
  ↓
Handle special cases:
  - Dice rolls → validateDiceRoll() → broadcast result
  - Host transfers → handleHostTransfer()
  - Add/remove co-hosts → handleAddCoHost()
  - Game state updates → updateRoomGameState()
  - Version conflicts → reject with error
  ↓
If has destinationId (dst) → send to specific user
  ↓
Otherwise → broadcast to entire room
```

### Connection Quality Monitoring

Both client and server track connection quality:

**Server:**
- Heartbeat timeout: 10 seconds
- Max consecutive misses: 3 before disconnection
- Quality metric: 'excellent' | 'good' | 'poor' | 'critical'

**Client:**
- Tracks latency (ping/pong roundtrip)
- Measures packet loss rate
- Adjusts optimization based on quality

### Port Management (Development)

The system uses intelligent port discovery:

```
1. Try configured VITE_WS_PORT (default 5001)
2. If development mode:
   a. Try HTTP health check on ports 5001-5004
   b. Cache successful port in localStorage
   c. Use cached port for next connection
3. Fall back to standard port list
```

---

## 3. Scene and Canvas System

### Scene Hierarchy

```
Game
  └─ Session (room with players)
      └─ Scenes[] (multiple maps/scenes)
          ├─ SceneCanvas (2D rendering)
          │   ├─ SceneBackground (map image)
          │   ├─ SceneGrid (visual grid overlay)
          │   ├─ TokenRenderer (placed tokens)
          │   ├─ DrawingRenderer (freehand drawings)
          │   ├─ RemoteCursors (other players' cursors)
          │   └─ SelectionOverlay (selected objects)
          │
          ├─ PlacedTokens[] (instances of tokens on map)
          │   ├─ position {x, y}
          │   ├─ rotation
          │   ├─ scale
          │   └─ visibility (shown to host/all)
          │
          ├─ Drawings[] (freehand annotations)
          │   ├─ type: 'pencil' | 'rectangle' | 'circle' | 'polygon'
          │   ├─ points/path data
          │   ├─ style (color, thickness, opacity)
          │   └─ visibility (hidden/shown to players)
          │
          └─ GridSettings
              ├─ size (pixels)
              ├─ color
              ├─ opacity
              └─ snapToGrid
```

### Canvas Components

**Location:** `/src/components/Scene/`

#### Core Components:

1. **SceneCanvas.tsx** (Master renderer)
   - Main canvas orchestrator
   - Handles camera, zoom, pan
   - Manages layer rendering order
   - Integrates all sub-renderers
   - Event delegation for interactions

2. **TokenRenderer.tsx**
   - Renders placed tokens as HTML img elements
   - Handles hover effects and selection
   - Receives drag events from canvas

3. **DrawingRenderer.tsx**
   - Renders drawings on HTML5 canvas
   - Supports multi-layer rendering
   - Handles visibility toggling

4. **DrawingTools.tsx** (45KB)
   - Tool palette (pencil, eraser, shapes, measurement)
   - Drawing state management
   - Stroke rendering on canvas
   - Tool-specific UI panels

5. **SelectionOverlay.tsx**
   - Visual selection indicator (blue outline)
   - Handles multi-select
   - Drag handles for transformation

6. **RemoteCursors.tsx**
   - Shows other players' cursor positions
   - Animated cursor tracking
   - Custom cursor styling per player

#### Supporting Components:

- **ScenePanel.tsx** - Scene browser & properties
- **SceneEditor.tsx** - Map editing panel
- **SceneBackground.tsx** - Background image management
- **SceneGrid.tsx** - Grid visualization
- **BaseMapBrowser.tsx** - Dungeon map generator browser

### Drawing System

**Persistence:** `/src/services/drawingPersistence.ts` + `drawingPersistenceV2.ts`

Drawings are stored as:
```typescript
interface Drawing {
  id: string;
  sceneId: string;
  type: 'pencil' | 'rectangle' | 'circle' | 'polygon' | 'mask';
  points?: Array<{x: number, y: number}>;  // For pencil/polygon
  x?: number; y?: number; width?: number; height?: number;  // For shapes
  style: {
    color: string;
    thickness: number;
    opacity: number;
    lineJoin?: 'round' | 'bevel' | 'miter';
  };
  visibility: 'hidden' | 'shown';
  createdAt: number;
  updatedAt: number;
}
```

Key features:
- Drawings auto-save to IndexedDB
- Hidden drawings only visible to host
- Drawing updates sent via WebSocket events
- Compression for bandwidth optimization

### Camera System

```typescript
interface Camera {
  x: number;      // Pan X (left/right)
  y: number;      // Pan Y (up/down)
  zoom: number;   // Zoom factor (0.1 - 5.0)
}
```

- Host's camera position broadcast to all players
- Players can toggle "Follow DM" to track host's view
- Camera updates throttled to reduce message volume

---

## 4. Asset Management

### Token Asset Pipeline

**Location:** `/src/services/tokenAssets.ts`

```
Token Asset Flow:
1. Load default token libraries (bundled assets)
2. Scan localStorage for custom tokens
3. Cache images in memory (HTMLImageElement)
4. Apply customizations (color, size changes)
5. Serve to TokenRenderer

Performance Optimizations:
- Lazy loading with Promise deduplication
- Image caching to prevent reloads
- Customization serialization to localStorage
```

### Dungeon Map Generation

**Location:** `/src/services/dungeonMapService.ts`

- Integration with One-Page Dungeon Generator
- Generates random map images (WebP compressed)
- Stores maps in IndexedDB with compression metadata
- Automatic migration from legacy localStorage format

### Asset Categories

Server serves four main asset types:

1. **Maps** - Background images for scenes
2. **Tokens** - Character/creature tokens
3. **Art** - Ambient artwork and decorations
4. **Handouts** - Player-facing documents
5. **Reference** - Rules and quick reference

Asset serving:
- `/assets/:filename` - Original assets
- `/thumbnails/:filename` - Cached thumbnails
- `/manifest.json` - Asset catalog
- `/search?q=term` - Asset search
- `/category/:name` - Category browsing

### Manifest System

**Location:** `/static-assets/assets/manifest.json`

```typescript
interface AssetManifest {
  version: string;
  generatedAt: string;
  totalAssets: number;
  categories: Array<{
    name: string;
    count: number;
    icon: string;
  }>;
  assets: Array<{
    id: string;
    name: string;
    category: string;
    filename: string;
    thumbnail: string;
    size: number;
    tags: string[];
  }>;
}
```

---

## 5. Database Integration (PostgreSQL)

### Schema Architecture

**Location:** `/server/schema.sql`

Core tables:

1. **users**
   - Stores OAuth profiles (Google, Discord) + guest users
   - UUID primary key
   - Provider: 'google' | 'discord' | 'guest'

2. **campaigns**
   - Campaign containers with name, description
   - Owned by DM (dmId)
   - scenes stored as JSONB

3. **characters**
   - Player-created characters
   - JSONB data field for character sheet data
   - Owned by player (ownerId)

4. **sessions** (replaces "rooms")
   - Active game sessions with join code
   - Status: 'active' | 'hibernating' | 'abandoned'
   - gameState stored as JSONB for persistence
   - Maps to campaign via campaignId
   - lastActivity tracked for cleanup

5. **players**
   - Join table linking users to sessions
   - Optional characterId for character binding
   - isConnected flag for online status
   - lastSeen timestamp

6. **hosts** (Co-DM support)
   - Links users to sessions with co-host privileges
   - isPrimary flag for primary DM
   - permissions stored as JSONB

### Session Persistence

**Flow:**

```
Game state changes (tokens, scenes, drawings)
  ↓
updateRoomGameState() called in server
  ↓
GameState serialized to JSONB
  ↓
UPDATE sessions SET gameState = $1, lastActivity = NOW()
  ↓
On player refresh/reconnect:
  SELECT gameState FROM sessions WHERE joinCode = $1
  ↓
Server sends session-joined with gameState included
  ↓
Client applies persisted state to gameStore
```

### Database Service

**Location:** `/server/database.ts`

Key methods:
- `getUserById()` / `getUserByEmail()` - User lookup
- `getCampaignsByUser()` - Load user's campaigns
- `getSessionByJoinCode()` - Find session for join/reconnect
- `updateSessionGameState()` - Persist game state
- `createGuestUser()` - On-the-fly guest user creation
- `trackLastActivity()` - Update session heartbeat

---

## 6. Client-Side Persistence

### Hybrid State Management

**Location:** `/src/services/hybridStateManager.ts` + `/src/services/indexedDBAdapter.ts`

Three-layer persistence model:

1. **RAM (Zustand Store)** - Active game state
2. **IndexedDB** - Unlimited offline storage
3. **PostgreSQL** - Cross-device persistence

### IndexedDB Schema

**Location:** `/src/utils/indexedDB.ts`

Object stores:
- `dungeonMaps` - Generated map images (blob storage)
- `gameState` - Full game state snapshots
- `drawings` - Scene drawings (compressed)

Benefits:
- Unlimited storage (~50MB+ per domain)
- Survives page refresh
- No network required for reads
- Compression for large assets

### Session Recovery

**Flow on page refresh:**

```
1. Check localStorage for 'nexus-active-session'
2. If found and < 24 hours old:
   - Extract room code
   - Attempt WebSocket reconnection
   - Server looks up session in PostgreSQL
   - Send full game state back to client
   - Client restores state to Zustand
3. If session not found or expired:
   - Redirect to lobby
   - Clear localStorage
```

---

## 7. Key Architectural Patterns

### Event Handler Pattern

The core event system uses a dispatch pattern:

```typescript
// Event handlers registry (gameStore.ts around line 600-900)
const eventHandlers: Record<string, (state: GameState, data: any) => void> = {
  'session/created': (state, data) => { /* update state */ },
  'session/joined': (state, data) => { /* update state */ },
  'token/move': (state, data) => { /* update state */ },
  'token/update': (state, data) => { /* update state */ },
  // ... 20+ event types
};

// Applied via applyEvent action
useGameStore.setState((state) => {
  const handler = eventHandlers[event.type];
  if (handler) handler(state, event.data);
});
```

### Optimistic Updates

For fast UX, client applies updates immediately:

```
User drags token:
  ↓
1. Call moveTokenOptimistic() 
   - Updates store immediately (optimistic)
   - Stores updateId for tracking
2. Send token-move event via WebSocket
   - Include updateId and version number
3. Server validates:
   - Check version conflict
   - Update room state
   - Broadcast to other players
4. Server sends update-confirmed with updateId
   - Client calls confirmUpdate(updateId)
   - Optimistic update is now confirmed
5. If server rejects:
   - Client calls rollbackUpdate(updateId)
   - State reverted to previous value
```

### Version Conflict Resolution

**Location:** `/server/index.ts` around line 1338

```typescript
// Track entity versions (per room)
room.entityVersions = new Map<string, number>();

// On update receipt:
const currentVersion = room.entityVersions.get(entityId) || 0;
if (expectedVersion < currentVersion) {
  // Conflict detected - reject update
  sendMessage(connection, { type: 'error', code: 409 });
  return;
}
// Accept update and increment version
room.entityVersions.set(entityId, expectedVersion + 1);
```

### Service Layer Isolation

Services are imported dynamically within store actions to prevent circular dependencies:

```typescript
// In gameStore action:
const { webSocketService } = await import('@/utils/websocket');
const { sessionPersistenceService } = await import('@/services/sessionPersistence');
const { dungeonMapService } = await import('@/services/dungeonMapService');
```

This allows:
- Services to use the store without circular deps
- Lazy loading of heavy modules
- Better code splitting

### Component Subscription Pattern

Fine-grained selectors prevent unnecessary re-renders:

```typescript
// Define custom hooks per feature:
export const useActiveScene = () => 
  useGameStore((state) => state.sceneState.scenes.find(...));

export const useIsHost = () => 
  useGameStore((state) => state.user.type === 'host');

export const useCamera = () => 
  useGameStore((state) => state.sceneState.camera);

// Components only re-render when their specific value changes
const scene = useActiveScene();  // Only re-renders if active scene changes
```

---

## 8. Important Implementation Details

### Room State Management

**In-memory rooms on server:**

```typescript
interface Room {
  id: string;                           // Room ID
  joinCode: string;                     // 4-char join code
  connections: Set<string>;             // Connected user IDs
  entityVersions: Map<string, number>;   // Version tracking
  lastActivity: number;                 // Timestamp for cleanup
}

// Rooms map: roomId -> Room
private rooms = new Map<string, Room>();
```

Room cleanup:
- Hibernation timeout: 10 minutes of inactivity
- Abandonment timeout: 60 minutes
- Periodic cleanup task removes stale rooms

### Drawing Compression

**Location:** `/src/services/drawingPersistenceV2.ts`

Techniques:
1. Run-length encoding for pencil strokes
2. Delta encoding for point coordinates
3. WebP image compression at lower quality
4. Base64 compression statistics tracking

Example compression:
- Original pencil stroke: 5KB
- Compressed: 200 bytes (96% reduction)

### Character/Token Resolution

When a player joins with a character:
1. Store character in localStorage (via characterStore)
2. Send character info to server
3. Server optionally links playerRecord.characterId
4. Character data available in gameState

### Chat System

Simple but effective:
- Messages stored in gameStore.chat.messages[]
- WebSocket broadcasts chat-message events
- No database persistence (ephemeral)
- Types support: 'text', 'dm-announcement', 'whisper', 'system'

### Voice State (Stub)

Voice infrastructure in place but not implemented:
- VoiceState interface defined
- Voice channel types defined
- Ready for WebRTC integration
- No active voice communication yet

---

## 9. Developer Conventions

### Naming Conventions

**Stores & Hooks:**
- `useGameStore` - Main Zustand store
- `useActiveScene()` - Custom selector hook
- `useIsHost()` - Boolean selector
- `useDiceRolls()` - Array selector

**Events:**
- Namespace/action format: `'session/created'`, `'token/move'`, `'drawing/delete'`
- Server-sent events broadcast to all players
- Client-sent events can include updateId for confirmation

**Services:**
- CamelCase class names: `TokenAssetManager`, `DungeonMapService`
- Singleton instances: `export const tokenAssetManager = new TokenAssetManager()`
- Async initialization: `async initialize()` method

**Components:**
- React FC components named as PascalCase
- Props interface named `<ComponentName>Props`
- File names match component names

### File Organization

```
src/
├── stores/          # Zustand stores (gameStore is monolithic)
├── components/      # React components
│   ├── Scene/       # Canvas and scene-related
│   ├── Tokens/      # Token management UI
│   ├── Generator/   # Dungeon generator UI
│   └── ...
├── services/        # Business logic services
│   ├── hybridStateManager.ts
│   ├── sessionPersistence.ts
│   ├── tokenAssets.ts
│   └── ...
├── utils/           # Utilities & helpers
│   ├── websocket.ts
│   ├── indexedDB.ts
│   ├── colorSchemes.ts
│   └── ...
├── hooks/           # Custom React hooks
├── types/           # TypeScript interfaces
├── styles/          # CSS/SCSS files
└── assets/          # Static assets
```

---

## 10. Testing & Debugging

### Debug Logging

Consistent emoji prefixes in console:
- `🎮` - Game state changes
- `📡` - WebSocket communication
- `🗄️` - Database operations
- `💾` - Local storage/persistence
- `🎯` - Selection/interaction
- `⚠️` - Warnings
- `❌` - Errors
- `✅` - Success

### Development Features

**In-development environment:**
- Mock data generator available
- Admin panel at `/admin`
- CSS debugging utilities exposed to window
- Detailed logging enabled
- Port discovery for server detection

### Test Files

Located alongside implementation:
- `gameStore.test.ts` - Store action tests
- Integration tests in `/tests/integration`
- E2E tests in `/tests/e2e` with Playwright

---

## 11. Performance Optimizations

### Rendering

1. **Canvas-based rendering** for drawings (better than DOM)
2. **Image lazy loading** for tokens and maps
3. **CSS containment** for panel performance
4. **Memoization** of expensive selectors
5. **Debounced updates** for camera/scroll events

### Network

1. **WebSocket message batching** for bulk updates
2. **Update confirmation deduplication** 
3. **Heartbeat interval adjustment** based on latency
4. **Compression** for large asset transfers

### Storage

1. **IndexedDB blob storage** for unlimited capacity
2. **Drawing compression** (96% reduction)
3. **Asset thumbnail caching** 
4. **Session state snapshots** instead of full replays

---

## 12. Known Quirks & Important Notes

1. **gameStore is monolithic** (97KB+)
   - Contains all game state in single Zustand store
   - Could be split into multiple stores if it grows further
   - Currently practical due to interconnected state

2. **Room codes are 4 characters**
   - Format: ABCD (uppercase alphanumeric)
   - Generated by server
   - Used for join URLs and reconnection

3. **Optimistic updates don't broadcast**
   - Client applies immediately
   - Server broadcasts to others (creating double-apply on sender)
   - Handled by checkingLatin-update confirmations

4. **Drawings don't persist to PostgreSQL**
   - Only stored in IndexedDB
   - Lost when switching sessions
   - Could be added to sessionGameState if needed

5. **Character data is browser-local**
   - Stored in characterStore (not persisted to server)
   - Linked to browser via `nexus-browser-id`
   - Not tied to user accounts (yet)

6. **Co-host system implemented but UI incomplete**
   - Database schema supports co-hosts
   - Transfer/add/remove host events work
   - UI controls not yet in place

7. **Version conflicts use simple counter**
   - Increments per entity per room
   - Reset when room is recreated
   - Not suitable for high-concurrency scenarios (but VTT doesn't need it)

---

## 13. Future Architecture Considerations

**Potential improvements:**

1. **Split gameStore** into domain-specific stores (sceneStore, tokenStore, chatStore)
2. **Drawing persistence to PostgreSQL** for session recovery
3. **WebRTC voice integration** (infrastructure in place)
4. **Offline-first with local app** (service worker ready)
5. **Real-time collaboration cursors** (RemoteCursors can show more detail)
6. **Asset caching strategy** (SW + IndexedDB)
7. **Performance monitoring** (connection quality metrics started)

---

## Quick Reference: Message Flow Examples

### Token Movement (Optimistic Update)

```
1. User drags token on canvas
2. SceneCanvas calls moveTokenOptimistic(tokenId, {x, y})
3. gameStore:
   - Updates token position immediately (optimistic)
   - Stores PendingUpdate with updateId
4. webSocketService.sendEvent({
     type: 'token/move',
     data: { tokenId, position, updateId, expectedVersion }
   })
5. Server receives message:
   - Validates version
   - Updates room state
   - Broadcasts to all players
   - Increments entity version
6. Server response: update-confirmed with updateId
7. gameStore.confirmUpdate(updateId) removes from pending
8. Other players receive token/move event:
   - Apply to their store
   - Visual update on their screens
```

### Scene Visibility Toggle

```
DM clicks "hide from players" on layer
  ↓
gameStore.updateDrawing(sceneId, drawingId, { visibility: 'hidden' })
  ↓
webSocketService.sendEvent({
  type: 'drawing/update',
  data: { sceneId, drawingId, updates: { visibility: 'hidden' } }
})
  ↓
Server broadcasts to all players
  ↓
Players' DrawingRenderer checks visibility
  ↓
Hidden drawings don't render (only host's drawer shows it)
```

### Dice Roll Server Validation

```
Player sends:
  {
    type: 'event',
    data: {
      name: 'dice/roll-request',
      expression: '3d20+5',
      isPrivate: false
    }
  }
  ↓
Server receives in routeMessage:
  - Validates expression
  - Rolls dice
  - Calculates result
  - Creates DiceRoll object
  ↓
Server broadcasts:
  {
    type: 'event',
    data: {
      name: 'dice/roll-result',
      id: uuid,
      userId: roller_id,
      expression: '3d20+5',
      total: 18,
      results: [12, 4, 2],
      modifier: 5
    }
  }
  ↓
All clients' gameStore.applyEvent()
  ↓
DiceRoller component re-renders
  ↓
Roll appears in dice panel
```

---

## Conclusion

Nexus VTT demonstrates a modern, event-driven architecture with clear separation between client state management, real-time synchronization, and persistent storage layers. The use of Zustand with Immer provides excellent developer ergonomics, while the WebSocket-based message system ensures low-latency multiplayer synchronization. The hybrid persistence model (RAM → IndexedDB → PostgreSQL) enables both responsive offline usage and cross-device session recovery.

The main architectural principle: **Client authority + server validation** - clients drive the experience with optimistic updates, but the server validates, persists, and broadcasts the canonical state.
