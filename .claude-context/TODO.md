# Project TODO List

## High Priority Issues

### 🔧 Toolbar Drag Functionality (URGENT)
- **Issue**: GameToolbar drag handle is not working correctly
- **Problem**: Toolbar jumps to incorrect position when dragging, doesn't follow mouse smoothly
- **Location**: `src/components/GameToolbar.tsx`
- **Attempted Solutions**:
  - Tried delta-based approach (failed)
  - Tried offset-based approach from React forum post (still failing)
  - Fixed CSS positioning context conflicts
- **Current Status**: Multiple approaches attempted, none successful
- **Next Steps**:
  - Consider using a proven drag library like `react-draggable`
  - Investigate if CSS transform interaction is causing issues
  - Test with simpler absolute positioning approach

## Medium Priority

### 🎨 UI Improvements
- Scene management panel layout optimizations ✅ (COMPLETED)
- Initiative tracker add-entry layout improvements ✅ (COMPLETED)
- Dice and Initiative panel width adjustments ✅ (COMPLETED)

### 🔧 Technical Debt
- Scene deletion persistence was missing - fixed ✅ (COMPLETED)
- Test mocks needed updating for new persistence methods ✅ (COMPLETED)

## Low Priority

### 📱 Mobile Removal
- All mobile responsive CSS has been removed ✅ (COMPLETED)
- App is now desktop/tablet only ✅ (COMPLETED)

---

## Implementation Notes

### Toolbar Drag Issue Details
The toolbar drag functionality has been problematic despite multiple implementation attempts:

1. **CSS Positioning Context**: Fixed by ensuring consistent transform usage
2. **Delta Calculation**: Tried relative mouse movement tracking
3. **Offset Approach**: Implemented React forum post pattern for drag relative positioning
4. **Transform Method**: Using CSS custom properties with calc() for centering

**Key Files**:
- `src/components/GameToolbar.tsx` - Main component with drag logic
- `src/styles/layout-consolidated.css` - CSS transforms and positioning

**Forum Reference**: Used React drag/drop pattern but still experiencing issues with position calculation.

Current drag logic calculates mouse offset relative to toolbar on mousedown, then positions toolbar so mouse stays at same relative position during drag. This should work but position calculation seems off.