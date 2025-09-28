# Layout Testing & Validation

This document describes the testing framework created to prevent layout issues like panels overflowing viewport bounds and toolbars becoming invisible.

## The Problem We're Solving

The layout bug we encountered had these symptoms:
- Panels (Settings, Scene) extending beyond viewport height
- Scene canvas toolbar positioned relative to full content height instead of visible area
- Sidebar resize handle stretching beyond viewport
- Missing or non-functional scrollbars in overflowing content

## Testing Framework

### 1. CSS Layout Validation (`scripts/validate-layout-css.js`)

Automatically scans CSS files for patterns that could cause layout issues.

**Run manually:**
```bash
npm run validate-layout
```

**What it checks:**
- `.layout-panel` has height constraints (`max-height` or `height: 100%`)
- `.panel-content` doesn't use problematic `overflow-x: visible`
- `.sidebar-resize-handle` has proper height constraints
- Absolutely positioned elements have viewport bounds
- Required properties for scrollable containers

**Example output:**
```
📄 src/styles/game-layout.css:
  ❌ Line 456: layout-panel: layout-panel must have height constraints to prevent viewport overflow
  ⚠️ Line 611: panel-content with overflow-x: visible can cause scrollbar issues
```

### 2. Automated Layout Tests (`tests/layout.test.ts`)

Playwright tests that verify layout behavior in the browser.

**Run layout tests:**
```bash
npm run test:layout
```

**Run quick pre-commit test:**
```bash
npm run test:layout:quick
```

**What it tests:**
- Panels don't exceed viewport height
- Toolbar visibility in all panels
- Scrollbar functionality
- Resize handle positioning
- Multi-viewport responsiveness
- Content overflow handling

### 3. Visual Regression Tests (`tests/visual-regression.test.ts`)

Screenshot-based tests to catch visual layout regressions.

**Run visual tests:**
```bash
npm run test:visual
```

**What it captures:**
- Panel layouts with toolbar visible
- Before/after scrolling states
- Different viewport sizes
- Toolbar positioning consistency
- Overflow content scenarios

### 4. Pre-commit Validation

Automatically runs on every commit to catch issues early.

**What runs:**
- CSS layout validation
- Quick layout test (panel height check)
- Existing lint-staged tasks

## Key CSS Rules to Follow

### 1. Panel Height Constraints
```css
.layout-panel {
  max-height: 100vh; /* Critical: Prevent viewport overflow */
  height: 100%;      /* Ensure full available height */
  overflow: hidden;  /* Prevent content stretching panel */
}
```

### 2. Scrollable Content Containers
```css
.panel-content {
  flex: 1;
  overflow-y: auto;     /* Enable vertical scrolling */
  overflow-x: hidden;   /* Avoid overflow-x: visible */
  min-height: 0;        /* Allow flex shrinking */
}
```

### 3. Flex Container Hierarchy
```css
.settings-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;  /* Critical for flex children to shrink */
  height: 100%;   /* Take full available height */
}
```

## Common Anti-Patterns to Avoid

❌ **Panel without height constraints:**
```css
.layout-panel {
  /* Missing max-height or height constraints */
  display: flex;
  flex-direction: column;
}
```

❌ **Mixing overflow properties:**
```css
.panel-content {
  overflow-y: auto;
  overflow-x: visible; /* This causes scrollbar issues */
}
```

❌ **Missing min-height on flex containers:**
```css
.container {
  display: flex;
  flex: 1;
  /* Missing min-height: 0 prevents children from shrinking */
}
```

## Debugging Layout Issues

### 1. Check Panel Height
```javascript
// In browser console
const panel = document.querySelector('.layout-panel');
console.log('Panel height:', panel.offsetHeight);
console.log('Viewport height:', window.innerHeight);
console.log('Exceeds viewport:', panel.offsetHeight > window.innerHeight);
```

### 2. Check Toolbar Position
```javascript
const toolbar = document.querySelector('.scene-canvas-toolbar');
const rect = toolbar.getBoundingClientRect();
console.log('Toolbar position:', { top: rect.top, left: rect.left });
console.log('Is visible:', rect.top >= 0 && rect.left >= 0);
```

### 3. Check Scrollable Area
```javascript
const content = document.querySelector('.settings-content');
console.log('Can scroll:', content.scrollHeight > content.clientHeight);
console.log('Scroll position:', content.scrollTop);
```

## Adding New Layout Components

When adding new layout components, ensure:

1. **Height constraints**: Components that could contain variable content should have `max-height: 100vh`
2. **Scrollable containers**: Use `overflow-y: auto` and `min-height: 0`
3. **Flex hierarchy**: Parent containers need `min-height: 0` for children to shrink
4. **Testing**: Add relevant test cases to `layout.test.ts`

## CI/CD Integration

The layout validation runs automatically on:
- **Pre-commit**: CSS validation and quick layout test
- **CI pipeline**: Full layout and visual regression test suite
- **Manual**: `npm run validate-layout` and `npm run test:layout`

## Updating Tests

When layout changes are intentional:

1. **CSS validation**: Update patterns in `validate-layout-css.js`
2. **Layout tests**: Update assertions in `layout.test.ts`
3. **Visual tests**: Update screenshots with `npm run test:visual -- --update-snapshots`

## Performance Considerations

- **Quick tests** run on pre-commit (fast feedback)
- **Full test suite** runs in CI (comprehensive coverage)
- **Visual tests** are separate to avoid blocking basic development

This testing framework should catch the type of layout issues we encountered before they reach production.