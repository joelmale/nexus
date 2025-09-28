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
import { useAppFlowStore } from '@/stores/appFlowStore';
import { CharacterCreation } from './CharacterCreation';
import type { PlayerCharacter } from '@/types/appFlow';

export const PlayerSetupPage: React.FC = () => {
  const {
    user,
    getSavedCharacters,
    selectCharacter,
    deleteCharacter,
    createCharacter,
    joinRoomWithCode,
    exportCharacters,
    importCharacters,
    resetToWelcome
  } = useAppFlowStore();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const characters = getSavedCharacters();
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  const handleJoinGame = async () => {
    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      setError('Please enter a valid 4-character room code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await joinRoomWithCode(roomCode.trim().toUpperCase(), selectedCharacter);
    } catch (err) {
      setError('Failed to join room - room may not exist or be full');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (confirm('Are you sure you want to delete this character?')) {
      deleteCharacter(characterId);
      if (selectedCharacterId === characterId) {
        setSelectedCharacterId(null);
      }
    }
  };

  const handleExportCharacters = () => {
    const data = exportCharacters();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-characters-${user.name || 'player'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportCharacters = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        importCharacters(data);
        setError('');
        alert('Characters imported successfully!');
      } catch (err) {
        setError('Failed to import characters - invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const handleCharacterCreated = (newCharacter: Omit<PlayerCharacter, 'id' | 'createdAt' | 'playerId'>) => {
    const character = createCharacter(newCharacter);
    setSelectedCharacterId(character.id);
    setShowCharacterCreation(false);
  };

  if (showCharacterCreation) {
    return (
      <div className="player-setup">
        <div className="setup-header">
          <button
            onClick={() => setShowCharacterCreation(false)}
            className="back-button glass-button"
            title="Back to Character Selection"
          >
            ←
          </button>
          <h1>Create New Character</h1>
        </div>
        <CharacterCreation
          onCharacterCreated={handleCharacterCreated}
          onCancel={() => setShowCharacterCreation(false)}
        />
      </div>
    );
  }

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
                ←
              </button>
              <div className="header-content">
                <h1>⚔️ Player Setup</h1>
                <p>Welcome, <strong>{user.name}</strong>! Select a character and join your adventure.</p>
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
              <div className="character-actions">
                <button
                  onClick={() => setShowCharacterCreation(true)}
                  className="glass-button secondary"
                >
                  <span>➕</span>
                  Create New
                </button>

                {characters.length > 0 && (
                  <>
                    <button
                      onClick={handleExportCharacters}
                      className="glass-button secondary"
                      title="Export characters to file"
                    >
                      <span>📤</span>
                      Export
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
                    >
                      <span>📥</span>
                      Import
                    </button>
                  </>
                )}
              </div>
            </div>

            {characters.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎭</div>
                <h3>No Characters Yet</h3>
                <p>Create your first character to begin your adventure!</p>
                <button
                  onClick={() => setShowCharacterCreation(true)}
                  className="glass-button primary"
                >
                  <span>✨</span>
                  Create First Character
                </button>
              </div>
            ) : (
              <div className="character-grid">
                {characters
                  .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
                  .map(character => (
                    <div
                      key={character.id}
                      className={`character-card glass-panel ${
                        selectedCharacterId === character.id ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedCharacterId(character.id)}
                    >
                      <div className="character-info">
                        <h3>{character.name}</h3>
                        <p>Level {character.level} {character.race} {character.class}</p>
                        <p className="character-background">{character.background}</p>
                        {character.lastUsed && (
                          <p className="last-used">
                            Last used: {new Date(character.lastUsed).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="character-stats">
                        {Object.entries(character.stats).map(([stat, value]) => (
                          <div key={stat} className="stat-mini">
                            <span className="stat-name">{stat.substring(0, 3).toUpperCase()}</span>
                            <span className="stat-value">{value}</span>
                          </div>
                        ))}
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
                        {selectedCharacterId === character.id && <span>✓</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}
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
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
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
                    (Level {selectedCharacter.level} {selectedCharacter.race} {selectedCharacter.class})
                  </p>
                </div>
              )}

              {!selectedCharacter && characters.length > 0 && (
                <div className="character-hint">
                  <p>💡 Select a character above to join with, or join without a character.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};