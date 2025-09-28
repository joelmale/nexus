/**
 * Character Creation Component
 *
 * Placeholder page for D&D 5e character creation.
 * Players land here after selecting "Player" role.
 */

import React, { useState } from 'react';
import type { PlayerCharacter } from '@/types/appFlow';

interface CharacterCreationProps {
  onCharacterCreated?: (character: Omit<PlayerCharacter, 'id' | 'createdAt' | 'playerId'>) => void;
  onCancel?: () => void;
}

export const CharacterCreation: React.FC<CharacterCreationProps> = ({
  onCharacterCreated,
  onCancel
}) => {
  const [character, setCharacter] = useState({
    name: '',
    race: '',
    class: '',
    background: '',
    level: 1,
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    }
  });

  const [isComplete, setIsComplete] = useState(false);

  const dndRaces = [
    'Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn',
    'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'
  ];

  const dndClasses = [
    'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
    'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
    'Warlock', 'Wizard'
  ];

  const dndBackgrounds = [
    'Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage',
    'Soldier', 'Charlatan', 'Entertainer', 'Guild Artisan',
    'Hermit', 'Outlander', 'Sailor'
  ];

  const handleStatChange = (stat: string, value: number) => {
    setCharacter(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [stat]: Math.max(8, Math.min(18, value))
      }
    }));
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleContinue = () => {
    if (onCharacterCreated) {
      onCharacterCreated(character);
    } else {
      setIsComplete(true);
      console.log('Character created:', character);
    }
  };

  const isFormComplete = character.name && character.race && character.class && character.background;

  return (
    <div className="character-creation">
      <div className="creation-background">
        <div className="background-overlay"></div>
      </div>

      <div className="creation-content">
        <div className="creation-panel glass-panel">
          <div className="creation-header">
            <div className="header-with-back">
              {onCancel && (
                <button
                  onClick={handleCancel}
                  className="back-button glass-button"
                  title="Cancel"
                >
                  ←
                </button>
              )}
              <div className="header-content">
                <h1>🧙‍♂️ Create Your Hero</h1>
                <p>Build your character for the adventure ahead!</p>
              </div>
            </div>
          </div>

          <div className="character-form">
            {/* Basic Info */}
            <div className="form-section">
              <h2>📋 Basic Information</h2>
              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="characterName">Character Name</label>
                  <input
                    id="characterName"
                    type="text"
                    value={character.name}
                    onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter character name"
                    className="glass-input"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="level">Level</label>
                  <input
                    id="level"
                    type="number"
                    min="1"
                    max="20"
                    value={character.level}
                    onChange={(e) => setCharacter(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            {/* Race, Class, Background */}
            <div className="form-section">
              <h2>🎭 Character Details</h2>
              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="race">Race</label>
                  <select
                    id="race"
                    value={character.race}
                    onChange={(e) => setCharacter(prev => ({ ...prev, race: e.target.value }))}
                    className="glass-select"
                  >
                    <option value="">Choose a race...</option>
                    {dndRaces.map(race => (
                      <option key={race} value={race}>{race}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="class">Class</label>
                  <select
                    id="class"
                    value={character.class}
                    onChange={(e) => setCharacter(prev => ({ ...prev, class: e.target.value }))}
                    className="glass-select"
                  >
                    <option value="">Choose a class...</option>
                    {dndClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="background">Background</label>
                  <select
                    id="background"
                    value={character.background}
                    onChange={(e) => setCharacter(prev => ({ ...prev, background: e.target.value }))}
                    className="glass-select"
                  >
                    <option value="">Choose a background...</option>
                    {dndBackgrounds.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Ability Scores */}
            <div className="form-section">
              <h2>💪 Ability Scores</h2>
              <p className="section-description">Distribute your character's base attributes (8-18)</p>
              <div className="stats-grid">
                {Object.entries(character.stats).map(([stat, value]) => (
                  <div key={stat} className="stat-group">
                    <label htmlFor={stat}>{stat.charAt(0).toUpperCase() + stat.slice(1)}</label>
                    <div className="stat-controls">
                      <button
                        type="button"
                        onClick={() => handleStatChange(stat, value - 1)}
                        className="stat-btn"
                        disabled={value <= 8}
                      >
                        -
                      </button>
                      <input
                        id={stat}
                        type="number"
                        min="8"
                        max="18"
                        value={value}
                        onChange={(e) => handleStatChange(stat, parseInt(e.target.value) || 10)}
                        className="stat-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleStatChange(stat, value + 1)}
                        className="stat-btn"
                        disabled={value >= 18}
                      >
                        +
                      </button>
                    </div>
                    <div className="stat-modifier">
                      {value >= 10 ? '+' : ''}{Math.floor((value - 10) / 2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Character Summary */}
            {isFormComplete && (
              <div className="form-section">
                <h2>📝 Character Summary</h2>
                <div className="character-summary glass-panel">
                  <h3>{character.name}</h3>
                  <p>Level {character.level} {character.race} {character.class}</p>
                  <p>Background: {character.background}</p>
                  <div className="summary-stats">
                    {Object.entries(character.stats).map(([stat, value]) => (
                      <span key={stat} className="stat-badge">
                        {stat.substring(0, 3).toUpperCase()}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="form-actions">
              <button
                onClick={handleContinue}
                disabled={!isFormComplete}
                className="glass-button primary"
              >
                <span>⚔️</span>
                {isComplete ? 'Character Created!' : 'Create Character'}
              </button>

              {!isFormComplete && (
                <p className="form-hint">
                  Complete all required fields to create your character
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};