import React, { useState } from 'react';
import { useGameStore, useSession, useIsHost } from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';
import { NexusLogo, useAssetExists } from './Assets';

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
      // The server will send a session/created event
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
      // The server will send a session/joined event
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
      <div className="lobby connected">
        <h2>Game Session</h2>
        <div className="session-info">
          <p><strong>Room Code:</strong> {session.roomCode}</p>
          <p><strong>Role:</strong> {isHost ? 'Host (DM)' : 'Player'}</p>
        </div>

        <div className="players-list">
          <h3>Players ({session.players.length})</h3>
          <ul>
            {session.players.map(player => (
              <li key={player.id} className={player.type === 'host' ? 'host' : 'player'}>
                {player.name} {player.type === 'host' ? '(DM)' : ''}
                <span className={`status ${player.connected ? 'connected' : 'disconnected'}`}>
                  {player.connected ? '🟢' : '🔴'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={handleDisconnect} className="disconnect-btn">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-content">
        <div className="lobby-brand">
          {hasCustomLogo ? (
            <NexusLogo size="xl" className="lobby-logo" />
          ) : (
            <h1>Nexus VTT</h1>
          )}
        </div>
        <p>A lightweight virtual tabletop for modern web browsers</p>

        {error && <div className="error">{error}</div>}

        <div className="name-input">
          <label htmlFor="playerName">Your Name:</label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            disabled={loading}
          />
        </div>

        <div className="lobby-actions">
          <div className="action-group">
            <h3>Host a Game</h3>
            <p>Start a new session as the Dungeon Master</p>
            <button 
              onClick={handleHostGame}
              disabled={loading || !playerName.trim()}
              className="primary"
            >
              {loading ? 'Creating...' : 'Host Game'}
            </button>
          </div>

          <div className="action-group">
            <h3>Join a Game</h3>
            <p>Connect to an existing session</p>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room Code (e.g., ABC1)"
              disabled={loading}
              maxLength={4}
            />
            <button 
              onClick={handleJoinGame}
              disabled={loading || !playerName.trim() || !roomCode.trim()}
              className="secondary"
            >
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
