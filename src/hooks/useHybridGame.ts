/**
 * Hybrid Game Hooks
 *
 * React hooks that provide a clean, type-safe interface for
 * interacting with the hybrid state management system.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  useHybridGameStore,
  useUser,
  useSessionMode,
  useMultiplayerSession as useStoreMultiplayerSession,
  useIsHydrated,
  useGameActions,
} from '@/stores/hybridGameStore';
import type { SessionMode, MultiplayerSession } from '@/types/hybrid';
import type { Drawing } from '@/types/drawing';
import type { PlacedToken } from '@/types/token';
import { createDiceRoll } from '@/utils/dice';

// =============================================================================
// CORE GAME STATE HOOKS
// =============================================================================

/**
 * Main hook for accessing game state and actions
 */
export function useHybridGame() {
  const store = useHybridGameStore();
  const isHydrated = useIsHydrated();
  const sessionMode = useSessionMode();
  const actions = useGameActions();

  return {
    // State
    isHydrated,
    sessionMode,
    user: store.user,
    session: store.session,
    settings: store.settings,

    // Actions
    ...actions,

    // Utilities
    forceSave: store.forceSave,
    reset: store.reset,
  };
}

/**
 * Hook for managing user state
 */
export function useUserState() {
  const user = useUser();
  const setUser = useHybridGameStore((state) => state.setUser);

  return {
    user,
    updateUser: setUser,
    isHost: user.type === 'host',
    isConnected: user.connected,
  };
}

/**
 * Hook for managing application settings
 */
export function useGameSettings() {
  const settings = useHybridGameStore((state) => state.settings);
  const updateSettings = useHybridGameStore((state) => state.updateSettings);
  const resetSettings = useHybridGameStore((state) => state.resetSettings);
  const setColorScheme = useHybridGameStore((state) => state.setColorScheme);
  const setEnableGlassmorphism = useHybridGameStore(
    (state) => state.setEnableGlassmorphism,
  );

  return {
    settings,
    updateSettings,
    resetSettings,
    setColorScheme,
    setEnableGlassmorphism,
  };
}

// =============================================================================
// SCENE MANAGEMENT HOOKS
// =============================================================================

/**
 * Hook for managing scenes
 */
export function useSceneManager() {
  const scenes = useHybridGameStore((state) => state.sceneState.scenes);
  const activeSceneId = useHybridGameStore(
    (state) => state.sceneState.activeSceneId,
  );
  const createScene = useHybridGameStore((state) => state.createScene);
  const updateScene = useHybridGameStore((state) => state.updateScene);
  const deleteScene = useHybridGameStore((state) => state.deleteScene);
  const setActiveScene = useHybridGameStore((state) => state.setActiveScene);
  const reorderScenes = useHybridGameStore((state) => state.reorderScenes);

  const activeScene =
    scenes.find((scene) => scene.id === activeSceneId) || null;

  const createNewScene = useCallback(
    async (name: string, description?: string) => {
      const sceneData = {
        name,
        description: description || '',
        visibility: 'public' as const,
        isEditable: true,
        createdBy: useHybridGameStore.getState().user.id,
        gridSettings: {
          enabled: true,
          size: 50,
          color: '#ffffff',
          opacity: 0.3,
          snapToGrid: true,
          showToPlayers: true,
        },
        lightingSettings: {
          enabled: false,
          globalIllumination: true,
          ambientLight: 0.5,
          darkness: 0,
        },
        drawings: [],
        placedTokens: [],
        isActive: false,
        playerCount: 0,
      };

      return await createScene(sceneData);
    },
    [createScene],
  );

  return {
    scenes,
    activeScene,
    activeSceneId,
    createScene: createNewScene,
    updateScene,
    deleteScene,
    setActiveScene,
    reorderScenes,
  };
}

/**
 * Hook for managing camera and viewport
 */
export function useCamera() {
  const camera = useHybridGameStore((state) => state.sceneState.camera);
  const followDM = useHybridGameStore((state) => state.sceneState.followDM);
  const updateCamera = useHybridGameStore((state) => state.updateCamera);
  const setFollowDM = useHybridGameStore((state) => state.setFollowDM);

  const moveCamera = useCallback(
    (x: number, y: number) => {
      updateCamera({ x, y });
    },
    [updateCamera],
  );

  const zoomCamera = useCallback(
    (zoom: number) => {
      updateCamera({ zoom: Math.max(0.1, Math.min(5, zoom)) });
    },
    [updateCamera],
  );

  const resetCamera = useCallback(() => {
    updateCamera({ x: 0, y: 0, zoom: 1 });
  }, [updateCamera]);

  return {
    camera,
    followDM,
    moveCamera,
    zoomCamera,
    resetCamera,
    setFollowDM,
  };
}

// =============================================================================
// CONTENT MANAGEMENT HOOKS
// =============================================================================

/**
 * Hook for managing drawings in a scene
 */
export function useSceneDrawings(sceneId: string) {
  const getSceneDrawings = useHybridGameStore(
    (state) => state.getSceneDrawings,
  );
  const getVisibleDrawings = useHybridGameStore(
    (state) => state.getVisibleDrawings,
  );
  const createDrawing = useHybridGameStore((state) => state.createDrawing);
  const updateDrawing = useHybridGameStore((state) => state.updateDrawing);
  const deleteDrawing = useHybridGameStore((state) => state.deleteDrawing);
  const clearDrawings = useHybridGameStore((state) => state.clearDrawings);
  const isHost = useHybridGameStore((state) => state.user.type === 'host');

  const allDrawings = getSceneDrawings(sceneId);
  const visibleDrawings = getVisibleDrawings(sceneId, isHost);

  const addDrawing = useCallback(
    async (drawing: Drawing) => {
      await createDrawing(sceneId, drawing);
    },
    [createDrawing, sceneId],
  );

  const modifyDrawing = useCallback(
    async (drawingId: string, updates: Partial<Drawing>) => {
      await updateDrawing(sceneId, drawingId, updates);
    },
    [updateDrawing, sceneId],
  );

  const removeDrawing = useCallback(
    async (drawingId: string) => {
      await deleteDrawing(sceneId, drawingId);
    },
    [deleteDrawing, sceneId],
  );

  const clearAllDrawings = useCallback(
    async (layer?: string) => {
      await clearDrawings(sceneId, layer);
    },
    [clearDrawings, sceneId],
  );

  return {
    drawings: visibleDrawings,
    allDrawings,
    addDrawing,
    updateDrawing: modifyDrawing,
    removeDrawing,
    clearDrawings: clearAllDrawings,
  };
}

/**
 * Hook for managing tokens in a scene
 */
export function useSceneTokens(sceneId: string) {
  const getSceneTokens = useHybridGameStore((state) => state.getSceneTokens);
  const getVisibleTokens = useHybridGameStore(
    (state) => state.getVisibleTokens,
  );
  const placeToken = useHybridGameStore((state) => state.placeToken);
  const moveToken = useHybridGameStore((state) => state.moveToken);
  const updateToken = useHybridGameStore((state) => state.updateToken);
  const deleteToken = useHybridGameStore((state) => state.deleteToken);
  const isHost = useHybridGameStore((state) => state.user.type === 'host');

  const allTokens = getSceneTokens(sceneId);
  const visibleTokens = getVisibleTokens(sceneId, isHost);

  const addToken = useCallback(
    async (token: PlacedToken) => {
      await placeToken(sceneId, token);
    },
    [placeToken, sceneId],
  );

  const moveTokenTo = useCallback(
    async (tokenId: string, x: number, y: number, rotation?: number) => {
      await moveToken(sceneId, tokenId, { x, y }, rotation);
    },
    [moveToken, sceneId],
  );

  const modifyToken = useCallback(
    async (tokenId: string, updates: Partial<PlacedToken>) => {
      await updateToken(sceneId, tokenId, updates);
    },
    [updateToken, sceneId],
  );

  const removeToken = useCallback(
    async (tokenId: string) => {
      await deleteToken(sceneId, tokenId);
    },
    [deleteToken, sceneId],
  );

  return {
    tokens: visibleTokens,
    allTokens,
    addToken,
    moveToken: moveTokenTo,
    updateToken: modifyToken,
    removeToken,
  };
}

// =============================================================================
// MULTIPLAYER SESSION HOOKS
// =============================================================================

/**
 * Hook for managing multiplayer sessions
 */
export function useMultiplayerSession(): {
  sessionMode: SessionMode;
  session: MultiplayerSession | null;
  isConnecting: boolean;
  connectionError: string | null;
  isLocal: boolean;
  isHosting: boolean;
  isJoined: boolean;
  hostSession: () => Promise<MultiplayerSession | null>;
  joinSession: (roomCode: string) => Promise<MultiplayerSession | null>;
  leaveSession: () => Promise<void>;
} {
  const sessionMode = useSessionMode();
  const session = useStoreMultiplayerSession();
  const startHosting = useHybridGameStore((state) => state.startHosting);
  const joinSession = useHybridGameStore((state) => state.joinSession);
  const leaveSession = useHybridGameStore((state) => state.leaveSession);

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const hostNewSession = useCallback(async () => {
    if (sessionMode !== 'local') return null;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const newSession = await startHosting();
      setIsConnecting(false);
      return newSession;
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Failed to start hosting',
      );
      setIsConnecting(false);
      return null;
    }
  }, [sessionMode, startHosting]);

  const joinExistingSession = useCallback(
    async (roomCode: string) => {
      if (sessionMode !== 'local') return null;

      setIsConnecting(true);
      setConnectionError(null);

      try {
        const joinedSession = await joinSession(roomCode);
        setIsConnecting(false);
        return joinedSession;
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : 'Failed to join session',
        );
        setIsConnecting(false);
        return null;
      }
    },
    [sessionMode, joinSession],
  );

  const leaveCurrentSession = useCallback(async () => {
    if (sessionMode === 'local') return;

    try {
      await leaveSession();
      setConnectionError(null);
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Failed to leave session',
      );
    }
  }, [sessionMode, leaveSession]);

  return {
    sessionMode,
    session,
    isConnecting,
    connectionError,
    isLocal: sessionMode === 'local',
    isHosting: sessionMode === 'hosting',
    isJoined: sessionMode === 'joined',
    hostSession: hostNewSession,
    joinSession: joinExistingSession,
    leaveSession: leaveCurrentSession,
  };
}

// =============================================================================
// DICE AND ACTIONS HOOKS
// =============================================================================

/**
 * Hook for managing dice rolls
 */
export function useDiceRolls() {
  const diceRolls = useHybridGameStore((state) => state.diceRolls);
  const addDiceRoll = useHybridGameStore((state) => state.addDiceRoll);

  const rollDice = useCallback(
    (
      expression: string,
      options: {
        isPrivate?: boolean;
        advantage?: boolean;
        disadvantage?: boolean;
      } = {},
    ) => {
      const user = useHybridGameStore.getState().user;

      // Use the existing dice utility to create a proper dice roll
      const roll = createDiceRoll(expression, user.id, user.name, options);

      if (!roll) {
        console.error('Invalid dice expression:', expression);
        return null;
      }

      addDiceRoll(roll);
      return roll;
    },
    [addDiceRoll],
  );

  return {
    diceRolls,
    rollDice,
  };
}

// =============================================================================
// PERSISTENCE AND SYNC HOOKS
// =============================================================================

/**
 * Hook for managing persistence and sync state
 */
export function usePersistence() {
  const isHydrated = useIsHydrated();
  const forceSave = useHybridGameStore((state) => state.forceSave);
  const sessionMode = useSessionMode();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveNow = useCallback(async () => {
    setIsSaving(true);
    try {
      await forceSave();
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [forceSave]);

  return {
    isHydrated,
    isSaving,
    lastSaved,
    isLocalMode: sessionMode === 'local',
    saveNow,
  };
}

// =============================================================================
// DEVELOPMENT AND DEBUG HOOKS
// =============================================================================

/**
 * Hook for accessing debug information (development only)
 */
export function useDebugInfo() {
  const store = useHybridGameStore();
  const stateManager = store._stateManager;

  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const updateDebugInfo = async () => {
      const state = await stateManager.getState();
      setDebugInfo({
        syncVersion: state.syncVersion,
        lastModified: new Date(state.lastModified),
        lastSaved: new Date(state.lastSaved),
        localChanges: state.localChanges.length,
        sessionMode: store.sessionMode,
        isHydrated: store.isHydrated,
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);

    return () => clearInterval(interval);
  }, [stateManager, store]);

  return {
    debugInfo,
    stateManager: process.env.NODE_ENV === 'development' ? stateManager : null,
  };
}
