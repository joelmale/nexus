import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LinearLayout } from './LinearLayout';
import { useAppFlowStore } from '@/stores/appFlowStore';
import { useGameStore } from '@/stores/gameStore';
import { getLinearFlowStorage } from '@/services/linearFlowStorage';

export const Layout: React.FC = () => {
  const params = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { view, user, roomCode, isConnectedToRoom, gameConfig, setView } =
    useAppFlowStore();

  // Add initial state logging, sync gameStore, and handle migration
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Layout mounted with AppFlow state:', {
        view,
        user,
        roomCode,
        isConnectedToRoom,
        gameConfig,
      });
    }

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

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Initial gameStore sync on mount:', {
          name: user.name,
          type: user.type === 'dm' ? 'host' : 'player',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple recovery logic for linear flow
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Layout restoration check:', {
        view,
        hasUserName: !!user.name,
        hasUserType: !!user.type,
        hasRoomCode: !!roomCode,
        isConnected: isConnectedToRoom,
      });
    }

    // Only restore if we're on welcome screen but should be in game
    if (view === 'welcome' && user.name && user.type && roomCode) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 RESTORING linear flow session:', {
          user: user.name,
          type: user.type,
          room: roomCode,
          isConnected: isConnectedToRoom,
        });
      }

      // Sync the user data to gameStore before going to game
      const gameStore = useGameStore.getState();
      gameStore.setUser({
        name: user.name,
        type: user.type === 'dm' ? 'host' : 'player',
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Synced to gameStore, setting view to game');
      }

      useAppFlowStore.getState().setView('game');
    } else if (process.env.NODE_ENV === 'development') {
      if (view === 'game') {
        console.log('✅ Already on game view - no restoration needed');
      } else {
        console.log('❌ Not restoring session - missing data:', {
          isWelcomeView: view === 'welcome',
          hasName: !!user.name,
          hasType: !!user.type,
          hasRoom: !!roomCode,
        });
      }
    }
  }, [view, user.name, user.type, roomCode, isConnectedToRoom]);

  // React Router Integration: Sync URL params with app state
  // URL is source of truth on initial load, app state updates URL during runtime
  useEffect(() => {
    // URL → App State: If URL has sessionId but app isn't in game mode
    if (params.sessionId && view !== 'game') {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 URL indicates game session, updating app state:', params.sessionId);
      }
      // Also set the roomCode to match the URL sessionId
      useAppFlowStore.setState({ roomCode: params.sessionId });
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
        if (process.env.NODE_ENV === 'development') {
          console.log('🔗 Updating URL to match game state:', expectedPath);
        }
        navigate(expectedPath, { replace: true });
      }
    } else if (view !== 'game') {
      // Not in game mode - ensure we're on /lobby
      if (currentPath !== '/lobby' && !currentPath.startsWith('/game/')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔗 Updating URL to lobby view');
        }
        navigate('/lobby', { replace: true });
      }
    }
  }, [view, roomCode, navigate]);

  return (
    <DndProvider backend={HTML5Backend}>
      <LinearLayout />
    </DndProvider>
  );
};
