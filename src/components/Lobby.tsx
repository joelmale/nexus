import React, { useState } from 'react';
import { useGameStore, useSession, useIsHost } from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';
import { NexusLogo, useAssetExists } from './Assets';
import DnDTeamBackground from '@/assets/DnDTeamPosing.png';

export const Lobby: React.FC = () => {
  const { setUser } = useGameStore();
  const session = useSession();
  const isHost = useIsHost();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasCustomLogo = useAssetExists('/assets/logos/nexus-logo.svg');

  const handleHostGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setUser({ name: playerName.trim(), type: 'host' });
      await webSocketService.connect();
    } catch (err) {
      setError('Failed to create game session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setUser({ name: playerName.trim(), type: 'player' });
      await webSocketService.connect(roomCode.trim().toUpperCase());
    } catch (err) {
      setError('Failed to join game session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    webSocketService.disconnect();
    useGameStore.getState().reset();
  };

  if (session) {
    return (
      <div className="lobby lobby-connected">
        <div className="lobby-background">
          <img src={DnDTeamBackground} alt="D&D Party" />
          <div className="background-overlay"></div>
        </div>
        
        <div className="lobby-content">
          <div className="glass-panel session-panel">
            <div className="panel-header">
              <h2>Game Session</h2>
              <div className="connection-status connected">
                <span className="status-dot"></span>
                Connected
              </div>
            </div>
            
            <div className="session-info">
              <div className="info-item">
                <label>Room Code</label>
                <div className="room-code">{session.roomCode}</div>
              </div>
              <div className="info-item">
                <label>Your Role</label>
                <div className="role-badge">
                  {isHost ? (
                    <>
                      <span className="role-icon">👑</span>
                      Dungeon Master
                    </>
                  ) : (
                    <>
                      <span className="role-icon">⚔️</span>
                      Player
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="players-section">
              <h3>Party Members ({session.players.length})</h3>
              <div className="players-grid">
                {session.players.map(player => (
                  <div 
                    key={player.id} 
                    className={`player-card ${player.type === 'host' ? 'dm-card' : 'player-card'}`}
                  >
                    <div className="player-avatar">
                      {player.type === 'host' ? '👑' : '⚔️'}
                    </div>
                    <div className="player-info">
                      <div className="player-name">{player.name}</div>
                      <div className="player-role">
                        {player.type === 'host' ? 'DM' : 'Player'}
                      </div>
                    </div>
                    <div className={`connection-indicator ${player.connected ? 'online' : 'offline'}`}>
                      <span className="indicator-dot"></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleDisconnect} className="disconnect-btn glass-button danger">
              <span>🚪</span>
              Leave Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby lobby-welcome">
      <div className="lobby-background">
        <img src={DnDTeamBackground} alt="D&D Adventure Party" />
        <div className="background-overlay"></div>
        <div className="background-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i} 
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${4 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="lobby-content">
        <div className="welcome-panel glass-panel">
          <div className="brand-section">
            {hasCustomLogo ? (
              <NexusLogo size="xl" className="lobby-logo" />
            ) : (
              <div className="brand-logo">
                <div className="logo-icon">🎲</div>
                <h1 className="brand-title">Nexus VTT</h1>
              </div>
            )}
            <p className="brand-tagline">
              Your gateway to epic adventures
            </p>
          </div>

          {error && (
            <div className="error-message glass-panel error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-section">
            <div className="input-group">
              <label htmlFor="playerName">Enter Your Name</label>
              <div className="glass-input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your adventurer name"
                  disabled={loading}
                  className="glass-input"
                />
              </div>
            </div>

            <div className="actions-section">
              <div className="action-card glass-panel">
                <div className="action-header">
                  <div className="action-icon">👑</div>
                  <div>
                    <h3>Host Adventure</h3>
                    <p>Lead your party as the Dungeon Master</p>
                  </div>
                </div>
                <button 
                  onClick={handleHostGame}
                  disabled={loading || !playerName.trim()}
                  className="glass-button primary"
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      Start New Campaign
                    </>
                  )}
                </button>
              </div>

              <div className="divider">
                <span>OR</span>
              </div>

              <div className="action-card glass-panel">
                <div className="action-header">
                  <div className="action-icon">⚔️</div>
                  <div>
                    <h3>Join Adventure</h3>
                    <p>Connect to an existing campaign</p>
                  </div>
                </div>
                <div className="input-group">
                  <div className="glass-input-wrapper">
                    <span className="input-icon">🗝️</span>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Enter room code"
                      disabled={loading}
                      maxLength={6}
                      className="glass-input room-code-input"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleJoinGame}
                  disabled={loading || !playerName.trim() || !roomCode.trim()}
                  className="glass-button secondary"
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Joining...
                    </>
                  ) : (
                    <>
                      <span>🌟</span>
                      Join Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
