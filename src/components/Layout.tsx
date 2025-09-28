import React, { useEffect } from 'react';
import { LinearLayout } from './LinearLayout';
import { useAppFlowStore } from '@/stores/appFlowStore';
import { useGameStore } from '@/stores/gameStore';
import { getLinearFlowStorage } from '@/services/linearFlowStorage';

export const Layout: React.FC = () => {
  const { view, user, roomCode, isConnectedToRoom, gameConfig } = useAppFlowStore();

  // Add initial state logging, sync gameStore, and handle migration
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Layout mounted with AppFlow state:', {
        view,
        user,
        roomCode,
        isConnectedToRoom,
        gameConfig
      });
    }

    // Check for and perform localStorage migration to IndexedDB
    const storage = getLinearFlowStorage();
    if (storage.needsMigration()) {
      storage.migrateFromLocalStorage().then(stats => {
        if (stats.migrated) {
          console.log('🔄 Migration completed:', stats);
        }
      }).catch(error => {
        console.error('Migration failed:', error);
      });
    }

    // Always sync user data to gameStore on mount if we have user data
    if (user.name && user.type) {
      const gameStore = useGameStore.getState();
      gameStore.setUser({
        name: user.name,
        type: user.type === 'dm' ? 'host' : 'player'
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Initial gameStore sync on mount:', {
          name: user.name,
          type: user.type === 'dm' ? 'host' : 'player'
        });
      }
    }
  }, []);

  // Simple recovery logic for linear flow
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Layout restoration check:', {
        view,
        hasUserName: !!user.name,
        hasUserType: !!user.type,
        hasRoomCode: !!roomCode,
        isConnected: isConnectedToRoom
      });
    }

    // Only restore if we're on welcome screen but should be in game
    if (view === 'welcome' && user.name && user.type && roomCode) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 RESTORING linear flow session:', {
          user: user.name,
          type: user.type,
          room: roomCode,
          isConnected: isConnectedToRoom
        });
      }

      // Sync the user data to gameStore before going to game
      const gameStore = useGameStore.getState();
      gameStore.setUser({
        name: user.name,
        type: user.type === 'dm' ? 'host' : 'player'
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
          hasRoom: !!roomCode
        });
      }
    }
  }, [view, user.name, user.type, roomCode, isConnectedToRoom]);

  return <LinearLayout />;
};
