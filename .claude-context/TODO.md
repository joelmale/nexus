⏺ Migration Plan: View-Based to URL-Based Routing

  Executive Summary

  Migrate from Zustand view-based routing to React Router URL-based routing to fix refresh issues, improve user
   experience, and simplify state management.

  ---
  Current Situation

  Architecture Overview

  The application currently uses a hybrid routing approach that causes problems:

  1. React Router (outer layer): Handles top-level routes
    - / → redirects to /lobby
    - /lobby → renders <Layout />
    - /dashboard → renders <Layout />
    - /game/:sessionId → renders <Layout />
  2. View-based routing (inner layer): Zustand state determines content
    - view state: 'welcome' | 'player_setup' | 'dm_setup' | 'dashboard' | 'game' | 'admin'
    - <LinearLayout> component renders different pages based on view state
    - View state is persisted to localStorage (nexus-pre-game-view)

  Key Files Involved

  src/
  ├── main.tsx                           # React Router configuration
  ├── components/
  │   ├── Layout.tsx                     # Top-level layout wrapper
  │   ├── LinearLayout.tsx               # View-based routing logic
  │   ├── LinearWelcomePage.tsx          # Welcome screen
  │   ├── PlayerSetupPage.tsx            # Player setup
  │   ├── DMSetupPage.tsx                # DM setup
  │   ├── Dashboard.tsx                  # User dashboard
  │   ├── LinearGameLayout.tsx           # In-game view
  │   └── AdminPage.tsx                  # Admin panel
  └── stores/
      └── gameStore.ts                   # Contains view state & setView()

  Current Data Flow

  User clicks "Create Game"
    ↓
  LinearWelcomePage calls setUser({type: 'host'})
    ↓
  gameStore.setUser() determines nextView = 'dm_setup'
    ↓
  gameStore.setView('dm_setup') updates state
    ↓
  localStorage.setItem('nexus-pre-game-view', 'dm_setup')
    ↓
  LinearLayout re-renders and shows DMSetupPage
    ↓
  URL remains '/lobby' (mismatch!)

  ---
  The Problem

  Issues with Current Approach

  1. URL-State Mismatch
    - URL: /lobby
    - Actual page: DM Setup
    - User refreshes → sees DM Setup instead of Welcome (confusing!)
  2. localStorage Dependency
    - View state persisted to survive refreshes
    - Stale state causes wrong page to load
    - Extra complexity managing localStorage cleanup
  3. Browser Navigation Broken
    - Back button doesn't work (URL never changes)
    - Forward button doesn't work
    - Can't bookmark specific pages
  4. Developer Experience
    - Can't directly navigate to a page in development
    - Testing requires setting Zustand state manually
    - Difficult to debug routing issues
  5. User Experience
    - Confusing behavior on refresh
    - No URL to share for specific flows
    - Browser history doesn't work as expected

  Specific Bug Example

  1. User navigates to /lobby → sees Welcome page ✓
  2. User clicks "Create Game" → sees DM Setup ✓
  3. User refreshes /lobby → sees DM Setup ✗ (should see Welcome)

  ---
  The Solution: URL-Based Routing

  New URL Structure

  /                           → Redirect to /lobby
  /lobby                      → Welcome screen (LinearWelcomePage)
  /lobby/player-setup         → Player setup (PlayerSetupPage)
  /lobby/dm-setup             → DM setup (DMSetupPage)
  /lobby/game/:roomCode       → In-game (LinearGameLayout)
  /dashboard                  → User dashboard (existing)
  /admin                      → Admin panel (dev only)

  New Data Flow

  User clicks "Create Game"
    ↓
  LinearWelcomePage calls navigate('/lobby/dm-setup')
    ↓
  React Router changes URL to /lobby/dm-setup
    ↓
  React Router renders DMSetupPage
    ↓
  URL and content match! ✓
    ↓
  User refreshes → React Router renders DMSetupPage again ✓

  Benefits

  - ✅ URL always matches visible content
  - ✅ Refresh always shows correct page
  - ✅ No localStorage needed for view persistence
  - ✅ Browser back/forward works naturally
  - ✅ Bookmarkable URLs
  - ✅ Shareable links for specific flows
  - ✅ Simpler debugging
  - ✅ Better testing experience
  - ✅ Cleaner architecture

  ---
  Implementation Phases

  Phase 1: Setup New Routes (No Breaking Changes)

  Goal: Add new URL-based routes alongside existing view-based routing

  Files to modify:
  - src/main.tsx

  Steps:

  1. Update main.tsx with new routes
  /**
   * Main application entry point with URL-based routing
   *
   * Route structure:
   * - /lobby: Welcome/landing page for creating or joining games
   * - /lobby/player-setup: Player configuration before joining
   * - /lobby/dm-setup: DM configuration before creating game
   * - /lobby/game/:roomCode: Active game session
   * - /dashboard: User dashboard (authenticated users)
   * - /admin: Admin panel (development only)
   *
   * @see https://reactrouter.com/en/main for React Router docs
   */

  <Routes>
    {/* Root redirect */}
    <Route path="/" element={<Navigate to="/lobby" replace />} />

    {/* Lobby routes - linear flow for creating/joining games */}
    <Route path="/lobby" element={<LinearWelcomePage />} />
    <Route path="/lobby/player-setup" element={<PlayerSetupPage />} />
    <Route path="/lobby/dm-setup" element={<DMSetupPage />} />
    <Route path="/lobby/game/:roomCode" element={<LinearGameLayout />} />

    {/* User dashboard (authenticated users) */}
    <Route path="/dashboard" element={<Dashboard />} />

    {/* Admin panel (development only) */}
    {process.env.NODE_ENV === 'development' && (
      <Route path="/admin" element={<AdminPage />} />
    )}

    {/* Fallback - redirect unknown routes to lobby */}
    <Route path="*" element={<Navigate to="/lobby" replace />} />
  </Routes>
  2. Wrap routes in necessary providers
    - Each route component needs providers (DndProvider, CharacterCreationProvider)
    - Create a <Providers> wrapper component to avoid repetition

  Testing:
  - Verify /lobby shows welcome page
  - Verify direct navigation to /lobby/dm-setup works
  - View-based routing still works (no regression)

  ---
  Phase 2: Update Navigation Logic

  Goal: Replace setView() calls with navigate() calls

  Files to modify:
  - src/components/LinearWelcomePage.tsx
  - src/components/PlayerSetupPage.tsx
  - src/components/DMSetupPage.tsx
  - src/stores/gameStore.ts

  Steps:

  1. LinearWelcomePage.tsx - Replace view changes with navigation

  1. Current code:
  // After creating guest user
  setUser({ ...guestUser, type: 'host' });
  // setView is called automatically in setUser()

  1. New code:
  import { useNavigate } from 'react-router-dom';

  export const LinearWelcomePage: React.FC = () => {
    const navigate = useNavigate();

    const handleDMSetup = async () => {
      // ... create guest user logic ...
      setUser({ ...guestUser, type: 'host' });

      // Navigate to DM setup page
      navigate('/lobby/dm-setup');
    };

    const handlePlayerSetup = async () => {
      // ... create guest user logic ...
      setUser({ ...guestUser, type: 'player' });

      // Navigate to player setup page
      navigate('/lobby/player-setup');
    };

    const handleJoinRoom = async () => {
      // ... join room logic ...
      setUser({ ...guestUser, type: 'player' });

      // Navigate to player setup page
      navigate('/lobby/player-setup');
    };
  };
  2. DMSetupPage.tsx - Navigate to game after room creation

  2. Current code:
  await createGameRoom(gameConfig);
  // View changes to 'game' inside createGameRoom

  2. New code:
  import { useNavigate } from 'react-router-dom';

  export const DMSetupPage: React.FC = () => {
    const navigate = useNavigate();

    const handleCreateRoom = async () => {
      // ... validation ...

      const roomCode = await createGameRoom(gameConfig);

      // Navigate to game with room code
      navigate(`/lobby/game/${roomCode}`);
    };

    const handleBack = () => {
      navigate('/lobby');
    };
  };
  3. PlayerSetupPage.tsx - Navigate to game after joining

  3. Current code:
  await joinRoomWithCode(roomCode);
  // View changes to 'game' inside joinRoomWithCode

  3. New code:
  import { useNavigate } from 'react-router-dom';

  export const DMSetupPage: React.FC = () => {
    const navigate = useNavigate();

    const handleJoinRoom = async () => {
      // ... validation ...

      const roomCode = await joinRoomWithCode(roomCodeInput);

      // Navigate to game with room code
      navigate(`/lobby/game/${roomCode}`);
    };

    const handleBack = () => {
      navigate('/lobby');
    };
  };
  4. gameStore.ts - Remove automatic view changes

  4. Update setUser() - Remove automatic view navigation:
  /**
   * Update user data in the store
   *
   * Note: This no longer automatically changes views. Components should
   * use React Router's navigate() to change pages after setting user data.
   *
   * @param userData - Partial user data to merge
   */
  setUser: (userData) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 setUser:', userData);
    }

    set((state) => {
      Object.assign(state.user, userData);
    });

    // Navigation is now handled by components using React Router
  },

  4. Update createGameRoom() - Return room code instead of changing view:
  /**
   * Create a new game room via WebSocket
   *
   * @param config - Game configuration
   * @param clearExistingData - Whether to clear IndexedDB data (legacy)
   * @returns The created room code
   */
  createGameRoom: async (
    config: GameConfig,
    clearExistingData: boolean = false,
  ): Promise<string> => {
    // ... existing logic ...

    const session = await webSocketService.waitForSessionCreated();
    const roomCode = session.roomCode;

    console.log('✅ Room created:', roomCode);

    // Update state but DON'T change view
    set((state) => {
      state.gameConfig = config;
      state.user.connected = true;
      // Remove: state.view = 'game';
    });

    saveSessionToStorage(get());

    return roomCode; // Let component navigate with this
  },

  4. Update joinRoomWithCode() - Return room code instead of changing view:
  /**
   * Join an existing game room via WebSocket
   *
   * @param roomCode - The room code to join
   * @param character - Optional character to join with
   * @returns The joined room code
   */
  joinRoomWithCode: async (
    roomCode: string,
    character?: PlayerCharacter,
  ): Promise<string> => {
    // ... existing logic ...

    // Update state but DON'T change view
    set((state) => {
      state.selectedCharacter = character;
      state.user.connected = true;
      // Remove: state.view = 'game';
    });

    saveSessionToStorage(get());

    return roomCode; // Let component navigate with this
  },
  5. Update resetToWelcome() - Use window.location instead of setView:
  /**
   * Reset to welcome screen
   *
   * With URL-based routing, we use window.location to navigate to /lobby
   * This ensures a full reset of the application state
   */
  resetToWelcome: () => {
    console.log('🔄 Resetting to welcome screen');

    set((state) => {
      // Clear session data
      state.session = null;
      state.user = {
        ...initialState.user,
        id: getBrowserId(),
      };
      state.connection = initialState.connection;
    });

    // Clear persisted session
    clearSessionFromStorage();

    // Navigate to lobby using window.location for full reset
    window.location.href = '/lobby';
  },

  JSDoc Standards:
  /**
   * [Brief one-line description]
   *
   * [Optional detailed description explaining the "why" and any important context]
   *
   * @param paramName - Description of parameter
   * @returns Description of return value
   * @throws {ErrorType} When/why error is thrown
   * @see RelatedFunction - For related functionality
   *
   * @example
   * const result = functionName(param);
   */

  Testing:
  - Click "Create Game" → should navigate to /lobby/dm-setup
  - Fill DM form and create → should navigate to /lobby/game/ABC123
  - Refresh on /lobby/game/ABC123 → should show game (not welcome)
  - Browser back button → should navigate through URLs correctly

  ---
  Phase 3: Remove View State from Store

  Goal: Clean up Zustand store by removing view-related state

  Files to modify:
  - src/stores/gameStore.ts
  - src/components/LinearLayout.tsx
  - src/components/Layout.tsx

  Steps:

  1. gameStore.ts - Remove view state and related code

  1. Remove from type definition:
  // DELETE this:
  interface GameStore extends GameState {
    view: AppView;  // ← Remove
    setView: (view: AppView) => void;  // ← Remove
  }

  1. Remove from initialState:
  const initialState: GameState & {
    // Remove: view: AppView;
    gameConfig?: GameConfig;
    selectedCharacter?: PlayerCharacter;
    isAuthenticated: boolean;
  } = {
    // Remove: view: preGameView || 'welcome',
    gameConfig: undefined,
    // ...
  };

  1. Remove setView function:
  // DELETE entire setView function

  1. Remove localStorage persistence:
  // DELETE pre-game view localStorage code:
  // - const preGameView = localStorage.getItem('nexus-pre-game-view')
  // - localStorage.setItem('nexus-pre-game-view', view)
  // - localStorage.removeItem('nexus-pre-game-view')
  2. Remove LinearLayout.tsx entirely
    - This component only exists for view-based routing
    - All its rendering logic is now handled by React Router
    - Delete the file: src/components/LinearLayout.tsx
  3. Update Layout.tsx - Remove view-based routing logic

  3. Current Layout.tsx wraps LinearLayout which does view routing.

  3. New approach: Each route renders its own component directly (done in Phase 1), so Layout.tsx can be
  simplified or removed depending on what shared logic it has.

  3. If Layout.tsx only provides providers:
  /**
   * Shared providers for all pages
   *
   * Wraps the application in necessary providers:
   * - DndProvider: React DnD for drag-and-drop
   * - CharacterCreationProvider: Character creation modal
   */
  export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <DndProvider backend={HTML5Backend}>
        <CharacterCreationProvider>
          {children}
        </CharacterCreationProvider>
      </DndProvider>
    );
  };

  3. Then wrap routes in main.tsx:
  <BrowserRouter>
    <Providers>
      <Routes>
        {/* routes here */}
      </Routes>
    </Providers>
    <Toaster />
  </BrowserRouter>
  4. Remove view state references across codebase

  4. Search for and update any remaining references:
  # Search for view state usage
  grep -r "\.view" src/
  grep -r "setView" src/
  grep -r "AppView" src/

  4. Common patterns to replace:
    - const { view } = useGameStore() → Remove if only used for view
    - setView('game') → Replace with navigate('/lobby/game/:roomCode')
    - view === 'welcome' checks → Use React Router's useLocation() or useMatch()

  Testing:
  - All navigation still works
  - No console errors about missing view state
  - TypeScript compiles without errors
  - Application works exactly as before but with URLs

  ---
  Phase 4: Session Recovery & Deep Linking

  Goal: Handle game session recovery on refresh and direct URL access

  Files to modify:
  - src/components/LinearGameLayout.tsx
  - src/stores/gameStore.ts

  Steps:

  1. LinearGameLayout.tsx - Handle session recovery from URL

  1. When user refreshes on /lobby/game/ABC123 or directly navigates to it:

  /**
   * Game layout component for active game sessions
   *
   * Handles:
   * - Loading game session from URL parameter
   * - Session recovery on page refresh
   * - WebSocket reconnection
   * - Invalid/expired session handling
   */
  export const LinearGameLayout: React.FC = () => {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { session, user } = useGameStore();
    const [isRecovering, setIsRecovering] = useState(true);
    const [recoveryError, setRecoveryError] = useState<string | null>(null);

    useEffect(() => {
      const recoverSession = async () => {
        if (!roomCode) {
          console.error('No room code in URL');
          navigate('/lobby');
          return;
        }

        try {
          // Check if we already have this session loaded
          if (session?.roomCode === roomCode) {
            console.log('✅ Session already loaded:', roomCode);
            setIsRecovering(false);
            return;
          }

          // Try to recover from localStorage
          const stored = localStorage.getItem('nexus-active-session');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.roomCode === roomCode) {
              console.log('🔄 Recovering session from localStorage:', roomCode);

              // Reconnect to WebSocket with room code
              const { webSocketService } = await import('@/utils/websocket');
              await webSocketService.reconnect(roomCode, user.type);

              setIsRecovering(false);
              return;
            }
          }

          // No recoverable session - redirect to lobby
          console.warn('⚠️ No recoverable session for room:', roomCode);
          setRecoveryError('Session expired or invalid');
          setTimeout(() => navigate('/lobby'), 2000);

        } catch (error) {
          console.error('Failed to recover session:', error);
          setRecoveryError('Failed to reconnect to game');
          setTimeout(() => navigate('/lobby'), 2000);
        }
      };

      recoverSession();
    }, [roomCode, navigate]);

    if (isRecovering) {
      return (
        <div className="session-recovery">
          <div className="spinner" />
          <p>Reconnecting to game...</p>
        </div>
      );
    }

    if (recoveryError) {
      return (
        <div className="session-error">
          <p>{recoveryError}</p>
          <p>Redirecting to lobby...</p>
        </div>
      );
    }

    // Render actual game UI
    return <GameUI />;
  };
  2. Add route guards for protected pages

  2. Create a <ProtectedRoute> component for pages requiring setup:

  /**
   * Protected route wrapper that ensures required setup is complete
   *
   * Guards routes that require user data or other prerequisites.
   * Redirects to appropriate setup page if requirements not met.
   *
   * @param requiredData - What data must be present
   * @param redirectTo - Where to redirect if requirements not met
   */
  interface ProtectedRouteProps {
    children: React.ReactNode;
    requireUser?: boolean;
    requireSession?: boolean;
  }

  const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireUser = false,
    requireSession = false,
  }) => {
    const { user, session } = useGameStore();
    const navigate = useNavigate();

    useEffect(() => {
      if (requireUser && !user.name) {
        console.warn('User data required - redirecting to lobby');
        navigate('/lobby');
      }

      if (requireSession && !session) {
        console.warn('Session required - redirecting to lobby');
        navigate('/lobby');
      }
    }, [user, session, navigate]);

    if (requireUser && !user.name) return null;
    if (requireSession && !session) return null;

    return <>{children}</>;
  };

  2. Use in routes:
  <Route
    path="/lobby/game/:roomCode"
    element={
      <ProtectedRoute requireUser requireSession>
        <LinearGameLayout />
      </ProtectedRoute>
    }
  />

  Testing:
  - Create game → note room code → refresh page → should reconnect
  - Copy /lobby/game/ABC123 URL → open in new tab → should show error or reconnect
  - Browser back from game → should go to DM/player setup page

  ---
  Phase 5: Cleanup & Documentation

  Goal: Remove legacy code and document new architecture

  Tasks:

  1. Remove unused code
  # Files to delete:
  rm src/components/LinearLayout.tsx

  # Types to remove from src/types/game.ts:
  # - AppView type (if not used elsewhere)
  2. Update TypeScript types

  2. src/types/game.ts - Remove or mark as deprecated:
  /**
   * @deprecated Use React Router URLs instead of view state
   * Keeping for backwards compatibility during migration
   */
  export type AppView =
    | 'welcome'
    | 'player_setup'
    | 'dm_setup'
    | 'dashboard'
    | 'game'
    | 'admin';
  3. Document new routing architecture

  3. Create docs/routing-architecture.md:
  # Routing Architecture

  ## Overview
  This application uses React Router for URL-based routing.
  Each page has its own URL, making the app more intuitive and testable.

  ## Route Structure

  ### Public Routes
  - `GET /` - Redirects to /lobby
  - `GET /lobby` - Welcome/landing page

  ### Game Setup Routes
  - `GET /lobby/player-setup` - Player configuration
  - `GET /lobby/dm-setup` - DM game configuration

  ### Active Game Routes
  - `GET /lobby/game/:roomCode` - Active game session

  ### User Routes
  - `GET /dashboard` - User dashboard (requires authentication)

  ### Development Routes
  - `GET /admin` - Admin panel (dev mode only)

  ## Navigation Patterns

  ### Between Pages
  Use React Router's `useNavigate()` hook:
  \`\`\`typescript
  import { useNavigate } from 'react-router-dom';

  const navigate = useNavigate();
  navigate('/lobby/dm-setup');
  \`\`\`

  ### With State/Data
  Pass data via URL params or search params:
  \`\`\`typescript
  // URL param
  navigate(`/lobby/game/${roomCode}`);

  // Search param
  navigate(`/lobby/player-setup?character=${characterId}`);
  \`\`\`

  ### Back Navigation
  \`\`\`typescript
  navigate(-1); // Go back one page
  navigate('/lobby'); // Explicit navigation
  \`\`\`

  ## Session Recovery

  Game sessions are recovered on refresh via:
  1. URL room code (`/lobby/game/:roomCode`)
  2. localStorage session data
  3. WebSocket reconnection

  See `LinearGameLayout.tsx` for implementation.

  ## Migration Notes

  Previously, the app used Zustand view state (`view: AppView`) for routing.
  This caused issues with browser refresh and URL sharing.

  Migration completed: [Date]
  Old approach removed: Phase 3
  4. Add JSDoc to all routing-related functions

  4. Every function should have:
  /**
   * [One-line summary]
   *
   * [Detailed explanation if needed]
   *
   * @param name - Description
   * @returns Description
   *
   * @example
   * // Usage example
   * const result = functionName(param);
   */
  5. Update README.md

  5. Add routing section:
  ## Routing

  The application uses React Router for URL-based routing.
  Each major view has its own URL:

  - `/lobby` - Create or join games
  - `/lobby/dm-setup` - Configure DM game
  - `/lobby/player-setup` - Configure player
  - `/lobby/game/:roomCode` - Active game
  - `/dashboard` - User dashboard

  See [docs/routing-architecture.md](docs/routing-architecture.md) for details.

  Testing:
  - All routes work correctly
  - No TypeScript errors
  - No unused imports
  - Code is well-documented
  - Architecture docs are accurate

  ---
  Code Quality Standards

  React Strict Mode

  // ✅ Correctly handle React Strict Mode double-invocations
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const result = await api.call();
      if (!cancelled) {
        setState(result);
      }
    };

    fetchData();

    return () => {
      cancelled = true; // Cleanup
    };
  }, []);

  // ❌ Don't do this - will cause double API calls
  useEffect(() => {
    api.call().then(setState);
  }, []);

  JSDoc Documentation Standards

  /**
   * Navigate to DM setup page after creating guest user
   *
   * Creates a guest user account via API, stores user data in Zustand,
   * then navigates to the DM setup page where game configuration happens.
   *
   * @throws {Error} When guest user creation fails
   *
   * @example
   * // User clicks "Create Game as DM" button
   * await handleDMSetup();
   * // → Guest user created
   * // → User data stored
   * // → Navigated to /lobby/dm-setup
   */
  const handleDMSetup = async () => {
    // Implementation
  };

  Required JSDoc elements:
  1. One-line summary (first line)
  2. Detailed explanation (if complex)
  3. @param for each parameter
  4. @returns for return value
  5. @throws for possible errors
  6. @example for complex functions
  7. @see for related functions

  Clean Code Principles

  1. Single Responsibility
  // ✅ Good - one responsibility
  const createGuestUser = async (name: string) => {
    const response = await fetch('/api/guest-users', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return response.json();
  };

  // ❌ Bad - multiple responsibilities
  const handleSubmit = async () => {
    const user = await fetch(/* ... */).then(r => r.json());
    setUser(user);
    navigate('/somewhere');
    trackAnalytics('user_created');
  };
  2. Descriptive Names
  // ✅ Good
  const handleNavigateToPlayerSetup = () => navigate('/lobby/player-setup');

  // ❌ Bad
  const handler = () => nav('/lobby/player-setup');
  3. Early Returns
  // ✅ Good
  const validateForm = () => {
    if (!name) return 'Name required';
    if (!roomCode) return 'Room code required';
    return null;
  };

  // ❌ Bad
  const validateForm = () => {
    let error = null;
    if (!name) {
      error = 'Name required';
    } else if (!roomCode) {
      error = 'Room code required';
    }
    return error;
  };
  4. Avoid Magic Numbers/Strings
  // ✅ Good
  const ROUTES = {
    LOBBY: '/lobby',
    DM_SETUP: '/lobby/dm-setup',
    PLAYER_SETUP: '/lobby/player-setup',
    GAME: (roomCode: string) => `/lobby/game/${roomCode}`,
  } as const;

  navigate(ROUTES.DM_SETUP);

  // ❌ Bad
  navigate('/lobby/dm-setup');
  5. Type Safety
  // ✅ Good - explicit types
  interface NavigationProps {
    roomCode: string;
    userName: string;
  }

  const navigateToGame = ({ roomCode, userName }: NavigationProps) => {
    // ...
  };

  // ❌ Bad - any types
  const navigateToGame = (props: any) => {
    // ...
  };

  ---
  Testing Strategy

  Per-Phase Testing Checklist

  Phase 1 - Routes Setup:
  - All new routes render correct components
  - Unknown routes redirect to /lobby
  - Existing functionality unchanged

  Phase 2 - Navigation:
  - "Create Game" → navigates to /lobby/dm-setup
  - "Join Game" → navigates to /lobby/player-setup
  - "Create Room" → navigates to /lobby/game/:roomCode
  - Back buttons navigate to correct previous page
  - Browser back/forward buttons work

  Phase 3 - Cleanup:
  - No TypeScript errors
  - No console warnings about missing state
  - All existing features work
  - localStorage cleaned up properly

  Phase 4 - Session Recovery:
  - Refresh on game page reconnects to session
  - Invalid room code redirects to lobby
  - Direct URL access handles missing session gracefully

  Phase 5 - Documentation:
  - All functions have JSDoc comments
  - README updated with routing info
  - Architecture docs complete and accurate

  Manual Testing Checklist

  Test all user flows:

  1. Guest DM Flow:
    - Navigate to /lobby
    - Enter name and click "Create Game"
    - Should be at /lobby/dm-setup
    - Fill game config and create
    - Should be at /lobby/game/XXXX
    - Refresh page
    - Should reconnect to game
  2. Guest Player Flow:
    - Navigate to /lobby
    - Enter name and room code
    - Click "Join Game"
    - Should be at /lobby/player-setup
    - Configure character and join
    - Should be at /lobby/game/XXXX
  3. Browser Navigation:
    - Click back button from game → goes to setup page
    - Click back button from setup → goes to lobby
    - Click forward button → navigates forward
    - Bookmark /lobby/dm-setup → opens correctly
  4. Edge Cases:
    - Navigate to /lobby/game/INVALID → redirects to lobby
    - Navigate to /random-url → redirects to lobby
    - Refresh on /lobby → shows welcome (not cached view)

  ---
  Rollback Plan

  If issues arise during migration:

  Phase 1-2 (Routes added, navigation updated)

  Rollback: Revert navigation changes, keep view-based routing
  git revert <commit-hash>

  Phase 3 (View state removed)

  Rollback: Restore view state, revert to previous phase
  git revert <commit-hash-range>

  Phase 4 (Session recovery)

  Rollback: Disable session recovery, use localStorage fallback
  // Temporary fallback
  const fallbackRecovery = () => {
    const stored = localStorage.getItem('nexus-pre-game-view');
    if (stored) setView(stored as AppView);
  };

  ---
  Success Criteria

  Migration is complete when:

  ✅ All routes use URL-based routing✅ No view state in Zustand store✅ No localStorage view persistence✅
  Browser refresh shows correct page✅ Browser back/forward work correctly✅ URLs are shareable/bookmarkable✅
  Session recovery works on refresh✅ All code has JSDoc documentation✅ Architecture docs are complete✅ All
  tests pass✅ No TypeScript errors✅ No console warnings

  ---
  Timeline Estimate

  - Phase 1: 2-3 hours (routes setup, testing)
  - Phase 2: 3-4 hours (navigation updates, testing)
  - Phase 3: 2-3 hours (cleanup, testing)
  - Phase 4: 3-4 hours (session recovery, edge cases)
  - Phase 5: 2-3 hours (docs, final testing)

  Total: 12-17 hours for complete migration

  ---
  Additional Notes for AI Implementation

  React Strict Mode Considerations

  React Strict Mode (enabled in production builds) will:
  - Mount components twice in development
  - Call effects twice
  - Highlight potential problems

  Always ensure:
  - Effects have proper cleanup functions
  - API calls have cancellation tokens
  - Subscriptions are properly unsubscribed

  Error Handling Patterns

  // Navigation with error handling
  const safeNavigate = (path: string) => {
    try {
      navigate(path);
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback to window.location
      window.location.href = path;
    }
  };

  Performance Considerations

  - Lazy load route components if needed:
  const DMSetupPage = lazy(() => import('./components/DMSetupPage'));

  <Route
    path="/lobby/dm-setup"
    element={
      <Suspense fallback={<LoadingSpinner />}>
        <DMSetupPage />
      </Suspense>
    }
  />

  Accessibility

  - Ensure focus management on route changes
  - Update page title on route change:
  useEffect(() => {
    document.title = 'DM Setup | Nexus VTT';
  }, []);

  This plan should provide complete guidance for an AI coding assistant to successfully migrate the application
   from view-based to URL-based routing with high code quality standards.
