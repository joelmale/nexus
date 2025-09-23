import React from 'react';
import { useGameStore, useIsConnected, useActiveTab } from '@/stores/gameStore';
import { NexusLogo, useAssetExists } from './Assets';
import { Lobby } from './Lobby';
import { DiceRoller } from './DiceRoller';
import { Placeholder } from './Placeholder';

export const Layout: React.FC = () => {
  const { setActiveTab } = useGameStore();
  const isConnected = useIsConnected();
  const activeTab = useActiveTab();
  const hasCustomLogo = useAssetExists('/assets/logos/nexus-logo.svg');

  if (!isConnected) {
    return <Lobby />;
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-brand">
          {hasCustomLogo ? (
            <NexusLogo size="lg" className="nexus-brand-logo" />
          ) : (
            <h1>Nexus VTT</h1>
          )}
        </div>
        <nav className="tab-nav">
          <button
            className={activeTab === 'lobby' ? 'active' : ''}
            onClick={() => setActiveTab('lobby')}
          >
            Lobby
          </button>
          <button
            className={activeTab === 'dice' ? 'active' : ''}
            onClick={() => setActiveTab('dice')}
          >
            Dice
          </button>
          <button
            className={activeTab === 'scenes' ? 'active' : ''}
            onClick={() => setActiveTab('scenes')}
          >
            Scenes
          </button>
          <button
            className={activeTab === 'tokens' ? 'active' : ''}
            onClick={() => setActiveTab('tokens')}
          >
            Tokens
          </button>
        </nav>
      </header>

      <main className="layout-main">
        {activeTab === 'lobby' && <Lobby />}
        {activeTab === 'dice' && <DiceRoller />}
        {activeTab === 'scenes' && <Placeholder title="Scenes" />}
        {activeTab === 'tokens' && <Placeholder title="Tokens" />}
      </main>
    </div>
  );
};
