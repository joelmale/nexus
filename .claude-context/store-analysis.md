# Detailed Store Analysis: appFlowStore vs gameStore

## 1. Core Responsibilities

### **appFlowStore - "Session & Navigation Controller"**
**Core responsibility**: Manages the **user's journey** through the application and **session lifecycle**.

- **Navigation**: Controls which screen the user sees (`welcome` → `player_setup` → `dm_setup` → `game`)
- **User Identity**: Manages who the user is (name, type: player/dm, browser ID)
- **Session State**: Tracks room codes, connection status, whether user is online/offline
- **Character Management**: CRUD operations for player characters (create, save, delete, import/export)
- **Room Lifecycle**: Creating rooms (DM), joining rooms (Player), leaving rooms

### **gameStore - "Game Content & Settings Manager"**
**Core responsibility**: Manages the **actual game content** and **application settings**.

- **Game Content**: Scenes, tokens, drawings, maps
- **Game Mechanics**: Dice rolls, initiative tracking (via events)
- **User Settings**: Display, audio, gameplay preferences, accessibility
- **Real-time Sync**: WebSocket event handling for multiplayer
- **Persistence**: Loading/saving scenes and drawings to IndexedDB
- **UI State**: Active tab, camera position, selected objects, active tool

---

## 2. State Coupling & Overlap

### **OVERLAPPING STATE (Duplicated!)**

Both stores manage these concepts:

| State | appFlowStore | gameStore |
|-------|--------------|-----------|
| **User info** | `user: { name, type, id, color }` | `user: { id, name, type, color, connected }` |
| **Room code** | `roomCode?: string` | `session.roomCode` |
| **Connection status** | `isConnectedToRoom: boolean` | `user.connected` + `session.status` |
| **Session players** | ❌ Not stored | `session.players[]` |

### **State That's Closely Coupled**

1. **appFlowStore.user** → **gameStore.user**: appFlowStore calls `gameStore.setUser()` to sync (manual sync required!)
2. **appFlowStore.roomCode** → **gameStore.session.roomCode**: Set separately but must stay in sync
3. **appFlowStore.isConnectedToRoom** → **gameStore.session.status**: Different representations of same concept
4. **appFlowStore.selectedCharacter** → Should probably live with character data in game content

### **Tight Coupling Example** (from appFlowStore.ts:150-158):
```typescript
setUser: (name: string, type: 'player' | 'dm') => {
  set((state) => {
    state.user.name = name;
    state.user.type = type;
  });

  // MANUAL SYNC! Must remember to update gameStore too
  const gameStore = useGameStore.getState();
  gameStore.setUser({
    name,
    type: type === 'dm' ? 'host' : 'player'
  });
}
```

**This is a code smell!** If we forget this sync, the stores get out of sync.

---

## 3. Original Design Intention

Based on file names, comments, and structure:

### **Historical Context** (from comments in appFlowStore.ts:1-5):
```typescript
/**
 * Simple Linear App Flow Store
 *
 * Replaces the complex lifecycle + game store split with a simple linear flow
 */
```

**Original intention**: Separate **application flow/routing** from **game content**.

**Why this made sense initially**:
- **Separation of concerns**: Navigation logic separate from game data
- **Simpler testing**: Could test user flows without loading game content
- **Clear boundaries**: "appFlow" handles screens, "game" handles what's ON those screens

**Why it became problematic**:
- **User identity spans both domains**: User info needed for both navigation AND game content
- **Session management spans both**: Room codes needed for routing AND multiplayer sync
- **Manual synchronization**: No automatic way to keep stores aligned
- **Confusion**: Developers must remember which store owns what

---

## 4. appFlowStore State Interface

```typescript
export interface AppState {
  // Navigation
  view: AppView; // 'welcome' | 'player_setup' | 'dm_setup' | 'game'

  // User Identity
  user: {
    name: string;
    type: 'player' | 'dm' | null;
    id: string; // Generated browser ID for character linking
    color: string;
  };

  // Session State
  roomCode?: string;
  isConnectedToRoom: boolean;
  gameConfig?: GameConfig; // DM's game configuration

  // Player Character
  selectedCharacter?: PlayerCharacter;

  // Cleanup flag
  hasLeftRoom?: boolean;
}
```

**Initial values** (appFlowStore.ts:98-109):
```typescript
const initialState: AppState = {
  view: 'welcome',
  user: {
    name: '',
    type: null,
    id: getBrowserId(), // Persistent browser ID from localStorage
    color: 'blue',
  },
  isConnectedToRoom: false,
  gameConfig: undefined,
  selectedCharacter: undefined
};
```

---

## 5. gameStore State Interface

```typescript
interface GameState {
  // User Identity (DUPLICATE!)
  user: {
    id: string;
    name: string;
    type: 'player' | 'host';
    color: string;
    connected: boolean; // Different from appFlowStore.isConnectedToRoom
  };

  // Session State (DUPLICATE!)
  session: Session | null; // { roomCode, hostId, players[], status }

  // Game Content
  diceRolls: DiceRoll[];
  activeTab: TabType; // UI state
  sceneState: {
    scenes: Scene[];
    activeSceneId: string | null;
    camera: Camera;
    followDM: boolean;
    activeTool: string;
    selectedObjectIds: string[];
  };

  // Settings (large nested object with ~30 settings)
  settings: UserSettings;
}
```

**Initial values** (gameStore.ts:125-135):
```typescript
const initialState: GameState = {
  user: {
    id: uuidv4(), // Different from appFlowStore's getBrowserId()!
    name: '',
    type: 'player',
    color: 'blue',
    connected: false,
  },
  session: null,
  diceRolls: [],
  activeTab: 'lobby',
  sceneState: { scenes: [], activeSceneId: null, ... },
  settings: { /* ~30 settings */ }
};
```

---

## 6. Redundant/Overlapping State

### **Confirmed Redundancies**:

| Concept | appFlowStore | gameStore | Issue |
|---------|--------------|-----------|-------|
| User ID | `user.id` (browser ID) | `user.id` (uuid) | **DIFFERENT VALUES!** |
| User name | `user.name` | `user.name` | Must sync manually |
| User type | `user.type: 'dm' | 'player'` | `user.type: 'host' | 'player'` | Different terminology! |
| User color | `user.color` | `user.color` | Duplicate |
| Room code | `roomCode: string` | `session.roomCode` | Different locations |
| Connected | `isConnectedToRoom: boolean` | `user.connected + session.status` | Different representations |

### **Partially Overlapping State**:

- **gameStore.session.players[]** contains all connected users (including current user)
- **appFlowStore.user** is just the current user
- These should be unified: current user should be derived from session.players

---

## 7. Data Normalization

### **appFlowStore** (Simple, mostly flat):
- **Characters**: Stored in localStorage as flat array (`nexus-characters`)
- **No entity/ID lookups**: Characters accessed by array index or linear search
- **User ID**: Single browser ID from localStorage (`nexus-browser-id`)

### **gameStore** (More normalized):
- **Scenes**: Array with IDs, indexed by `activeSceneId`
- **Tokens**: Nested in scenes by `sceneId`, indexed by `tokenId`
- **Drawings**: Nested in scenes by `sceneId`, indexed by `drawingId`
- **Players**: Array in `session.players[]`, indexed by `playerId`
- **Lookup pattern**: `scenes.find(s => s.id === sceneId)?.tokens.find(t => t.id === tokenId)`

**Neither store uses a proper entity normalization pattern** like:
```typescript
{
  entities: {
    scenes: { [id: string]: Scene },
    tokens: { [id: string]: Token }
  },
  ids: {
    scenes: string[],
    tokens: string[]
  }
}
```

This is okay for small datasets but could cause performance issues with many entities.

---

## 8. Primary Actions - appFlowStore

### **Navigation Actions**:
```typescript
setView(view: AppView) // Change screen
setUser(name, type) // Set user identity + navigate to setup screen
```

### **Player Flow Actions**:
```typescript
joinRoomWithCode(roomCode, character?) // Connect to DM's game via WebSocket
createCharacter(data) // Create new character, save to localStorage
selectCharacter(characterId) // Mark character as selected
getSavedCharacters() // Load characters from localStorage
deleteCharacter(characterId) // Remove character
exportCharacters() // Export to JSON
importCharacters(jsonData) // Import from JSON
```

### **DM Flow Actions**:
```typescript
createGameRoom(config, clearData?) // Connect as host via WebSocket, get room code
```

### **Room Management Actions**:
```typescript
leaveRoom() // Disconnect WebSocket, reset state
resetToWelcome() // Clear everything, return to welcome screen
```

### **Dev Helper Actions**:
```typescript
dev_quickDM(name?) // Skip to DM game (offline mode)
dev_quickPlayer(name?, roomCode?) // Skip to player game (offline mode)
dev_skipToGame(userType?) // Wrapper for dev helpers
```

---

## 9. Complex Async Actions in appFlowStore

### **Example: `createGameRoom()` - DM Room Creation** (appFlowStore.ts:243-298)

**Purpose**: DM creates an online multiplayer room

**Steps**:
1. **Clear/preserve data**: Option to clear existing game data or keep offline work
2. **Connect WebSocket**: `webSocketService.connect(undefined, 'host')`
3. **Wait for server**: `await waitForSessionCreated()` - blocks until server assigns room code
4. **Update appFlowStore**: Set `roomCode`, `gameConfig`, `isConnectedToRoom = true`, `view = 'game'`
5. **Save to localStorage**: Persist session for refresh recovery
6. **Update gameStore**: Call `gameStore.setSession()` to sync
7. **Sync scenes**: Load existing scenes from IndexedDB to gameStore

```typescript
createGameRoom: async (config: GameConfig, clearExistingData: boolean = true) => {
  try {
    const storage = getLinearFlowStorage();

    // Step 1: Clear or preserve data
    if (clearExistingData) {
      await storage.clearGameData();
    }

    // Step 2-3: Connect and wait for room code
    const { webSocketService } = await import('@/utils/websocket');
    await webSocketService.connect(undefined, 'host');
    const session = await webSocketService.waitForSessionCreated(); // ASYNC WAIT

    // Step 4-5: Update appFlowStore + save
    set((state) => {
      state.roomCode = session.roomCode;
      state.gameConfig = config;
      state.isConnectedToRoom = true;
      state.view = 'game';
    });
    saveSessionToStorage(get());

    // Step 6-7: Sync with gameStore
    const { user } = get();
    useGameStore.getState().setSession({ /* ... */ });
    await storage.syncScenesWithGameStore();

    return session.roomCode;
  } catch (error) {
    console.error('Failed to create room:', error);
    throw error;
  }
}
```

**Why this is complex**:
- **Multiple async operations**: WebSocket connection, server response, IndexedDB
- **Cross-store coordination**: Must update both appFlowStore and gameStore
- **Error handling**: Must clean up on failure
- **State recovery**: Saves to localStorage for refresh handling

---

## 10. Data Flow Example: "Player Joins Room"

### **User Action**: Player enters room code "ABCD" and clicks "Join"

### **Data Flow**:

```
1. LobbyPanel.tsx
   ↓ Calls joinRoomWithCode('ABCD')

2. appFlowStore.joinRoomWithCode()
   ↓ Imports webSocketService
   ↓ Calls webSocketService.connect('ABCD', 'player')

3. webSocketService
   ↓ Creates WebSocket connection to server
   ↓ Sends { type: 'session/join', roomCode: 'ABCD' }
   ↓ Waits for server response...

4. Server sends back:
   { type: 'session/joined', session: { roomCode, hostId, players[] } }

5. webSocketService
   ↓ Resolves waitForSessionJoined() promise
   ↓ Returns session data

6. appFlowStore.joinRoomWithCode() (continued)
   ↓ set({ roomCode: 'ABCD', isConnectedToRoom: true, view: 'game' })
   ↓ saveSessionToStorage() // localStorage for recovery
   ↓ useGameStore.getState().setSession({ roomCode, hostId, players })

7. gameStore.setSession()
   ↓ set({ session: newSession })
   ↓ sessionPersistenceService.saveSession()

8. Components re-render:
   - LinearLayout sees view='game', renders LinearGameLayout
   - LinearGameLayout sees session, renders game UI
   - LobbyPanel sees isConnectedToRoom=true, shows "Connected ✅"
```

**Stores touched**:
1. **appFlowStore**: Updates view, roomCode, isConnectedToRoom
2. **gameStore**: Updates session with players list
3. **WebSocket**: Manages connection (not a store, but state lives in closure)
4. **localStorage**: Persists session recovery data

---

## 11. Components Subscribing to appFlowStore

Found **10 components** importing `useAppFlowStore`:

### **1. LinearWelcomePage.tsx**
**Reads**:
- `setUser`, `joinRoomWithCode`
- `dev_quickDM`, `dev_quickPlayer`, `dev_skipToGame`

**Purpose**: Welcome screen, initial user setup

### **2. PlayerSetupPage.tsx**
**Reads**:
- `user`, `createCharacter`, `getSavedCharacters`, `deleteCharacter`
- `importCharacters`, `exportCharacters`, `setView`

**Purpose**: Player character selection/creation

### **3. DMSetupPage.tsx**
**Reads**:
- `user`, `createGameRoom`, `setView`

**Purpose**: DM game configuration

### **4. LinearGameLayout.tsx**
**Reads**:
- `user`, `roomCode`, `leaveRoom`, `resetToWelcome`

**Purpose**: Main game layout

### **5. LobbyPanel.tsx**
**Reads**:
- `roomCode`, `isConnectedToRoom`, `gameConfig`, `leaveRoom`, `createGameRoom`

**Purpose**: Session management panel

### **6. LinearLayout.tsx**
**Reads**:
- `view`, `setView` (for routing logic)

**Purpose**: Top-level router

### **7. Settings.tsx**
**Reads**:
- `leaveRoom` (for "Clear & Reset" button)

**Purpose**: Settings panel

### **8. PlayerPanel.tsx**
**Reads**:
- `user.type` (to check if DM)

**Purpose**: Player management

### **9. Layout.tsx** (old layout, might be deprecated)
**Reads**:
- Various appFlowStore state

### **10. DiceRoller.tsx**
**Reads**:
- `user` (for rolling dice with user name)

**Purpose**: Dice rolling UI

---

## 12. Components Subscribing to gameStore

Found **~25 components** using gameStore hooks. Key examples:

### **Direct useGameStore imports**:
- **SceneCanvas.tsx**: `sceneState`, `camera`, `tokens`, `drawings`, `placeToken`, `moveToken`
- **ScenePanel.tsx**: `scenes`, `activeSceneId`, `createScene`, `updateScene`, `deleteScene`
- **DrawingTools.tsx**: `activeTool`, `setActiveTool`, `createDrawing`
- **GameToolbar.tsx**: `activeTool`, `setActiveTool`, `selectedObjectIds`
- **DiceRoller.tsx**: `addDiceRoll`, `diceRolls`, `user`
- **Settings.tsx**: `settings`, `updateSettings`, `resetSettings`

### **Using selector hooks** (`useSession`, `useIsHost`, `useSettings`):
- **LobbyPanel.tsx**: `useSession()`, `useIsHost()`
- **PlayerBar.tsx**: `useSession()` for player list
- **DiceAnimation.tsx**: `useSettings()` for dice disappear time
- **DiceBox3D.tsx**: `useSettings()` for dice disappear time

### **Pattern**:
Most components use **granular selectors** to avoid unnecessary re-renders:
```typescript
// Good: Only re-renders when scenes change
const scenes = useGameStore((state) => state.sceneState.scenes);

// Bad: Re-renders on ANY gameStore change
const state = useGameStore();
```

---

## 13. Complex Selectors in gameStore

### **Helper hooks** (gameStore.ts:1400-1470):

```typescript
// Get current session
export const useSession = () =>
  useGameStore((state) => state.session);

// Check if current user is host
export const useIsHost = () =>
  useGameStore((state) => {
    if (!state.session || !state.user.id) return false;
    return state.session.hostId === state.user.id;
  });

// Get all settings
export const useSettings = () =>
  useGameStore((state) => state.settings);

// Get visible tokens for current scene (DM sees all, players see non-hidden)
export const getVisibleTokens = (sceneId: string, isHost: boolean) => {
  const scene = sceneState.scenes.find(s => s.id === sceneId);
  if (!scene) return [];
  return scene.tokens.filter(t => isHost || !t.hidden);
};

// Get visible drawings (DM sees all layers, players see only 'map' layer)
export const getVisibleDrawings = (sceneId: string, isHost: boolean) => {
  const drawings = getSceneDrawings(sceneId);
  return drawings.filter(d => isHost || d.layer === 'map');
};
```

**Most complex selector**: `getVisibleTokens` / `getVisibleDrawings`
- Filters based on user role (host vs player)
- Used heavily in SceneCanvas.tsx to determine what to render

---

## 14. Impact of Merge on Components

### **Import Changes**:

**Before**:
```typescript
import { useAppFlowStore } from '@/stores/appFlowStore';
import { useGameStore, useSession, useIsHost } from '@/stores/gameStore';

const MyComponent = () => {
  const { user, roomCode, leaveRoom } = useAppFlowStore();
  const { scenes, createScene } = useGameStore();
  const session = useSession();
  // ...
};
```

**After**:
```typescript
import { useGameStore, useSession, useIsHost } from '@/stores/gameStore';

const MyComponent = () => {
  // All from gameStore now!
  const { user, roomCode, leaveRoom, scenes, createScene } = useGameStore();
  const session = useSession();
  // ...
};
```

### **Files that need updates** (10 components):
1. ✅ LinearWelcomePage.tsx - Replace `useAppFlowStore` with `useGameStore`
2. ✅ PlayerSetupPage.tsx - Replace `useAppFlowStore` with `useGameStore`
3. ✅ DMSetupPage.tsx - Replace `useAppFlowStore` with `useGameStore`
4. ✅ LinearGameLayout.tsx - Replace `useAppFlowStore` with `useGameStore`
5. ✅ LobbyPanel.tsx - Replace `useAppFlowStore` with `useGameStore`
6. ✅ LinearLayout.tsx - Replace `useAppFlowStore` with `useGameStore`
7. ✅ Settings.tsx - Replace `useAppFlowStore` with `useGameStore`
8. ✅ PlayerPanel.tsx - Replace `useAppFlowStore` with `useGameStore`
9. ✅ DiceRoller.tsx - Replace `useAppFlowStore` with `useGameStore` (already has both)
10. ✅ Layout.tsx - Replace `useAppFlowStore` with `useGameStore` (might be deprecated)

### **Test files that need updates**:
- ✅ tests/unit/stores/appFlowStore.test.ts → Migrate to test gameStore instead

---

## Summary & Recommendations

### **Problems with Current Split**:
1. ✅ **Duplicate state**: User info, room code, connection status stored in BOTH stores
2. ✅ **Manual synchronization**: Must remember to call `gameStore.setUser()` from appFlowStore
3. ✅ **Inconsistent terminology**: 'dm' vs 'host', different user ID generation
4. ✅ **Unclear ownership**: Who owns "user"? Who owns "session"?
5. ✅ **Cross-store dependencies**: appFlowStore imports gameStore (tight coupling)

### **Benefits of Merging**:
1. ✅ **Single source of truth**: User, session, room code in ONE place
2. ✅ **No manual sync**: Can't get out of sync if there's only one copy
3. ✅ **Simpler mental model**: Developers only think about one store
4. ✅ **Better type safety**: TypeScript can enforce relationships
5. ✅ **Easier testing**: Test everything in one place

### **Drawbacks of Merging**:
1. ⚠️ **Large file**: ~2,000 lines (but we can split actions into modules)
2. ⚠️ **Migration effort**: 10 components + tests need updates
3. ⚠️ **Potential for bugs**: Must carefully merge state + actions
4. ⚠️ **Less separation**: Navigation and game content in same store

### **Final Recommendation**: **PROCEED WITH MERGE (Option B)**

**Rationale**:
- The duplicate state and manual sync are bigger problems than file size
- We have comprehensive baseline tests (21 passing tests)
- We can split the merged store into modules later if needed
- The current design was meant to be temporary (see comment: "Replaces the complex lifecycle")

**Next steps if you approve**:
1. Merge appFlowStore types into GameState
2. Copy actions from appFlowStore to gameStore
3. Remove duplicate state initialization
4. Update 10 components (one at a time, test after each)
5. Run full test suite
6. Delete appFlowStore.ts

Would you like me to proceed with the merge?
