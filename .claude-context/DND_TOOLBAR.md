# React DnD Toolbar Implementation

## Overview
Successfully implemented drag-and-drop functionality for the GameToolbar component using react-dnd v16.0.1 with HTML5Backend.

## Key Components

### Dependencies
```json
{
  "react-dnd": "^16.0.1",
  "react-dnd-html5-backend": "^16.0.1"
}
```

### DndProvider Setup
**File**: `src/components/Layout.tsx`

The DndProvider must wrap the entire application at a high level to provide drag-and-drop context:

```typescript
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

return (
  <DndProvider backend={HTML5Backend} debugMode={true}>
    <LinearLayout />
  </DndProvider>
);
```

**Important**: The DndProvider should be placed high in the component tree, above any components that use drag-and-drop functionality.

## GameToolbar Implementation

### Key Implementation Details

#### 1. Position State Management
The toolbar uses both state and refs to track position:

```typescript
const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
const positionRef = useRef<Position>({ x: 0, y: 0 });

// Keep ref in sync with state
useEffect(() => {
  positionRef.current = position;
}, [position]);
```

**Why both state and ref?**
- **State**: Triggers re-renders to update the toolbar's visual position
- **Ref**: Captures the current position in the drag `item()` function without closure issues

#### 2. useDrag Hook Configuration

```typescript
const [{ isDragging }, dragRef, preview] = useDrag({
  type: TOOLBAR_TYPE,
  item: () => {
    // Use ref to get current position, not stale closure value
    return {
      type: TOOLBAR_TYPE,
      initialPosition: { ...positionRef.current }
    };
  },
  collect: (monitor) => ({
    isDragging: monitor.isDragging(),
  }),
  end: (item, monitor) => {
    const differenceOffset = monitor.getDifferenceFromInitialOffset();

    if (differenceOffset && (differenceOffset.x !== 0 || differenceOffset.y !== 0)) {
      // Add delta to initial position to get final position
      const newPosition = {
        x: item.initialPosition.x + differenceOffset.x,
        y: item.initialPosition.y + differenceOffset.y,
      };
      setPosition(newPosition);
    }
  },
});
```

**Key Points**:
- `item()` is a function that returns the drag item, capturing the initial position when drag starts
- `getDifferenceFromInitialOffset()` returns the delta movement since drag started
- The new position is calculated by adding the delta to the initial position

#### 3. Drag Preview Configuration

```typescript
useEffect(() => {
  const connectPreview = () => {
    if (toolbarRef.current) {
      preview(toolbarRef.current, {
        captureDraggingState: false,
        anchorX: 0.5,  // Center horizontally
        anchorY: 0,     // Top anchor
      });
    }
  };

  // Small delay to ensure toolbar is rendered
  const timer = setTimeout(connectPreview, 100);
  return () => clearTimeout(timer);
}, [preview]);
```

**Options Explained**:
- `captureDraggingState: false`: Prevents capturing the toolbar in its "dragging" state
- `anchorX: 0.5`: Centers the preview horizontally on the cursor
- `anchorY: 0`: Anchors the preview at the top
- **Delay**: 100ms timeout ensures the DOM element is fully rendered before connecting

#### 4. Drag Handle Ref Connection

```typescript
<div
  ref={dragRef}
  className="toolbar-drag-handle"
  style={{
    cursor: isDragging ? 'grabbing' : 'grab',
    pointerEvents: 'auto',
  }}
>
  <span className="drag-dots">⋮⋮</span>
</div>
```

**Important**: The `dragRef` is attached to the drag handle (⋮⋮), not the entire toolbar.

#### 5. CSS Position Application

```typescript
<div
  ref={toolbarRef}
  className={`game-toolbar ${position.x !== 0 || position.y !== 0 ? 'positioned' : ''}`}
  style={{
    '--tw-translate-x': `${position.x}px`,
    '--tw-translate-y': `${position.y}px`,
    opacity: isDragging ? 0.7 : 1,
    pointerEvents: 'auto',
  }}
>
```

**CSS Custom Properties** (in `layout-consolidated.css`):
```css
.game-toolbar {
  transform: translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0));
}

.game-toolbar.positioned {
  transform: translate(calc(-50% + var(--tw-translate-x, 0px)), var(--tw-translate-y, 0)) !important;
}
```

## Troubleshooting Solutions

### Problem 1: Delta Always Returns {x: 0, y: 0}
**Cause**: The `item` was not a function, so it captured a stale position value in the closure.

**Solution**: Make `item` a function that reads from `positionRef.current`:
```typescript
item: () => {
  return { initialPosition: { ...positionRef.current } };
}
```

### Problem 2: Toolbar Jumps on Subsequent Drags
**Cause**: Each drag was using a stale initial position from the closure instead of the current position.

**Solution**: Use a ref to track the current position and read from it in the `item()` function.

### Problem 3: Drag Preview Shows Only Small Square
**Cause**: Default browser drag preview was being used.

**Solution**: Connect the toolbar element as the preview using the `preview` connector:
```typescript
preview(toolbarRef.current, {
  captureDraggingState: false,
  anchorX: 0.5,
  anchorY: 0,
});
```

### Problem 4: pointer-events Blocking Drag
**Cause**: Parent container `.layout-toolbar` had `pointer-events: none`.

**Solution**: Add explicit `pointerEvents: 'auto'` to both the toolbar and drag handle elements.

## Complete Working Code

### GameToolbar.tsx (Relevant Sections)

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { useGameStore, useIsHost, useCamera } from '@/stores/gameStore';

interface Position {
  x: number;
  y: number;
}

const TOOLBAR_TYPE = 'GAME_TOOLBAR';

export const GameToolbar: React.FC = () => {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with state
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Set up react-dnd dragging
  const [{ isDragging }, dragRef, preview] = useDrag({
    type: TOOLBAR_TYPE,
    item: () => {
      return { type: TOOLBAR_TYPE, initialPosition: { ...positionRef.current } };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const differenceOffset = monitor.getDifferenceFromInitialOffset();

      if (differenceOffset && (differenceOffset.x !== 0 || differenceOffset.y !== 0)) {
        const newPosition = {
          x: item.initialPosition.x + differenceOffset.x,
          y: item.initialPosition.y + differenceOffset.y,
        };
        setPosition(newPosition);
      }
    },
  });

  // Connect preview
  useEffect(() => {
    const connectPreview = () => {
      if (toolbarRef.current) {
        preview(toolbarRef.current, {
          captureDraggingState: false,
          anchorX: 0.5,
          anchorY: 0,
        });
      }
    };
    const timer = setTimeout(connectPreview, 100);
    return () => clearTimeout(timer);
  }, [preview]);

  const handleDoubleClick = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={toolbarRef}
      className={`game-toolbar ${position.x !== 0 || position.y !== 0 ? 'positioned' : ''}`}
      style={{
        '--tw-translate-x': `${position.x}px`,
        '--tw-translate-y': `${position.y}px`,
        opacity: isDragging ? 0.7 : 1,
        pointerEvents: 'auto',
      } as React.CSSProperties}
    >
      <div className="toolbar-controls">
        <div
          ref={dragRef}
          className="toolbar-drag-handle"
          title="Drag to move | Double-click: reset position"
          onDoubleClick={handleDoubleClick}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'auto',
          }}
        >
          <span className="drag-dots">⋮⋮</span>
        </div>
        {/* Rest of toolbar content */}
      </div>
    </div>
  );
};
```

## Key Lessons Learned

1. **Use refs for current values in drag callbacks**: The `item()` function creates a closure, so use refs to access current state values.

2. **Preview configuration is crucial**: Without proper preview setup, you get the default browser drag image (small square).

3. **Timing matters**: Adding a small delay before connecting the preview ensures the element is rendered.

4. **Pointer events must be explicit**: When parent containers have `pointer-events: none`, child elements need explicit `pointer-events: auto`.

5. **Position accumulation requires careful state management**: Each drag should start from the last position, not reset to origin.

## Testing Checklist

- [x] Toolbar can be dragged by the handle
- [x] Full toolbar is visible as drag preview
- [x] Toolbar stays where it's dropped
- [x] Subsequent drags start from current position
- [x] Double-click resets to center
- [x] Opacity changes during drag (0.7)
- [x] Cursor changes (grab/grabbing)

## Related Files

- `src/components/GameToolbar.tsx` - Main implementation
- `src/components/Layout.tsx` - DndProvider setup
- `src/styles/layout-consolidated.css` - CSS for positioning
- `package.json` - Dependencies

## Date Completed
September 30, 2025