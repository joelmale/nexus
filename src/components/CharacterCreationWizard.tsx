import React, { useState, useEffect } from 'react';
import { useCharacterCreation } from '@/stores/characterStore';
import {
  generateRandomCharacter,
  randomizeName,
  randomizeRace,
  randomizeClass,
  randomizeBackground,
  randomizeAlignment,
  randomizeAbilityScores,
  getAvailableRaces,
  getAvailableClasses,
  getAvailableBackgrounds,
  getAvailableAlignments
} from '@/utils/characterGenerator';
import type { Character, AbilityScores } from '@/types/character';

interface CharacterCreationWizardProps {
  playerId: string;
  onComplete: (characterId: string) => void;
  onCancel: () => void;
  isModal?: boolean;
}

interface WizardStepProps {
  character: Partial<Character>;
  updateCharacter: (updates: Partial<Character>) => void;
  onNext: () => void;
  onPrevious: () => void;
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// =============================================================================
// STEP 1: CORE CONCEPT
// =============================================================================

const CoreConceptStep: React.FC<WizardStepProps> = ({
  character,
  updateCharacter,
  onNext,
  onPrevious,
  canProceed,
  isFirstStep,
  isLastStep
}) => {
  const handleRandomizeAll = () => {
    const randomChar = generateRandomCharacter(character.playerId || '');
    updateCharacter({
      name: randomChar.name,
      race: randomChar.race,
      classes: randomChar.classes,
      background: randomChar.background,
      alignment: randomChar.alignment
    });
  };

  const handleRandomizeName = () => {
    const newName = randomizeName(character.race?.name);
    updateCharacter({ name: newName });
  };

  const handleRandomizeRace = () => {
    const newRace = randomizeRace();
    updateCharacter({ race: newRace });
  };

  const handleRandomizeClass = () => {
    const newClass = randomizeClass();
    updateCharacter({ classes: [newClass] });
  };

  const handleRandomizeBackground = () => {
    const newBackground = randomizeBackground();
    updateCharacter({ background: newBackground });
  };

  const handleRandomizeAlignment = () => {
    const newAlignment = randomizeAlignment();
    updateCharacter({ alignment: newAlignment });
  };

  return (
    <div className="wizard-step core-concept-step">
      <div className="step-header">
        <h2>Character Concept</h2>
        <button
          className="randomize-all-btn"
          onClick={handleRandomizeAll}
          title="Randomize all fields"
        >
          🎲 Randomize All
        </button>
      </div>

      <div className="form-grid">
        {/* Character Name */}
        <div className="form-group">
          <label htmlFor="character-name">Character Name</label>
          <div className="input-with-dice">
            <input
              type="text"
              id="character-name"
              value={character.name || ''}
              onChange={(e) => updateCharacter({ name: e.target.value })}
              placeholder="Enter character name"
              className="form-input"
            />
            <button
              className="dice-btn"
              onClick={handleRandomizeName}
              title="Generate random name"
            >
              🎲
            </button>
          </div>
        </div>

        {/* Race */}
        <div className="form-group">
          <label htmlFor="character-race">Race</label>
          <div className="input-with-dice">
            <select
              id="character-race"
              value={character.race?.name || ''}
              onChange={(e) => {
                const raceName = e.target.value;
                if (raceName) {
                  const selectedRace = randomizeRace();
                  selectedRace.name = raceName;
                  updateCharacter({ race: selectedRace });
                }
              }}
              className="form-select"
            >
              <option value="">Select a race</option>
              {getAvailableRaces().map(race => (
                <option key={race} value={race}>{race}</option>
              ))}
            </select>
            <button
              className="dice-btn"
              onClick={handleRandomizeRace}
              title="Random race"
            >
              🎲
            </button>
          </div>
        </div>

        {/* Class */}
        <div className="form-group">
          <label htmlFor="character-class">Class</label>
          <div className="input-with-dice">
            <select
              id="character-class"
              value={character.classes?.[0]?.name || ''}
              onChange={(e) => {
                const className = e.target.value;
                if (className) {
                  const selectedClass = randomizeClass();
                  selectedClass.name = className;
                  updateCharacter({ classes: [selectedClass] });
                }
              }}
              className="form-select"
            >
              <option value="">Select a class</option>
              {getAvailableClasses().map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <button
              className="dice-btn"
              onClick={handleRandomizeClass}
              title="Random class"
            >
              🎲
            </button>
          </div>
        </div>

        {/* Background */}
        <div className="form-group">
          <label htmlFor="character-background">Background</label>
          <div className="input-with-dice">
            <select
              id="character-background"
              value={character.background?.name || ''}
              onChange={(e) => {
                const backgroundName = e.target.value;
                if (backgroundName) {
                  const selectedBackground = randomizeBackground();
                  selectedBackground.name = backgroundName;
                  updateCharacter({ background: selectedBackground });
                }
              }}
              className="form-select"
            >
              <option value="">Select a background</option>
              {getAvailableBackgrounds().map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <button
              className="dice-btn"
              onClick={handleRandomizeBackground}
              title="Random background"
            >
              🎲
            </button>
          </div>
        </div>

        {/* Alignment */}
        <div className="form-group">
          <label htmlFor="character-alignment">Alignment</label>
          <div className="input-with-dice">
            <select
              id="character-alignment"
              value={character.alignment || ''}
              onChange={(e) => updateCharacter({ alignment: e.target.value })}
              className="form-select"
            >
              <option value="">Select alignment</option>
              {getAvailableAlignments().map(alignment => (
                <option key={alignment} value={alignment}>{alignment}</option>
              ))}
            </select>
            <button
              className="dice-btn"
              onClick={handleRandomizeAlignment}
              title="Random alignment"
            >
              🎲
            </button>
          </div>
        </div>

        {/* Level */}
        <div className="form-group">
          <label htmlFor="character-level">Level</label>
          <input
            type="number"
            id="character-level"
            value={character.level || 1}
            onChange={(e) => updateCharacter({ level: parseInt(e.target.value) || 1 })}
            min="1"
            max="20"
            className="form-input"
          />
        </div>
      </div>

      <div className="step-navigation">
        <button
          className="nav-btn previous"
          onClick={onPrevious}
          disabled={isFirstStep}
        >
          ← Previous
        </button>
        <button
          className="nav-btn next"
          onClick={onNext}
          disabled={!canProceed}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// STEP 2: ABILITY SCORES
// =============================================================================

const AbilityScoresStep: React.FC<WizardStepProps> = ({
  character,
  updateCharacter,
  onNext,
  onPrevious,
  canProceed,
  isFirstStep,
  isLastStep
}) => {
  const handleRandomizeAbilities = () => {
    const newAbilities = randomizeAbilityScores();
    updateCharacter({ abilities: newAbilities });
  };

  const handleAbilityChange = (ability: keyof AbilityScores, score: number) => {
    if (!character.abilities) return;

    const calculateModifier = (score: number) => Math.floor((score - 10) / 2);
    const newModifier = calculateModifier(score);

    const updatedAbilities = {
      ...character.abilities,
      [ability]: {
        ...character.abilities[ability],
        score,
        modifier: newModifier,
        savingThrow: newModifier
      }
    };

    updateCharacter({ abilities: updatedAbilities });
  };

  const abilities = character.abilities || randomizeAbilityScores();

  return (
    <div className="wizard-step ability-scores-step">
      <div className="step-header">
        <h2>Ability Scores</h2>
        <button
          className="randomize-all-btn"
          onClick={handleRandomizeAbilities}
          title="Roll all ability scores"
        >
          🎲 Roll All Scores
        </button>
      </div>

      <div className="abilities-grid">
        {Object.entries(abilities).map(([abilityName, abilityData]) => (
          <div key={abilityName} className="ability-score-group">
            <label className="ability-label">
              {abilityName.charAt(0).toUpperCase() + abilityName.slice(1)}
            </label>
            <div className="ability-input-container">
              <input
                type="number"
                value={abilityData.score}
                onChange={(e) => handleAbilityChange(
                  abilityName as keyof AbilityScores,
                  parseInt(e.target.value) || 10
                )}
                min="1"
                max="20"
                className="ability-input"
              />
              <div className="ability-modifier">
                {abilityData.modifier >= 0 ? '+' : ''}{abilityData.modifier}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ability-score-help">
        <p>Standard ability score generation uses 4d6, dropping the lowest die.</p>
        <p>Scores can be manually adjusted between 1-20.</p>
      </div>

      <div className="step-navigation">
        <button
          className="nav-btn previous"
          onClick={onPrevious}
          disabled={isFirstStep}
        >
          ← Previous
        </button>
        <button
          className="nav-btn next"
          onClick={onNext}
          disabled={!canProceed}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// STEP 3: DETAILS & PERSONALITY
// =============================================================================

const DetailsStep: React.FC<WizardStepProps> = ({
  character,
  updateCharacter,
  onNext,
  onPrevious,
  canProceed,
  isFirstStep,
  isLastStep
}) => {
  return (
    <div className="wizard-step details-step">
      <div className="step-header">
        <h2>Character Details</h2>
      </div>

      <div className="form-grid">
        {/* Combat Stats */}
        <div className="form-section">
          <h3>Combat Statistics</h3>

          <div className="form-group">
            <label htmlFor="armor-class">Armor Class</label>
            <input
              type="number"
              id="armor-class"
              value={character.armorClass || 10}
              onChange={(e) => updateCharacter({ armorClass: parseInt(e.target.value) || 10 })}
              min="1"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="hit-points">Hit Points</label>
            <input
              type="number"
              id="hit-points"
              value={character.hitPoints?.maximum || 1}
              onChange={(e) => {
                const maxHP = parseInt(e.target.value) || 1;
                updateCharacter({
                  hitPoints: {
                    maximum: maxHP,
                    current: maxHP,
                    temporary: 0
                  }
                });
              }}
              min="1"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="speed">Speed (ft)</label>
            <input
              type="number"
              id="speed"
              value={character.speed || 30}
              onChange={(e) => updateCharacter({ speed: parseInt(e.target.value) || 30 })}
              min="0"
              step="5"
              className="form-input"
            />
          </div>
        </div>

        {/* Personality Traits */}
        <div className="form-section">
          <h3>Personality</h3>

          <div className="form-group">
            <label htmlFor="personality-traits">Personality Traits</label>
            <textarea
              id="personality-traits"
              value={character.personalityTraits?.join('\n') || ''}
              onChange={(e) => updateCharacter({
                personalityTraits: e.target.value.split('\n').filter(t => t.trim())
              })}
              placeholder="Describe your character's personality traits..."
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ideals">Ideals</label>
            <textarea
              id="ideals"
              value={character.ideals?.join('\n') || ''}
              onChange={(e) => updateCharacter({
                ideals: e.target.value.split('\n').filter(t => t.trim())
              })}
              placeholder="What drives your character..."
              className="form-textarea"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bonds">Bonds</label>
            <textarea
              id="bonds"
              value={character.bonds?.join('\n') || ''}
              onChange={(e) => updateCharacter({
                bonds: e.target.value.split('\n').filter(t => t.trim())
              })}
              placeholder="Important connections and relationships..."
              className="form-textarea"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="flaws">Flaws</label>
            <textarea
              id="flaws"
              value={character.flaws?.join('\n') || ''}
              onChange={(e) => updateCharacter({
                flaws: e.target.value.split('\n').filter(t => t.trim())
              })}
              placeholder="Character weaknesses or vices..."
              className="form-textarea"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="step-navigation">
        <button
          className="nav-btn previous"
          onClick={onPrevious}
          disabled={isFirstStep}
        >
          ← Previous
        </button>
        <button
          className="nav-btn next"
          onClick={onNext}
          disabled={!canProceed}
        >
          {isLastStep ? 'Create Character' : 'Next →'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export const CharacterCreationWizard: React.FC<CharacterCreationWizardProps> = ({
  playerId,
  onComplete,
  onCancel,
  isModal = false
}) => {
  const {
    creationState,
    startCharacterCreation,
    updateCreationState,
    nextCreationStep,
    previousCreationStep,
    completeCharacterCreation,
    cancelCharacterCreation
  } = useCharacterCreation();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Initialize creation state when component mounts
  useEffect(() => {
    if (!creationState) {
      startCharacterCreation(playerId, 'guided');
    }
  }, [playerId, creationState, startCharacterCreation]);

  const character = creationState?.character || {};

  const updateCharacter = (updates: Partial<Character>) => {
    updateCreationState({
      character: { ...character, ...updates }
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete character creation
      const characterId = completeCharacterCreation();
      if (characterId) {
        onComplete(characterId);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    cancelCharacterCreation();
    onCancel();
  };

  const handleRandomizeAll = () => {
    const randomChar = generateRandomCharacter(playerId);
    updateCreationState({ character: randomChar });
  };

  // Validation for each step
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(character.name && character.race?.name && character.classes?.[0]?.name);
      case 2:
        return !!(character.abilities);
      case 3:
        return true; // Details are optional
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    const stepProps = {
      character,
      updateCharacter,
      onNext: handleNext,
      onPrevious: handlePrevious,
      canProceed: canProceedFromStep(currentStep),
      isFirstStep: currentStep === 1,
      isLastStep: currentStep === totalSteps
    };

    switch (currentStep) {
      case 1:
        return <CoreConceptStep {...stepProps} />;
      case 2:
        return <AbilityScoresStep {...stepProps} />;
      case 3:
        return <DetailsStep {...stepProps} />;
      default:
        return null;
    }
  };

  const containerClass = isModal ? 'character-wizard-modal' : 'character-wizard-fullpage';

  return (
    <div className={`character-creation-wizard ${containerClass}`}>
      {isModal && <div className="modal-backdrop" onClick={handleCancel} />}

      <div className="wizard-container">
        {/* Header */}
        <div className="wizard-header">
          <h1>Create New Character</h1>
          <div className="wizard-actions">
            <button
              className="randomize-everything-btn"
              onClick={handleRandomizeAll}
              title="Randomize entire character"
            >
              🎲 Random Character
            </button>
            <button
              className="cancel-btn"
              onClick={handleCancel}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="wizard-progress">
          <div className="progress-steps">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i + 1}
                className={`progress-step ${i + 1 <= currentStep ? 'active' : ''} ${i + 1 < currentStep ? 'completed' : ''}`}
              >
                <div className="step-number">{i + 1}</div>
                <div className="step-label">
                  {i + 1 === 1 && 'Concept'}
                  {i + 1 === 2 && 'Abilities'}
                  {i + 1 === 3 && 'Details'}
                </div>
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="wizard-content">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};