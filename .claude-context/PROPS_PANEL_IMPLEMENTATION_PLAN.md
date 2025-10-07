# Props Panel Implementation Plan

**Created:** 2025-10-06
**Status:** Planning Phase
**Estimated Total Time:** 12-16 hours

## Overview

This document outlines the complete implementation plan for adding a Props/Game Objects panel to Nexus VTT, with functionality similar to the existing Tokens panel. Props include furniture, decorations, treasure, containers, doors, traps, light sources, and other scene objects.

---

## Phase 1: Core Data Layer (Foundation)
**Time Estimate: 2-3 hours**
**Priority: CRITICAL (Required for all other phases)**

### 1.1 Update Game Store (`src/stores/gameStore.ts`)

Add prop management to the game state:

```typescript
// Add to scene state interface
interface SceneState {
  // ... existing fields
  placedProps: PlacedProp[]; // NEW
}

// Add actions
const useGameStore = create<GameStore>((set, get) => ({
  // ... existing actions

  // Place a prop on the scene
  placeProp: (sceneId: string, propId: string, position: Point) => {
    const { user } = get();
    const placedProp = createPlacedProp(propId, sceneId, position, user.id);

    set((state) => ({
      sceneState: {
        ...state.sceneState,
        scenes: state.sceneState.scenes.map((scene) =>
          scene.id === sceneId
            ? { ...scene, placedProps: [...(scene.placedProps || []), placedProp] }
            : scene
        ),
      },
    }));

    // Sync to other clients
    webSocketService.send({
      type: 'event',
      data: {
        name: 'prop/placed',
        sceneId,
        prop: placedProp,
      },
    });
  },

  // Move a placed prop
  moveProp: (propId: string, position: Point) => {
    set((state) => ({
      sceneState: {
        ...state.sceneState,
        scenes: state.sceneState.scenes.map((scene) => ({
          ...scene,
          placedProps: (scene.placedProps || []).map((prop) =>
            prop.id === propId
              ? { ...prop, x: position.x, y: position.y, updatedAt: Date.now() }
              : prop
          ),
        })),
      },
    }));

    // Sync to other clients
    const prop = get().sceneState.scenes
      .flatMap((s) => s.placedProps || [])
      .find((p) => p.id === propId);

    if (prop) {
      webSocketService.send({
        type: 'event',
        data: {
          name: 'prop/moved',
          sceneId: prop.sceneId,
          propId,
          position,
        },
      });
    }
  },

  // Update placed prop properties
  updatePlacedProp: (propId: string, updates: Partial<PlacedProp>) => {
    set((state) => ({
      sceneState: {
        ...state.sceneState,
        scenes: state.sceneState.scenes.map((scene) => ({
          ...scene,
          placedProps: (scene.placedProps || []).map((prop) =>
            prop.id === propId
              ? { ...prop, ...updates, updatedAt: Date.now() }
              : prop
          ),
        })),
      },
    }));

    // Sync to other clients
    const prop = get().sceneState.scenes
      .flatMap((s) => s.placedProps || [])
      .find((p) => p.id === propId);

    if (prop) {
      webSocketService.send({
        type: 'event',
        data: {
          name: 'prop/updated',
          sceneId: prop.sceneId,
          propId,
          updates,
        },
      });
    }
  },

  // Delete a placed prop
  deletePlacedProp: (propId: string) => {
    const prop = get().sceneState.scenes
      .flatMap((s) => s.placedProps || [])
      .find((p) => p.id === propId);

    if (!prop) return;

    set((state) => ({
      sceneState: {
        ...state.sceneState,
        scenes: state.sceneState.scenes.map((scene) => ({
          ...scene,
          placedProps: (scene.placedProps || []).filter((p) => p.id !== propId),
        })),
      },
    }));

    // Sync to other clients
    webSocketService.send({
      type: 'event',
      data: {
        name: 'prop/removed',
        sceneId: prop.sceneId,
        propId,
      },
    });
  },
}));

// Add selectors
export const useSceneProps = (sceneId: string) =>
  useGameStore((state) =>
    state.sceneState.scenes.find((s) => s.id === sceneId)?.placedProps || []
  );

export const getSceneProps = (sceneId: string): PlacedProp[] => {
  const state = useGameStore.getState();
  return state.sceneState.scenes.find((s) => s.id === sceneId)?.placedProps || [];
};
```

**Tasks:**
- [ ] Add `placedProps: PlacedProp[]` to scene state
- [ ] Create `placeProp(sceneId, propId, position)` action
- [ ] Create `moveProp(propId, position)` action
- [ ] Create `updatePlacedProp(propId, updates)` action
- [ ] Create `deletePlacedProp(propId)` action
- [ ] Add WebSocket sync for prop placement/movement/deletion
- [ ] Add selectors: `useSceneProps(sceneId)`, `getSceneProps(sceneId)`
- [ ] Add WebSocket event handlers for incoming prop events

### 1.2 Update Game Types (`src/types/game.ts`)

Add prop support to Scene interface:

```typescript
import type { PlacedProp } from './prop';

export interface Scene {
  id: string;
  name: string;
  description?: string;
  backgroundImage?: BackgroundImage;
  gridSettings: GridSettings;
  drawings: Drawing[];
  placedProps: PlacedProp[]; // NEW
  createdAt: number;
  updatedAt: number;
}

// Add to WebSocketMessage data types
export type GameEventData =
  | { name: 'session/created'; roomCode: string; uuid: string }
  | { name: 'session/joined'; roomCode: string; uuid: string; hostId: string }
  // ... existing events
  | { name: 'prop/placed'; sceneId: string; prop: PlacedProp }
  | { name: 'prop/moved'; sceneId: string; propId: string; position: Point }
  | { name: 'prop/updated'; sceneId: string; propId: string; updates: Partial<PlacedProp> }
  | { name: 'prop/removed'; sceneId: string; propId: string };
```

**Tasks:**
- [ ] Add `placedProps: PlacedProp[]` to `Scene` interface
- [ ] Update WebSocket message types to include prop events
- [ ] Add prop-related event names

---

## Phase 2: Scene Rendering Layer
**Time Estimate: 2-3 hours**
**Priority: HIGH (Required to see props)**

### 2.1 Create PropRenderer Component

**File:** `src/components/Scene/PropRenderer.tsx`

```typescript
import React from 'react';
import type { PlacedProp, Prop } from '@/types/prop';
import { PROP_SIZE_GRID_MAPPING } from '@/types/prop';

interface PropRendererProps {
  placedProp: PlacedProp;
  prop: Prop;
  gridSize: number;
  isSelected: boolean;
  onSelect: (prop: PlacedProp) => void;
  onMove: (prop: PlacedProp, dx: number, dy: number) => void;
  onMoveEnd: (prop: PlacedProp) => void;
  canEdit: boolean;
}

export const PropRenderer: React.FC<PropRendererProps> = ({
  placedProp,
  prop,
  gridSize,
  isSelected,
  onSelect,
  onMove,
  onMoveEnd,
  canEdit,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Calculate prop size in pixels
  const propSize = placedProp.width && placedProp.height
    ? { width: placedProp.width, height: placedProp.height }
    : {
        width: PROP_SIZE_GRID_MAPPING[prop.size] * gridSize * placedProp.scale,
        height: PROP_SIZE_GRID_MAPPING[prop.size] * gridSize * placedProp.scale,
      };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canEdit) return;

    e.stopPropagation();
    onSelect(placedProp);

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !canEdit) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    onMove(placedProp, dx, dy);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onMoveEnd(placedProp);
    }
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <g
      className="prop-renderer"
      transform={`translate(${placedProp.x}, ${placedProp.y}) rotate(${placedProp.rotation})`}
      style={{ cursor: canEdit ? 'move' : 'default' }}
    >
      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={-propSize.width / 2 - 4}
          y={-propSize.height / 2 - 4}
          width={propSize.width + 8}
          height={propSize.height + 8}
          fill="none"
          stroke="#4ade80"
          strokeWidth="3"
          strokeDasharray="5,5"
          opacity="0.8"
        />
      )}

      {/* Prop image */}
      <image
        href={prop.image}
        x={-propSize.width / 2}
        y={-propSize.height / 2}
        width={propSize.width}
        height={propSize.height}
        opacity={placedProp.dmNotesOnly ? 0.5 : 1}
        onMouseDown={handleMouseDown}
        style={{ pointerEvents: canEdit ? 'all' : 'none' }}
      />

      {/* Prop name on hover */}
      <title>{prop.name}</title>
    </g>
  );
};
```

**Tasks:**
- [ ] Create PropRenderer component
- [ ] Render prop image at x,y with rotation/scale
- [ ] Handle click events for selection
- [ ] Show selection highlight when selected
- [ ] Support drag-to-move (when select/move tool active)
- [ ] Show prop name on hover
- [ ] Respect visibility settings (visibleToPlayers, dmNotesOnly)

### 2.2 Update SceneCanvas

**File:** `src/components/Scene/SceneCanvas.tsx`

Add props rendering layer:

```typescript
// Import
import { PropRenderer } from './PropRenderer';
import { propAssetManager } from '@/services/propAssets';
import { useSceneProps } from '@/stores/gameStore';

// Inside component
const placedProps = useSceneProps(scene.id);
const [selectedProps, setSelectedProps] = useState<string[]>([]);

// In JSX, add after background but before tokens:
{/* Props layer */}
<g id="props-layer">
  {placedProps.map((placedProp) => {
    const prop = propAssetManager.getPropById(placedProp.propId);
    if (!prop) return null;

    // Filter by visibility
    if (!isHost && !placedProp.visibleToPlayers) return null;

    return (
      <PropRenderer
        key={placedProp.id}
        placedProp={placedProp}
        prop={prop}
        gridSize={safeGridSettings.size}
        isSelected={selectedProps.includes(placedProp.id)}
        onSelect={handlePropSelect}
        onMove={handlePropMove}
        onMoveEnd={handlePropMoveEnd}
        canEdit={isHost || placedProp.placedBy === user.id}
      />
    );
  })}
</g>
```

**Tasks:**
- [ ] Add props layer between background and tokens
- [ ] Import and render PropRenderer for each placed prop
- [ ] Add `selectedProps` state (similar to `selectedTokens`)
- [ ] Handle prop selection/deselection
- [ ] Add prop drag handlers (similar to token drag handlers)

### 2.3 Create PropDropZone Component

**File:** `src/components/Scene/PropDropZone.tsx`

```typescript
import React from 'react';
import { useDrop } from 'react-dnd';
import type { Prop } from '@/types/prop';
import { useGameStore } from '@/stores/gameStore';

interface PropDropZoneProps {
  sceneId: string;
  children: React.ReactNode;
}

export const PropDropZone: React.FC<PropDropZoneProps> = ({ sceneId, children }) => {
  const { placeProp } = useGameStore();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'PROP',
    drop: (item: { prop: Prop }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset) return;

      // Calculate position relative to scene
      // TODO: Convert screen coordinates to scene coordinates
      const position = { x: offset.x, y: offset.y };

      placeProp(sceneId, item.prop.id, position);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [sceneId, placeProp]);

  return (
    <div ref={drop} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {children}
      {isOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(74, 222, 128, 0.1)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
};
```

**Tasks:**
- [ ] Create PropDropZone component
- [ ] Accept drag-and-drop from PropPanel
- [ ] Calculate drop position on scene
- [ ] Call gameStore.placeProp() on drop
- [ ] Handle grid snapping if enabled

---

## Phase 3: Props Panel UI
**Time Estimate: 3-4 hours**
**Priority: HIGH (Required to browse/select props)**

### 3.1 Create Base Components

#### PropPanel.tsx

**File:** `src/components/Props/PropPanel.tsx`

Structure similar to `TokenPanel.tsx`:

```typescript
import React, { useState, useMemo, useEffect } from 'react';
import { usePropAssets } from '@/services/propAssets';
import { PropCreationPanel } from './PropCreationPanel';
import { PropConfigPanel } from './PropConfigPanel';
import { DraggableProp } from './DraggableProp';
import { PropCategoryTabs } from './PropCategoryTabs';
import type { Prop } from '@/types/prop';

export const PropPanel: React.FC = () => {
  const { getAllProps, updateProp } = usePropAssets();
  const [showCreationPanel, setShowCreationPanel] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [selectedProp, setSelectedProp] = useState<Prop | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'furniture' | 'decoration' | 'treasure' | 'container' | 'door' | 'trap' | 'light' | 'other'
  >('all');

  const allProps = getAllProps();

  // Filter logic similar to TokenPanel
  const filteredProps = useMemo(() => {
    // ... filtering logic
  }, [allProps, activeCategory, searchQuery]);

  return (
    <>
      <div className="prop-panel-wrapper">
        <PropCategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <div className="prop-panel-main">
          {/* Header with Create/Manage buttons */}
          {/* Search bar */}
          {/* Props grid */}
        </div>
      </div>

      {/* Modals */}
      {showCreationPanel && <PropCreationPanel ... />}
      {showConfigPanel && <PropConfigPanel ... />}
    </>
  );
};
```

**Tasks:**
- [ ] Create PropPanel component structure
- [ ] Add category tabs (furniture, decoration, treasure, container, door, trap, light, other)
- [ ] Add search bar with category-scoped search
- [ ] Add grid display of filtered props
- [ ] Add "Create Prop" button → opens PropCreationPanel
- [ ] Add "Manage Libraries" button → opens PropLibraryManager
- [ ] Add empty states for no props
- [ ] Save/restore active category to localStorage

#### DraggableProp.tsx

**File:** `src/components/Props/DraggableProp.tsx`

```typescript
import React from 'react';
import { useDrag } from 'react-dnd';
import type { Prop } from '@/types/prop';

interface DraggablePropProps {
  prop: Prop;
  onClick: (prop: Prop) => void;
  onConfigure: (prop: Prop) => void;
}

export const DraggableProp: React.FC<DraggablePropProps> = ({
  prop,
  onClick,
  onConfigure,
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PROP',
    item: { prop },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [prop]);

  return (
    <div
      ref={drag}
      className="draggable-prop"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={() => onClick(prop)}
      onContextMenu={(e) => {
        e.preventDefault();
        onConfigure(prop);
      }}
    >
      <img src={prop.image} alt={prop.name} />
      <div className="prop-name">{prop.name}</div>
    </div>
  );
};
```

**Tasks:**
- [ ] Create DraggableProp component
- [ ] Show prop thumbnail
- [ ] Show prop name
- [ ] Make draggable (react-dnd)
- [ ] Click to select
- [ ] Right-click to configure

#### PropCategoryTabs.tsx

**File:** `src/components/Props/PropCategoryTabs.tsx`

```typescript
export const PropCategoryTabs: React.FC<PropCategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
  categoryCounts,
}) => {
  const categories = [
    { id: 'all', icon: '📦', label: 'All' },
    { id: 'furniture', icon: '🪑', label: 'Furniture' },
    { id: 'decoration', icon: '🎨', label: 'Decoration' },
    { id: 'treasure', icon: '💰', label: 'Treasure' },
    { id: 'container', icon: '📦', label: 'Containers' },
    { id: 'door', icon: '🚪', label: 'Doors' },
    { id: 'trap', icon: '⚠️', label: 'Traps' },
    { id: 'light', icon: '💡', label: 'Lights' },
    { id: 'other', icon: '⚙️', label: 'Other' },
  ];

  return (
    <div className="prop-category-tabs">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={activeCategory === cat.id ? 'active' : ''}
          onClick={() => onCategoryChange(cat.id)}
        >
          <span className="icon">{cat.icon}</span>
          <span className="label">{cat.label}</span>
          <span className="count">{categoryCounts[cat.id]}</span>
        </button>
      ))}
    </div>
  );
};
```

**Tasks:**
- [ ] Create PropCategoryTabs component
- [ ] Show category icons and labels
- [ ] Show count badges per category
- [ ] Highlight active category

### 3.2 Creation & Configuration Panels

#### PropCreationPanel.tsx

**File:** `src/components/Props/PropCreationPanel.tsx`

Similar to `TokenCreationPanel.tsx` but for props.

**Tasks:**
- [ ] Upload image or use URL
- [ ] Enter name, category, size
- [ ] Add tags
- [ ] Set stats (hp, ac, locked, lightRadius, etc.)
- [ ] Set visibility (public/private)
- [ ] Preview before creating
- [ ] Save to custom library

#### PropConfigPanel.tsx

**File:** `src/components/Props/PropConfigPanel.tsx`

**Tasks:**
- [ ] Edit name, category, size
- [ ] Edit tags
- [ ] Edit stats
- [ ] Change image
- [ ] Delete prop (with confirmation)

#### PropLibraryManager.tsx

**File:** `src/components/Props/PropLibraryManager.tsx`

**Tasks:**
- [ ] List all libraries (default + custom)
- [ ] Import/export libraries (JSON)
- [ ] Delete custom props
- [ ] Bulk operations

---

## Phase 4: Selection & Movement Tools
**Time Estimate: 2-3 hours**
**Priority: MEDIUM (Makes props interactive)**

### 4.1 Update Selection System

**File:** `src/components/Scene/SelectionOverlay.tsx`

**Tasks:**
- [ ] Support both tokens AND props selection
- [ ] Show selection box around selected props
- [ ] Handle multi-select (Shift+click)
- [ ] Show prop count in selection info

### 4.2 Update Drawing Tools

**File:** `src/components/Scene/DrawingTools.tsx`

**Tasks:**
- [ ] When `activeTool === 'select'`:
  - Click on prop → select it
  - Drag selected prop → move it
  - Click empty space → deselect all
- [ ] When `activeTool === 'move'`:
  - Click-and-drag any prop → move it
- [ ] Add grid snapping for props (if enabled)

### 4.3 Create Unified Selection Manager

**File:** `src/utils/selectionManager.ts`

**Tasks:**
- [ ] Track selected items (tokens + props + drawings)
- [ ] Determine what was clicked (token vs prop vs drawing)
- [ ] Handle selection priority
- [ ] Support keyboard shortcuts (Delete, Ctrl+A, etc.)

---

## Phase 5: Advanced Features
**Time Estimate: 3-4 hours**
**Priority: LOW (Nice-to-have enhancements)**

### 5.1 Prop Interactions

**File:** `src/components/Scene/PropInteractionPanel.tsx`

**Tasks:**
- [ ] Show prop stats sidebar when selected
- [ ] Toggle locked/unlocked (for doors/containers)
- [ ] Toggle light on/off (for light sources)
- [ ] Add/remove items from containers
- [ ] Show prop notes (DM only)
- [ ] Quick delete button

### 5.2 Context Menus

**File:** `src/components/Props/PropContextMenu.tsx`

**Tasks:**
- [ ] Configure
- [ ] Duplicate
- [ ] Copy/Paste
- [ ] Delete
- [ ] Send to front/back (layer control)
- [ ] Toggle visibility
- [ ] Add to favorites

### 5.3 Keyboard Shortcuts

**Tasks:**
- [ ] Delete key → delete selected props
- [ ] Ctrl+C → copy selected props
- [ ] Ctrl+V → paste props
- [ ] Ctrl+D → duplicate props
- [ ] Arrow keys → nudge selected props

---

## Phase 6: Polish & Integration
**Time Estimate: 2-3 hours**
**Priority: MEDIUM (Professional finish)**

### 6.1 Update Main App

**File:** `src/App.tsx` or main layout

**Tasks:**
- [ ] Add "Props" tab to sidebar
- [ ] Import and render PropPanel
- [ ] Ensure tab switching works
- [ ] Add prop count badges

### 6.2 Persistence

**Tasks:**
- [ ] Ensure placed props save with scene data
- [ ] Load props when scene loads
- [ ] Sync props across multiplayer sessions

### 6.3 Styling

**File:** `src/styles/prop-panel.css`

**Tasks:**
- [ ] Match existing glassmorphism theme
- [ ] Responsive grid layout
- [ ] Hover effects and transitions
- [ ] Category tab styling
- [ ] Selection highlights

### 6.4 Testing Checklist

- [ ] Create prop → appears in library
- [ ] Drag prop to scene → places correctly
- [ ] Select prop → highlights correctly
- [ ] Move prop → updates position
- [ ] Delete prop → removes from scene
- [ ] Save scene → props persist
- [ ] Load scene → props load correctly
- [ ] Multiplayer sync → props sync across clients
- [ ] Grid snapping works
- [ ] Rotation works
- [ ] Scaling works
- [ ] Visibility settings work
- [ ] DM-only props are hidden from players

---

## Recommended Implementation Order

### MVP (Minimum Viable Product) - 4-6 hours
1. ✅ **Phase 1.1** - Update gameStore with prop actions
2. ✅ **Phase 1.2** - Update game types
3. **Phase 2.1** - Create PropRenderer
4. **Phase 2.2** - Update SceneCanvas to render props
5. **Phase 3.1** - Create PropPanel base (PropPanel, DraggableProp, PropCategoryTabs)
6. **Phase 4.1-4.2** - Basic selection & movement

**Result:** Props can be browsed, placed, seen, selected, and moved

### Enhanced Features - 4-6 hours
7. **Phase 2.3** - PropDropZone for drag-and-drop
8. **Phase 3.2** - Creation & Config panels
9. **Phase 5.1** - Prop interactions
10. **Phase 6** - Polish & styling

**Result:** Full-featured prop system with custom props

### Advanced Features - 4-6 hours
11. **Phase 4.3** - Unified selection manager
12. **Phase 5.2-5.3** - Context menus & keyboard shortcuts
13. **Phase 6.4** - Comprehensive testing

**Result:** Professional, polished prop system

---

## File Checklist

### ✅ Completed Files (2)
- [x] `src/types/prop.ts` - Type definitions
- [x] `src/services/propAssets.ts` - Asset manager

### 📋 New Files to Create (11)
- [ ] `src/components/Props/PropPanel.tsx`
- [ ] `src/components/Props/DraggableProp.tsx`
- [ ] `src/components/Props/PropCategoryTabs.tsx`
- [ ] `src/components/Props/PropCreationPanel.tsx`
- [ ] `src/components/Props/PropConfigPanel.tsx`
- [ ] `src/components/Props/PropLibraryManager.tsx`
- [ ] `src/components/Scene/PropRenderer.tsx`
- [ ] `src/components/Scene/PropDropZone.tsx`
- [ ] `src/components/Scene/PropInteractionPanel.tsx`
- [ ] `src/components/Props/PropContextMenu.tsx`
- [ ] `src/styles/prop-panel.css`

### 📝 Files to Modify (5)
- [ ] `src/stores/gameStore.ts` - Add prop actions/state
- [ ] `src/types/game.ts` - Add prop types to Scene
- [ ] `src/components/Scene/SceneCanvas.tsx` - Render props layer
- [ ] `src/components/Scene/DrawingTools.tsx` - Handle prop selection/movement
- [ ] `src/App.tsx` - Add Props tab

---

## Dependencies & Prerequisites

### Required Libraries (already installed)
- `react-dnd` - Drag and drop
- `react-dnd-html5-backend` - HTML5 backend for react-dnd

### Required Components (already exist)
- Token panel components (as reference)
- Scene canvas infrastructure
- Game store architecture

### Required Services (already exist)
- WebSocket service
- Image storage service (can be reused)

---

## Notes & Considerations

1. **Layer Ordering:** Props render between background and tokens. Consider adding layer control in Phase 5.

2. **Performance:** For scenes with many props, consider:
   - Virtual scrolling in prop list
   - Lazy loading of prop images
   - Throttling drag events

3. **Multiplayer:** All prop actions must sync via WebSocket. Test with multiple clients.

4. **Accessibility:** Add keyboard navigation, ARIA labels, and screen reader support.

5. **Mobile:** Consider touch-friendly drag-and-drop for tablet users.

6. **Import/Export:** Props should be included in scene export/import functionality.

7. **Undo/Redo:** Consider integrating with undo/redo system (if it exists).

---

## Success Criteria

- [ ] Users can browse default props by category
- [ ] Users can create custom props with images
- [ ] Props can be dragged onto scenes
- [ ] Props can be selected and moved with select/move tools
- [ ] Props persist when scene is saved/loaded
- [ ] Props sync across multiplayer sessions
- [ ] Props respect visibility settings (DM-only, etc.)
- [ ] UI matches existing glassmorphism theme
- [ ] No performance issues with 50+ props on scene

---

## Future Enhancements (Post-MVP)

1. **Prop Templates** - Save prop configurations as templates
2. **Prop Groups** - Group props together (furniture set, etc.)
3. **Smart Snapping** - Props snap to other props (doors snap to walls)
4. **Prop Effects** - Light sources cast actual light
5. **Prop Animations** - Animated props (flickering torches, etc.)
6. **Prop Sounds** - Sound effects for interactions
7. **Prop States** - Multiple states (open/closed door, lit/unlit torch)
8. **Prop Collections** - Browse online prop libraries
9. **Prop Generator** - AI-generated prop images
10. **3D Props** - isometric or 3D rendered props

---

**Last Updated:** 2025-10-06
**Status:** Ready for implementation
