# Z-Index Layer System

**Purpose:** Prevent z-index conflicts by defining a clear stacking hierarchy for all UI layers.

## Layer Hierarchy (Bottom to Top)

```
Layer 0: Base Scene Content
├─ z-index: 0-9
├─ Scene canvas (SVG)
├─ Scene background images
├─ Grid layer
└─ Drawings layer

Layer 10: Interactive Overlays
├─ z-index: 10-19
├─ Token placement zones
├─ Selection overlays
└─ Drawing tools interaction rect

Layer 20: Side Panels
├─ z-index: 20-29
├─ Context panel (right sidebar)
├─ Scene panel
├─ Token panel
└─ Settings panel

Layer 30: Toolbars & Controls
├─ z-index: 30-39
├─ Game toolbar (bottom)
├─ Scene tabs
├─ Camera controls
└─ Drawing style panels

Layer 40: Overlays & Notifications
├─ z-index: 40-49
├─ PlayerBar (top header)
├─ Toast notifications
├─ Drawing properties panel
└─ Context menus

Layer 50: Modals & Dialogs
├─ z-index: 50-59
├─ Modal backdrops
├─ Modal dialogs
├─ Confirmation dialogs
└─ Popover menus

Layer 9999+: Critical Top Layer
├─ z-index: 9999+
├─ DiceBox3D (visual only, pointer-events: none)
├─ Tooltips
├─ Error messages
└─ Loading overlays
```

## CSS Variable Reference

Located in `src/styles/design-tokens.css`:

```css
/* Base numeric scale */
--z-0: 0;
--z-10: 10;
--z-20: 20;
--z-30: 30;
--z-40: 40;
--z-50: 50;

/* Semantic layer names (USE THESE) */
--z-base: var(--z-0);           /* Scene content, backgrounds */
--z-dropdown: var(--z-10);      /* Dropdowns, selection overlays */
--z-sticky: var(--z-20);        /* Side panels, sticky headers */
--z-panel: var(--z-20);         /* Same as sticky */
--z-fixed: var(--z-30);         /* Fixed position elements */
--z-toolbar: var(--z-30);       /* Toolbars, controls */
--z-overlay: var(--z-40);       /* Overlays, notifications */
--z-modal-backdrop: var(--z-40);
--z-modal: var(--z-50);         /* Modals, dialogs */
--z-popover: var(--z-50);
--z-tooltip: var(--z-50);
```

## Usage Guidelines

### ✅ DO:

1. **Use semantic variable names**, not raw numbers:
   ```css
   /* ✅ Good */
   .game-toolbar {
     z-index: var(--z-toolbar);
   }

   /* ❌ Bad */
   .game-toolbar {
     z-index: 30;
   }
   ```

2. **Check this document before adding z-index** to new components

3. **Document new layers** in this file when adding them

4. **Group related components** in the same layer range:
   ```css
   .toolbar { z-index: var(--z-toolbar); }
   .toolbar-popup { z-index: calc(var(--z-toolbar) + 1); }
   ```

5. **Use `pointer-events: none`** for visual-only overlays:
   ```css
   .dice-box {
     z-index: 10000;
     pointer-events: none; /* Visible but doesn't block clicks */
   }
   ```

### ❌ DON'T:

1. **Don't use arbitrary high numbers** like `z-index: 9999999`
2. **Don't add z-index without checking** this hierarchy
3. **Don't use raw numbers** - always use CSS variables
4. **Don't assume higher = always visible** - check pointer-events too

## Component Layer Map

### Scene Area (`z-index: 0-9`)
- `.scene-canvas-container` → 0 (default)
- `.scene-canvas` (SVG) → 0
- `.scene-background` → 0
- `DrawingTools rect` → inside SVG (no explicit z-index)

### Panels (`z-index: 20`)
- `.layout-panel` → `var(--z-panel)` (20)
- `.context-panel` → inherits from parent
- `.scene-panel` → inherits from parent

### Toolbars (`z-index: 30`)
- `.layout-toolbar` → `var(--z-toolbar)` (30)
- `.game-toolbar` → inherits, with `pointer-events: auto`
- `.scene-tab-bar` → no explicit z-index (relies on DOM order)

### Overlays (`z-index: 40`)
- `.player-bar-container` → `var(--z-overlay)` (40)
- `.drawing-properties-panel` → `var(--z-overlay)` (40)
- Toast notifications → `var(--z-overlay)` (40)

### Modals (`z-index: 50`)
- Modal dialogs → `var(--z-modal)` (50)
- Confirmation dialogs → `var(--z-modal)` (50)

### Special Cases (`z-index: 10000+`)
- **DiceBox3D** → `10000` with `pointer-events: none`
  - Must stay on top for visual dice rolling
  - Must NOT block canvas interactions
  - Always set `pointer-events: none`!

## Common Issues & Solutions

### Issue: "Toolbar buttons don't respond to clicks"
**Cause:** Higher z-index element blocking with `pointer-events: auto`
**Solution:**
1. Check this document for proper layer
2. Ensure toolbar has higher z-index than scene content
3. Set blocking element to `pointer-events: none` if visual-only

### Issue: "Drawing tools don't work in one area"
**Cause:** Invisible element (like DiceBox) blocking canvas
**Solution:**
1. Find the blocking element (inspect with browser DevTools)
2. Set `pointer-events: none` if it's visual-only
3. OR move it to appropriate layer with proper stacking

### Issue: "Modal appears behind panel"
**Cause:** Panel has higher z-index than modal
**Solution:** Use `var(--z-modal)` which is higher than `var(--z-panel)`

## Debugging Z-Index Issues

1. **Open browser DevTools** → Elements tab
2. **Inspect the non-clickable area**
3. **Look for elements with:**
   - High z-index values
   - `pointer-events: auto`
   - Large width/height covering the area
4. **Check this document** for proper layer assignment
5. **Fix by either:**
   - Lowering z-index to correct layer
   - Setting `pointer-events: none`
   - Reducing element size to only what's needed

## Updating This System

When adding a new UI layer:

1. **Choose the appropriate layer range** (0-9, 10-19, etc.)
2. **Add to design-tokens.css** if it needs a semantic name
3. **Document it in this file** with examples
4. **Update the hierarchy diagram** above
5. **Test with existing layers** to ensure no conflicts

## Quick Reference

| Component Type | Z-Index Variable | Pointer Events |
|---|---|---|
| Scene canvas | `0` (no variable) | auto |
| Panels | `var(--z-panel)` | auto |
| Toolbars | `var(--z-toolbar)` | auto |
| Overlays | `var(--z-overlay)` | auto |
| Modals | `var(--z-modal)` | auto |
| DiceBox | `10000` (raw) | **none** ⚠️ |
| Tooltips | `var(--z-tooltip)` | none |

---

**Last Updated:** 2025-01-09
**Maintained By:** Development team
**Related Files:**
- `src/styles/design-tokens.css` (variable definitions)
- `src/styles/layout-consolidated.css` (component usage)
