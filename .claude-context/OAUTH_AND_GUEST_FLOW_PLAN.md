# OAuth, Guest Flow, and User Persistence - Implementation Plan

**Last Updated:** 2025-10-16
**Current Phase:** Phase 4 Complete - Phase 5 & 6 Remaining

---

## **CURRENT STATUS SUMMARY**

### ✅ **Phase 1: Backend Schema & Authentication** - **100% COMPLETE**
### ✅ **Phase 2: Frontend Login & User Flow** - **100% COMPLETE**
### ✅ **Phase 3: Campaign-Session Integration** - **100% COMPLETE**
### ✅ **Phase 4: Character Management** - **100% COMPLETE**
### ❌ **Phase 5: Session History & Resume** - **NOT STARTED**
### ❌ **Phase 6: Polish & Cleanup** - **NOT STARTED**

---

## **COMPLETED WORK**

### **Phase 1: Backend Schema & Authentication Setup** - ✅ **COMPLETE**

**Database Infrastructure:**
- ✅ Database schema with tables: `users`, `campaigns`, `characters`, `sessions`, `players`, `hosts`
- ✅ PostgreSQL session storage with `connect-pg-simple`
- ✅ All database methods implemented in `server/database.ts`:
  - User operations: `getUserById()`, `findOrCreateUserByOAuth()`, `createGuestUser()`
  - Campaign operations: `createCampaign()`, `getCampaignsByUser()`, `updateCampaign()`
  - Session operations: `createSession()`, `getSessionByJoinCode()`, `updateSessionStatus()`, `saveGameState()`, `deleteSession()`
  - Player operations: `addPlayerToSession()`, `removePlayerFromSession()`, `updatePlayerConnection()`, `getPlayersBySession()`
  - Host operations: `addCoHost()`, `removeCoHost()`, `transferPrimaryHost()`, `getHostsBySession()`

**Authentication:**
- ✅ OAuth dependencies: passport, passport-google-oauth20, passport-discord
- ✅ Google OAuth strategy in `server/auth.ts`
- ✅ Discord OAuth strategy in `server/auth.ts`
- ✅ Auth routes: `/auth/google`, `/auth/discord`, `/auth/logout`, `/auth/me`
- ✅ Environment variable validation for OAuth credentials
- ✅ Session serialization/deserialization with database

**Code Quality:**
- ✅ Comprehensive JSDoc documentation on all methods
- ✅ TypeScript strict mode compliance - zero errors
- ✅ Proper error handling throughout

### **Phase 2: Frontend Login & User Flow** - ✅ **COMPLETE**

**Routing & Navigation:**
- ✅ React Router with routes: `/`, `/lobby`, `/dashboard`, `/game/:sessionId`
- ✅ `Layout.tsx` calls `checkAuth()` on mount
- ✅ Authenticated users redirect to `/dashboard`
- ✅ OAuth callbacks redirect to `/dashboard`

**Dashboard:**
- ✅ `Dashboard.tsx` component with campaign management
- ✅ Campaign creation modal
- ✅ Campaign list/grid display
- ✅ Empty state for new users
- ✅ Loading states
- ✅ Complete CSS styling in `dashboard.css`

**OAuth Login:**
- ✅ Account menu bubble in upper right of welcome page
- ✅ Dropdown with Google and Discord login options
- ✅ Glassmorphism styling consistent with app theme
- ✅ Hover states and transitions

**Guest User Flow:**
- ✅ Guest user creation on all entry points
- ✅ `POST /api/guest-users` endpoint
- ✅ `GET /api/guest-me` endpoint
- ✅ Database persistence for guest users
- ✅ Session management for guests

**Campaign API:**
- ✅ `GET /api/campaigns` - Get user's campaigns
- ✅ `POST /api/campaigns` - Create new campaign
- ✅ `PUT /api/campaigns/:id` - Update campaign

**Code Quality:**
- ✅ React best practices (functional components, hooks)
- ✅ Comprehensive JSDoc documentation
- ✅ TypeScript strict mode compliance
- ✅ Proper state management with Zustand

**Recent Fixes:**
- ✅ Fixed theme class mismatch (`theme-solid` → `solid-theme`)
- ✅ Fixed CSS custom properties not loading on welcome page
- ✅ Added fallback values for `--text-primary` and `--text-secondary`

### **Phase 3: Campaign-Session Integration** - ✅ **COMPLETE**

**Database:**
- ✅ Added `getCampaignById(campaignId)` method to retrieve single campaign with scenes
- ✅ Updated `handleHostConnection` to load campaign data when campaignId provided
- ✅ Campaign scenes loaded from database and sent to client

**Backend:**
- ✅ Server loads campaign scenes when session starts with campaignId
- ✅ `session/created` event includes `campaignScenes` array
- ✅ Logging shows campaign scene loading status

**Frontend:**
- ✅ Dashboard "Start Session" button functional - creates session with campaign ID
- ✅ Campaign selection in LinearWelcomePage for authenticated DMs
- ✅ WebSocket passes campaignId as query parameter
- ✅ gameStore loads campaign scenes from `session/created` event
- ✅ Scenes automatically populate in game state when session starts

**Flow Complete:**
1. User clicks "Start Session" on dashboard campaign → 2. GameStore connects WebSocket with campaignId → 3. Server loads campaign from database → 4. Server sends scenes in session/created event → 5. Client loads scenes into game state → 6. User sees campaign scenes in game!

### **Phase 4: Character Management** - ✅ **COMPLETE**

**Database Schema:**
- ✅ Characters table already existed in schema.sql
- ✅ Added `characterId` field to players table (nullable, references characters)
- ✅ Added index on players.characterId for performance
- ✅ CharacterRecord interface defined with proper types

**Database Methods:**
- ✅ `createCharacter(ownerId, name, data)` - Creates new character
- ✅ `getCharactersByUser(userId)` - Retrieves all user's characters
- ✅ `getCharacterById(characterId)` - Retrieves single character
- ✅ `updateCharacter(characterId, updates)` - Updates character details
- ✅ `deleteCharacter(characterId)` - Deletes character
- ✅ `addPlayerToSession()` updated to accept optional characterId
- ✅ `getPlayerCharacter(userId, sessionId)` - Gets character for player in session

**API Routes:**
- ✅ `GET /api/characters` - Get user's characters
- ✅ `GET /api/characters/:id` - Get specific character (with ownership check)
- ✅ `POST /api/characters` - Create new character
- ✅ `PUT /api/characters/:id` - Update character (with ownership check)
- ✅ `DELETE /api/characters/:id` - Delete character (with ownership check)

**Frontend Components:**
- ✅ CharacterManager modal component for create/edit
- ✅ Character list in Dashboard with cards showing race/class/level
- ✅ Character creation, edit, and delete functionality
- ✅ Character selection in player join flow (LinearWelcomePage)
- ✅ CSS styling in character-manager.css

**Files Created:**
- `src/components/CharacterManager.tsx` - Modal for character creation/editing
- `src/styles/character-manager.css` - Character UI styles

**Files Modified:**
- `server/schema.sql` - Added characterId to players table
- `server/database.ts` - Added all character database methods
- `server/index.ts` - Added character API routes (326-486)
- `src/components/Dashboard.tsx` - Added characters section with full CRUD
- `src/components/LinearWelcomePage.tsx` - Added character selection for players

---

## **REMAINING WORK - BROKEN DOWN BY PHASE**

### **Phase 5: Session History & Resume**

**Goal:** Show past sessions and allow resuming hibernated sessions.

**Priority:** MEDIUM - Quality of life feature

**Estimated Time:** 3-4 hours

#### 5.1. Session History in Dashboard
**File:** `src/components/Dashboard.tsx`

- [ ] Add "Sessions" tab to campaign view
- [ ] Display list of sessions for selected campaign
- [ ] Show: date, duration, status (active/hibernated/completed)
- [ ] Show participants (DM + players)

#### 5.2. Resume Hibernated Sessions
**File:** `server/database.ts`

- [ ] Implement `getSessionsByCampaign(campaignId, status?)`
- [ ] Implement `getSessionById(sessionId)`

**File:** `src/components/Dashboard.tsx`

- [ ] "Resume Session" button for hibernated sessions
- [ ] Load game state from database
- [ ] Reconnect to session with saved state
- [ ] Notify previous players (future: email/notification system)

#### 5.3. Session Notes & Summary
**File:** `server/database.ts`

- [ ] Add `notes` field to sessions table
- [ ] Implement `updateSessionNotes(sessionId, notes)`

**File:** `src/components/Dashboard.tsx`

- [ ] Add notes section to session history
- [ ] Allow DM to add session summary
- [ ] Display session timeline/events

**Acceptance Criteria:**
- ✅ Users can see all past sessions for a campaign
- ✅ DMs can resume hibernated sessions
- ✅ Game state loads correctly from database
- ✅ Session notes can be added and viewed

---

### **Phase 6: Polish & Cleanup**

**Goal:** Improve UX, fix edge cases, add missing features.

**Priority:** LOW - Nice to have features

**Estimated Time:** 4-5 hours

#### 6.1. Campaign Management Improvements
**File:** `src/components/Dashboard.tsx`

- [ ] Edit campaign modal (name, description)
- [ ] Delete campaign with confirmation
- [ ] Archive campaigns (soft delete)
- [ ] Campaign sharing (future: invite other DMs)
- [ ] Campaign export/import (JSON)

#### 6.2. User Profile Management
**New File:** `src/components/UserProfile.tsx`

- [ ] View user profile page
- [ ] Edit display name
- [ ] Change avatar/profile picture
- [ ] Account settings
- [ ] Delete account (with confirmation)

#### 6.3. Guest User Improvements
**File:** `server/database.ts` & `server/auth.ts`

- [ ] "Claim Guest Account" feature - link guest to OAuth
- [ ] Migrate guest campaigns/characters to authenticated account
- [ ] Keep guest history when authenticating

#### 6.4. Database Cleanup Jobs
**New File:** `server/cleanup.ts`

- [ ] Automated cleanup of abandoned sessions (>7 days old)
- [ ] Delete guest users inactive for >30 days
- [ ] Archive completed sessions after 90 days
- [ ] Run cleanup job on server startup or cron

#### 6.5. Error Handling & Edge Cases
**Multiple Files**

- [ ] Handle OAuth errors gracefully
- [ ] Handle database connection failures
- [ ] Handle session conflicts (same user multiple tabs)
- [ ] Better loading states throughout app
- [ ] User-friendly error messages
- [ ] Retry logic for failed API calls

#### 6.6. Documentation
**Multiple Files**

- [ ] Update README with OAuth setup instructions
- [ ] Document database schema
- [ ] API documentation (consider Swagger/OpenAPI)
- [ ] Developer onboarding guide
- [ ] User guide for campaign/character management

**Acceptance Criteria:**
- ✅ All CRUD operations work for campaigns
- ✅ User profile is editable
- ✅ Guest accounts can be claimed
- ✅ Automated cleanup prevents database bloat
- ✅ Error handling is comprehensive
- ✅ Documentation is up to date

---

## **IMPLEMENTATION ROADMAP**

### **Completed:**

1. ✅ **Phase 3: Campaign-Session Integration** (COMPLETE)
   - Campaign data loads into game sessions
   - Dashboard "Start Session" works
   - Campaign selection in welcome page

2. ✅ **Phase 4: Character Management** (COMPLETE)
   - Full CRUD for characters
   - Character selection in player join flow
   - Dashboard character management UI

### **Remaining:**

3. 📊 **Phase 5: Session History & Resume** (3-4 hours) - NEXT
   - Quality of life improvement
   - Allows campaigns to span multiple sessions
   - Relatively straightforward after Phase 3

4. ✨ **Phase 6: Polish & Cleanup** (4-5 hours)
   - Do incrementally as issues arise
   - Can be done in parallel with other phases
   - Some items can be deferred to post-MVP

**Total Completed Time:** ~12 hours
**Total Remaining Time:** 7-9 hours

---

## **TECHNICAL NOTES**

### Current Architecture Decisions:

1. **Hybrid Database Approach:**
   - In-memory Map for active sessions (real-time performance)
   - PostgreSQL for persistence (campaigns, characters, session history)
   - Sync on session start, periodically during session, and on session end

2. **Guest vs Authenticated Users:**
   - Guest users stored in database with `provider: 'guest'`
   - Guest users can play without creating campaigns/characters
   - Future: Allow guests to "claim" their account via OAuth

3. **Campaign-Session Relationship:**
   - Sessions are linked to campaigns via `campaign_id` foreign key
   - Campaigns can have multiple sessions (campaign progression)
   - Guest DMs create anonymous campaigns (not shown in dashboard)

4. **Character-Session Relationship:**
   - Players table has optional `character_id` foreign key
   - Characters can be reused across multiple sessions
   - Guest players don't create persisted characters

### Database Schema Status:

✅ **Complete Tables:**
- `users` - User accounts (OAuth + guest)
- `campaigns` - Campaign data (scenes, NPCs, etc.)
- `sessions` - Active/hibernated/completed sessions
- `players` - Player participation in sessions
- `hosts` - DM/co-host relationships

✅ **Complete Tables:**
- `characters` - Character data (race, class, level, etc.)

### API Endpoints Status:

✅ **Implemented:**
- Auth: `/auth/google`, `/auth/discord`, `/auth/logout`, `/auth/me`
- Guest: `POST /api/guest-users`, `GET /api/guest-me`
- Campaigns: `GET /api/campaigns`, `POST /api/campaigns`, `PUT /api/campaigns/:id`
- Characters: `GET /api/characters`, `POST /api/characters`, `PUT /api/characters/:id`, `DELETE /api/characters/:id`

❌ **Not Implemented:**
- Sessions: `GET /api/sessions`, `GET /api/sessions/:id`
- Campaign deletion: `DELETE /api/campaigns/:id`
- User profile: `GET/PUT /api/profile`

---

## **RISK ASSESSMENT**

### Phase 3 Risks: LOW
- Straightforward integration work
- Database methods already exist
- Main challenge: UI/UX for campaign selection

### Phase 4 Risks: MEDIUM
- Character creation wizard already exists
- Need to adapt it for database persistence
- Risk: Breaking existing character creation flow
- Mitigation: Feature flag for new character system

### Phase 5 Risks: LOW
- Mostly UI work with existing database methods
- Session resumption logic already exists (hibernation)
- Main challenge: Testing edge cases

### Phase 6 Risks: MEDIUM
- Many small features, easy to bikeshed
- Guest account claiming is complex
- Database cleanup jobs need careful testing
- Mitigation: Start with high-priority items only

---

## **SUCCESS METRICS**

### Phase 3 Complete When:
- [ ] Can start a session from dashboard campaign card
- [ ] Can select campaign when creating game as DM
- [ ] Campaign scenes/data load into game session
- [ ] Changes save back to campaign

### Phase 4 Complete When:
- [ ] Can create and save characters from dashboard
- [ ] Can select saved character when joining game
- [ ] Character data persists across sessions
- [ ] Character updates save to database

### Phase 5 Complete When:
- [ ] Can view session history for each campaign
- [ ] Can resume hibernated sessions from dashboard
- [ ] Session state loads correctly
- [ ] Can add notes to completed sessions

### Phase 6 Complete When:
- [ ] Can edit/delete campaigns from dashboard
- [ ] User profile page exists and is editable
- [ ] Guest accounts can be claimed (basic implementation)
- [ ] Database cleanup job runs on schedule
- [ ] All major features have comprehensive error handling
- [ ] Documentation is complete

---

## **DEFERRED FEATURES (Post-MVP)**

These features are valuable but not critical for the initial release:

- **Multi-DM Campaigns:** Allow multiple DMs to co-manage campaigns
- **Campaign Sharing/Templates:** Public campaign library
- **Character Sheets:** Full D&D 5e character sheet with calculations
- **Session Scheduling:** Calendar integration for planning sessions
- **Session Recording:** Save full session logs/chat history
- **Player Notifications:** Email/push notifications for session invites
- **Campaign Analytics:** Track session stats, player engagement
- **Asset Library:** Shared asset repository for all campaigns
- **Mobile App:** Native mobile experience for players
- **Voice/Video Integration:** Built-in communication

---

## **CONCLUSION**

**Current State:** ✅ OAuth authentication, guest flow, campaigns, characters, and campaign-session integration are all complete! Users can:
- Log in with Google/Discord or play as guests
- Create and manage campaigns in the dashboard
- Create and manage characters in the dashboard
- Start sessions from campaigns (scenes load automatically)
- Select saved characters when joining as a player
- Full CRUD operations on campaigns and characters

**Next Step:** Phase 5 - Session History & Resume. This adds quality-of-life features for viewing past sessions and resuming hibernated games.

**Estimated Timeline:**
- Phase 5: 3-4 hours
- Phase 6: Ongoing (4-5 hours for core features)

**Total Remaining: 1-2 days** for session history and polish.

---

## **FUTURE ENHANCEMENTS & RECOMMENDATIONS**

### **Short-Term Enhancements (Post-MVP)**

1. **Enhanced Character Management**
   - Character portrait upload/selection
   - Full stat blocks (STR, DEX, CON, etc.)
   - Inventory management
   - Spell/ability tracking
   - Character sheet PDF export
   - Integration with D&D Beyond or similar services

2. **Campaign Improvements**
   - Campaign sharing (invite other DMs as co-owners)
   - Campaign templates (pre-built adventures)
   - Campaign export/import (JSON format)
   - Campaign notes and journal system
   - NPC database within campaigns
   - Location/map management

3. **Session Management**
   - Session scheduling and calendar integration
   - Automated reminders to players (email/push notifications)
   - Session recap generation (AI-powered summaries)
   - Session voice/video recording
   - Combat encounter tracker
   - Initiative management improvements

4. **Player Experience**
   - Character progression tracking (XP, leveling)
   - Achievement system
   - Player statistics (sessions played, dice rolled, etc.)
   - Character relationship graph
   - Party composition analyzer

### **Medium-Term Features**

5. **Social Features**
   - Friend system
   - Player ratings/reviews
   - Public campaign browser (find games to join)
   - LFG (Looking For Group) board
   - Guild/community system

6. **Advanced Tools**
   - AI-powered NPC dialogue
   - Dynamic music/ambience system
   - Weather and time-of-day effects
   - Random encounter generator
   - Loot table generator
   - Battle map builder integration

7. **Mobile Experience**
   - Native mobile apps (React Native)
   - Optimized character sheets for mobile
   - Push notifications for turn order
   - Offline character sheet access

### **Long-Term Vision**

8. **Monetization Features**
   - Premium tier with advanced features
   - Marketplace for custom content (maps, tokens, adventures)
   - Subscription for unlimited campaigns/characters
   - DM tools bundle (advanced encounter builder, etc.)

9. **Third-Party Integrations**
   - D&D Beyond API integration
   - Roll20/Foundry VTT import/export
   - Discord bot for game management
   - Twitch/YouTube streaming integration
   - Patreon integration for creator support

10. **Community Content**
    - User-generated campaign templates
    - Custom character classes/races
    - Homebrew rules database
    - Asset marketplace (maps, tokens, music)
    - Community voting on features

### **Technical Debt & Infrastructure**

11. **Performance Optimizations**
    - Redis caching for frequent queries
    - CDN for asset delivery
    - WebSocket connection pooling
    - Database query optimization
    - Image optimization pipeline

12. **Security Enhancements**
    - Rate limiting on all API endpoints
    - CSRF protection
    - XSS sanitization
    - SQL injection prevention audit
    - Security headers (CSP, HSTS, etc.)
    - Regular dependency updates

13. **DevOps & Monitoring**
    - CI/CD pipeline (GitHub Actions)
    - Automated testing (unit, integration, E2E)
    - Performance monitoring (Sentry, DataDog)
    - Automated database backups
    - Blue-green deployment strategy
    - Docker containerization

### **Recommended Priority Order**

**Immediate (Next 2 weeks):**
1. Complete Phase 5 (Session History)
2. Complete Phase 6 (Polish & Cleanup)
3. Add basic error handling improvements
4. Write deployment documentation

**Next Month:**
1. Enhanced character management (stat blocks)
2. Campaign sharing features
3. Session scheduling
4. Mobile responsiveness improvements

**Next Quarter:**
1. Social features (friends, LFG board)
2. AI-powered tools (NPC dialogue, summaries)
3. Native mobile apps
4. Marketplace infrastructure

**Success Metrics to Track:**
- Daily/Monthly Active Users (DAU/MAU)
- Average session length
- Campaign completion rate
- Character creation rate
- User retention (7-day, 30-day)
- API response times
- WebSocket connection stability
- Database query performance

---

## **CONCLUSION**

Phases 1-4 are now complete! The application has a solid foundation with:
- ✅ OAuth authentication + guest flow
- ✅ Full campaign management
- ✅ Full character management
- ✅ Campaign-session integration with scene loading
- ✅ Character selection in player flow

The remaining work (Phases 5-6) focuses on session history and polish, which are quality-of-life improvements. The core functionality is ready for beta testing and user feedback.

**Recommendation:** Deploy the current state to a staging environment for internal testing before implementing Phases 5-6. This allows real-world validation of the user experience and may inform priorities for the remaining phases.
