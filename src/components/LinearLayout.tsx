/**
 * Linear Layout Component
 *
 * Simple view-based routing for the linear flow
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, useServerRoomCode } from '@/stores/gameStore';
import { LinearWelcomePage } from './LinearWelcomePage';
import { PlayerSetupPage } from './PlayerSetupPage';
import { DMSetupPage } from './DMSetupPage';
import { Dashboard } from './Dashboard';
import { LinearGameLayout } from './LinearGameLayout'; // Clean game layout for linear flow
import { AdminPage } from './AdminPage';
import {
  CharacterCreationProvider,
  useCharacterCreationLauncher,
} from './CharacterCreationLauncher';

const LinearLayoutContent: React.FC = () => {
  const { view, user } = useGameStore();
  const roomCode = useServerRoomCode();
  const navigate = useNavigate();
  const { LauncherComponent } = useCharacterCreationLauncher();

  React.useEffect(() => {
    const { isAuthenticated, view, setView } = useGameStore.getState();
    if (isAuthenticated && view === 'welcome') {
      setView('dashboard');
    }
  }, [user.id]);

  // Add debugging for view changes

  // Handle invalid game state - reset to welcome after render
  React.useEffect(() => {
    // Allow game view for DMs even without roomCode (offline preparation mode)
    const isValidGameState =
      user.name && user.type && (roomCode || user.type === 'host');

    if (view === 'game' && !isValidGameState) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '⚠️ Invalid game state detected - redirecting to welcome',
          JSON.stringify({
            hasName: !!user.name,
            userName: user.name,
            hasType: !!user.type,
            userType: user.type,
            hasRoomCode: !!roomCode,
            roomCode: roomCode,
          }, null, 2)
        );
      }
      // Reset to welcome and navigate to /lobby URL
      useGameStore.getState().resetToWelcome();
      navigate('/lobby', { replace: true });
    }
  }, [view, user.name, user.type, roomCode, navigate]);

  // Simple view-based routing
  const renderCurrentView = () => {
    switch (view) {
      case 'welcome':
        return <LinearWelcomePage />;

      case 'player_setup':
        return <PlayerSetupPage />;

      case 'dm_setup':
        return <DMSetupPage />;

      case 'dashboard':
        return <Dashboard />;

      case 'game': {
        // Safety check: Don't render game if user state is invalid
        // Allow DMs to prepare games offline (without roomCode)
        const isValidGameState =
          user.name && user.type && (roomCode || user.type === 'host');

        if (!isValidGameState) {
          // Invalid state - reset to welcome after render
          setTimeout(() => {
            useGameStore.getState().resetToWelcome();
          }, 0);
          return <LinearWelcomePage />;
        }

        return <LinearGameLayout />;
      }

      case 'admin':
        // Only allow admin access in development mode
        if (process.env.NODE_ENV !== 'development') {
          useGameStore.getState().resetToWelcome();
          return <LinearWelcomePage />;
        }
        return <AdminPage />;

      default:
        return <LinearWelcomePage />;
    }
  };

  return (
    <>
      {renderCurrentView()}
      {LauncherComponent}
    </>
  );
};

export const LinearLayout: React.FC = () => {
  return (
    <CharacterCreationProvider>
      <LinearLayoutContent />
    </CharacterCreationProvider>
  );
};
