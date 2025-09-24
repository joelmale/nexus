import React from 'react';
import { useGameStore, useIsConnected, useActiveTab } from '@/stores/gameStore';
import { NexusLogo, useAssetExists } from './Assets';
import { TabIcon } from './Icons';
import { Lobby } from './Lobby';
import { DiceRoller } from './DiceRoller';
import { Placeholder } from './Placeholder';
import { SceneManager } from './Scene';
import { Settings } from './Settings';

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
            <TabIcon tab="lobby" size={20} />
            Lobby
          </button>
          <button
            className={activeTab === 'dice' ? 'active' : ''}
            onClick={() => setActiveTab('dice')}
          >
            <TabIcon tab="dice" size={20} />
            Dice
          </button>
          <button
            className={activeTab === 'scenes' ? 'active' : ''}
            onClick={() => setActiveTab('scenes')}
          >
            <TabIcon tab="scenes" size={20} />
            Scenes
          </button>
          <button
            className={activeTab === 'tokens' ? 'active' : ''}
            onClick={() => setActiveTab('tokens')}
          >
            <TabIcon tab="tokens" size={20} />
            Tokens
          </button>
          <button
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            <TabIcon tab="settings" size={20} />
            Settings
          </button>
        </nav>
      </header>

      <main className="layout-main">
        {activeTab === 'lobby' && <Lobby />}
        {activeTab === 'dice' && <DiceRoller />}
        {activeTab === 'scenes' && <SceneManager />}
        {activeTab === 'tokens' && <Placeholder title="Tokens" />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
};
