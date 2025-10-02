# Token Implementation Status & Next Steps

## Completed Phase 1: Foundation (✅ Complete)

### 1. Image Processing System
**Files Created:**
- `src/utils/imageProcessor.ts` - Client-side image optimization

**Key Features:**
- ✅ SHA-1 hash generation for deduplication
- ✅ Automatic thumbnail creation (256x256)
- ✅ JPEG optimization (92% quality for originals, 85% for thumbnails)
- ✅ File validation (10MB limit, image types only)
- ✅ Batch processing support

### 2. IndexedDB Storage
**Files Created:**
- `src/services/tokenImageStorage.ts` - Hash-based image storage

**Key Features:**
- ✅ Separate object stores for images and metadata
- ✅ Hash-based keys (no duplicate storage)
- ✅ Object URL caching for performance
- ✅ Automatic initialization
- ✅ Storage statistics and management

### 3. React Hooks
**Files Created:**
- `src/hooks/useImageUploader.ts` - Upload management

**Key Features:**
- ✅ `useImageUploader()` - Handles single/batch uploads with progress
- ✅ `useImage()` - Loads images from storage
- ✅ Error handling and recovery
- ✅ Progress tracking (current/total/percentage)

### 4. Type Enhancements
**Files Modified:**
- `src/types/token.ts` - Added new fields

**Key Features:**
- ✅ `imageChecksum` - SHA-1 hash for IndexedDB lookup
- ✅ `thumbnailChecksum` - Separate hash for thumbnails
- ✅ `isPublic` - Public vs. private (DM-only) visibility
- ✅ Backwards compatible with existing URLs/base64

## Completed Phase 2: Drag-and-Drop (✅ Complete)

### 5. Draggable Token Components
**Files Created:**
- `src/components/Tokens/DraggableToken.tsx` - Draggable token for gallery

**Key Features:**
- ✅ React DnD integration
- ✅ Visual feedback (opacity, cursor changes)
- ✅ Hover effects
- ✅ Public/private badges
- ✅ Custom token indicator

### 6. Drop Zone Handler
**Files Created:**
- `src/components/Scene/TokenDropZone.tsx` - Scene canvas drop zone

**Key Features:**
- ✅ Screen-to-scene coordinate conversion
- ✅ Grid snapping support
- ✅ Camera zoom/pan compensation
- ✅ Visual drop feedback (outline, overlay)

### 7. Token Renderer
**Files Created:**
- `src/components/Scene/TokenRenderer.tsx` - Displays placed tokens

**Key Features:**
- ✅ SVG-based rendering
- ✅ Size calculations based on token size + grid
- ✅ Selection indicators
- ✅ Rotation support
- ✅ Condition/status badges
- ✅ Token labels
- ✅ DM-only visual indicator

### 8. TokenPanel Integration
**Files Modified:**
- `src/components/Tokens/TokenPanel.tsx` - Now uses DraggableToken

**Key Features:**
- ✅ Replaced static divs with DraggableToken components
- ✅ Maintains all existing functionality (search, filter, stats)

## Phase 3: Scene Integration (🚧 In Progress - Next Steps)

### Remaining Work:

#### A. Integrate TokenDropZone with SceneCanvas
**File to Modify:** `src/components/Scene/SceneCanvas.tsx`

**Tasks:**
1. Import TokenDropZone and wrap SVG canvas
2. Implement `handleTokenDrop` function:
   ```typescript
   const handleTokenDrop = useCallback((token: Token, x: number, y: number) => {
     const placedToken = createPlacedToken(
       token,
       { x, y },
       scene.id,
       user.id,
       { visibleToPlayers: token.isPublic !== false }
     );
     placeToken(scene.id, placedToken);

     // Broadcast over WebSocket
     webSocketService.send({
       type: 'event',
       data: {
         name: 'token/place',
         sceneId: scene.id,
         token: placedToken,
       },
     });
   }, [scene.id, user.id]);
   ```
3. Pass gridSize, snapToGrid, camera to TokenDropZone

#### B. Render Placed Tokens
**File to Modify:** `src/components/Scene/SceneCanvas.tsx`

**Tasks:**
1. Import TokenRenderer
2. Get placed tokens for active scene: `const tokens = getSceneTokens(scene.id)`
3. Add SVG group for tokens layer:
   ```tsx
   <g id="tokens-layer">
     {tokens.map((placedToken) => {
       const token = tokenAssetManager.getTokenById(placedToken.tokenId);
       if (!token) return null;

       return (
         <TokenRenderer
           key={placedToken.id}
           placedToken={placedToken}
           token={token}
           gridSize={gridSettings.size}
           isSelected={selectedTokens.includes(placedToken.id)}
           onSelect={handleTokenSelect}
           onMove={handleTokenMove}
           canEdit={isHost || placedToken.placedBy === user.id}
         />
       );
     })}
   </g>
   ```

#### C. Implement Token Selection
**File to Modify:** `src/components/Scene/SceneCanvas.tsx`

**Tasks:**
1. Add state: `const [selectedTokens, setSelectedTokens] = useState<string[]>([])`
2. Implement selection handler:
   ```typescript
   const handleTokenSelect = (tokenId: string, multi: boolean) => {
     setSelectedTokens(prev => {
       if (multi) {
         return prev.includes(tokenId)
           ? prev.filter(id => id !== tokenId)
           : [...prev, tokenId];
       }
       return [tokenId];
     });
   };
   ```

#### D. Implement Token Movement
**File to Modify:** `src/components/Scene/SceneCanvas.tsx`

**Tasks:**
1. Implement move handler:
   ```typescript
   const handleTokenMove = (tokenId: string, deltaX: number, deltaY: number) => {
     const token = getSceneTokens(scene.id).find(t => t.id === tokenId);
     if (!token) return;

     const newX = token.x + deltaX / camera.zoom;
     const newY = token.y + deltaY / camera.zoom;

     moveToken(scene.id, tokenId, { x: newX, y: newY });

     // Broadcast over WebSocket
     webSocketService.send({
       type: 'event',
       data: {
         name: 'token/move',
         sceneId: scene.id,
         tokenId,
         position: { x: newX, y: newY },
       },
     });
   };
   ```

## Phase 4: WebSocket Synchronization (📋 Planned)

### A. Add Token Event Handlers
**File to Modify:** `src/stores/gameStore.ts`

**Tasks:**
1. Add event handlers to `eventHandlers` object:
   ```typescript
   'token/place': (state, data) => {
     const eventData = data as TokenPlaceEvent['data'];
     const sceneIndex = state.sceneState.scenes.findIndex(
       (s) => s.id === eventData.sceneId
     );
     if (sceneIndex >= 0) {
       state.sceneState.scenes[sceneIndex].placedTokens.push(eventData.token);
     }
   },
   'token/move': (state, data) => {
     // Similar to drawing/update pattern
   },
   'token/update': (state, data) => {
     // Similar to drawing/update pattern
   },
   'token/delete': (state, data) => {
     // Similar to drawing/delete pattern
   },
   ```

### B. Add WebSocket Listeners in SceneCanvas
**File to Modify:** `src/components/Scene/SceneCanvas.tsx`

**Tasks:**
1. Add useEffect for token events:
   ```typescript
   useEffect(() => {
     const handleTokenEvent = (event: Event) => {
       const customEvent = event as CustomEvent<WebSocketMessage>;
       if (customEvent.detail.type === 'event' &&
           customEvent.detail.data.name?.startsWith('token/')) {
         // Event already handled by store, just force re-render if needed
       }
     };

     window.addEventListener('websocket:message', handleTokenEvent);
     return () => window.removeEventListener('websocket:message', handleTokenEvent);
   }, []);
   ```

## Phase 5: Image Sync Protocol (📋 Planned)

### A. Implement Image Request System
**File to Create:** `src/services/tokenImageSync.ts`

**Key Functions:**
1. `requestMissingImage(checksum: string)` - Player requests image from host
2. `handleImageRequest(checksum: string, requesterId: string)` - Host handles request
3. `receiveImageData(checksum: string, data: ArrayBuffer)` - Player receives image
4. Binary transfer over WebSocket using ArrayBuffer

### B. Integrate with useImage Hook
**File to Modify:** `src/hooks/useImageUploader.ts`

**Tasks:**
1. When image not found in IndexedDB, trigger network request
2. Show loading state while awaiting response
3. Cache received image in IndexedDB

## Integration Checklist

### Scene Canvas Integration
- [ ] Wrap canvas with TokenDropZone
- [ ] Implement handleTokenDrop
- [ ] Add tokens SVG layer
- [ ] Render TokenRenderer for each placed token
- [ ] Implement token selection
- [ ] Implement token movement
- [ ] Add token deletion (keyboard shortcut)
- [ ] Add token context menu (right-click)

### TokenCreationPanel Updates
- [ ] Replace file upload with useImageUploader
- [ ] Store checksums instead of base64
- [ ] Add public/private toggle
- [ ] Show upload progress
- [ ] Handle upload errors

### WebSocket Events
- [ ] Add token event handlers to gameStore
- [ ] Test token placement sync
- [ ] Test token movement sync
- [ ] Test token updates sync
- [ ] Test token deletion sync

### Image Synchronization
- [ ] Implement image request protocol
- [ ] Test host-to-player image transfer
- [ ] Test duplicate detection
- [ ] Add progress indicators
- [ ] Handle network failures

## Testing Plan

### Unit Tests
- [ ] Image processor (hash generation, thumbnail creation)
- [ ] Token image storage (CRUD operations)
- [ ] Token manipulation (place, move, rotate, delete)

### Integration Tests
- [ ] Drag-and-drop from gallery to scene
- [ ] Token selection and manipulation
- [ ] Grid snapping behavior
- [ ] Camera coordinate transformation

### Multiplayer Tests
- [ ] Token placement visible to all players
- [ ] Token movement synchronization
- [ ] Image request/response cycle
- [ ] Public/private token visibility

## Performance Optimizations

### Completed
- ✅ Hash-based image deduplication
- ✅ Thumbnail generation
- ✅ IndexedDB caching
- ✅ Object URL caching

### Planned
- [ ] Virtual scrolling for large token lists
- [ ] Lazy loading of token images
- [ ] Debounced token movement updates
- [ ] WebSocket message batching

## Documentation Needs

- [ ] User guide: Uploading custom tokens
- [ ] User guide: Drag-and-drop placement
- [ ] User guide: Token manipulation
- [ ] Developer guide: Image processing pipeline
- [ ] Developer guide: WebSocket token events
- [ ] API documentation: tokenImageStorage
- [ ] API documentation: Token types

## Known Limitations

1. **File Size**: 10MB limit per image (configurable)
2. **Storage**: Browser IndexedDB quota limits
3. **Browser Support**: Requires modern browsers (ImageBitmap, crypto.subtle)
4. **Network**: Large images may take time to sync in multiplayer
5. **Concurrent Edits**: No conflict resolution for simultaneous token moves

## Future Enhancements

1. **Token Animations**: Add movement animations
2. **Token Auras**: Light/vision radius indicators
3. **Token Health Bars**: Visual HP indicators
4. **Token Nameplates**: Floating labels above tokens
5. **Token Grouping**: Move multiple tokens together
6. **Token Templates**: Save token presets
7. **Token Import**: Bulk import from external sources
8. **Token Search**: Advanced filtering and search
9. **Token History**: Undo/redo token operations
10. **Token Layers**: Z-ordering for token stacking

## Current Status Summary

**Phase 1 (Foundation)**: ✅ 100% Complete
**Phase 2 (Drag-and-Drop)**: ✅ 100% Complete
**Phase 3 (Scene Integration)**: 🚧 0% Complete - Ready to start
**Phase 4 (WebSocket Sync)**: 📋 0% Complete - Planned
**Phase 5 (Image Sync)**: 📋 0% Complete - Planned

**Overall Progress**: ~40% Complete

**Next Immediate Steps**:
1. Integrate TokenDropZone into SceneCanvas.tsx
2. Add TokenRenderer layer to SceneCanvas.tsx
3. Implement handleTokenDrop, handleTokenSelect, handleTokenMove
4. Test drag-and-drop from token panel to scene
5. Verify token rendering with different sizes and images
