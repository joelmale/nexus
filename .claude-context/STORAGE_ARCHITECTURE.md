# Storage Architecture & Data Model

## Overview

The Nexus VTT storage system has **THREE separate storage layers** that work together:

1. **IndexedDB (Ogres-style Entity Store)** - Persistent browser database
2. **localStorage** - Simple key-value storage for session recovery
3. **Zustand Stores** - In-memory React state

## The Problem You Discovered

**Scenes are stored GLOBALLY without any link to game rooms/sessions.**

When you create multiple game rooms, all scenes from all rooms are stored in the same IndexedDB database with no way to distinguish which room they belong to. This is why:
- Mock data scenes persist across different rooms
- Duplicate "Dank Mine" appears when toggling mock data multiple times
- Old scenes from previous sessions load into new rooms

## Current Data Model

### 1. IndexedDB (Persistent Entity Store)

**Database Name:** `nexus-ogres-store`

**Object Stores:**
- `gameState` - Main entity storage
- `metadata` - Store metadata
- `syncLog` - Synchronization logs

**Entity Types Stored:**

#### Scene Entity
```typescript
{
  id: string;              // UUID
  type: 'scene';           // Entity type
  name: string;
  description: string;
  visibility: 'private' | 'shared' | 'public';
  isEditable: boolean;
  createdBy: string;       // User ID (NOT linked to room)
  createdAt: number;
  updatedAt: number;
  backgroundImage?: { ... };
  gridSettings: { ... };
  lightingSettings: { ... };
  drawings: [];            // Empty - drawings stored separately
  placedTokens: [];        // Empty - tokens stored separately
  isActive: boolean;
  playerCount: number;

  // ❌ MISSING: No sessionId or roomCode!
}
```

#### Drawing Entity
```typescript
{
  id: string;              // UUID
  type: 'drawing';         // Entity type
  sceneId: string;         // ✅ Linked to scene
  // ...drawing-specific properties (center, radius, etc.)
  layer: 'background' | 'tokens' | 'effects' | 'dm-only' | 'overlay';
  style: { fillColor, strokeColor, ... };
  createdBy: string;
  createdAt: number;
  updatedAt: number;

  // ❌ MISSING: No sessionId or roomCode!
}
```

#### Character Entity
```typescript
{
  id: string;
  type: 'character';
  name: string;
  race: string;
  class: string;
  level: number;
  playerId: string;        // ✅ Linked to browser (not session)
  createdAt: number;
  lastUsed?: number;
  // ...character data
}
```

**Entity Relationships:**
- Drawings → Scene: Via `sceneId` property
- Characters → Player: Via `playerId` (browser ID)
- **Scenes → Session: NO RELATIONSHIP** ❌

### 2. localStorage (Session Recovery)

**Key:** `nexus-active-session`

**Stored Data:**
```typescript
{
  userName: string;
  userType: 'player' | 'dm';
  roomCode: string;        // Which room user is in
  gameConfig?: GameConfig;
  timestamp: number;       // For 24-hour expiration
}
```

**Purpose:** Restore user session after page refresh

**Key:** `nexus-browser-id`

**Purpose:** Stable browser/device identifier for linking characters

### 3. Zustand Stores (In-Memory State)

#### appFlowStore
```typescript
{
  view: 'welcome' | 'player_setup' | 'dm_setup' | 'game';
  user: {
    name: string;
    type: 'player' | 'dm' | null;
    id: string;            // Browser ID
    color: string;
  };
  roomCode?: string;       // Current room
  isConnectedToRoom: boolean;
  gameConfig?: GameConfig;
  selectedCharacter?: PlayerCharacter;
}
```

#### gameStore
```typescript
{
  session: {
    roomCode: string;
    hostId: string;
    players: Player[];
    status: 'connected' | 'disconnected';
  };
  scenes: Scene[];         // Loaded from IndexedDB
  activeSceneId: string | null;
  // ...UI state
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER CREATES ROOM "ABCD"                 │
└───────────────────────────────┬─────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   appFlowStore        │
                    │   - roomCode: "ABCD"  │
                    │   - user: { ... }     │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   localStorage        │
                    │   session data        │
                    │   - roomCode: "ABCD"  │
                    └───────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     USER CREATES SCENE                       │
└───────────────────────────────┬─────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   IndexedDB           │
                    │   Entity Store        │
                    │                       │
                    │   Scene: {            │
                    │     id: "scene-123"   │
                    │     name: "Dungeon"   │
                    │     ❌ No roomCode!   │
                    │   }                   │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   gameStore           │
                    │   scenes: [...]       │
                    └───────────────────────┘
```

**The Problem:**
```
Room "ABCD" creates "Dungeon" scene → IndexedDB
Room "EFGH" creates "Cave" scene → IndexedDB (same database)
Room "ABCD" loads scenes → Gets BOTH "Dungeon" AND "Cave"! ❌
```

## How Data Flows Through the System

### Creating a Scene

1. **User clicks "Create Scene"** in UI
2. **gameStore** creates scene object with UI data
3. **linearFlowStorage.createScene()** is called
4. **ogresStyleStore.create('scene', ...)** adds entity
5. **IndexedDB** saves to disk (throttled, 2 second delay)
6. **gameStore** updates in-memory scenes list

**Result:** Scene is in IndexedDB with NO link to which room created it

### Loading Scenes on App Start

1. **Layout.tsx useEffect** runs on mount
2. **linearFlowStorage.syncScenesWithGameStore()** is called
3. **ogresStyleStore.getByType('scene')** fetches ALL scenes
4. **gameStore.setScenes()** loads ALL scenes from database
5. UI displays all scenes regardless of which room created them

**Result:** All scenes from all previous sessions load into current room

### Mock Data Toggle

1. User toggles ON → **applyMockDataToStorage()** runs
2. Creates 2 scenes ("Bandits Camp", "Dank Mine") in IndexedDB
3. User clicks "Skip to Game (DM)"
4. **dev_quickDM()** calls **clearGameData()**
5. clearGameData() tries to delete all scenes
6. **But IndexedDB still has duplicates from previous toggles!**

### Why Duplicates Occur

Each time you toggle mock data ON without clearing between:
```
Toggle 1: Bandits Camp (id-1), Dank Mine (id-2)
Toggle 2: Bandits Camp (id-3), Dank Mine (id-4)  ← New UUIDs!
Toggle 3: Bandits Camp (id-5), Dank Mine (id-6)
```

All 6 scenes exist in IndexedDB with different IDs but same names.

## What's Missing: Session/Room Association

### Current Schema (Broken)
```
Scene {
  id: "abc"
  name: "Dungeon"
  createdBy: "user-123"
  // ❌ No roomCode or sessionId
}
```

### What It Should Be
```
Scene {
  id: "abc"
  name: "Dungeon"
  createdBy: "user-123"
  roomCode: "ABCD"        // ✅ Link to game room
  sessionId: "session-1"  // ✅ Or link to session
}
```

Then when loading:
```typescript
// Instead of:
const scenes = store.getByType('scene');

// Should be:
const scenes = store.query({
  type: 'scene',
  where: { roomCode: currentRoomCode }
});
```

## Workaround (Current Behavior)

**Why `clearGameData()` Exists:**

Since we can't filter scenes by room, the workaround is:
1. When creating NEW room → Clear ALL scenes
2. Start with blank slate
3. User creates scenes for this room
4. If user creates another room → Clear ALL scenes again

**Limitations:**
- Can't have multiple rooms with different scenes
- Can't save campaigns for later
- Can't switch between different games
- All data lost when starting new room

## Summary

### Current Architecture Issues

1. **No Session Isolation** - All game rooms share same scene database
2. **No Data Scoping** - Can't filter entities by room/session
3. **Global State Pollution** - Old scenes leak into new games
4. **Destructive Cleanup** - Must delete ALL data to start fresh

### What Works

1. **Character Persistence** - Characters linked to browser ID (survives across rooms)
2. **Session Recovery** - User name/room code restored after refresh
3. **Drawing → Scene Link** - Drawings correctly associated with scenes
4. **Throttled Saves** - Efficient IndexedDB writes (2 second throttle)

### Design Decisions to Consider

**Option 1: Add roomCode to Scenes** (Simple)
- Add `roomCode` property to Scene interface
- Filter scenes by current roomCode when loading
- Scenes persist across sessions for that room

**Option 2: Add sessionId to Scenes** (Isolated)
- Each game session gets unique ID
- Scenes isolated to specific session
- Can't resume old campaigns

**Option 3: Add both roomCode and sessionId** (Flexible)
- Room code for logical grouping
- Session ID for specific game instance
- Can have multiple campaigns per room

**Option 4: Keep Current Destructive Model** (Simplest)
- Every new room clears all data
- Only one active campaign at a time
- No persistence between games
