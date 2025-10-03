# Dungeon Generator Integration Plan

## Overview
Add a DM-only "Generator" panel to create procedural dungeon maps using the One-Page Dungeon generator (https://github.com/watabou/one-page-dungeon), with automatic integration into the base maps library.

## Phase 1: Repository Setup & Installation

### Tasks
1. **Clone the generator** into `public/assets/one-page-dungeon/` (keeping it with other assets)
   ```bash
   cd public/assets
   git clone https://github.com/watabou/one-page-dungeon.git
   ```

2. **Verify structure** - ensure index.html, style.css, and JS files are present

3. **Test standalone** - confirm generator works when accessed directly at `http://localhost:5173/assets/one-page-dungeon/index.html`

## Phase 2: React Component Creation

### 1. Create DungeonGenerator Component
**Location**: `/src/components/Generator/DungeonGenerator.tsx`

**Responsibilities**:
- Embed generator in iframe pointing to `/assets/one-page-dungeon/index.html`
- Set up postMessage listener for receiving generated map data
- Handle loading states and iframe communication
- Add error boundaries for iframe failures

**Key Features**:
```typescript
// Listen for messages from iframe
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'DUNGEON_MAP_GENERATED') {
      // Handle the generated map data
      onMapGenerated(event.data.data.imageData);
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### 2. Create GeneratorPanel Component
**Location**: `/src/components/Generator/GeneratorPanel.tsx`

**Responsibilities**:
- Wrapper component matching existing panel structure (like TokenPanel, ScenePanel)
- Include header with controls (regenerate, save to library, etc.)
- Display generator iframe
- Provide instructions/tips for using generator

**Structure**:
```typescript
export const GeneratorPanel: React.FC = () => {
  const [generatedMap, setGeneratedMap] = useState<string | null>(null);

  const handleMapGenerated = async (imageData: string) => {
    setGeneratedMap(imageData);
    await saveToLibrary(imageData);
    // Show success toast
  };

  return (
    <div className="generator-panel">
      <div className="panel-header">
        <h2>🗺️ Dungeon Generator</h2>
        <p>Press Enter in the generator to create a new dungeon</p>
      </div>
      <DungeonGenerator onMapGenerated={handleMapGenerated} />
    </div>
  );
};
```

## Phase 3: Modify Generator Source Code

### Update Generator's "Save as PNG" Functionality

**Files to modify**: Look for download/save function in generator's JavaScript (likely in `one-page-dungeon/index.html` or a separate JS file)

**Changes needed**:
1. Locate the canvas.toDataURL() or download trigger
2. Add postMessage call:
```javascript
// Original code probably has something like:
// downloadCanvas(canvas, 'dungeon-map.png');

// ADD this alongside (or replace):
if (window.parent !== window) {
  // We're in an iframe, send to parent
  window.parent.postMessage({
    type: 'DUNGEON_MAP_GENERATED',
    data: {
      imageData: canvas.toDataURL('image/png'),
      timestamp: Date.now()
    }
  }, '*');
}
```

3. **Add auto-save button** (optional):
   - Add new button in generator UI: "Save to VTT"
   - Triggers postMessage on click
   - Keep original "Save as PNG" as fallback

### Documentation of Modifications
Create `/public/assets/one-page-dungeon/VTT_MODIFICATIONS.md` documenting:
- What was changed
- Where it was changed
- Why it was changed
- How to update from upstream

## Phase 4: Integration with Asset Library

### 1. Create Dungeon Map Service
**Location**: `/src/services/dungeonMapService.ts`

**Responsibilities**:
- Receive dungeon map data from postMessage
- Convert base64 image data to blob/file
- Save to appropriate location or storage
- Add metadata (timestamp, generator source, etc.)

```typescript
export const dungeonMapService = {
  async saveGeneratedMap(imageData: string): Promise<string> {
    // Convert base64 to blob
    const blob = await fetch(imageData).then(r => r.blob());

    // Generate unique filename
    const filename = `dungeon_${Date.now()}.png`;

    // Save to IndexedDB or create object URL
    const mapId = await assetLibrary.saveBaseMap({
      name: `Generated Dungeon ${new Date().toLocaleDateString()}`,
      file: blob,
      filename,
      source: 'one-page-dungeon-generator',
      category: 'generated'
    });

    return mapId;
  }
};
```

### 2. Update Base Maps Integration

**Check/Update these locations**:
- Base maps asset service (look for existing base map loading logic)
- ScenePanel "Browse base maps" functionality
- Add filter/indicator for "Generated Maps"
- Ensure generated maps appear alongside default base maps

## Phase 5: UI/UX Integration

### 1. Add "Generator" Panel to GameLayout

**File**: `/src/components/GameLayout.tsx`

**Line ~145-146** (after 'props' panel):
```typescript
const panels = [
  { id: 'tokens' as const, icon: '👤', label: 'Tokens' },
  { id: 'scene' as const, icon: '🖼', label: 'Scene' },
  ...(isHost ? [ { id: 'props' as const, icon: '📦', label: 'Props' }] : []),
  ...(isHost ? [ { id: 'generator' as const, icon: '🗺️', label: 'Generator' }] : []),  // ADD THIS
  { id: 'initiative' as const, icon: '⏱', label: 'Initiative' },
  // ...
];
```

**Update type** around line 35:
```typescript
const [activePanel, setActivePanel] = useState<
  'tokens' | 'scene' | 'props' | 'generator' | 'initiative' | 'dice' | 'chat' | 'sounds' | 'players' | 'settings'
>('players');
```

### 2. Update ContextPanel

**File**: `/src/components/ContextPanel.tsx`

**Update interface** (lines 11-21):
```typescript
interface ContextPanelProps {
  activePanel:
    | 'tokens'
    | 'scene'
    | 'props'
    | 'generator'  // ADD THIS
    | 'initiative'
    | 'dice'
    | 'players'
    | 'settings'
    | 'chat'
    | 'sounds';
  onPanelChange: (panel: /* same types */) => void;
  // ...
}
```

**Update panel rendering** (add case around line 120+):
```typescript
{activePanel === 'tokens' && <TokenPanel />}
{activePanel === 'scene' && <ScenePanel scene={currentScene} />}
{activePanel === 'props' && <Placeholder title="Props" />}
{activePanel === 'generator' && <GeneratorPanel />}  // ADD THIS
{activePanel === 'initiative' && <InitiativeTracker />}
// ...
```

**Update panel widths** (around line 80-90):
```typescript
const panelWidths = {
  tokens: 320,
  scene: 400,
  props: 350,
  generator: 500,  // ADD THIS - wider for better viewing
  initiative: 450,
  // ...
};
```

### 3. Add Visual Feedback

**Toast notifications**:
- "Dungeon map saved to library!" (success)
- "Failed to save map" (error)
- "Generating dungeon..." (loading)

**Loading states**:
- Show spinner while iframe loads
- Show processing indicator when saving

## Phase 6: Styling & Polish

### 1. Create Generator Panel Styles
**File**: `/src/styles/generator-panel.css` (or add to existing panel styles)

```css
.generator-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.generator-panel .panel-header {
  padding: 1rem;
  background: var(--glass-surface-strong);
  border-bottom: 1px solid var(--glass-border);
}

.generator-iframe-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.generator-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #1a1a1a; /* Match generator's dark theme */
}

.generator-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

### 2. Theme Compatibility
- Ensure iframe content is visible in both glassmorphism and solid themes
- Add CSS overrides if generator's default styles conflict
- Test dark/light mode compatibility

### 3. Responsive Considerations
- Minimum panel width: 400px (to show generator properly)
- Add scroll behavior for smaller viewports
- Test with collapsed/expanded panel states

## Phase 7: Testing & Documentation

### Functional Testing Checklist
- [ ] Generator loads correctly in iframe
- [ ] "Generate" (Enter key) creates new dungeons
- [ ] postMessage communication works
- [ ] Map saves to library successfully
- [ ] Saved maps appear in "Browse base maps"
- [ ] Maps load correctly in scenes
- [ ] Panel only visible to DM (not players)
- [ ] Works in both online and offline modes
- [ ] Toast notifications display correctly
- [ ] Error states handled gracefully

### Edge Cases to Test
- [ ] Iframe load failures (timeout, 404, etc.)
- [ ] postMessage errors (invalid data, wrong origin)
- [ ] Duplicate map names
- [ ] Large image data (performance)
- [ ] CSP (Content Security Policy) compatibility
- [ ] Browser compatibility (Chrome, Firefox, Safari)

### Security Considerations
- Validate postMessage origin
- Sanitize image data before saving
- Ensure generated content can't execute scripts
- Verify DM-only access control

## File Structure Summary

```
/public/assets/one-page-dungeon/        # Generator source (cloned repo)
  ├── index.html                         # Main generator page (MODIFIED)
  ├── style.css
  ├── [generator JS files]
  └── VTT_MODIFICATIONS.md              # Document our changes

/src/components/Generator/
  ├── DungeonGenerator.tsx              # Iframe wrapper with postMessage
  └── GeneratorPanel.tsx                # Panel UI wrapper

/src/services/
  └── dungeonMapService.ts              # Handle map saving logic (NEW)

/src/styles/
  └── generator-panel.css               # Panel-specific styles (NEW or add to existing)
```

## TypeScript Types to Add

### Panel Type Updates
```typescript
// In GameLayout.tsx and ContextPanel.tsx
type PanelId =
  | 'tokens'
  | 'scene'
  | 'props'
  | 'generator'  // NEW
  | 'initiative'
  | 'dice'
  | 'chat'
  | 'sounds'
  | 'players'
  | 'settings';
```

### Generator Message Types
```typescript
// In types/generator.ts (NEW FILE)
export interface DungeonMapMessage {
  type: 'DUNGEON_MAP_GENERATED';
  data: {
    imageData: string; // base64 PNG
    timestamp: number;
  };
}

export interface DungeonGeneratorProps {
  onMapGenerated: (imageData: string) => void;
}

export interface SavedDungeonMap {
  id: string;
  name: string;
  imageUrl: string;
  timestamp: number;
  source: 'one-page-dungeon-generator';
  category: 'generated';
}
```

## Key Benefits of This Approach

✅ **Isolation**: Generator remains isolated (no code conflicts with VTT)
✅ **Integration**: Seamless integration with existing asset system
✅ **Security**: DM-only access maintained
✅ **UX**: Auto-save to library (better than manual download)
✅ **Consistency**: Follows existing panel architecture pattern
✅ **Maintainability**: Generator remains update-able (can pull updates from repo)
✅ **Flexibility**: Original "Save as PNG" still works as fallback

## Potential Challenges & Solutions

### 1. CORS/CSP Issues with Iframe
**Challenge**: Browser security may block iframe or postMessage
**Solution**: Use same-origin (public folder) instead of external URL, configure CSP headers if needed

### 2. postMessage Security
**Challenge**: Malicious messages could be sent
**Solution**:
- Validate message origin: `if (event.origin !== window.location.origin) return;`
- Validate message structure before processing
- Sanitize image data

### 3. Image Storage & Persistence
**Challenge**: Where to store generated maps long-term
**Solution**:
- Option A: IndexedDB for browser storage (works offline)
- Option B: Server upload (requires backend)
- Option C: LocalStorage with blob URLs (size limited)
- **Recommended**: IndexedDB with fallback to memory

### 4. Generator Updates
**Challenge**: Updating generator might break our modifications
**Solution**:
- Document all changes in VTT_MODIFICATIONS.md
- Use minimal invasive modifications (add code, don't replace)
- Keep modifications in clearly marked sections with comments

### 5. Performance with Large Maps
**Challenge**: High-resolution dungeon maps may be large
**Solution**:
- Compress images before saving (use canvas.toDataURL with quality parameter)
- Implement lazy loading for map thumbnails
- Add size warnings for very large maps

## Implementation Order (Recommended)

1. **Phase 1**: Clone and test generator standalone ✓
2. **Phase 5.1-5.2**: Add panel to UI (UI shell first) ✓
3. **Phase 2.1**: Create basic DungeonGenerator component (iframe only) ✓
4. **Phase 2.2**: Create GeneratorPanel wrapper ✓
5. **Phase 3**: Modify generator source to send postMessage ✓
6. **Phase 4**: Implement save to library functionality ✓
7. **Phase 6**: Polish styling and theming ✓
8. **Phase 7**: Testing and documentation ✓

## Next Steps

1. Get user approval for this plan
2. Create new branch: `feature/dungeon-generator`
3. Start with Phase 1: Clone repository
4. Proceed through phases in recommended order
5. Test thoroughly at each phase
6. Document any deviations or issues encountered

## References

- One-Page Dungeon Generator: https://github.com/watabou/one-page-dungeon
- MDN postMessage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- React iframe best practices: https://react.dev/learn/referencing-values-with-refs
