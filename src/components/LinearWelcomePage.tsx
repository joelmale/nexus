/**
 * Linear Welcome Page Component
 *
 * Simple welcome page with:
 * - Name input
 * - Player role with optional room code
 * - DM role for game creation
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { NexusLogo } from './Assets';
import { useAssetExists } from '@/utils/assets';
import DnDTeamBackground from '@/assets/DnDTeamPosing.png';
import { preloadOnUserIntent } from '@/utils/cssLoader';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const LinearWelcomePage: React.FC = () => {
  const {
    setUser,
    joinRoomWithCode,
    dev_quickDM,
    dev_quickPlayer,
    isAuthenticated,
    session,
    attemptSessionRecovery,
    login,
  } = useGameStore();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'player' | 'dm' | null>(
    null,
  );

  // Preload styles based on user intent
  const handleRoleSelection = (role: 'player' | 'dm') => {
    setSelectedRole(role);
    // Preload styles for the selected role
    if (role === 'player') {
      preloadOnUserIntent('character-creation');
    } else if (role === 'dm') {
      preloadOnUserIntent('scene-editing');
    }
  };
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const hasCustomLogo = useAssetExists('/assets/logos/nexus-logo.svg');

  // Campaign selection state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [characters, setCharacters] = useState<
    { id: string; name: string; data: { race?: string; class?: string; level?: number; portrait?: string; [key: string]: unknown; } }[]
  >([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const emailInputRef = React.useRef<HTMLInputElement | null>(null);

  // Auto-navigate to game if session exists, or attempt recovery if needed
  React.useEffect(() => {
    const recoverAndNavigate = async () => {
      if (session?.roomCode) {
        console.log(
          '🔄 Found existing session, navigating to game:',
          session.roomCode,
        );
        navigate(`/lobby/game/${session.roomCode}`);
        return;
      }

      // Check if we have stored session data that needs recovery
      const stored = localStorage.getItem('nexus-active-session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.roomCode) {
            console.log(
              '🔄 Attempting session recovery for room:',
              parsed.roomCode,
            );
            const recovered = await attemptSessionRecovery();
            if (recovered) {
              console.log(
                '✅ Session recovered, navigation will happen on next render',
              );
            }
          }
        } catch (error) {
          console.error('Failed to recover session from localStorage:', error);
        }
      }
    };

    recoverAndNavigate();
  }, [session, navigate, attemptSessionRecovery]);

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
        const response = await fetch('/api/campaigns', {
          credentials: 'include',
        });
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
        const response = await fetch('/api/characters', {
          credentials: 'include',
        });
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
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to create guest user');
        }

        const guestUser = await response.json();
        console.log('Guest user created:', guestUser);
        setUser({ ...guestUser, type: 'player' });
      } else {
        setUser({ name: playerName.trim(), type: 'player' });
      }
      navigate('/lobby/player-setup');
    } catch (err) {
      console.error('Failed to create guest user:', err);
      setError('Failed to set up player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalAuth = async (mode: 'signin' | 'signup') => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const endpoint = mode === 'signup' ? '/auth/register' : '/auth/login';
      const body =
        mode === 'signup'
          ? { email: authEmail.trim(), password: authPassword, displayName: authDisplayName.trim() || undefined }
          : { email: authEmail.trim(), password: authPassword };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login({
        ...data,
        type: 'player',
        connected: true,
        color: 'blue',
      });
      setAuthSuccess(
        mode === 'signup'
          ? 'Account created. You are signed in.'
          : 'Signed in successfully.',
      );
    } catch (err) {
      console.error('Local auth failed:', err);
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Focus email on modal open and close on Escape
  React.useEffect(() => {
    if (showAccountModal && emailInputRef.current) {
      emailInputRef.current.focus();
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAccountModal(false);
      }
    };

    if (showAccountModal) {
      window.addEventListener('keydown', handleKey);
    }
    return () => window.removeEventListener('keydown', handleKey);
  }, [showAccountModal]);

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
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to create guest user');
        }

        const guestUser = await response.json();
        console.log('Guest user created:', guestUser);
        setUser({ ...guestUser, type: 'player' });
      } else {
        setUser({ name: playerName.trim(), type: 'player' });
      }
      const joinedRoomCode = await joinRoomWithCode(
        roomCode.trim().toUpperCase(),
      );
      navigate(`/lobby/game/${joinedRoomCode}`);
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
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to create guest user');
        }

        const guestUser = await response.json();
        console.log('Guest user created:', guestUser);
        setUser({ ...guestUser, type: 'host' });
      } else {
        // Set user in store for authenticated users
        setUser({ name: playerName.trim(), type: 'host' });
      }

      navigate('/lobby/dm-setup');
    } catch (err) {
      console.error('Failed to create game:', err);
      setError('Failed to set up game. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <button
              className="account-bubble glass-panel"
              title="Login with OAuth"
              onClick={() => setShowAccountModal(true)}
            >
              <span className="account-icon">👤</span>
            </button>
          </div>

          {showAccountModal && (
            <div
              className="account-overlay"
              role="presentation"
              onClick={() => setShowAccountModal(false)}
            >
              <div
                className="account-dropdown glass-panel open"
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="account-dropdown-header">
                  <div className="title-row">
                    <span className="dropdown-title" id="account-modal-title">
                      {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                    </span>
                    <div className="title-note">
                      {authMode === 'signin'
                        ? 'Use your Nexus account'
                        : 'Create a Nexus account'}
                    </div>
                  </div>
                  <button
                    className="account-close"
                    onClick={() => setShowAccountModal(false)}
                    aria-label="Close account modal"
                  >
                    ×
                  </button>
                </div>

                <div className="account-form">
                  <label className="account-label" htmlFor="account-email">
                    Email
                  </label>
                  <input
                    id="account-email"
                    ref={emailInputRef}
                    type="email"
                    className="glass-input"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    disabled={authLoading}
                  />

                  {authMode === 'signup' && (
                    <>
                      <label className="account-label" htmlFor="account-display-name">
                        Display name (optional)
                      </label>
                      <input
                        id="account-display-name"
                        type="text"
                        className="glass-input"
                        placeholder="Your name in Nexus"
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        disabled={authLoading}
                      />
                    </>
                  )}

                  <label className="account-label" htmlFor="account-password">
                    Password
                  </label>
                  <input
                    id="account-password"
                    type="password"
                    className="glass-input"
                    placeholder="Enter your password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    disabled={authLoading}
                  />
                  {authMode === 'signup' && (
                    <div className="helper-text">
                      Use 8+ characters. We hash everything client-to-server.
                    </div>
                  )}

                  <button
                    className="action-btn glass-button primary"
                    disabled={!authEmail || !authPassword || authLoading}
                    onClick={() => handleLocalAuth(authMode)}
                  >
                    {authLoading
                      ? 'Please wait...'
                      : authMode === 'signin'
                        ? 'Sign In'
                        : 'Create Account'}
                  </button>
                  {authError && (
                    <div className="feedback error-message compact">
                      <span className="feedback-icon">⚠️</span>
                      {authError}
                    </div>
                  )}
                  {authSuccess && (
                    <div className="feedback success-message compact">
                      <span className="feedback-icon">✅</span>
                      {authSuccess}
                    </div>
                  )}
                  <button
                    className="account-text-toggle"
                    onClick={() =>
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                    }
                  >
                    {authMode === 'signin'
                      ? "Don't have an account? Create one"
                      : 'Have an account? Sign in'}
                  </button>
                </div>

                <div className="account-divider">or continue with</div>

                <div className="oauth-block">
                  <a href="/auth/google" className="account-option wide">
                    <span className="option-icon google-icon">G</span>
                    <span className="option-text">Google</span>
                  </a>
                  <a href="/auth/discord" className="account-option wide">
                    <span className="option-icon discord-icon">D</span>
                    <span className="option-text">Discord</span>
                  </a>
                </div>
                <div className="account-dropdown-footer">
                  <span className="dropdown-hint">
                    Accounts sync characters & campaigns. Guests can migrate later.
                  </span>
                </div>
              </div>
            </div>
          )}

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
                    onClick={() => handleRoleSelection('player')}
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
                          <label
                            htmlFor="character-select"
                            className="campaign-label"
                          >
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
                              onChange={(e) =>
                                setSelectedCharacter(e.target.value)
                              }
                              className="glass-input campaign-dropdown"
                              disabled={loading}
                            >
                              <option value="">
                                -- Select a character or create new --
                              </option>
                              {characters.map((character) => (
                                <option key={character.id} value={character.id}>
                                  {character.name}
                                  {character.data?.class
                                    ? ` (${character.data.class})`
                                    : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="no-campaigns-hint">
                              No saved characters yet. You can create one from
                              the{' '}
                              <a href="/dashboard" className="dashboard-link">
                                dashboard
                              </a>{' '}
                              or continue as a new character.
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
                    onClick={() => handleRoleSelection('dm')}
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
                          <label
                            htmlFor="campaign-select"
                            className="campaign-label"
                          >
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
                              onChange={(e) =>
                                setSelectedCampaign(e.target.value)
                              }
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
                  onClick={() => dev_quickDM()}
                  className="dev-btn glass-button secondary small"
                  title="Start as DM in offline mode - prepare game, then go online"
                >
                  🎮 Quick DM
                </button>
                <button
                  onClick={() => dev_quickPlayer()}
                  className="dev-btn glass-button secondary small"
                  title="Create test character and go to offline game"
                >
                  👤 Quick Player
                </button>
                <button
                  onClick={() => {
                    navigate('/admin');
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
