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
import { LinearGameLayout } from './LinearGameLayout'; // Clean game layout for linear flow

export const LinearLayout: React.FC = () => {
  const { view, user } = useGameStore();
  const roomCode = useServerRoomCode();
  const navigate = useNavigate();

  // Add debugging for view changes
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 LinearLayout rendering view:', view);
    }
  }, [view]);

  // Handle invalid game state - reset to welcome after render
  React.useEffect(() => {
    // Allow game view for DMs even without roomCode (offline preparation mode)
    const isValidGameState =
      user.name && user.type && (roomCode || user.type === 'host');

    if (view === 'game' && !isValidGameState) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '⚠️ Invalid game state detected - redirecting to welcome',
          {
            hasName: !!user.name,
            hasType: !!user.type,
            hasRoomCode: !!roomCode,
            userType: user.type,
          },
        );
      }
      // Reset to welcome and navigate to /lobby URL
      useGameStore.getState().resetToWelcome();
      navigate('/lobby', { replace: true });
    }
  }, [view, user.name, user.type, roomCode, navigate]);

  // Simple view-based routing
  switch (view) {
    case 'welcome':
      return <LinearWelcomePage />;

    case 'player_setup':
      return <PlayerSetupPage />;

    case 'dm_setup':
      return <DMSetupPage />;

    case 'game': {
      // Safety check: Don't render game if user state is invalid
      // Allow DMs to prepare games offline (without roomCode)
      const isValidGameState =
        user.name && user.type && (roomCode || user.type === 'host');

      if (!isValidGameState) {
        // The useEffect above will handle the reset and navigation
        return <LinearWelcomePage />;
      }
      return <LinearGameLayout />;
    }

    default:
      return <LinearWelcomePage />;
  }
};
