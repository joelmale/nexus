/**
 * Linear Layout Component
 *
 * Simple view-based routing for the linear flow
 */

import React from 'react';
import { useAppFlowStore } from '@/stores/appFlowStore';
import { LinearWelcomePage } from './LinearWelcomePage';
import { PlayerSetupPage } from './PlayerSetupPage';
import { DMSetupPage } from './DMSetupPage';
import { LinearGameLayout } from './LinearGameLayout'; // Clean game layout for linear flow

export const LinearLayout: React.FC = () => {
  const { view } = useAppFlowStore();

  // Add debugging for view changes
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 LinearLayout rendering view:', view);
    }
  }, [view]);

  // Simple view-based routing
  switch (view) {
    case 'welcome':
      return <LinearWelcomePage />;

    case 'player_setup':
      return <PlayerSetupPage />;

    case 'dm_setup':
      return <DMSetupPage />;

    case 'game':
      return <LinearGameLayout />;

    default:
      return <LinearWelcomePage />;
  }
};