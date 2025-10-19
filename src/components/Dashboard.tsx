import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { CharacterManager } from './CharacterManager';
import { useCharacterCreationLauncher } from './CharacterCreationLauncher';
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
}

/**
 * Character data structure from API
 * @interface Character
 */
interface Character {
  /** Unique character identifier (UUID) */
  id: string;
  /** Character name */
  name: string;
  /** User ID of the character owner */
  ownerId: string;
  /** Character data (race, class, stats, etc.) */
  data: {
    race?: string;
    class?: string;
    level?: number;
    portrait?: string;
    [key: string]: unknown;
  };
  /** Timestamp when character was created */
  createdAt: string;
  /** Timestamp when character was last updated */
  updatedAt: string;
}

/**
 * Dashboard component for authenticated users
 * Displays user's campaigns and characters
 * @component
 * @returns {JSX.Element} Dashboard page
 */
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, createGameRoom, joinRoomWithCode } = useGameStore();
  const { startCharacterCreation, LauncherComponent } = useCharacterCreationLauncher();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
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
    Character | undefined
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

        const response = await fetch('/api/campaigns');

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

        const response = await fetch('/api/characters');

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
   * Handles logout action
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
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
        (characterId, character) => {
          // Character saved to database via API, now add to local state
          if (character) {
            handleSaveCharacter(character as any);
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
  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
  };

  /**
   * Handles saving a character (create or update)
   */
  const handleSaveCharacter = (character: Character) => {
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
      console.log('✅ Session started successfully, navigating to game room:', roomCode);
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

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-title-section">
            <h1>Welcome, {user.name || 'Adventurer'}!</h1>
            <p className="dashboard-subtitle">
              Manage your campaigns and characters
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setShowJoinGameModal(true)}
              className="action-btn glass-button primary"
            >
              <span>🎲</span>
              Join Game
            </button>
            <button
              onClick={handleLogout}
              className="action-btn glass-button secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message glass-panel error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Campaigns Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>My Campaigns</h2>
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
          <div className="loading-state">
            <span className="loading-spinner"></span>
            <p>Loading campaigns...</p>
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
          <div className="dashboard-grid">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-card glass-panel">
                <div className="campaign-card-header">
                  <h3>{campaign.name}</h3>
                  <span className="campaign-date">
                    {new Date(campaign.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {campaign.description && (
                  <p className="campaign-description">{campaign.description}</p>
                )}
                <div className="campaign-actions">
                  <button
                    className="action-btn glass-button primary small"
                    onClick={() => handleStartSession(campaign.id)}
                    disabled={startingSession !== null}
                  >
                    {startingSession === campaign.id ? (
                      <>
                        <span className="loading-spinner"></span>
                        Starting...
                      </>
                    ) : (
                      <>
                        <span>🎮</span>
                        Start Session
                      </>
                    )}
                  </button>
                  <button className="action-btn glass-button secondary small">
                    <span>✏️</span>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Characters Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>My Characters</h2>
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
          <div className="loading-state">
            <span className="loading-spinner"></span>
            <p>Loading characters...</p>
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
          <div className="dashboard-grid">
            {characters.map((character) => (
              <div key={character.id} className="character-card glass-panel">
                <div className="character-card-header">
                  <h3>{character.name}</h3>
                  <span className="character-date">
                    {new Date(character.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="character-info">
                  {character.data.race && (
                    <span className="character-detail">
                      {character.data.race}
                    </span>
                  )}
                  {character.data.class && (
                    <span className="character-detail">
                      {character.data.class}
                    </span>
                  )}
                  {character.data.level && (
                    <span className="character-detail">
                      Level {character.data.level}
                    </span>
                  )}
                </div>
                <div className="character-actions">
                  <button
                    className="action-btn glass-button secondary small"
                    onClick={() => handleEditCharacter(character)}
                  >
                    <span>✏️</span>
                    Edit
                  </button>
                  <button
                    className="action-btn glass-button secondary small"
                    onClick={() => handleDeleteCharacter(character.id)}
                  >
                    <span>🗑️</span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                    onChange={(e) => setNewCampaignDescription(e.target.value)}
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

      {/* Character Creation Launcher */}
      {LauncherComponent}

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
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Enter the room code provided by your Dungeon Master to join their game.
              </p>

              <div className="input-group">
                <label htmlFor="roomCode">Room Code *</label>
                <div className="glass-input-wrapper">
                  <input
                    id="roomCode"
                    type="text"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
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
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    You have {characters.length} character{characters.length !== 1 ? 's' : ''} available to use in this game.
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
                          fontSize: '0.875rem'
                        }}
                      >
                        <strong>{character.name}</strong>
                        {character.data.race && character.data.class && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
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
  );
};
