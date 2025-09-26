import React, { useRef, useEffect } from 'react';
import { DiceRoller } from './DiceRoller';
import { Settings } from './Settings';
import { Placeholder } from './Placeholder';

interface ContextPanelProps {
  activePanel: 'tokens' | 'scene' | 'props' | 'initiative' | 'dice' | 'lobby' | 'settings' | 'chat' | 'sounds';
  onPanelChange: (panel: 'tokens' | 'scene' | 'props' | 'initiative' | 'dice' | 'lobby' | 'settings' | 'chat' | 'sounds') => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onContentWidthChange: (width: number) => void;
}

/**
 * Renders the content for the active sidebar panel.
 * This component acts as a container that displays the correct panel UI 
 * based on the `activePanel` prop provided by its parent layout component (e.g., GameLayout).
 * It does not manage its own state for which panel is active.
 */
export const ContextPanel: React.FC<ContextPanelProps> = ({
  activePanel,
  onPanelChange,
  expanded,
  onToggleExpanded,
  onContentWidthChange,
}) => {
  const panelBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && panelBodyRef.current) {
      // Use a timeout to allow content to render before measuring
      const timer = setTimeout(() => {
        if (panelBodyRef.current) {
          const contentWidth = panelBodyRef.current.scrollWidth;
          onContentWidthChange(contentWidth + 40); // Add padding
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activePanel, expanded, onContentWidthChange]);

  const panels = [
    { id: 'tokens' as const, icon: '👤', label: 'Tokens' },
    { id: 'scene' as const, icon: '🖼', label: 'Scene' },
    { id: 'props' as const, icon: '📦', label: 'Props' },
    { id: 'initiative' as const, icon: '⏱', label: 'Initiative' },
    { id: 'dice' as const, icon: '🎲', label: 'Dice' },
    { id: 'sounds' as const, icon: '🔊', label: 'Sounds' },
    { id: 'chat' as const, icon: '💬', label: 'Chat' },
    { id: 'lobby' as const, icon: '👥', label: 'Lobby' },
    { id: 'settings' as const, icon: '⚙️', label: 'Settings' },
  ];

  return (
    <div className="context-panel" data-expanded={expanded}>
      {/* Panel Content */}
      {expanded && (
        <div className="panel-content" role="tabpanel">
          <div className="panel-body" ref={panelBodyRef}>
            {activePanel === 'tokens' && <Placeholder title="Tokens" />}
            {activePanel === 'scene' && <Placeholder title="Scene Settings" />}
            {activePanel === 'props' && <Placeholder title="Props" />}
            {activePanel === 'initiative' && <Placeholder title="Initiative Tracker" />}
            {activePanel === 'dice' && <DiceRoller />}
            {activePanel === 'sounds' && <Placeholder title="Sound Effects"/>}
            {activePanel === 'chat' && <Placeholder title="Chat"/>}
            {activePanel === 'lobby' && <LobbyPanel />}
            {activePanel === 'settings' && <Settings />}
          </div>
        </div>
      )}

      {/* Collapsed state content - show icon when collapsed */}
      {!expanded && (
        <div className="collapsed-content">
          <div className="collapsed-icon">
            {panels.find(p => p.id === activePanel)?.icon}
          </div>
        </div>
      )}
    </div>
  );
};

const LobbyPanel: React.FC = () => {
  // Mock data - in real app, this would come from game store
  const connectedPlayers = [
    { id: '1', name: 'Joel', isHost: true, avatar: 'J', connected: true, canEditScenes: true },
    { id: '2', name: 'Alice', isHost: false, avatar: 'A', connected: true, canEditScenes: false },
    { id: '3', name: 'Bob', isHost: false, avatar: 'B', connected: false, canEditScenes: false },
  ];
  
  const currentUserIsHost = true; // This would come from game store
  
  const handleKickPlayer = (playerId: string, playerName: string) => {
    if (window.confirm(`Kick ${playerName} from the game?`)) {
      // Implement kick functionality
      console.log('Kicking player:', playerId);
    }
  };
  
  const handleToggleDMPermissions = (playerId: string, playerName: string, currentPermissions: boolean) => {
    const action = currentPermissions ? 'Remove' : 'Grant';
    if (window.confirm(`${action} DM permissions for ${playerName}?`)) {
      // Implement permission toggle
      console.log(`${action} DM permissions for:`, playerId);
    }
  };
  
  return (
    <div className="panel-section">
      <h3>Game Lobby</h3>
      <div className="lobby-stats">
        <p className="lobby-info">
          <strong>{connectedPlayers.filter(p => p.connected).length}</strong> of{' '}
          <strong>{connectedPlayers.length}</strong> players connected
        </p>
      </div>
      
      <div className="player-list">
        {connectedPlayers.map(player => (
          <div key={player.id} className={`player-item ${!player.connected ? 'disconnected' : ''}`}>
            <div className="player-info">
              <div className={`player-avatar ${player.isHost ? 'host-avatar' : ''}`}>
                {player.avatar}
              </div>
              <div className="player-details">
                <div className="player-name">
                  {player.name}
                  {player.isHost && <span className="host-badge">HOST</span>}
                  {player.canEditScenes && !player.isHost && <span className="dm-badge">DM</span>}
                </div>
                <div className="player-status">
                  <span className={`status-dot ${player.connected ? 'online' : 'offline'}`} />
                  {player.connected ? 'Online' : 'Disconnected'}
                </div>
              </div>
            </div>
            
            {currentUserIsHost && !player.isHost && (
              <div className="player-actions">
                <button
                  className={`action-btn ${player.canEditScenes ? 'active' : ''}`}
                  onClick={() => handleToggleDMPermissions(player.id, player.name, player.canEditScenes)}
                  title={player.canEditScenes ? 'Remove DM permissions' : 'Grant DM permissions'}
                >
                  ⚡
                </button>
                <button
                  className="action-btn kick-btn"
                  onClick={() => handleKickPlayer(player.id, player.name)}
                  title="Kick player"
                >
                  🚪
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {currentUserIsHost && (
        <div className="lobby-controls">
          <button className="btn btn-secondary" type="button">
            📋 Copy Invite Link
          </button>
          <button className="btn btn-secondary" type="button">
            🔒 Lock Game
          </button>
        </div>
      )}
    </div>
  );
};

const TokenPanel: React.FC = () => (
  <div className="panel-section">
    <h3>Token Library</h3>
    <p>Drag and drop character tokens onto the scene.</p>
    {/* Token content will go here */}
  </div>
);

const ScenePanel: React.FC = () => (
  <div className="panel-section">
    <h3>Scene Settings</h3>
    <p>Configure background, grid, and lighting settings.</p>
    {/* Scene settings will go here */}
  </div>
);

const PropsPanel: React.FC = () => (
  <div className="panel-section">
    <h3>Props & Objects</h3>
    <p>Add furniture, decorations, and interactive objects.</p>
    {/* Props content will go here */}
  </div>
);

const InitiativePanel: React.FC = () => (
  <div className="panel-section">
    <h3>Initiative Tracker</h3>
    <p>Track turn order and combat rounds.</p>
    {/* Initiative tracker will go here */}
  </div>
);

const SoundsPanel: React.FC = () => (
  <div className="panel-section">
    <h3>Sound Effects</h3>
    <p>Control ambient sounds, music, and sound effects.</p>
    {/* Sound effects content will go here */}
  </div>
);

const ChatPanel: React.FC = () => (
  <div className="panel-section">
    <h3>Chat</h3>
    <p>Communicate with players via public and private messages.</p>
    {/* Chat content will go here */}
  </div>
);
