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
import { applyMockDataToStorage, clearMockDataFromStorage } from '@/utils/mockDataGenerator';

export const LinearWelcomePage: React.FC = () => {
  const { setUser, joinRoomWithCode, dev_quickDM, dev_quickPlayer, dev_skipToGame } = useAppFlowStore();
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'player' | 'dm' | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [mockDataLoading, setMockDataLoading] = useState(false);
  const hasCustomLogo = useAssetExists('/assets/logos/nexus-logo.svg');

  // Handle mock data toggle
  const handleMockDataToggle = async (enabled: boolean) => {
    setMockDataLoading(true);
    try {
      if (enabled) {
        await applyMockDataToStorage({
          userId: 'mock-dm-user',
          userName: 'Mock DM',
        });
      } else {
        await clearMockDataFromStorage();
      }
      setUseMockData(enabled);
    } catch (error) {
      console.error('Failed to toggle mock data:', error);
    } finally {
      setMockDataLoading(false);
    }
  };

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
      {/* Mock Data Toggle - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <span style={{
            fontSize: '12px',
            color: '#ffffff',
            opacity: 0.7,
            fontWeight: 500,
          }}>
            Mock Data
          </span>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '44px',
            height: '24px',
            cursor: mockDataLoading ? 'wait' : 'pointer',
            opacity: mockDataLoading ? 0.5 : 1,
          }}>
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => handleMockDataToggle(e.target.checked)}
              disabled={mockDataLoading}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: useMockData ? '#4ade80' : '#374151',
              transition: 'background-color 0.3s',
              borderRadius: '24px',
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: useMockData ? '23px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                transition: 'left 0.3s',
                borderRadius: '50%',
              }} />
            </span>
          </label>
          {mockDataLoading && (
            <span style={{
              fontSize: '20px',
              animation: 'spin 1s linear infinite',
            }}>⏳</span>
          )}
        </div>
      )}

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
                  onClick={() => {
                    localStorage.removeItem('nexus-active-session');
                    window.location.href = '/lobby?new=true';
                  }}
                  className="dev-btn glass-button secondary small"
                  title="Clear session and start fresh"
                >
                  🔄 Force New Session
                </button>
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