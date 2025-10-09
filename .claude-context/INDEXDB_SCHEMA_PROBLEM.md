The Core Problem: No Session Isolation

Scenes are stored globally without any link to which game room created them.

Current Database Schema (Simplified)

IndexedDB: nexus-ogres-store
│
├── Scene Entities
│ ├── id: "uuid-1", name: "Bandits Camp", createdBy: "user-123"
│ ├── id: "uuid-2", name: "Dank Mine", createdBy: "user-123"
│ └── id: "uuid-3", name: "Dank Mine", createdBy: "user-456"
│ ❌ NO roomCode or sessionId property!
│
├── Drawing Entities
│ ├── id: "draw-1", sceneId: "uuid-1", type: "circle"
│ └── id: "draw-2", sceneId: "uuid-2", type: "rectangle"
│ ✅ Linked to scene, ❌ Not linked to room
│
└── Character Entities
└── id: "char-1", playerId: "browser-id-123", name: "Aragorn"
✅ Linked to browser (persists across rooms)

What Happens

// Room "ABCD" creates scene
createScene({ name: "Dungeon" })
→ IndexedDB stores: { id: "1", name: "Dungeon" }

// Room "EFGH" creates scene  
 createScene({ name: "Cave" })
→ IndexedDB stores: { id: "2", name: "Cave" }

// Room "ABCD" loads scenes
getScenes()
→ Returns ALL scenes: ["Dungeon", "Cave"] ❌ WRONG!

Why Duplicates Appear

Each mock data toggle creates NEW scenes with NEW UUIDs:
Toggle 1: Bandits Camp (id-1), Dank Mine (id-2)
Toggle 2: Bandits Camp (id-3), Dank Mine (id-4) ← Different IDs!
Toggle 3: Bandits Camp (id-5), Dank Mine (id-6)

The clearGameData() function tries to delete all scenes, but if it fails partway through (due to corrupted
data), duplicates remain.

Current Workaround

Since we can't filter by room, clearGameData() deletes ALL scenes from ALL rooms when creating a new room.
This is why it exists - to prevent old scenes from polluting new games.

Read the full documentation: .claude-context/STORAGE_ARCHITECTURE.md

Your Options

Option A: Keep current destructive model (simplest)

- Every new room clears all data
- Only one campaign at a time
- Current behavior

Option B: Add roomCode to scenes (better isolation)

- Each room has its own scenes
- Can switch between rooms
- Requires schema migration

Option C: Add database reset to welcome page

- User manually clears between games
- More control, but manual step
