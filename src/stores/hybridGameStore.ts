/**
 * Hybrid Game Store
 *
 * Enhanced Zustand store that integrates with the HybridStateManager
 * for local-first persistence and seamless multiplayer transitions.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  GameState,
  User,
  Session,
  DiceRoll,
  TabType,
  Scene,
  Camera,
  UserSettings,
  ColorScheme,
} from '@/types/game';
import type { SessionMode, MultiplayerSession } from '@/types/hybrid';
import type { Drawing } from '@/types/drawing';
import type { PlacedToken } from '@/types/token';

import {
  HybridStateManager,
  createHybridStateManager,
} from '@/services/hybridStateManager';
import * as actions from '@/actions/gameActions';

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface HybridGameStore extends GameState {
  // Hybrid state metadata
  isHydrated: boolean;
  sessionMode: SessionMode;
  multiplayerSession: MultiplayerSession | null;

  // Core actions (enhanced with hybrid state)
  setUser: (user: Partial<User>) => void;
  setSession: (session: Session | null) => void;
  addDiceRoll: (roll: DiceRoll) => void;
  setActiveTab: (tab: TabType) => void;
  reset: () => void;

  // Scene actions
  createScene: (
    scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Scene>;
  updateScene: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  reorderScenes: (fromIndex: number, toIndex: number) => Promise<void>;
  setActiveScene: (sceneId: string) => Promise<void>;
  updateCamera: (camera: Partial<Camera>) => Promise<void>;
  setFollowDM: (follow: boolean) => Promise<void>;

  // Drawing actions
  createDrawing: (sceneId: string, drawing: Drawing) => Promise<void>;
  updateDrawing: (
    sceneId: string,
    drawingId: string,
    updates: Partial<Drawing>,
  ) => Promise<void>;
  deleteDrawing: (sceneId: string, drawingId: string) => Promise<void>;
  clearDrawings: (sceneId: string, layer?: string) => Promise<void>;
  getScene: (sceneId: string) => Scene | undefined;
  getSceneDrawings: (sceneId: string) => Drawing[];
  getVisibleDrawings: (sceneId: string, isHost: boolean) => Drawing[];

  // Token actions
  placeToken: (sceneId: string, token: PlacedToken) => Promise<void>;
  moveToken: (
    sceneId: string,
    tokenId: string,
    position: { x: number; y: number },
    rotation?: number,
  ) => Promise<void>;
  updateToken: (
    sceneId: string,
    tokenId: string,
    updates: Partial<PlacedToken>,
  ) => Promise<void>;
  deleteToken: (sceneId: string, tokenId: string) => Promise<void>;
  getSceneTokens: (sceneId: string) => PlacedToken[];
  getVisibleTokens: (sceneId: string, isHost: boolean) => PlacedToken[];

  // Settings actions
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setColorScheme: (colorScheme: ColorScheme) => Promise<void>;
  setEnableGlassmorphism: (enabled: boolean) => Promise<void>;
  resetSettings: () => Promise<void>;

  // Multiplayer session actions
  startHosting: () => Promise<MultiplayerSession>;
  joinSession: (roomCode: string) => Promise<MultiplayerSession>;
  leaveSession: () => Promise<void>;

  // Persistence actions
  forceSave: () => Promise<void>;
  hydrate: () => Promise<void>;

  // Internal state manager
  _stateManager: HybridStateManager;
}

// =============================================================================
// STATE MANAGER INTEGRATION
// =============================================================================

let stateManager: HybridStateManager;

function getStateManager(): HybridStateManager {
  if (!stateManager) {
    stateManager = createHybridStateManager({
      debug: {
        enableLogging: process.env.NODE_ENV === 'development',
        logLevel: 'info',
        enableMetrics: false,
        simulateLatency: false,
        simulateErrors: false,
      },
    });
  }
  return stateManager;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useHybridGameStore = create<HybridGameStore>()(
  subscribeWithSelector((set, get) => {
    const manager = getStateManager();

    // Subscribe to state manager changes
    manager.subscribe('store', (persistedState) => {
      set({
        ...persistedState,
        isHydrated: true,
        sessionMode:
          (persistedState.session as MultiplayerSession)?.mode || 'local',
        multiplayerSession: persistedState.session as MultiplayerSession | null,
      });
    });

    return {
      // Initial state (will be hydrated)
      isHydrated: false,
      sessionMode: 'local' as SessionMode,
      multiplayerSession: null,

      user: {
        id: '',
        name: '',
        type: 'player',
        color: 'blue',
        connected: false,
      },
      session: null,
      diceRolls: [],
      activeTab: 'lobby',
      sceneState: {
        scenes: [],
        activeSceneId: null,
        camera: { x: 0, y: 0, zoom: 1 },
        followDM: true,
        activeTool: 'select',
      },
      settings: {
        colorScheme: {
          id: 'default',
          name: 'Default',
          primary: '#3b82f6',
          secondary: '#1e40af',
          accent: '#f59e0b',
          surface: '#1f2937',
          text: '#f3f4f6',
        },
        theme: 'auto',
        enableGlassmorphism: true,
        reducedMotion: false,
        fontSize: 'medium',
        enableSounds: true,
        diceRollSounds: true,
        notificationSounds: true,
        masterVolume: 75,
        autoRollInitiative: true,
        showOtherPlayersRolls: true,
        highlightActivePlayer: true,
        snapToGridByDefault: true,
        defaultGridSize: 50,
        allowSpectators: false,
        shareCharacterSheets: true,
        logGameSessions: true,
        maxTokensPerScene: 100,
        imageQuality: 'medium',
        enableAnimations: true,
        highContrast: false,
        screenReaderMode: false,
        keyboardNavigation: true,
      },

      // Internal state manager reference
      _stateManager: manager,

      // =============================================================================
      // CORE ACTIONS
      // =============================================================================

      setUser: (user) => {
        const { user: currentUser } = get();
        manager.applyAction(actions.updateUser(currentUser.id, user));
      },

      setSession: (session) => {
        set({ session });
      },

      addDiceRoll: (roll) => {
        const { user } = get();
        manager.applyAction(actions.rollDice(user.id, roll));
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      reset: async () => {
        await manager.setState((currentState) => {
          const initialState = {
            ...currentState,
            user: {
              id: '',
              name: '',
              type: 'player' as const,
              color: 'blue',
              connected: false,
            },
            session: null,
            diceRolls: [],
            activeTab: 'lobby' as const,
            sceneState: {
              scenes: [],
              activeSceneId: null,
              camera: { x: 0, y: 0, zoom: 1 },
              followDM: true,
              activeTool: 'select',
            },
            settings: currentState.settings, // Keep current settings
          };
          return initialState;
        });
      },

      // =============================================================================
      // SCENE ACTIONS
      // =============================================================================

      createScene: async (sceneData) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.createScene(user.id, sceneData),
        );

        if (result.success && result.newState) {
          return (result.newState as any).scene;
        }
        throw new Error(result.error || 'Failed to create scene');
      },

      updateScene: async (sceneId, updates) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.updateScene(user.id, sceneId, updates),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to update scene');
        }
      },

      deleteScene: async (sceneId) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.deleteScene(user.id, sceneId),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete scene');
        }
      },

      reorderScenes: async (fromIndex, toIndex) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.reorderScenes(user.id, fromIndex, toIndex),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to reorder scenes');
        }
      },

      setActiveScene: async (sceneId) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.setActiveScene(user.id, sceneId),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to set active scene');
        }
      },

      updateCamera: async (camera) => {
        const { user, sceneState } = get();
        const sceneId = sceneState.activeSceneId;
        if (!sceneId) return;

        const result = await manager.applyAction(
          actions.updateCamera(user.id, sceneId, camera),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to update camera');
        }
      },

      setFollowDM: async (follow) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.setFollowDM(user.id, follow),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to set follow DM');
        }
      },

      // =============================================================================
      // DRAWING ACTIONS
      // =============================================================================

      createDrawing: async (sceneId, drawing) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.createDrawing(user.id, sceneId, drawing),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to create drawing');
        }
      },

      updateDrawing: async (sceneId, drawingId, updates) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.updateDrawing(user.id, sceneId, drawingId, updates),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to update drawing');
        }
      },

      deleteDrawing: async (sceneId, drawingId) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.deleteDrawing(user.id, sceneId, drawingId),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete drawing');
        }
      },

      clearDrawings: async (sceneId, layer) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.clearDrawings(user.id, sceneId, layer),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to clear drawings');
        }
      },

      getScene: (sceneId) => {
        const { sceneState } = get();
        return sceneState.scenes.find((s) => s.id === sceneId);
      },

      getSceneDrawings: (sceneId) => {
        const { sceneState } = get();
        const scene = sceneState.scenes.find((s) => s.id === sceneId);
        return scene?.drawings || [];
      },

      getVisibleDrawings: (sceneId, isHost) => {
        const drawings = get().getSceneDrawings(sceneId);
        // Filter based on visibility rules
        return drawings.filter((drawing) => {
          if (isHost) return true;
          return drawing.style.visibleToPlayers !== false;
        });
      },

      // =============================================================================
      // TOKEN ACTIONS
      // =============================================================================

      placeToken: async (sceneId, token) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.placeToken(user.id, sceneId, token),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to place token');
        }
      },

      moveToken: async (sceneId, tokenId, position, rotation) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.moveToken(user.id, sceneId, tokenId, position, rotation),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to move token');
        }
      },

      updateToken: async (sceneId, tokenId, updates) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.updateToken(user.id, sceneId, tokenId, updates),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to update token');
        }
      },

      deleteToken: async (sceneId, tokenId) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.deleteToken(user.id, sceneId, tokenId),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete token');
        }
      },

      getSceneTokens: (sceneId) => {
        const { sceneState } = get();
        const scene = sceneState.scenes.find((s) => s.id === sceneId);
        return scene?.placedTokens || [];
      },

      getVisibleTokens: (sceneId, isHost) => {
        const tokens = get().getSceneTokens(sceneId);
        // Filter based on visibility rules
        return tokens.filter((token) => {
          if (isHost) return true;
          return token.visibleToPlayers !== false;
        });
      },

      // =============================================================================
      // SETTINGS ACTIONS
      // =============================================================================

      updateSettings: async (settings) => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.updateSettings(user.id, settings),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to update settings');
        }
      },

      setColorScheme: async (colorScheme) => {
        await get().updateSettings({ colorScheme });
      },

      setEnableGlassmorphism: async (enabled) => {
        await get().updateSettings({ enableGlassmorphism: enabled });
      },

      resetSettings: async () => {
        const { user } = get();
        const result = await manager.applyAction(
          actions.resetSettings(user.id),
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to reset settings');
        }
      },

      // =============================================================================
      // MULTIPLAYER SESSION ACTIONS
      // =============================================================================

      startHosting: async () => {
        const session = await manager.startHosting();
        set({
          sessionMode: 'hosting',
          multiplayerSession: session,
          session: session,
        });
        return session;
      },

      joinSession: async (roomCode) => {
        const session = await manager.joinSession(roomCode);
        set({
          sessionMode: 'joined',
          multiplayerSession: session,
          session: session,
        });
        return session;
      },

      leaveSession: async () => {
        await manager.leaveSession();
        set({
          sessionMode: 'local',
          multiplayerSession: null,
          session: null,
        });
      },

      // =============================================================================
      // PERSISTENCE ACTIONS
      // =============================================================================

      forceSave: async () => {
        await manager.forceSave();
      },

      hydrate: async () => {
        // Initial hydration happens automatically via the subscription
        await manager.getState();
        set({ isHydrated: true });
      },
    };
  }),
);

// =============================================================================
// INITIALIZATION
// =============================================================================

// Auto-hydrate the store when it's first used
let isHydrating = false;

useHybridGameStore.subscribe(
  (state) => state.isHydrated,
  (isHydrated) => {
    if (!isHydrated && !isHydrating) {
      isHydrating = true;
      useHybridGameStore
        .getState()
        .hydrate()
        .finally(() => {
          isHydrating = false;
        });
    }
  },
  { fireImmediately: true },
);

// =============================================================================
// CONVENIENCE SELECTORS (same as your existing store)
// =============================================================================

export const useUser = () => useHybridGameStore((state) => state.user);
export const useIsHost = () =>
  useHybridGameStore((state) => state.user.type === 'host');
export const useSession = () => useHybridGameStore((state) => state.session);
export const useDiceRolls = () =>
  useHybridGameStore((state) => state.diceRolls);
export const useActiveTab = () =>
  useHybridGameStore((state) => state.activeTab);

export const useScenes = () =>
  useHybridGameStore((state) => state.sceneState.scenes);
export const useActiveScene = () =>
  useHybridGameStore((state) => {
    const { scenes, activeSceneId } = state.sceneState;
    return scenes.find((s) => s.id === activeSceneId) || null;
  });
export const useCamera = () =>
  useHybridGameStore((state) => state.sceneState.camera);
export const useFollowDM = () =>
  useHybridGameStore((state) => state.sceneState.followDM);

export const useSettings = () => useHybridGameStore((state) => state.settings);
export const useColorScheme = () =>
  useHybridGameStore((state) => state.settings.colorScheme);
export const useTheme = () =>
  useHybridGameStore((state) => state.settings.theme);

export const useSceneDrawings = (sceneId: string) =>
  useHybridGameStore((state) => state.getSceneDrawings(sceneId));
export const useVisibleDrawings = (sceneId: string) =>
  useHybridGameStore((state) => {
    const isHost = state.user.type === 'host';
    return state.getVisibleDrawings(sceneId, isHost);
  });

export const useSceneTokens = (sceneId: string) =>
  useHybridGameStore((state) => state.getSceneTokens(sceneId));
export const useVisibleTokens = (sceneId: string) =>
  useHybridGameStore((state) => {
    const isHost = state.user.type === 'host';
    return state.getVisibleTokens(sceneId, isHost);
  });

// Hybrid-specific selectors
export const useSessionMode = () =>
  useHybridGameStore((state) => state.sessionMode);
export const useMultiplayerSession = () =>
  useHybridGameStore((state) => state.multiplayerSession);
export const useIsHydrated = () =>
  useHybridGameStore((state) => state.isHydrated);

// Actions selectors
export const useGameActions = () =>
  useHybridGameStore((state) => ({
    createScene: state.createScene,
    updateScene: state.updateScene,
    deleteScene: state.deleteScene,
    setActiveScene: state.setActiveScene,
    updateCamera: state.updateCamera,

    createDrawing: state.createDrawing,
    updateDrawing: state.updateDrawing,
    deleteDrawing: state.deleteDrawing,
    clearDrawings: state.clearDrawings,

    placeToken: state.placeToken,
    moveToken: state.moveToken,
    updateToken: state.updateToken,
    deleteToken: state.deleteToken,

    startHosting: state.startHosting,
    joinSession: state.joinSession,
    leaveSession: state.leaveSession,
  }));
