# Token Management System Optimization Summary

## Overview
This document outlines the optimizations made to the token management system based on the "Ogres" VTT approach.

## Key Improvements Implemented

### 1. Client-Side Image Processing (`utils/imageProcessor.ts`)
**Ogres Approach**: Process images entirely in the browser using ImageBitmap and Canvas API

**Implementation**:
- ✅ `processImageFile()` - Converts uploaded files to optimized JPEG format
- ✅ `generateHash()` - Creates SHA-1 hash for deduplication
- ✅ `createThumbnail()` - Generates 256x256 thumbnails automatically
- ✅ File validation (10MB limit, image types only)
- ✅ Quality optimization (92% for originals, 85% for thumbnails)

**Benefits**:
- Reduced server storage requirements
- Instant deduplication via hashing
- Automatic thumbnail generation
- Optimized image sizes

### 2. IndexedDB Storage (`services/tokenImageStorage.ts`)
**Ogres Approach**: Store images in IndexedDB with hash as primary key

**Implementation**:
- ✅ Separate object stores for `images` and `metadata`
- ✅ Hash-based keys for efficient lookups
- ✅ Thumbnail storage alongside originals
- ✅ URL caching for performance
- ✅ `getImageURL()` - Returns cached or creates new object URLs
- ✅ `storeImage()` - Stores both full-size and thumbnail
- ✅ Automatic deduplication (checks hash before storing)

**Benefits**:
- No duplicate images stored
- Faster image loading (client-side cache)
- Works offline after initial load
- Reduced network bandwidth

### 3. Image Upload Hook (`hooks/useImageUploader.ts`)
**Ogres Approach**: React hook for managing upload lifecycle

**Implementation**:
- ✅ `useImageUploader()` - Handles single or batch uploads
- ✅ Progress tracking (current/total/percentage)
- ✅ Error handling and reporting
- ✅ `useImage()` - Loads images from storage
- ✅ Automatic storage initialization

**Benefits**:
- Clean React integration
- Progress feedback for users
- Error recovery
- Reusable across components

### 4. Token Type Enhancements (`types/token.ts`)
**Ogres Approach**: Store image references by hash, add visibility flags

**Implementation**:
- ✅ `imageChecksum` - SHA-1 hash for IndexedDB lookup
- ✅ `thumbnailChecksum` - Separate hash for thumbnails
- ✅ `isPublic` - Public vs. private (DM-only) tokens
- ✅ Backwards compatible (image field still supports URLs/base64)

**Benefits**:
- Efficient image lookup
- DM can control token visibility
- Multiple storage strategies supported

## Architecture Comparison

### Before (Basic Implementation)
```
User uploads image
  → Base64 encoding
  → Store in Token object
  → No deduplication
  → No thumbnails
  → Large state size
```

### After (Ogres-Inspired)
```
User uploads image
  → Client-side processing (Canvas API)
  → Generate SHA-1 hash
  → Create thumbnail
  → Check for duplicates
  → Store in IndexedDB by hash
  → Reference hash in Token
  → Cache object URLs
```

## Remaining Work (Not Yet Implemented)

### 5. Drag-and-Drop Token Placement
**Ogres Approach**: Drag from gallery, drop on scene canvas

**Needed**:
- [ ] Draggable token components in TokenPanel
- [ ] Drop zone on SceneCanvas
- [ ] Coordinate transformation (screen → scene space)
- [ ] Dispatch `:token/create` event
- [ ] Add to scene's `placedTokens` array

### 6. Token Manipulation Events
**Ogres Approach**: Event-driven state updates

**Needed**:
- [ ] `:token/translate` - Move token
- [ ] `:token/rotate` - Rotate token
- [ ] `:token/scale` - Resize token
- [ ] `:token/change-flag` - Add/remove conditions
- [ ] `:token/change-light` - Update light radius
- [ ] Event dispatcher integration

### 7. WebSocket Synchronization
**Ogres Approach**: Real-time state sync over WebSocket

**Needed**:
- [ ] Initial state sync when player joins
- [ ] Transaction broadcasting (`:tx` messages)
- [ ] Token event serialization
- [ ] Conflict resolution

### 8. Image Request/Response Protocol
**Ogres Approach**: Players request missing images from host

**Needed**:
- [ ] `:image/request` event (player → host)
- [ ] `:image/change-thumbnail-request` event (host → player)
- [ ] Binary data transfer over WebSocket
- [ ] Automatic request when image not found
- [ ] Progress indication for large transfers

## Integration Points

### TokenCreationPanel Updates Needed
1. Replace file upload with `useImageUploader` hook
2. Store checksums instead of base64
3. Add public/private toggle
4. Show upload progress

### TokenPanel Updates Needed
1. Use `useImage` hook to load images from IndexedDB
2. Display draggable token items
3. Implement drag handlers
4. Add public/private filtering

### SceneCanvas Updates Needed
1. Accept token drops
2. Convert screen coordinates to scene coordinates
3. Dispatch token placement events
4. Render placed tokens with manipulation handles

### GameStore Updates Needed
1. Add token manipulation actions
2. Subscribe to WebSocket token events
3. Update scene state on token changes
4. Broadcast local changes to peers

## Performance Benefits

### Storage Efficiency
- **Before**: 1 token with 5MB image = 5MB per instance
- **After**: 10 tokens with same image = 5MB total (shared by hash)

### Network Efficiency
- **Before**: Every player downloads every image
- **After**: Images only transferred when needed, deduplicated

### Memory Efficiency
- **Before**: All images loaded into React state
- **After**: IndexedDB with lazy loading, URL cache

### Load Time
- **Before**: Load entire state including base64 images
- **After**: Load metadata only, images on-demand

## Testing Recommendations

1. **Upload Testing**
   - Test large files (near 10MB limit)
   - Test duplicate uploads (verify deduplication)
   - Test various image formats (PNG, JPEG, WebP)
   - Test batch uploads (10+ images)

2. **Storage Testing**
   - Verify IndexedDB persistence across sessions
   - Test cache invalidation
   - Test storage quota handling

3. **Performance Testing**
   - Measure upload processing time
   - Measure thumbnail generation time
   - Measure hash calculation time
   - Test with 100+ tokens

4. **Multiplayer Testing**
   - Test image request/response
   - Test concurrent uploads
   - Test network failure recovery

## Migration Path

For existing tokens with base64 images:

```typescript
async function migrateToken(token: Token): Promise<Token> {
  if (token.imageChecksum) {
    return token; // Already migrated
  }

  // Convert base64 to blob
  const blob = dataURLToBlob(token.image);

  // Generate hash
  const hash = await generateHash(blob);

  // Store in IndexedDB
  await tokenImageStorage.storeImage(/* ... */);

  // Update token
  return {
    ...token,
    imageChecksum: hash,
    image: hash, // Or keep URL for backwards compat
  };
}
```

## Conclusion

The implemented optimizations bring significant improvements in:
- **Storage efficiency** through deduplication
- **Network efficiency** through on-demand loading
- **User experience** through progress feedback
- **Performance** through caching and lazy loading

The remaining work (drag-and-drop, events, WebSocket sync) will complete the full Ogres-inspired token system.
