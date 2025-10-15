/**
 * Player Setup Page Component
 *
 * Allows players to:
 * - View saved characters
 * - Create new characters
 * - Select a character and enter room code
 * - Import/export character data
 */

import React, { useState, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useCharacterCreationLauncher } from './CharacterCreationLauncher';
import { useCharacters } from '@/stores/characterStore';
import { CharacterSheetPopup } from './CharacterSheetPopup';
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
  const { user, joinRoomWithCode, resetToWelcome } = useGameStore();

  const { characters, deleteCharacter } = useCharacters();
  const { startCharacterCreation, LauncherComponent } =
    useCharacterCreationLauncher();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [popupCharacter, setPopupCharacter] = useState<Character | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      await joinRoomWithCode(roomCode.trim().toUpperCase(), playerCharacter);
    } catch {
      setError('Failed to join room - room may not exist or be full');
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

  const handleExportCharacters = () => {
    alert('Character export will be implemented in a future update');
  };

  const handleImportCharacters = () => {
    alert('Character import will be implemented in a future update');
  };

  const handleCreateCharacter = () => {
    if (user.id) {
      startCharacterCreation(
        user.id,
        'fullpage',
        (characterId: string) => {
          // Character is already saved to characterStore by the wizard
          // Just select the newly created character
          setSelectedCharacterId(characterId);
        },
        () => {
          // Character creation cancelled
          console.log('🎭 Character creation cancelled');
        },
      );
    }
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
                onClick={resetToWelcome}
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
              {userCharacters.length > 0 && (
                <div className="character-actions">
                  <button
                    onClick={handleExportCharacters}
                    className="glass-button secondary"
                    title="Export characters to file"
                    disabled
                  >
                    <span>📤</span>
                    Export (Soon)
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportCharacters}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="glass-button secondary"
                    title="Import characters from file"
                    disabled
                  >
                    <span>📥</span>
                    Import (Soon)
                  </button>
                </div>
              )}
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

            {/* Always visible Create Character button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                onClick={handleCreateCharacter}
                className="glass-button primary"
              >
                <span>✨</span>
                {userCharacters.length === 0
                  ? 'Create First Character'
                  : 'Create New Character'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="glass-button secondary"
                title="Import characters from file"
              >
                <span>📥</span>
                Import Characters
              </button>
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

      {/* Character Creation Launcher */}
      {LauncherComponent}

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
