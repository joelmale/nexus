import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LinearLayout } from './LinearLayout';
import { useGameStore } from '@/stores/gameStore';
import { getLinearFlowStorage } from '@/services/linearFlowStorage';

export const Layout: React.FC = () => {
  const params = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { view, user, roomCode, isConnectedToRoom, setView } =
    useGameStore();

  // Add initial state logging, sync gameStore, and handle migration
  useEffect(() => {
    // Check for and perform localStorage migration to IndexedDB
    const storage = getLinearFlowStorage();
    if (storage.needsMigration()) {
      storage
        .migrateFromLocalStorage()
        .then((stats) => {
          if (stats.migrated) {
            console.log('🔄 Migration completed:', stats);
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
          console.log('🔄 Auto-synced scenes to UI on app load:', syncResult);
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
        type: user.type === 'dm' ? 'host' : 'player',
      });

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple recovery logic for linear flow
  useEffect(() => {
    // Check if user wants to force a new session (via ?new=true)
    const urlParams = new URLSearchParams(window.location.search);
    const forceNew = urlParams.get('new') === 'true';

    if (forceNew) {
      console.log('🔄 Force new session requested - clearing stored session');
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
    const hasValidSession = currentState.user.name && currentState.user.type && currentState.roomCode;

    if (view === 'welcome' && hasValidSession) {
      console.log('🔄 Auto-restoring session to game view', {
        userName: currentState.user.name,
        userType: currentState.user.type,
        roomCode: currentState.roomCode,
        isConnected: currentState.isConnectedToRoom,
      });

      // Sync the user data to gameStore before going to game
      const gameStore = useGameStore.getState();
      gameStore.setUser({
        name: currentState.user.name,
        type: currentState.user.type === 'dm' ? 'host' : 'player',
      });

      useGameStore.getState().setView('game');
    }
  }, [user.name, user.type, roomCode, isConnectedToRoom, view, navigate]);

  // React Router Integration: Sync URL params with app state
  // URL is source of truth on initial load, app state updates URL during runtime
  useEffect(() => {
    // URL → App State: If URL has sessionId but app isn't in game mode
    if (params.sessionId && view !== 'game') {
      // Also set the roomCode to match the URL sessionId
      useGameStore.setState({ roomCode: params.sessionId });
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
        useGameStore.setState({ hasLeftRoom: false });
      }
    }
  }, [view, roomCode, navigate]);

  return (
    <DndProvider backend={HTML5Backend}>
      <LinearLayout />
    </DndProvider>
  );
};
