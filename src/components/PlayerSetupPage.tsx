/**
 * Player Setup Page Component
 *
 * Allows players to:
 * - View saved characters
 * - Create new characters
 * - Select a character and enter room code
 * - Import/export character data
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { useCharacters } from '@/stores/characterStore';
import { CharacterSheetPopup } from './CharacterSheetPopup';
import { QuickCharacterEntry } from './QuickCharacterEntry';
import { CharacterImportModal } from './CharacterImportModal';
import type { Character } from '@/types/character';
import type { PlayerCharacter } from '@/types/game';
import '@/styles/character-sheet-parchment.css';

// Convert Character to PlayerCharacter for gameStore compatibility
const convertCharacterToPlayerCharacter = (
  character: Character,
): PlayerCharacter => {
  return {
    id: character.id,
    name: character.name,
    race: character.race.name,
    class: character.classes[0]?.name || '',
    background: character.background.name,
    level: character.level,
    stats: {
      strength: character.abilities.strength.score,
      dexterity: character.abilities.dexterity.score,
      constitution: character.abilities.constitution.score,
      intelligence: character.abilities.intelligence.score,
      wisdom: character.abilities.wisdom.score,
      charisma: character.abilities.charisma.score,
    },
    createdAt: character.createdAt,
    playerId: character.playerId,
  };
};

export const PlayerSetupPage: React.FC = () => {
  const { user, joinRoomWithCode } = useGameStore();
  const navigate = useNavigate();

  const { characters, deleteCharacter } = useCharacters();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [popupCharacter, setPopupCharacter] = useState<Character | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filter characters for the current user
  const userCharacters = characters.filter((c) => c.playerId === user.id);
  const selectedCharacter = userCharacters.find(
    (c) => c.id === selectedCharacterId,
  );

  const handleJoinGame = async () => {
    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      setError('Please enter a valid 4-character room code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const playerCharacter = selectedCharacter
        ? convertCharacterToPlayerCharacter(selectedCharacter)
        : undefined;
      const joinedRoomCode = await joinRoomWithCode(roomCode.trim().toUpperCase(), playerCharacter);
      navigate(`/lobby/game/${joinedRoomCode}`);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to join room - room may not exist or be full';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this character? This action cannot be undone.',
      )
    ) {
      deleteCharacter(characterId);

      // Clear selection if the deleted character was selected
      if (selectedCharacterId === characterId) {
        setSelectedCharacterId(null);
      }

      // Close popup if the deleted character was being viewed
      if (popupCharacter?.id === characterId) {
        setPopupCharacter(null);
      }
    }
  };

  const handleBack = () => {
    navigate('/lobby');
  };

  const handleQuickEntry = () => {
    setShowQuickEntry(true);
  };

  const handleQuickEntryComplete = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setShowQuickEntry(false);
  };

  const handleImportCharacters = () => {
    setShowImportModal(true);
  };

  const handleImportComplete = (result: {
    successful: number;
    failed: number;
  }) => {
    console.log(
      `✅ Import complete: ${result.successful} successful, ${result.failed} failed`,
    );
    // Auto-select the first imported character if there's only one
    if (result.successful === 1 && characters.length > 0) {
      const latestCharacter = characters.sort(
        (a, b) => b.createdAt - a.createdAt,
      )[0];
      setSelectedCharacterId(latestCharacter.id);
    }
  };

  const handleOpenCharacterForge = () => {
    window.open('https://5e-character-builder.com', '_blank');
  };

  return (
    <div className="player-setup">
      <div className="setup-background">
        <div className="background-overlay"></div>
      </div>

      <div className="setup-content">
        <div className="setup-panel glass-panel">
          <div className="setup-header">
            <div className="header-with-back">
              <button
                onClick={handleBack}
                className="back-button glass-button"
                title="Back to Welcome"
              >
                <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="header-content">
                <h1>⚔️ Player Setup</h1>
                <p>
                  Welcome, <strong>{user.name}</strong>! Select a character and
                  join your adventure.
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

          {/* Character Management */}
          <div className="setup-section">
            <div className="section-header">
              <h2>🎭 Your Characters</h2>
            </div>

            {userCharacters.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center' }}>
                <div className="empty-icon">🎭</div>
                <h3>No Characters Yet</h3>
                <p>Create your first character to begin your adventure!</p>
              </div>
            ) : (
              <div className="character-grid">
                {userCharacters
                  .sort(
                    (a: Character, b: Character) => b.updatedAt - a.updatedAt,
                  )
                  .map((character: Character) => (
                    <div
                      key={character.id}
                      className={`character-card glass-panel ${
                        selectedCharacterId === character.id ? 'selected' : ''
                      }`}
                      onClick={() => setPopupCharacter(character)}
                    >
                      <div className="character-info">
                        <h3>{character.name}</h3>
                        <p>
                          Level {character.level} {character.race.name}
                          {character.race.subrace &&
                            ` (${character.race.subrace})`}{' '}
                          {character.classes[0]?.name}
                        </p>
                        <p className="character-background">
                          {character.background.name}
                        </p>
                        <p className="last-used">
                          Created:{' '}
                          {new Date(character.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="character-stats">
                        {Object.entries(character.abilities).map(
                          ([stat, ability]) => (
                            <div key={stat} className="stat-mini">
                              <span className="stat-name">
                                {stat.substring(0, 3).toUpperCase()}
                              </span>
                              <span className="stat-value">
                                {ability.score}
                              </span>
                            </div>
                          ),
                        )}
                      </div>

                      <div className="character-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCharacter(character.id);
                          }}
                          className="delete-btn"
                          title="Delete character"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="selection-indicator">
                        {selectedCharacterId === character.id ? (
                          <span>✓</span>
                        ) : (
                          <input
                            type="checkbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCharacterId(character.id);
                            }}
                            className="character-select-checkbox"
                            title="Select this character"
                          />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Character Entry Options */}
            <div
              className="character-entry-options"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div
                className="entry-option-card glass-panel"
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '2rem' }}>⚡</div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Quick Entry</h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    opacity: 0.8,
                    flexGrow: 1,
                  }}
                >
                  I have basic character info
                </p>
                <button onClick={handleQuickEntry} className="glass-button primary" style={{ width: '100%' }}>
                  Enter Info
                </button>
                <small style={{ opacity: 0.6 }}>⏱️ 30 seconds</small>
              </div>

              <div
                className="entry-option-card glass-panel"
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '2rem' }}>📥</div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Import JSON</h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    opacity: 0.8,
                    flexGrow: 1,
                  }}
                >
                  I have a .json character file
                </p>
                <button
                  onClick={handleImportCharacters}
                  className="glass-button secondary"
                  style={{ width: '100%' }}
                >
                  Upload File
                </button>
                <small style={{ opacity: 0.6 }}>⏱️ 2 minutes</small>
              </div>

              <div
                className="entry-option-card glass-panel"
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '2rem' }}>✨</div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Character Forge</h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    opacity: 0.8,
                    flexGrow: 1,
                  }}
                >
                  I need to build a character
                </p>
                <button
                  onClick={handleOpenCharacterForge}
                  className="glass-button secondary"
                  style={{ width: '100%' }}
                >
                  Open Forge ↗
                </button>
                <small style={{ opacity: 0.6 }}>⏱️ 15+ minutes</small>
              </div>
            </div>
          </div>

          {/* Room Join */}
          <div className="setup-section">
            <h2>🗝️ Join Game</h2>
            <div className="join-form">
              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="roomCode">Room Code</label>
                  <div className="glass-input-wrapper">
                    <span className="input-icon">🗝️</span>
                    <input
                      id="roomCode"
                      type="text"
                      value={roomCode}
                      onChange={(e) =>
                        setRoomCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter 4-character code"
                      maxLength={4}
                      className="glass-input room-code-input"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  onClick={handleJoinGame}
                  disabled={!roomCode.trim() || loading}
                  className="glass-button primary join-btn"
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Joining...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      Join Game
                    </>
                  )}
                </button>
              </div>

              {selectedCharacter && (
                <div className="selected-character-info">
                  <p>
                    <strong>Joining as:</strong> {selectedCharacter.name}
                    (Level {selectedCharacter.level}{' '}
                    {selectedCharacter.race.name}
                    {selectedCharacter.race.subrace &&
                      ` (${selectedCharacter.race.subrace})`}{' '}
                    {selectedCharacter.classes[0]?.name})
                  </p>
                </div>
              )}

              {!selectedCharacter && userCharacters.length > 0 && (
                <div className="character-hint">
                  <p>
                    💡 Select a character above to join with, or join without a
                    character.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Character Entry Modal */}
      <QuickCharacterEntry
        isOpen={showQuickEntry}
        onClose={() => setShowQuickEntry(false)}
        onComplete={handleQuickEntryComplete}
        playerId={user.id}
      />

      {/* Character Import Modal */}
      <CharacterImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Character Sheet Popup */}
      {popupCharacter && (
        <CharacterSheetPopup
          character={popupCharacter}
          isOpen={true}
          onClose={() => setPopupCharacter(null)}
        />
      )}
    </div>
  );
};
