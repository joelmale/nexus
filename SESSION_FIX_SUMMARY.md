# Session and Room Creation Fix - October 17, 2025

## Issues Fixed

### 1. Server Compilation Error (RESOLVED)
**Error:** Duplicate variable declarations in `server/index.ts:692-693`
```
ERROR: The symbol "url" has already been declared
ERROR: The symbol "params" has already been declared
```

**Fix:** Removed duplicate declarations at lines 692-693. Variables `url` and `params` were already declared at lines 676-677.

**File:** `server/index.ts:692-693`

---

### 2. Guest User Session Handling (RESOLVED)
**Error:**
```
Failed to create session: error: insert or update on table "campaigns" violates foreign key constraint "campaigns_dmId_fkey"
Room creation timeout
```

**Root Cause:** Race condition in WebSocket connection handling
- Guest users were created in the database via `/api/guest-users` endpoint
- Guest user info stored in `request.session.guestUser`
- WebSocket `handleConnection` only checked `request.session.passport.user` (for OAuth)
- WebSocket didn't recognize guest users, used random UUID or query param
- Campaign creation failed because it tried to use a user ID that wasn't in the database

**Fix:** Updated `handleConnection` to check for guest users in session

**Changes in `server/index.ts:673-685`:**
```typescript
private handleConnection(ws: WebSocket, req: IncomingMessage) {
  const request = req as any;
  const user = request.session?.passport?.user;
  const guestUser = request.session?.guestUser;  // ← NEW
  const url = new URL(req.url!, 'ws://localhost');
  const params = url.searchParams;
  const userIdFromQuery = params.get('userId');

  // Priority: authenticated user > guest user > query param > new UUID
  const uuid = user?.id || guestUser?.id || userIdFromQuery || uuidv4();  // ← UPDATED
  const displayName = user?.name || guestUser?.name || 'Guest';  // ← NEW
  const userType = user ? 'Authenticated' : guestUser ? 'Guest' : 'Anonymous';  // ← NEW
  console.log(`📡 New connection: ${uuid} (${userType} as ${displayName})`);  // ← UPDATED
```

**What This Fixes:**
1. WebSocket now correctly identifies guest users from the session
2. Uses the actual guest user ID that exists in the database
3. Campaign creation succeeds with valid foreign key reference
4. Room creation completes without timeout

---

## Flow Before Fix

1. User enters name, clicks "Create Game"
2. Frontend calls `POST /api/guest-users` → creates guest in DB, stores in session
3. Frontend connects to WebSocket
4. WebSocket doesn't see `passport.user`, generates random UUID
5. WebSocket tries to create campaign with random UUID
6. ❌ Database foreign key constraint fails (UUID not in users table)
7. ❌ Room creation times out

## Flow After Fix

1. User enters name, clicks "Create Game"
2. Frontend calls `POST /api/guest-users` → creates guest in DB, stores in session
3. Frontend connects to WebSocket **with session cookie**
4. WebSocket reads `guestUser` from session ✅
5. WebSocket uses guest user's actual database ID ✅
6. Campaign creation succeeds with valid user ID ✅
7. Room creation completes successfully ✅

---

## Testing

### Database Verification
Guest users are correctly stored in database:
```sql
SELECT id, name, provider FROM users WHERE provider = 'guest';
```
Result: All guest users present with correct IDs

### Manual Testing Steps
1. Refresh browser at http://localhost:5173
2. Enter a name
3. Click "DM"
4. Click "Create Game"
5. ✅ Session should create without errors
6. ✅ Room code should appear
7. ✅ Game should load

---

## Files Modified

1. `server/index.ts:692-693` - Removed duplicate variable declarations
2. `server/index.ts:673-685` - Added guest user session handling

---

## Impact

- **Before:** Guest users could not create games (500 errors, timeouts)
- **After:** Guest users can successfully create games
- **Risk:** Low - only added fallback logic, doesn't affect authenticated users
- **Tested:** Guest user creation API works, database contains users

---

Generated: October 17, 2025
Status: Ready for testing in browser
