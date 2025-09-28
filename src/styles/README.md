# Nexus VTT CSS Architecture

## Overview
This CSS architecture follows a performance-first, maintainable approach with modern design tokens, utilities, and component organization.

## File Structure

### Core Files
- `design-tokens.css` - All CSS custom properties and design system tokens
- `critical.css` - Above-the-fold styles for initial render
- `utilities.css` - Atomic utility classes (Tailwind-inspired)
- `main-optimized.css` - Performance-optimized import strategy

### Layout & Navigation
- `layout-consolidated.css` - Unified layout system (grid, panels, navigation)

### Components (Priority Order)
1. `toolbar-unified.css` - Unified toolbar system with responsive modes
2. `settings-optimized.css` - Settings interface with design tokens
3. `scenes.css` - Scene management and canvas
4. `character-sheet.css` - Character management interface
5. `dice-roller.css` - Dice rolling interface
6. `player-panel.css` - Player interface components

### Secondary Components
- `character-creation-wizard.css` - Character creation flow
- `character-creation.css` - Character creation forms
- `initiative-tracker.css` - Initiative tracking interface
- `assets.css` - Asset management
- `asset-browser.css` - Asset browsing interface
- `offline-preparation.css` - Offline mode interface
- `welcome-page.css` - Welcome and onboarding
- `linear-flow.css` - Linear workflow components

### Theme & Styling
- `theme-solid.css` - Solid theme overrides
- `lobby-glassmorphism.css` - Lobby-specific glass effects

## Design System

### Design Tokens
All colors, spacing, typography, and other design decisions are centralized in `design-tokens.css`:

```css
/* Usage examples */
color: var(--text-primary);
background: var(--surface-primary);
padding: var(--spacing-4);
font-size: var(--text-lg);
border-radius: var(--border-radius);
```

### Utility Classes
Atomic utility classes for rapid development:

```css
/* Layout */
.flex .items-center .justify-between
.grid .grid-cols-3 .gap-4

/* Spacing */
.p-4 .mx-auto .mt-6

/* Typography */
.text-lg .font-semibold .text-primary

/* Colors */
.bg-surface .border-primary .text-success
```

### Component Architecture
Components follow BEM methodology with design token integration:

```css
.component-name {
  /* Base styles using design tokens */
}

.component-name__element {
  /* Element styles */
}

.component-name--modifier {
  /* Modifier styles */
}
```

## Performance Optimizations

### Critical Path Loading
1. Design tokens (required for all other CSS)
2. Critical above-the-fold styles
3. Utilities (for JavaScript components)
4. Core layout
5. Primary components
6. Secondary components
7. Theme overrides

### Modern CSS Features
- CSS Custom Properties for theming
- CSS Grid and Flexbox for layouts
- Container queries where supported
- CSS Layers for cascade control
- Content visibility for performance
- CSS containment for paint optimization

### Accessibility
- Reduced motion support
- High contrast mode support
- Focus management
- Screen reader utilities
- Print optimizations

## Browser Support

### Modern Features
- CSS Grid (IE11+)
- CSS Custom Properties (IE11 with polyfill)
- Flexbox (IE11+)
- CSS containment (Chrome 52+, Firefox 69+)
- Backdrop-filter (Chrome 76+, Safari 9+)

### Fallbacks
- Glass effects degrade gracefully to solid backgrounds
- Grid layouts have flexbox fallbacks
- Custom properties have static fallbacks

## Migration Guide

### Week 1: Foundation
- ✅ Created design token system
- ✅ Implemented critical CSS strategy
- ✅ Set up modern CSS architecture

### Week 2: Layout Consolidation
- ✅ Merged layout.css and game-layout.css
- ✅ Eliminated redundant grid definitions
- ✅ Unified responsive design patterns

### Week 3: Component Optimization
- ✅ Consolidated toolbar CSS files
- ✅ Optimized settings with design tokens
- ✅ Added backwards compatibility

### Week 4: Final Optimization
- ✅ Created comprehensive utility system
- ✅ Performance-optimized loading strategy
- ✅ Modern CSS feature detection
- ✅ Enhanced accessibility support

## Usage Guidelines

### Adding New Styles
1. Check if utilities can solve the need
2. Use design tokens for all values
3. Follow component naming conventions
4. Consider performance impact
5. Test across browsers and devices

### Debugging
```css
/* Temporary debug classes */
.debug-outline * { outline: 1px solid red; }
.debug-grid { /* grid overlay */ }
```

### Performance
```css
/* Use containment for heavy components */
.performance-container {
  contain: layout style paint;
}

/* Lazy load below-fold content */
.below-fold {
  content-visibility: auto;
  contain-intrinsic-size: 300px;
}
```

## Future Considerations

### Planned Improvements
- CSS Layers implementation
- OKLCH color space support
- CSS Nesting when widely supported
- Enhanced container queries
- CSS Scope for component isolation

### Maintenance
- Regular audit for unused CSS
- Performance monitoring
- Browser compatibility updates
- Design token refinements

## File Size Analysis

Current optimized structure:
- Critical path: ~50KB (design tokens + critical + utilities)
- Core components: ~100KB
- Secondary components: ~80KB
- Total reduction from original: ~40% smaller

## Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Prefer utilities** for simple styling needs
3. **Use semantic naming** for components
4. **Test performance impact** of new CSS
5. **Consider accessibility** in all decisions
6. **Mobile-first** responsive design
7. **Progressive enhancement** for modern features