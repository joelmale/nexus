import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { CharacterManager } from './CharacterManager';
import { useCharacterCreationLauncher } from '@/hooks';
import { DocumentLibrary } from './DocumentLibrary';
import '@/styles/dashboard.css';

/**
 * Campaign data structure from API
 * @interface Campaign
 */
interface Campaign {
  /** Unique campaign identifier (UUID) */
  id: string;
  /** Campaign name/title */
  name: string;
  /** Campaign description */
  description: string | null;
  /** User ID of the Dungeon Master */
  dmId: string;
  /** Campaign scenes data (JSONB) */
  scenes: unknown;
  /** Timestamp when campaign was created */
  createdAt: string;
  /** Timestamp when campaign was last updated */
  updatedAt: string;
  /** Whether this campaign is favorited */
  isFavorite?: boolean;
}

/**
 * Character record from the database
 * @interface CharacterRecord
 */
interface CharacterRecord {
  id: string;
  name: string;
  ownerId: string;
  data: {
    race?: string;
    class?: string;
    level?: number;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
  /** Whether this character is favorited */
  isFavorite?: boolean;
}

/**
 * Dashboard component for authenticated users
 * Displays user's campaigns and characters
 * @component
 * @returns {JSX.Element} Dashboard page
 */
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, createGameRoom, joinRoomWithCode } =
    useGameStore();
  const { startCharacterCreation, LauncherComponent } =
    useCharacterCreationLauncher();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDescription, setNewCampaignDescription] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [startingSession, setStartingSession] = useState<string | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<
    CharacterRecord | undefined
  >(undefined);
  const [showJoinGameModal, setShowJoinGameModal] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joiningGame, setJoiningGame] = useState(false);

  // Check authentication and redirect if not authenticated
  useEffect(() => {
    // Give authentication check time to complete
    const timer = setTimeout(() => {
      setAuthChecking(false);
      if (!isAuthenticated) {
        console.warn('Dashboard: User not authenticated, redirecting to lobby');
        navigate('/lobby');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  /**
   * Fetches campaigns from API on component mount
   */
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/campaigns', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }

        const data = await response.json();
        setCampaigns(data);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setError('Failed to load campaigns. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [isAuthenticated]);

  /**
   * Fetches characters from API on component mount
   */
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setCharactersLoading(true);
        setError(null);

        const response = await fetch('/api/characters', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }

        const data = await response.json();
        setCharacters(data);
      } catch (err) {
        console.error('Error fetching characters:', err);
        setError('Failed to load characters. Please try again.');
      } finally {
        setCharactersLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCharacters();
    }
  }, [isAuthenticated]);

  /**
   * Handles creating a new campaign
   */
  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) {
      return;
    }

    try {
      setCreatingCampaign(true);
      setError(null);

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCampaignName.trim(),
          description: newCampaignDescription.trim() || undefined,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const newCampaign = await response.json();

      // Add new campaign to list
      setCampaigns([newCampaign, ...campaigns]);

      // Reset form and close modal
      setNewCampaignName('');
      setNewCampaignDescription('');
      setShowNewCampaignModal(false);
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create campaign',
      );
    } finally {
      setCreatingCampaign(false);
    }
  };

  /**
   * Handles opening the character creation modal
   */
  const handleCreateCharacter = () => {
    if (user.id) {
      startCharacterCreation(
        user.id,
        'modal',
        (characterId: string, character?: unknown) => {
          // Character saved to database via API, now add to local state
          if (character) {
            handleSaveCharacter(character as CharacterRecord);
          }
        },
        () => {
          console.log('Character creation cancelled');
        },
      );
    }
  };

  /**
   * Handles opening the character edit modal
   */
  const handleEditCharacter = (character: CharacterRecord) => {
    setEditingCharacter(character);
  };

  /**
   * Handles saving a character (create or update)
   */
  const handleSaveCharacter = (character: CharacterRecord) => {
    if (editingCharacter) {
      // Update existing character
      setCharacters(
        characters.map((c) => (c.id === character.id ? character : c)),
      );
    } else {
      // Add new character
      setCharacters([character, ...characters]);
    }
  };

  /**
   * Handles deleting a character
   */
  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm('Are you sure you want to delete this character?')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/characters/${characterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete character');
      }

      setCharacters(characters.filter((c) => c.id !== characterId));
    } catch (err) {
      console.error('Error deleting character:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete character',
      );
    }
  };

  /**
   * Handles starting a game session from a campaign
   * @param {string} campaignId - Campaign ID to start session with
   */
  const handleStartSession = async (campaignId: string) => {
    try {
      setStartingSession(campaignId);
      setError(null);

      console.log(`🎮 Starting session for campaign: ${campaignId}`);

      // Create game room with campaign ID
      const gameConfig = {
        name: 'Quick Session',
        description: 'Session started from dashboard',
        estimatedTime: '2-4 hours',
        campaignType: 'campaign' as const,
        maxPlayers: 6,
        campaignId,
      };

      const roomCode = await createGameRoom(gameConfig);

      // Navigate to game view
      console.log(
        '✅ Session started successfully, navigating to game room:',
        roomCode,
      );
      navigate(`/lobby/game/${roomCode}`);
    } catch (err) {
      console.error('Error starting session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setStartingSession(null);
    }
  };

  /**
   * Handles joining an existing game with a room code
   */
  const handleJoinGame = async () => {
    if (!joinRoomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    try {
      setJoiningGame(true);
      setError(null);

      console.log(`🎮 Joining game with room code: ${joinRoomCode}`);

      // Join the room - this will connect via WebSocket
      await joinRoomWithCode(joinRoomCode.trim().toUpperCase());

      // Navigate to game view
      console.log('✅ Joined game successfully, navigating to game room');
      navigate(`/lobby/game/${joinRoomCode.trim().toUpperCase()}`);

      // Close modal and reset
      setShowJoinGameModal(false);
      setJoinRoomCode('');
    } catch (err) {
      console.error('Error joining game:', err);
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setJoiningGame(false);
    }
  };

  // Show loading while checking authentication
  if (authChecking) {
    return (
      <div className="dashboard-page">
        <div className="auth-check-loading">
          <div className="loading-state">
            <span className="loading-spinner"></span>
            <p>Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  const favorites = {
    campaigns: campaigns.filter((c) => c.isFavorite),
    characters: characters.filter((c) => c.isFavorite),
  };

  const recentCampaigns = [...campaigns]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 4);

  const recentCharacters = [...characters]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 4);

  return (
    <>
      <div className="dashboard-page">
        <div className="dashboard-hero glass-panel">
          <div className="hero-left">
            <div className="avatar-circle">{user.name?.[0] || '🧭'}</div>
            <div>
              <p className="eyebrow">Dashboard</p>
              <h1 className="hero-title">
                Welcome, {user.name || user.displayName || 'Adventurer'}!
              </h1>
              <p className="hero-subtitle">
                Jump back into your worlds, manage characters, and start a new
                session.
              </p>
              <div className="hero-actions">
                <button
                  onClick={() => setShowNewCampaignModal(true)}
                  className="action-btn glass-button primary"
                  disabled={loading}
                >
                  <span>✨</span>
                  Create Campaign
                </button>
                <button
                  onClick={handleCreateCharacter}
                  className="action-btn glass-button secondary"
                  disabled={charactersLoading}
                >
                  <span>🎭</span>
                  Create Character
                </button>
                <button
                  onClick={() => setShowJoinGameModal(true)}
                  className="action-btn glass-button tertiary"
                >
                  <span>🎲</span>
                  Join Game
                </button>
              </div>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-card glass-panel">
              <p className="stat-label">Campaigns</p>
              <p className="stat-value">{campaigns.length}</p>
            </div>
            <div className="stat-card glass-panel">
              <p className="stat-label">Characters</p>
              <p className="stat-value">{characters.length}</p>
            </div>
            <div className="stat-card glass-panel">
              <p className="stat-label">Favorites</p>
              <p className="stat-value">
                {favorites.campaigns.length + favorites.characters.length}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message glass-panel error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="dashboard-grid-layout">
          <div className="dashboard-main">
            {/* Favorites */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Favorites</h2>
              </div>
              {favorites.campaigns.length + favorites.characters.length ===
              0 ? (
                <div className="empty-state glass-panel compact">
                  <div className="empty-state-icon">⭐</div>
                  <h3>No favorites yet</h3>
                  <p>Pin campaigns or characters to see them here.</p>
                </div>
              ) : (
                <div className="card-row">
                  {favorites.campaigns.slice(0, 2).map((campaign) => (
                    <div key={campaign.id} className="card glass-panel">
                      <div className="card-top">
                        <p className="eyebrow">Campaign</p>
                        <span className="pill">⭐</span>
                      </div>
                      <h3>{campaign.name}</h3>
                      <p className="card-meta">
                        Updated{' '}
                        {new Date(campaign.updatedAt).toLocaleDateString()}
                      </p>
                      {campaign.description && (
                        <p className="card-desc">{campaign.description}</p>
                      )}
                      <div className="card-actions">
                        <button
                          className="action-btn glass-button primary small"
                          onClick={() => handleStartSession(campaign.id)}
                          disabled={startingSession !== null}
                        >
                          {startingSession === campaign.id
                            ? 'Starting...'
                            : 'Start Session'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {favorites.characters.slice(0, 2).map((character) => (
                    <div key={character.id} className="card glass-panel">
                      <div className="card-top">
                        <p className="eyebrow">Character</p>
                        <span className="pill">⭐</span>
                      </div>
                      <h3>{character.name}</h3>
                      <p className="card-meta">
                        Updated{' '}
                        {new Date(character.updatedAt).toLocaleDateString()}
                      </p>
                      <div className="card-tags">
                        {character.data.race && (
                          <span>{character.data.race}</span>
                        )}
                        {character.data.class && (
                          <span>{character.data.class}</span>
                        )}
                        {character.data.level && (
                          <span>Level {character.data.level}</span>
                        )}
                      </div>
                      <div className="card-actions">
                        <button
                          className="action-btn glass-button secondary small"
                          onClick={() => handleEditCharacter(character)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Campaigns */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Recent Campaigns</h2>
                <button
                  onClick={() => setShowNewCampaignModal(true)}
                  className="action-btn glass-button primary"
                  disabled={loading}
                >
                  <span>➕</span>
                  New Campaign
                </button>
              </div>

              {loading ? (
                <div className="skeleton-grid">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton-card" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="empty-state glass-panel">
                  <div className="empty-state-icon">🎲</div>
                  <h3>No campaigns yet</h3>
                  <p>Create your first campaign to start your adventure!</p>
                  <button
                    onClick={() => setShowNewCampaignModal(true)}
                    className="action-btn glass-button primary"
                  >
                    <span>➕</span>
                    Create Campaign
                  </button>
                </div>
              ) : (
                <div className="card-row">
                  {recentCampaigns.map((campaign) => (
                    <div key={campaign.id} className="card glass-panel">
                      <div className="card-top">
                        <p className="eyebrow">Campaign</p>
                        <span className="pill">
                          {new Date(campaign.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3>{campaign.name}</h3>
                      {campaign.description && (
                        <p className="card-desc">{campaign.description}</p>
                      )}
                      <div className="card-actions">
                        <button
                          className="action-btn glass-button primary small"
                          onClick={() => handleStartSession(campaign.id)}
                          disabled={startingSession !== null}
                        >
                          {startingSession === campaign.id
                            ? 'Starting...'
                            : 'Start Session'}
                        </button>
                        <button className="action-btn glass-button secondary small">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Characters */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Recent Characters</h2>
                <button
                  onClick={handleCreateCharacter}
                  className="action-btn glass-button primary"
                  disabled={charactersLoading}
                >
                  <span>➕</span>
                  New Character
                </button>
              </div>

              {charactersLoading ? (
                <div className="skeleton-grid">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton-card" />
                  ))}
                </div>
              ) : characters.length === 0 ? (
                <div className="empty-state glass-panel">
                  <div className="empty-state-icon">⚔️</div>
                  <h3>No characters yet</h3>
                  <p>Create your first character to start adventuring!</p>
                  <button
                    onClick={handleCreateCharacter}
                    className="action-btn glass-button primary"
                  >
                    <span>➕</span>
                    Create Character
                  </button>
                </div>
              ) : (
                <div className="card-row">
                  {recentCharacters.map((character) => (
                    <div key={character.id} className="card glass-panel">
                      <div className="card-top">
                        <p className="eyebrow">Character</p>
                        <span className="pill">
                          {new Date(character.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3>{character.name}</h3>
                      <div className="card-tags">
                        {character.data.race && (
                          <span>{character.data.race}</span>
                        )}
                        {character.data.class && (
                          <span>{character.data.class}</span>
                        )}
                        {character.data.level && (
                          <span>Level {character.data.level}</span>
                        )}
                      </div>
                      <div className="card-actions">
                        <button
                          className="action-btn glass-button secondary small"
                          onClick={() => handleEditCharacter(character)}
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn glass-button secondary small"
                          onClick={() => handleDeleteCharacter(character.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Library Section */}
            <DocumentLibrary />
          </div>
        </div>

        {/* New Campaign Modal */}
        {showNewCampaignModal && (
          <div
            className="modal-overlay"
            onClick={() => !creatingCampaign && setShowNewCampaignModal(false)}
          >
            <div
              className="modal-content glass-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Create New Campaign</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowNewCampaignModal(false)}
                  disabled={creatingCampaign}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="campaignName">Campaign Name *</label>
                  <div className="glass-input-wrapper">
                    <input
                      id="campaignName"
                      type="text"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      placeholder="Enter campaign name"
                      className="glass-input"
                      disabled={creatingCampaign}
                      maxLength={255}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="campaignDescription">
                    Description (optional)
                  </label>
                  <div className="glass-input-wrapper">
                    <textarea
                      id="campaignDescription"
                      value={newCampaignDescription}
                      onChange={(e) =>
                        setNewCampaignDescription(e.target.value)
                      }
                      placeholder="Describe your campaign..."
                      className="glass-input"
                      disabled={creatingCampaign}
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="action-btn glass-button secondary"
                  onClick={() => setShowNewCampaignModal(false)}
                  disabled={creatingCampaign}
                >
                  Cancel
                </button>
                <button
                  className="action-btn glass-button primary"
                  onClick={handleCreateCampaign}
                  disabled={!newCampaignName.trim() || creatingCampaign}
                >
                  {creatingCampaign ? (
                    <>
                      <span className="loading-spinner"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Character Manager Modal */}
        {showCharacterModal && (
          <CharacterManager
            character={editingCharacter}
            onClose={() => setShowCharacterModal(false)}
            onSave={handleSaveCharacter}
          />
        )}

        {/* Join Game Modal */}
        {showJoinGameModal && (
          <div
            className="modal-overlay"
            onClick={() => !joiningGame && setShowJoinGameModal(false)}
          >
            <div
              className="modal-content glass-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Join Game</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowJoinGameModal(false)}
                  disabled={joiningGame}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <p
                  style={{
                    marginBottom: '1rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Enter the room code provided by your Dungeon Master to join
                  their game.
                </p>

                <div className="input-group">
                  <label htmlFor="roomCode">Room Code *</label>
                  <div className="glass-input-wrapper">
                    <input
                      id="roomCode"
                      type="text"
                      value={joinRoomCode}
                      onChange={(e) =>
                        setJoinRoomCode(e.target.value.toUpperCase())
                      }
                      placeholder="e.g., ABC123"
                      className="glass-input"
                      disabled={joiningGame}
                      maxLength={6}
                      style={{ textTransform: 'uppercase' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && joinRoomCode.trim()) {
                          handleJoinGame();
                        }
                      }}
                    />
                  </div>
                </div>

                {characters.length > 0 && (
                  <div className="input-group">
                    <label>Your Characters</label>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      You have {characters.length} character
                      {characters.length !== 1 ? 's' : ''} available to use in
                      this game.
                    </p>
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {characters.map((character) => (
                        <div
                          key={character.id}
                          style={{
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                          }}
                        >
                          <strong>{character.name}</strong>
                          {character.data.race && character.data.class && (
                            <span
                              style={{
                                marginLeft: '0.5rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              ({character.data.race} {character.data.class})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="action-btn glass-button secondary"
                  onClick={() => setShowJoinGameModal(false)}
                  disabled={joiningGame}
                >
                  Cancel
                </button>
                <button
                  className="action-btn glass-button primary"
                  onClick={handleJoinGame}
                  disabled={!joinRoomCode.trim() || joiningGame}
                >
                  {joiningGame ? (
                    <>
                      <span className="loading-spinner"></span>
                      Joining...
                    </>
                  ) : (
                    <>
                      <span>🎲</span>
                      Join Game
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Character Creation Launcher - rendered via portal to overlay everything */}
      {LauncherComponent && createPortal(LauncherComponent, document.body)}
    </>
  );
};
