# Toolbar Display Modes

## Overview
The GameToolbar supports two display modes: **Docked** (default) and **Floating** (experimental).

## Modes

### Docked Mode (Default)
- Toolbar spans the full width of the canvas area (stopping at the panel)
- Positioned at the bottom of the scene canvas
- Always visible and stationary
- No drag handle or position controls
- Clean, professional appearance
- Best for most users

**CSS Classes**: `.game-toolbar.docked`

### Floating Mode (Experimental)
- Toolbar can be dragged anywhere on the canvas
- Compact, centered design
- Includes drag handle (⋮⋮) for repositioning
- Includes compact toggle button
- Position persists across drags
- Double-click drag handle to reset to center

**CSS Classes**: `.game-toolbar.floating`

## User Setting

The mode is controlled by the `floatingToolbar` setting in `UserSettings`:

```typescript
interface UserSettings {
  // ... other settings

  // Experimental Settings
  floatingToolbar?: boolean; // When false (default), toolbar is docked at bottom
}
```

### Accessing the Setting

Users can toggle between modes in **Settings > Experimental > Floating Toolbar**

Default value: `false` (docked mode)

## Implementation Details

### GameToolbar Component

The toolbar checks the setting and applies appropriate classes and behavior:

```typescript
const isFloating = settings.floatingToolbar ?? false;

<div
  className={`game-toolbar ${isFloating ? 'floating' : 'docked'} ...`}
  style={{
    '--tw-translate-x': isFloating ? `${displayPosition.x}px` : '0',
    '--tw-translate-y': isFloating ? `${displayPosition.y}px` : '0',
    ...
  }}
>
  {/* Drag Handle - Only in floating mode */}
  {isFloating && <div className="toolbar-controls">...</div>}

  {/* Toolbar content */}
  <div className="toolbar-content">...</div>
</div>
```

### CSS Styling

#### Docked Mode
```css
.game-toolbar.docked {
  width: 100%;
  max-width: none;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
  justify-content: center;
  margin: 0;
  padding: var(--spacing-2) var(--spacing-4);
}

.game-toolbar.docked .toolbar-content {
  flex: 1;
  max-width: 1400px;
  justify-content: center;
}

.game-toolbar.docked .toolbar-row {
  flex-wrap: wrap;
  justify-content: center;
}
```

#### Floating Mode
```css
.game-toolbar.floating {
  transform: translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0));
}
```

### Layout Container

The `.layout-toolbar` container was updated to support both modes:

```css
.layout-toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-toolbar);
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: var(--spacing-6);
}
```

## Drag and Drop (Floating Mode Only)

When in floating mode, the toolbar uses react-dnd for drag functionality:

- **Drag Handle**: Only visible in floating mode
- **Preview**: Full toolbar follows cursor during drag
- **Position Persistence**: Position is maintained using local state
- **Reset**: Double-click drag handle to return to center

See `DND_TOOLBAR.md` for complete drag-and-drop implementation details.

## Testing Checklist

- [ ] Docked mode spans full canvas width
- [ ] Docked mode stops at panel boundary
- [ ] Docked mode has no drag handle
- [ ] Floating mode shows drag handle
- [ ] Floating mode can be dragged
- [ ] Setting toggle works in Settings panel
- [ ] Mode persists after reload (if settings are saved)
- [ ] Toolbar content renders correctly in both modes
- [ ] Compact toggle works in both modes
- [ ] Double-click reset works in floating mode

## Related Files

- `src/components/GameToolbar.tsx` - Main component
- `src/components/Settings.tsx` - Settings UI with toggle
- `src/types/game.ts` - UserSettings type definition
- `src/stores/gameStore.ts` - State management
- `src/styles/layout-consolidated.css` - CSS styles
- `.claude-context/DND_TOOLBAR.md` - Drag-and-drop documentation

## Date Implemented
September 30, 2025