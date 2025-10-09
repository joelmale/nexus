# 3D Dice Box Implementation - Successful Patterns

## Overview
Successfully integrated @3d-dice/dice-box v1.1.4 for 3D animated dice rolling using BabylonJS v5.57.1.

## Critical Success Factors

### 1. Correct API Usage (v1.1.x)
```typescript
// ✅ CORRECT - v1.1.x API
const diceBox = new DiceBox({
  id: 'dice-canvas',
  container: '#dice-box',  // Selector INSIDE config object
  assetPath: '/assets/dice-box/',
  theme: 'default',
  offscreen: false,
  scale: 8,
  gravity: 1,
  // ... other physics settings
});

// ❌ WRONG - Old v1.0.x API
const diceBox = new DiceBox('#dice-box', config);
```

### 2. Container Positioning Strategy
```tsx
// In LinearGameLayout.tsx - scene-content has position: relative
<div className="scene-content" style={{ position: 'relative' }}>
  <SceneCanvas scene={activeScene} />
  <DiceBox3D />  {/* Positioned absolutely within scene */}
</div>

// In DiceBox3D.tsx - absolute positioning
<div
  id="dice-box"
  style={{
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '500px',
    height: '400px',
    zIndex: 10000,        // CRITICAL: High z-index
    pointerEvents: 'auto', // CRITICAL: Allow canvas interaction
  }}
/>
```

### 3. CSS Overrides (dice-box-3d.css)
```css
/* CRITICAL: Force canvas to display properly */
#dice-box canvas {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  position: relative !important;
  z-index: 1 !important;
}
```

**Why `!important` is necessary**: BabylonJS may apply inline styles that conflict with our layout. These overrides ensure the canvas always displays correctly regardless of what BabylonJS does.

### 4. Roll Implementation Pattern
```typescript
// Client-side roll generation
const roll = createDiceRoll(
  expression.trim(),
  user.id || 'unknown',
  user.name || 'Player',
  {
    isPrivate: isHost && isPrivate,
    advantage: rollMode === 'advantage',
    disadvantage: rollMode === 'disadvantage',
  }
);

// Add to local state immediately
useGameStore.getState().addDiceRoll(roll);

// Broadcast if connected (optional)
if (webSocketService.isConnected()) {
  webSocketService.sendEvent({
    type: 'dice/roll-result',
    data: { roll }
  });
}

// DiceBox3D listens to gameStore and animates
```

### 5. Roll Notation Conversion
```typescript
// Convert pools to individual dice with predetermined values
const rollNotations: string[] = [];
const rollValues: number[] = [];

for (const pool of latestRoll.pools) {
  for (const value of pool.results) {
    rollNotations.push(`1d${pool.sides}`);  // MUST include '1' prefix
    rollValues.push(value);
  }
}

// Roll with server-generated values
diceBox.roll(rollNotations, { values: rollValues });
```

## Configuration Reference

### Physics Settings (from documentation)
```typescript
{
  gravity: 1,           // Too much causes jitter, too little takes too long
  mass: 1,              // Affects spin and movement
  friction: 0.8,        // Dice and surface friction
  restitution: 0,       // Bounciness (0 = no bounce)
  linearDamping: 0.4,   // How quickly dice slow down
  angularDamping: 0.4,  // How quickly dice stop spinning
  spinForce: 4,         // Maximum spin force
  throwForce: 5,        // Maximum throwing force
  startingHeight: 8,    // Height where toss begins
  settleTimeout: 5000,  // Max time before forcing stop
  delay: 10,            // Delay between generating dice
}
```

### Visual Settings
```typescript
{
  scale: 8,                  // Dice size (2-9 recommended, accepts decimals)
  enableShadows: true,       // Cast shadows (disable for performance)
  shadowTransparency: 0.8,   // Shadow opacity
  lightIntensity: 1,         // Scene lighting level
  theme: 'default',          // Theme name
  offscreen: false,          // Use offscreenCanvas if available
}
```

## Debugging Tips

### Console Verification
After initialization, check for:
```
🎲 DiceBox3D initialized successfully with config:
🎲 All canvas elements in document: 2
🎲 Canvas in dice-box container: <canvas id="dice-canvas">
🎲 Canvas found! Details: {width: 496, height: 396, opacity: '1', display: 'block'}
```

### Common Issues

**Canvas not visible:**
- Check z-index is high enough (10000+)
- Verify `pointerEvents: 'auto'`
- Ensure dice-box-3d.css is imported in main.css
- Check parent container has `position: relative`

**Dice not rolling:**
- Verify notation includes '1' prefix: `'1d6'` not `'d6'`
- Check roll values array matches notation array length
- Ensure diceBox.init() completed successfully

**Wrong API error:**
- Must use single config object for v1.1.x
- `container` property goes INSIDE config object
- Use selector string, not DOM element reference

## Asset Management

### Required Assets
Must copy from `@3d-dice/dice-box/src/assets` to `/public/assets/dice-box/`:
- `/themes/default/` - Default dice theme
- `/ammo/` - Physics engine files

### Additional Themes
Download from [@3d-dice/dice-themes](https://github.com/3d-dice/dice-themes) and place in `/public/assets/dice-box/themes/`

## TypeScript Definitions

Updated type definitions in `src/types/dice-box.d.ts` for v1.1.x:
- Constructor accepts single config object
- Added `container`, `id`, `origin` properties
- Added `onBeforeRoll`, `onThemeLoaded` callbacks
- Added `preloadThemes`, `externalThemes` for theme management

## Performance Considerations

- **Offscreen Canvas**: Set `offscreen: false` for compatibility (true for performance if supported)
- **Shadows**: Disable (`enableShadows: false`) for performance boost
- **Scale**: Larger dice (higher scale) = more rendering work
- **Physics**: Higher settleTimeout gives more realistic physics but slower results

## Success Metrics

✅ **Working Implementation Verified**:
- Canvas renders at 496x396 inside 500x400 container
- BabylonJS v5.57.1 initializes successfully
- Dice roll, tumble, and settle with physics
- Correct values reported to roll history
- Audio plays on completion
- Theme switching works
- Offline mode functional
- No WebSocket required for basic rolling
