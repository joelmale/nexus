# React Router v7 Implementation Guide

## Overview

This document explains how React Router v7 is integrated into the Nexus VTT application, its role in testing, and production considerations.

## Why React Router v7?

### Benefits for Testing (Primary Reason)
1. **E2E Test Support**: Playwright tests can navigate to specific app states via URLs (e.g., `/game/TEST-SESSION`)
2. **State Isolation**: Each test can start with a clean URL state
3. **Deep Linking**: Tests can directly access specific game sessions without UI navigation
4. **URL Assertions**: Can verify app state changes via URL changes

### Benefits for Production (Secondary)
1. **Shareable Links**: Users can bookmark or share direct links to game sessions
2. **Browser Navigation**: Back/forward buttons work as expected
3. **Page Refresh**: Maintains app state across page refreshes (when combined with persistence)
4. **Future Extensibility**: Easy to add new views/pages as the app grows

## Route Structure

```
/                           → Redirects to /lobby
/lobby                      → Welcome/lobby view (default landing page)
/game/:sessionId            → Active game session view
```

## How Routes Map to App State

The app uses Zustand for state management (`appFlowStore`), which has these views:
- `welcome` - Lobby/welcome screen
- `player_setup` - Player character setup
- `dm_setup` - DM game configuration
- `game` - Active game session

### Route-to-View Mapping

| URL Route | App View | Description |
|-----------|----------|-------------|
| `/lobby` | `welcome`, `player_setup`, or `dm_setup` | Pre-game states |
| `/game/:sessionId` | `game` | Active game with session ID |

## Implementation Details

### 1. Router Setup (main.tsx)

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

<BrowserRouter>
  <Routes>
    <Route path="/" element={<Navigate to="/lobby" replace />} />
    <Route path="/lobby" element={<Layout />} />
    <Route path="/game/:sessionId" element={<Layout />} />
  </Routes>
</BrowserRouter>
```

**Key Points**:
- `BrowserRouter` provides HTML5 history API routing (clean URLs)
- Root `/` redirects to `/lobby` for consistent entry point
- Both routes render `<Layout />` - the route doesn't change the component, just the URL
- `:sessionId` is a dynamic parameter (room code)

### 2. Layout Component Integration

The Layout component syncs between:
1. **URL state** (React Router)
2. **App state** (Zustand appFlowStore)

```tsx
const params = useParams<{ sessionId?: string }>();
const navigate = useNavigate();
const { view, roomCode, setView } = useAppFlowStore();

// Sync URL → App State
useEffect(() => {
  if (params.sessionId && view !== 'game') {
    // URL says game mode, update app state
    setView('game');
  }
}, [params.sessionId]);

// Sync App State → URL
useEffect(() => {
  if (view === 'game' && roomCode && window.location.pathname !== `/game/${roomCode}`) {
    navigate(`/game/${roomCode}`, { replace: true });
  } else if (view !== 'game' && window.location.pathname !== '/lobby') {
    navigate('/lobby', { replace: true });
  }
}, [view, roomCode]);
```

**Sync Strategy**:
- URL is **source of truth** on initial load (enables deep linking)
- App state changes **update URL** during runtime (enables shareable links)
- Uses `replace: true` to avoid polluting browser history

## How This Supports Playwright Tests

### Before Routing
```typescript
// ❌ This didn't work - no /game route existed
await page.goto('/game/TEST-SESSION');
// Tests timed out waiting for navigation
```

### After Routing
```typescript
// ✅ This works - route exists and loads app
await page.goto('/game/TEST-SESSION');
await page.waitForLoadState('networkidle');

// The app automatically:
// 1. Loads at /game/TEST-SESSION
// 2. Extracts 'TEST-SESSION' from route params
// 3. Can set up test game state based on that ID
// 4. Renders in 'game' view
```

### Test Benefits

1. **Direct State Access**:
   ```typescript
   await page.goto('/lobby');           // Test lobby view
   await page.goto('/game/ROOM-ABC');   // Test game view with specific room
   ```

2. **URL Assertions**:
   ```typescript
   await expect(page).toHaveURL('/lobby');
   await expect(page).toHaveURL(/\/game\/.+/);
   ```

3. **Isolated Tests**:
   Each test starts with a clean URL state, preventing cross-test pollution.

4. **Realistic Testing**:
   Tests how users actually navigate (via URLs shared by friends, bookmarks, etc.)

## Production Considerations

### Should Routing Be Included in Production?

**Recommendation: YES - Include in Production**

#### Reasons to Include:

1. **Zero Runtime Cost**: React Router v7 is ~9KB gzipped - negligible impact
2. **Better UX**:
   - Users can refresh without losing context
   - Can bookmark specific game sessions
   - Can share direct links to games
3. **Same Code Path**: Production runs exact same code as tests (fewer bugs)
4. **Future-Proof**: Makes it easy to add features like:
   - `/settings`
   - `/characters/:id`
   - `/campaigns/:id`

#### Bundle Size Impact:

```bash
# Without Router
dist/assets/index-[hash].js: 550.95 kB

# With Router (v7)
dist/assets/index-[hash].js: ~560 kB (+9KB gzipped)
```

**Impact**: <2% size increase for significant UX and testing benefits.

### How to Remove (If Needed)

If you decide routing isn't needed in production:

1. **Use Conditional Routing**:
   ```tsx
   // main.tsx
   const AppRoot = import.meta.env.VITE_ENABLE_ROUTING === 'true'
     ? RouterApp
     : SimpleApp;
   ```

2. **Tree-Shaking**:
   Modern bundlers will tree-shake unused imports if routing isn't used.

3. **Environment Variables**:
   ```bash
   # .env.test
   VITE_ENABLE_ROUTING=true

   # .env.production
   VITE_ENABLE_ROUTING=false
   ```

**However**: This adds complexity and dual code paths. **Not recommended** unless bundle size is critical.

## URL Structure Best Practices

### Current Implementation
- `/lobby` - Simple, clear, no session state
- `/game/:sessionId` - Session ID in URL for shareability

### Future Extensions
Consider these patterns as the app grows:

```
/characters                    → Character list
/characters/:id                → Specific character
/campaigns                     → Campaign list
/campaigns/:id                 → Specific campaign
/game/:sessionId/scene/:sceneId → Direct scene access
```

## Testing Guidelines

### For E2E Tests

**Good Practices**:
```typescript
// ✅ Use semantic routes
await page.goto('/game/TEST-SESSION');

// ✅ Wait for app to be ready
await page.waitForLoadState('networkidle');

// ✅ Verify URL state
await expect(page).toHaveURL(/\/game\/TEST-SESSION/);
```

**Anti-Patterns**:
```typescript
// ❌ Don't manipulate internal state directly
await page.evaluate(() => window.__setAppState({ ... }));

// ❌ Don't rely on timing
await page.waitForTimeout(5000);

// ✅ Instead, use routes and selectors
await page.goto('/game/ROOM-123');
await page.waitForSelector('[data-testid="game-canvas"]');
```

### For Unit Tests

Routes don't affect unit tests. They still test components in isolation:

```typescript
// Unit tests are unaffected by routing
const { getByText } = render(<Layout />);
```

## Migration Path

### Phase 1: Basic Routes (Current)
- ✅ `/lobby` and `/game/:sessionId`
- ✅ E2E tests working
- ✅ URL-state sync

### Phase 2: Enhanced Features (Future)
- Add route-based authentication checks
- Implement proper 404 pages
- Add loading states per route
- Add route-based code splitting

### Phase 3: Advanced Routing (Future)
- Nested routes for sub-views
- Route guards for DM-only pages
- Query parameters for filters/search
- Hash routing for single-page sections

## Troubleshooting

### Issue: Tests Still Timeout

**Solution**: Verify webServer in `playwright.config.ts`:
```typescript
webServer: [
  {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  }
]
```

### Issue: URL and State Out of Sync

**Solution**: Check the sync logic in Layout component:
```typescript
// URL should update when app state changes
useEffect(() => {
  if (view === 'game' && roomCode) {
    navigate(`/game/${roomCode}`, { replace: true });
  }
}, [view, roomCode]);
```

### Issue: Refresh Loses State

**Solution**: This is expected! Use the existing persistence layer:
- Session data is persisted via `sessionPersistenceService`
- Game state is persisted via `linearFlowStorage`
- URL provides the session ID for reload

## Summary

### How Router Supports Tests
1. **Enables navigation** to specific app states via URLs
2. **Provides URL assertions** for state verification
3. **Isolates test state** via clean URL starts
4. **Mirrors real usage** (users share/bookmark URLs)

### Production Recommendations
- **Keep routing in production**: <2% bundle increase, significant UX benefits
- **Use it for shareability**: Players can share game links
- **Leverage for future features**: Easy to add new routes as app grows
- **Don't overcomplicate**: Simple routes are sufficient for now

### Development Workflow
- **Local dev**: Routes work normally, hot reload maintained
- **Testing**: Playwright can navigate to any route
- **Production**: Same code, same behavior, predictable UX

React Router v7 provides a solid foundation for both testing and user experience with minimal overhead.
