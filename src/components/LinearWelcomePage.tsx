/**
 * Linear Welcome Page Component
 *
 * Simple welcome page with:
 * - Name input
 * - Player role with optional room code
 * - DM role for game creation
 */

import React, { useState } from 'react';
import { useAppFlowStore } from '@/stores/appFlowStore';
import { NexusLogo } from './Assets';
import { useAssetExists } from '@/utils/assets';
import DnDTeamBackground from '@/assets/DnDTeamPosing.png';

export const LinearWelcomePage: React.FC = () => {
  const { setUser, joinRoomWithCode, dev_quickDM, dev_quickPlayer, dev_skipToGame } = useAppFlowStore();
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'player' | 'dm' | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const hasCustomLogo = useAssetExists('/assets/logos/nexus-logo.svg');

  const handlePlayerSetup = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setUser(playerName.trim(), 'player');
  };

  const handleQuickJoin = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      setError('Please enter a valid 4-character room code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setUser(playerName.trim(), 'player');
      await joinRoomWithCode(roomCode.trim().toUpperCase());
    } catch (err) {
      setError('Failed to join room - room may not exist or be full');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDMSetup = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setUser(playerName.trim(), 'dm');
  };

  return (
    <div className="welcome-page">
      <div className="welcome-background">
        <img src={DnDTeamBackground} alt="D&D Adventure Party" />
        <div className="background-overlay"></div>
        <div className="background-particles">
          {Array.from({ length: 15 }).map((_, i) => (
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

      <div className="welcome-content">
        <div className="welcome-panel glass-panel">
          {/* Brand Section */}
          <div className="brand-section">
            {hasCustomLogo ? (
              <NexusLogo size="xl" className="welcome-logo" />
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

          {/* Name Input */}
          <div className="form-section">
            <div className="input-group">
              <label htmlFor="adventurerName">Enter Your Name</label>
              <div className="glass-input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="adventurerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your adventurer name"
                  className="glass-input"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="role-selection">
              <label>Choose Your Adventure</label>
              <div className="role-cards">
                {/* Player Options */}
                <div className="role-card-group">
                  <div
                    className={`role-card glass-panel ${selectedRole === 'player' ? 'selected' : ''}`}
                    onClick={() => setSelectedRole('player')}
                  >
                    <div className="role-icon">⚔️</div>
                    <div className="role-info">
                      <h3>Player</h3>
                      <p>Join adventures as a hero</p>
                    </div>
                    <div className="selection-indicator">
                      {selectedRole === 'player' && <span>✓</span>}
                    </div>
                  </div>

                  {/* Player Action Buttons */}
                  {selectedRole === 'player' && (
                    <div className="player-actions">
                      <button
                        onClick={handlePlayerSetup}
                        disabled={!playerName.trim() || loading}
                        className="action-btn glass-button secondary"
                      >
                        <span>🎭</span>
                        Character Setup
                      </button>

                      <div className="quick-join-section">
                        <div className="divider-small">
                          <span>or</span>
                        </div>
                        <div className="quick-join-form">
                          <div className="glass-input-wrapper room-input">
                            <span className="input-icon">🗝️</span>
                            <input
                              type="text"
                              value={roomCode}
                              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                              placeholder="Room Code"
                              maxLength={4}
                              className="glass-input room-code-input"
                              disabled={loading}
                            />
                          </div>
                          <button
                            onClick={handleQuickJoin}
                            disabled={!playerName.trim() || !roomCode.trim() || loading}
                            className="action-btn glass-button primary"
                          >
                            {loading ? (
                              <>
                                <span className="loading-spinner"></span>
                                Joining...
                              </>
                            ) : (
                              <>
                                <span>🚀</span>
                                Quick Join
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* DM Options */}
                <div className="role-card-group">
                  <div
                    className={`role-card glass-panel ${selectedRole === 'dm' ? 'selected' : ''}`}
                    onClick={() => setSelectedRole('dm')}
                  >
                    <div className="role-icon">👑</div>
                    <div className="role-info">
                      <h3>Dungeon Master</h3>
                      <p>Guide the story and control the world</p>
                    </div>
                    <div className="selection-indicator">
                      {selectedRole === 'dm' && <span>✓</span>}
                    </div>
                  </div>

                  {/* DM Action Button */}
                  {selectedRole === 'dm' && (
                    <div className="dm-actions">
                      <button
                        onClick={handleDMSetup}
                        disabled={!playerName.trim() || loading}
                        className="action-btn glass-button primary"
                      >
                        <span>🎲</span>
                        Create Game
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Development Tools - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="dev-tools">
              <hr className="dev-divider" />
              <h4 className="dev-title">⚡ Development Tools</h4>
              <div className="dev-buttons">
                <button
                  onClick={() => dev_quickDM()}
                  className="dev-btn glass-button secondary small"
                  title="Skip to DM game interface with test room"
                >
                  🎮 Quick DM
                </button>
                <button
                  onClick={() => dev_quickPlayer()}
                  className="dev-btn glass-button secondary small"
                  title="Skip to Player setup with test character"
                >
                  👤 Quick Player
                </button>
                <button
                  onClick={() => dev_skipToGame('dm')}
                  className="dev-btn glass-button secondary small"
                  title="Skip directly to game as DM"
                >
                  🚀 Skip to Game (DM)
                </button>
                <button
                  onClick={() => dev_skipToGame('player')}
                  className="dev-btn glass-button secondary small"
                  title="Skip directly to game as Player"
                >
                  🚀 Skip to Game (Player)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};