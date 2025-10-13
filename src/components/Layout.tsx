import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CharacterCreationProvider } from './CharacterCreationLauncher';
import { LinearLayout } from './LinearLayout';
import {
  useGameStore,
  useServerRoomCode,
  useIsConnected,
} from '@/stores/gameStore';
import { getLinearFlowStorage } from '@/services/linearFlowStorage';

export const Layout: React.FC = () => {
  const params = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { view, user, setView } = useGameStore();
  const roomCode = useServerRoomCode();
  const isConnectedToRoom = useIsConnected();

  // Add initial state logging, sync gameStore, and handle migration
  useEffect(() => {
    // Check for and perform localStorage migration to IndexedDB
    const storage = getLinearFlowStorage();
    if (storage.needsMigration()) {
      storage
        .migrateFromLocalStorage()
        .then((stats) => {
          if (stats.migrated) {
            // Migration completed
          }
        })
        .catch((error) => {
          console.error('Migration failed:', error);
        });
    }

    // Sync scenes from entity store to gameStore for UI
    // Wait a bit for entity store to finish loading
    setTimeout(async () => {
      try {
        const syncResult = await storage.syncScenesWithGameStore();
        if (syncResult.synced > 0) {
          // Auto-synced scenes to UI on app load
        }
      } catch (error) {
        console.warn('Failed to auto-sync scenes:', error);
      }
    }, 1000); // 1 second delay to ensure entity store is ready

    // Always sync user data to gameStore on mount if we have user data
    if (user.name && user.type) {
      const gameStore = useGameStore.getState();
      gameStore.setUser({
        name: user.name,
        type: user.type,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple recovery logic for linear flow
  useEffect(() => {
    console.log('[Layout Effect] Running session recovery check...', { view, roomCode, isConnected: isConnectedToRoom, userName: user.name });
    // Check if user wants to force a new session (via ?new=true)
    const urlParams = new URLSearchParams(window.location.search);
    const forceNew = urlParams.get('new') === 'true';

    if (forceNew) {
      console.log('[Layout Effect] Force new session detected. Resetting.');
      useGameStore.getState().resetToWelcome();
      // Remove the query parameter
      navigate('/lobby', { replace: true });
      return;
    }

    // Restore session to game view if we have user data and room code
    // This handles:
    // 1. Page refresh with restored session from localStorage
    // 2. Navigation back to game after accidental navigation away
    // Note: After intentional leave (resetToWelcome), user.name will be empty
    //
    // IMPORTANT: Get fresh state to avoid stale closure values after resetToWelcome()
    const currentState = useGameStore.getState();
    const hasValidSession =
      currentState.user.name && currentState.user.type && roomCode;

    if (view === 'welcome' && hasValidSession) {
      console.log('[Layout Effect] Valid session found, but view is "welcome". Navigating to "game".');
      // Sync the user data to gameStore before going to game
      const gameStore = useGameStore.getState();
      gameStore.setUser({
        name: currentState.user.name,
        type: currentState.user.type,
      });

      useGameStore.getState().setView('game');
    }
  }, [user.name, user.type, roomCode, isConnectedToRoom, view, navigate]);

  // React Router Integration: Sync URL params with app state
  // URL is source of truth on initial load, app state updates URL during runtime
  useEffect(() => {
    // URL → App State: If URL has sessionId but app isn't in game mode
    if (params.sessionId && view !== 'game') {
      // Note: roomCode is derived from session state, not set directly
      setView('game');
      // Optionally: Load session data based on sessionId
      // const storage = getLinearFlowStorage();
      // storage.loadSessionByCode(params.sessionId);
    }
  }, [params.sessionId, view, setView]);

  // App State → URL: Keep URL in sync with app state
  useEffect(() => {
    const currentPath = window.location.pathname;

    if (view === 'game' && roomCode) {
      // In game mode with room code - ensure URL matches
      const expectedPath = `/game/${roomCode}`;
      if (currentPath !== expectedPath) {
        navigate(expectedPath, { replace: true });
      }
    } else if (view !== 'game') {
      // Not in game mode - ensure we're on /lobby
      if (currentPath !== '/lobby') {
        navigate('/lobby', { replace: true });
      }
    }
  }, [view, roomCode, navigate]);

  return (
    <DndProvider backend={HTML5Backend}>
      <CharacterCreationProvider>
        <LinearLayout />
      </CharacterCreationProvider>
    </DndProvider>
  );
};
