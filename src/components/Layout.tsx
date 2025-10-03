import React, { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LinearLayout } from './LinearLayout';
import { useAppFlowStore } from '@/stores/appFlowStore';
import { useGameStore } from '@/stores/gameStore';
import { getLinearFlowStorage } from '@/services/linearFlowStorage';

export const Layout: React.FC = () => {
  const { view, user, roomCode, isConnectedToRoom, gameConfig } =
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

  return (
    <DndProvider backend={HTML5Backend}>
      <LinearLayout />
    </DndProvider>
  );
};
