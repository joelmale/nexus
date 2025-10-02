# Better Architecture: Tailwind Performance Mode

## Current Approach (CSS Class Toggle)
- Uses `.theme-solid` class to disable glassmorphism
- Requires 700+ lines of CSS overrides
- Hard to maintain as app grows

## Recommended Approach with Tailwind v4

### 1. **Use Data Attributes Instead**

```tsx
<body data-performance-mode={!enableGlassmorphism}>
```

### 2. **Create Tailwind Variants**

In `tailwind.config.js`:
```js
export default {
  theme: {
    extend: {
      backdropBlur: {
        'glass': '12px',
        'glass-strong': '20px',
      }
    }
  },
  plugins: [
    function({ addVariant }) {
      // Add performance-mode variant
      addVariant('perf', '[data-performance-mode="true"] &')
    }
  ]
}
```

### 3. **Use in Components**

```tsx
<div className="backdrop-blur-glass perf:backdrop-blur-none bg-white/10 perf:bg-white/90">
  Glass effect with performance fallback
</div>
```

### 4. **Benefits**

- **Smaller CSS**: Only classes you use are included
- **Clearer intent**: `perf:backdrop-blur-none` is self-documenting
- **Better tree-shaking**: Unused utilities are purged
- **Easier maintenance**: No separate theme CSS file
- **Type-safe**: Can be used with TypeScript

### 5. **Implementation Steps**

1. Add `data-performance-mode` attribute to body
2. Create Tailwind variant for performance mode
3. Replace glassmorphism classes with Tailwind utilities
4. Use `perf:` variant for solid fallbacks

### 6. **Example Component**

```tsx
// Before (CSS class)
<div className="glass-panel">

// After (Tailwind with performance variant)
<div className="
  backdrop-blur-md perf:backdrop-blur-none
  bg-white/10 perf:bg-gray-800
  border border-white/20 perf:border-gray-700
">
```

## Migration Strategy

1. Keep existing `.theme-solid` for backward compatibility
2. Gradually migrate components to Tailwind utilities
3. Use both systems during transition
4. Remove old CSS once migration complete

## Performance Impact

- **With glassmorphism**: ~4KB of CSS + GPU compositing
- **Without glassmorphism**: ~1KB of CSS + no GPU overhead
- **Tailwind approach**: Only includes used utilities (~2KB total)
