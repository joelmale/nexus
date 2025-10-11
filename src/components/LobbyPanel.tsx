/**
 * Lobby Panel Component
 *
 * Unified session management panel for both DMs and Players.
 * Handles online/offline modes, room codes, and player connections.
 */

import React, { useState } from 'react';
import { useSession, useIsHost, useGameStore } from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';
import type { Player } from '@/types/game';

interface PlayerCardProps {
  player: Player;
  isHost: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
  return (
    <div
      className={`player-card ${player.type === 'host' ? 'dm-card' : ''} ${player.connected ? 'online' : 'offline'}`}
    >
      <div className="player-header">
        <div className="player-avatar">
          {player.type === 'host' ? '👑' : '⚔️'}
        </div>
        <div className="player-info">
          <div className="player-name">{player.name}</div>
          <div className="player-role">
            {player.type === 'host' ? 'Dungeon Master' : 'Player'}
            {player.canEditScenes && player.type !== 'host' && ' (Co-DM)'}
          </div>
        </div>
        <div
          className={`connection-indicator ${player.connected ? 'online' : 'offline'}`}
        >
          <span className="indicator-dot"></span>
          <span className="status-text">
            {player.connected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const LobbyPanel: React.FC = () => {
  const session = useSession();
  const isHost = useIsHost();
  const { roomCode, isConnectedToRoom, gameConfig, leaveRoom, createGameRoom } = useGameStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [playerRoomCode, setPlayerRoomCode] = useState('');

  const handleStartOnlineGame = async () => {
    setIsConnecting(true);
    setError('');

    try {
      if (isHost) {
        // DM: Create a new online room (don't clear existing data - preserve offline work)
        console.log('🌐 Creating online game room as DM');

        const config = gameConfig || {
          name: 'New Campaign',
          description: 'Online game session',
          estimatedTime: '2',
          campaignType: 'oneshot' as const,
          maxPlayers: 4
        };

        const newRoomCode = await createGameRoom(config, false); // false = don't clear data

        console.log('✅ Successfully created online game - Room:', newRoomCode);
      } else {
        // Player: Connect to existing room using entered room code
        const codeToJoin = playerRoomCode.trim().toUpperCase();

        if (!codeToJoin) {
          setError('Please enter a room code');
          return;
        }

        console.log('🌐 Connecting to online game as Player:', codeToJoin);

        await webSocketService.connect(codeToJoin, 'player');

        // Update game store with the room code and connected status
        useGameStore.setState({
          roomCode: codeToJoin,
          isConnectedToRoom: true
        });

        console.log('✅ Successfully connected to online game');
      }
    } catch (err) {
      console.error('Failed to start online game:', err);
      setError('Failed to connect to server. Please check your connection.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleShareRoom = () => {
    if (!roomCode) return;

    const url = `${window.location.origin}/game/${roomCode}`;

    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'Join my D&D game!',
        text: `Join my game with room code: ${roomCode}`,
        url,
      }).catch((err) => {
        console.log('Share cancelled or failed:', err);
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url).then(() => {
        alert(`Room URL copied to clipboard!\n${url}`);
      }).catch(() => {
        alert(`Share this URL with your players:\n${url}\n\nRoom Code: ${roomCode}`);
      });
    }
  };

  const handleCopyRoomCode = () => {
    if (!roomCode) return;

    navigator.clipboard.writeText(roomCode).then(() => {
      alert(`Room code copied: ${roomCode}`);
    }).catch(() => {
      alert(`Room Code: ${roomCode}`);
    });
  };

  return (
    <div className="lobby-panel">
      <div className="lobby-header">
        <h2>🎲 Game Lobby</h2>
        <div className={`connection-status ${isConnectedToRoom ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {isConnectedToRoom ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message glass-panel error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Room Information */}
      <div className="lobby-section glass-panel">
        <h3>Room Information</h3>

        <div className="room-info-grid">
          <div className="room-info-item">
            <label>Room Code</label>
            <div className="room-code-display">
              <span className="code">{roomCode || 'N/A'}</span>
              <button
                onClick={handleCopyRoomCode}
                className="glass-button small"
                title="Copy room code"
                disabled={!roomCode}
              >
                📋
              </button>
            </div>
          </div>

          <div className="room-info-item">
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

        {/* Online Game Controls */}
        {!isConnectedToRoom ? (
          <div className="online-controls">
            <p className="help-text">
              {isHost
                ? "Start an online game to allow players to join remotely."
                : "Enter a room code to connect to the online game."}
            </p>

            {/* Player: Room Code Input */}
            {!isHost && (
              <div className="room-code-input-group">
                <input
                  type="text"
                  value={playerRoomCode}
                  onChange={(e) => setPlayerRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  maxLength={6}
                  className="glass-input"
                  disabled={isConnecting}
                />
              </div>
            )}

            <button
              onClick={handleStartOnlineGame}
              disabled={isConnecting || (!isHost && !playerRoomCode.trim())}
              className="glass-button primary"
            >
              {isConnecting ? (
                <>
                  <span className="loading-spinner"></span>
                  Connecting...
                </>
              ) : (
                <>
                  <span>🌐</span>
                  {isHost ? 'Start Online Game' : 'Join Online Game'}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="online-controls">
            <p className="help-text success">
              ✅ Connected to online game server
            </p>
            {isHost && (
              <button
                onClick={handleShareRoom}
                className="glass-button secondary"
              >
                <span>🔗</span>
                Share Room
              </button>
            )}
          </div>
        )}
      </div>

      {/* Players List */}
      {session && (
        <div className="lobby-section">
          <h3>Party Members ({session.players.length})</h3>
          <div className="players-list">
            {session.players.map((player) => (
              <PlayerCard key={player.id} player={player} isHost={isHost} />
            ))}
          </div>
        </div>
      )}

      {/* Leave Room */}
      <div className="lobby-actions">
        <button onClick={leaveRoom} className="glass-button danger">
          <span>🚪</span>
          Leave Room
        </button>
      </div>

      {/* Instructions */}
      <div className="lobby-section glass-panel info">
        <h4>📖 How to Use</h4>
        <ul className="instructions-list">
          {isHost ? (
            <>
              <li>🎨 Prepare your game offline (create scenes, tokens, etc.)</li>
              <li>🌐 Click "Start Online Game" when ready to go live</li>
              <li>📤 Share the room code or URL with your players</li>
              <li>👥 Players will appear in the party list when they join</li>
            </>
          ) : (
            <>
              <li>🎮 You can explore the game offline first</li>
              <li>🔑 Enter the room code from your DM</li>
              <li>🌐 Click "Join Online Game" to sync with the session</li>
              <li>✨ Online mode enables real-time updates</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};
