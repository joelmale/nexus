/**
 * Linear Welcome Page Component
 *
 * Simple welcome page with:
 * - Name input
 * - Player role with optional room code
 * - DM role for game creation
 */

import React, { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { NexusLogo } from './Assets';
import { useAssetExists } from '@/utils/assets';
import DnDTeamBackground from '@/assets/DnDTeamPosing.png';
import {
  applyMockDataToStorage,
  clearMockDataFromStorage,
} from '@/utils/mockDataGenerator';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const LinearWelcomePage: React.FC = () => {
  const { setUser, joinRoomWithCode, createGameRoom, dev_quickDM, dev_quickPlayer, isAuthenticated } =
    useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'player' | 'dm' | null>(
    null,
  );
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [mockDataLoading, setMockDataLoading] = useState(false);
  const hasCustomLogo = useAssetExists('/assets/logos/nexus-logo.svg');

  // Campaign selection state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [characters, setCharacters] = useState<{ id: string; name: string; data: any }[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [charactersLoading, setCharactersLoading] = useState(false);

  /**
   * Fetch user's campaigns when DM role is selected and user is authenticated
   */
  React.useEffect(() => {
    const fetchCampaigns = async () => {
      if (selectedRole !== 'dm' || !isAuthenticated) {
        return;
      }

      setCampaignsLoading(true);
      try {
        const response = await fetch('/api/campaigns');
        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }
        const data = await response.json();
        setCampaigns(data);
      } catch (err) {
        console.error('Failed to fetch campaigns:', err);
        setError('Failed to load campaigns');
      } finally {
        setCampaignsLoading(false);
      }
    };

    fetchCampaigns();
  }, [selectedRole, isAuthenticated]);

  /**
   * Fetch user's characters when Player role is selected and user is authenticated
   */
  React.useEffect(() => {
    const fetchCharacters = async () => {
      if (selectedRole !== 'player' || !isAuthenticated) {
        return;
      }

      setCharactersLoading(true);
      try {
        const response = await fetch('/api/characters');
        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }
        const data = await response.json();
        setCharacters(data);
      } catch (err) {
        console.error('Failed to fetch characters:', err);
        setError('Failed to load characters');
      } finally {
        setCharactersLoading(false);
      }
    };

    fetchCharacters();
  }, [selectedRole, isAuthenticated]);

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

  /**
   * Handles player setup - creates guest user if not authenticated
   */
  const handlePlayerSetup = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create guest user if not authenticated
      const { isAuthenticated } = useGameStore.getState();
      if (!isAuthenticated) {
        const response = await fetch('/api/guest-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: playerName.trim() }),
        });

        if (!response.ok) {
          throw new Error('Failed to create guest user');
        }

        const guestUser = await response.json();
        console.log('Guest user created:', guestUser);
      }

      setUser({ name: playerName.trim(), type: 'player' });

      // Navigate to player setup
      useGameStore.getState().setView('player_setup');
    } catch (err) {
      console.error('Failed to create guest user:', err);
      setError('Failed to set up player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles quick join - creates guest user and joins room directly
   */
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
      // Create guest user if not authenticated
      const { isAuthenticated } = useGameStore.getState();
      if (!isAuthenticated) {
        const response = await fetch('/api/guest-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: playerName.trim() }),
        });

        if (!response.ok) {
          throw new Error('Failed to create guest user');
        }

        const guestUser = await response.json();
        console.log('Guest user created:', guestUser);
      }

      setUser({ name: playerName.trim(), type: 'player' });
      await joinRoomWithCode(roomCode.trim().toUpperCase());
    } catch (err) {
      setError('Failed to join room - room may not exist or be full');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles DM setup - creates guest user if not authenticated, then creates game
   * For authenticated users, requires campaign selection
   * For guest users, auto-creates a campaign
   */
  const handleDMSetup = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    const { isAuthenticated } = useGameStore.getState();

    // Check if authenticated user has selected a campaign
    if (isAuthenticated && !selectedCampaign) {
      setError('Please select a campaign or create a new one');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create guest user if not authenticated
      if (!isAuthenticated) {
        const response = await fetch('/api/guest-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: playerName.trim() }),
        });

        if (!response.ok) {
          throw new Error('Failed to create guest user');
        }

        const guestUser = await response.json();
        console.log('Guest user created:', guestUser);
      }

      // Set user in store
      setUser({ name: playerName.trim(), type: 'host' });

      // Create game room with campaign ID (passed to WebSocket connection)
      const gameConfig = {
        name: 'Quick Session',
        description: 'DM-hosted game session',
        estimatedTime: '2-4 hours',
        campaignType: 'campaign' as const,
        maxPlayers: 6,
        campaignId: isAuthenticated ? selectedCampaign : undefined,
      };

      await createGameRoom(gameConfig);
    } catch (err) {
      console.error('Failed to create game:', err);
      setError('Failed to set up game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-page">
      {/* Mock Data Toggle - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-mock-data-toggle">
          <span className="dev-mock-data-toggle__label">Mock Data</span>
          <label
            className={`dev-mock-data-toggle__switch ${mockDataLoading ? 'dev-mock-data-toggle__switch--loading' : ''}`}
          >
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => handleMockDataToggle(e.target.checked)}
              disabled={mockDataLoading}
              className="dev-mock-data-toggle__input"
            />
            <span className="dev-mock-data-toggle__slider">
              <span className="dev-mock-data-toggle__knob" />
            </span>
          </label>
          {mockDataLoading && (
            <span className="dev-mock-data-toggle__spinner">⏳</span>
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
                animationDuration: `${4 + Math.random() * 4}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="welcome-content">
        <div className="welcome-panel glass-panel">
          {/* Account Menu - Upper Right */}
          <div className="account-menu">
            <button className="account-bubble glass-panel" title="Login with OAuth">
              <span className="account-icon">👤</span>
            </button>
            <div className="account-dropdown glass-panel">
              <div className="account-dropdown-header">
                <span className="dropdown-title">Sign In</span>
              </div>
              <a href="/auth/google" className="account-option">
                <span className="option-icon google-icon">G</span>
                <span className="option-text">Google</span>
              </a>
              <a href="/auth/discord" className="account-option">
                <span className="option-icon discord-icon">D</span>
                <span className="option-text">Discord</span>
              </a>
              <div className="account-dropdown-footer">
                <span className="dropdown-hint">Save campaigns & progress</span>
              </div>
            </div>
          </div>

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
            <p className="brand-tagline">Your gateway to epic adventures</p>
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
                      {/* Character Selection for Authenticated Users */}
                      {isAuthenticated && (
                        <div className="campaign-selection">
                          <label htmlFor="character-select" className="campaign-label">
                            Select Character (Optional)
                          </label>
                          {charactersLoading ? (
                            <div className="loading-state">
                              <span className="loading-spinner"></span>
                              Loading characters...
                            </div>
                          ) : characters.length > 0 ? (
                            <select
                              id="character-select"
                              value={selectedCharacter}
                              onChange={(e) => setSelectedCharacter(e.target.value)}
                              className="glass-input campaign-dropdown"
                              disabled={loading}
                            >
                              <option value="">-- Select a character or create new --</option>
                              {characters.map((character) => (
                                <option key={character.id} value={character.id}>
                                  {character.name}
                                  {character.data?.class ? ` (${character.data.class})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="no-campaigns-hint">
                              No saved characters yet. You can create one from the{' '}
                              <a href="/dashboard" className="dashboard-link">
                                dashboard
                              </a>
                              {' '}or continue as a new character.
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={handlePlayerSetup}
                        disabled={!playerName.trim() || loading}
                        className="action-btn glass-button primary"
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
                              onChange={(e) =>
                                setRoomCode(e.target.value.toUpperCase())
                              }
                              placeholder="Room Code"
                              maxLength={4}
                              className="glass-input room-code-input"
                              disabled={loading}
                            />
                          </div>
                          <button
                            onClick={handleQuickJoin}
                            disabled={
                              !playerName.trim() || !roomCode.trim() || loading
                            }
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
                      {/* Campaign Selection for Authenticated Users */}
                      {isAuthenticated && (
                        <div className="campaign-selection">
                          <label htmlFor="campaign-select" className="campaign-label">
                            Select Campaign
                          </label>
                          {campaignsLoading ? (
                            <div className="loading-state">
                              <span className="loading-spinner"></span>
                              Loading campaigns...
                            </div>
                          ) : campaigns.length > 0 ? (
                            <select
                              id="campaign-select"
                              value={selectedCampaign}
                              onChange={(e) => setSelectedCampaign(e.target.value)}
                              className="glass-input campaign-dropdown"
                              disabled={loading}
                            >
                              <option value="">-- Select a campaign --</option>
                              {campaigns.map((campaign) => (
                                <option key={campaign.id} value={campaign.id}>
                                  {campaign.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="no-campaigns-hint">
                              No campaigns yet. Create one from the{' '}
                              <a href="/dashboard" className="dashboard-link">
                                dashboard
                              </a>
                              .
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={handleDMSetup}
                        disabled={
                          !playerName.trim() ||
                          loading ||
                          (isAuthenticated && !selectedCampaign)
                        }
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
                  onClick={async () => {
                    if (
                      confirm(
                        '⚠️ This will clear all game data, disconnect, and start fresh. Continue?',
                      )
                    ) {
                      // Proper cleanup using gameStore
                      const { useGameStore } = await import(
                        '@/stores/gameStore'
                      );

                      // Reset stores
                      useGameStore.getState().reset();
                      await useGameStore.getState().leaveRoom();

                      // Clear localStorage items
                      localStorage.removeItem('nexus-active-session');
                      localStorage.removeItem('nexus_ws_port');
                      localStorage.removeItem('nexus_dice_theme');

                      // Reload to ensure clean state
                      window.location.href = '/lobby';
                    }
                  }}
                  className="dev-btn glass-button secondary small"
                  title="Clear all session data and start completely fresh"
                >
                  🔄 Force New Session
                </button>
                <button
                  onClick={() => dev_quickDM()}
                  className="dev-btn glass-button secondary small"
                  title="Start as DM in offline mode - prepare game, then go online"
                >
                  🎮 Quick DM (offline)
                </button>
                <button
                  onClick={() => dev_quickPlayer()}
                  className="dev-btn glass-button secondary small"
                  title="Create test character and go to offline game"
                >
                  👤 Quick Player (offline)
                </button>
                <button
                  onClick={() => {
                    useGameStore.getState().setView('admin');
                  }}
                  className="dev-btn glass-button secondary small"
                  title="Access admin panel for character generation data"
                >
                  ⚙️ Admin Panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
