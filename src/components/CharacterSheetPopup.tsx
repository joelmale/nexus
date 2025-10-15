/**
 * Compact Character Sheet Popup Component
 *
 * Displays a parchment-styled character sheet popup when clicking on a character
 * in the Player Setup page. Features D&D-themed styling with scroll aesthetics.
 */

import React, { useEffect } from 'react';
import type { Character } from '@/types/character';

interface CharacterSheetPopupProps {
  character: Character;
  isOpen: boolean;
  onClose: () => void;
}

export const CharacterSheetPopup: React.FC<CharacterSheetPopupProps> = ({
  character,
  isOpen,
  onClose,
}) => {
  // Handle ESC key to close popup
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate ability modifiers
  const getModifier = (score: number): string => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Get proficiency bonus
  const profBonus = Math.ceil(character.level / 4) + 1;

  // Get proficient skills
  const proficientSkills = character.skills.filter((skill) => skill.proficient);

  // Get cantrips
  const cantrips = character.spells.filter((spell) => spell.level === 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="character-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popup */}
      <div
        className="character-sheet-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-name"
      >
        {/* Close Button */}
        <button
          className="character-sheet-close"
          onClick={onClose}
          aria-label="Close character sheet"
          type="button"
        >
          ✕
        </button>

        {/* Header Section */}
        <header className="character-sheet-header">
          <h1 id="character-name" className="character-name">
            {character.name}
          </h1>
          <div className="character-subtitle">
            {character.race.name}
            {character.race.subrace && ` (${character.race.subrace})`}
            {' • '}
            {character.classes[0]?.name} {character.level}
            {' • '}
            {character.background.name}
          </div>
          <div className="character-alignment">{character.alignment}</div>
        </header>

        {/* Core Stats Grid */}
        <div className="character-sheet-grid">
          {/* Abilities */}
          <section className="character-section abilities-section">
            <h2 className="section-header">Abilities</h2>
            <div className="abilities-grid">
              {Object.entries(character.abilities).map(([key, ability]) => {
                const modifier = Math.floor((ability.score - 10) / 2);
                const modifierClass =
                  modifier > 0
                    ? 'modifier-positive'
                    : modifier < 0
                      ? 'modifier-negative'
                      : 'modifier-zero';
                return (
                  <div key={key} className="ability-item">
                    <span className="ability-name">{key.toUpperCase()}</span>
                    <span className="ability-score">{ability.score}</span>
                    <span className={`ability-modifier ${modifierClass}`}>
                      ({getModifier(ability.score)})
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Combat Stats */}
          <section className="character-section combat-section">
            <h2 className="section-header">Combat</h2>
            <div className="combat-stats">
              <div className="combat-stat">
                <span className="stat-label">AC</span>
                <span className="stat-value">{character.armorClass}</span>
              </div>
              <div className="combat-stat">
                <span className="stat-label">HP</span>
                <span className="stat-value">
                  {character.hitPoints.current}/{character.hitPoints.maximum}
                </span>
              </div>
              <div className="combat-stat">
                <span className="stat-label">Initiative</span>
                <span className="stat-value">
                  {character.initiative >= 0 ? '+' : ''}
                  {character.initiative}
                </span>
              </div>
              <div className="combat-stat">
                <span className="stat-label">Speed</span>
                <span className="stat-value">{character.speed}ft</span>
              </div>
            </div>
          </section>

          {/* Skills */}
          <section className="character-section skills-section">
            <h2 className="section-header">
              Skills <span className="prof-bonus">(Prof. +{profBonus})</span>
            </h2>
            <div className="skills-list">
              {proficientSkills.slice(0, 6).map((skill) => (
                <div key={skill.name} className="skill-item">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-modifier">
                    {skill.modifier >= 0 ? '+' : ''}
                    {skill.modifier}
                  </span>
                </div>
              ))}
              {proficientSkills.length > 6 && (
                <div className="skill-item more-skills">
                  +{proficientSkills.length - 6} more...
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Spells Section (if applicable) */}
        {character.spellcasting && (
          <section className="character-section spells-section">
            <h2 className="section-header">Spells</h2>
            <div className="spells-content">
              <div className="spell-info">
                <span>Cantrips: {cantrips.length}</span>
                <span>Spell Save DC: {character.spellcasting.spellSaveDC}</span>
                <span>
                  Spell Attack:{' '}
                  {character.spellcasting.spellAttackBonus >= 0 ? '+' : ''}
                  {character.spellcasting.spellAttackBonus}
                </span>
              </div>
              {character.spellcasting.spellSlots.length > 0 && (
                <div className="spell-slots">
                  {character.spellcasting.spellSlots.map((slot) => (
                    <span key={slot.level} className="spell-slot">
                      {slot.level}: {slot.used}/{slot.total}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Equipment Section */}
        <section className="character-section equipment-section">
          <h2 className="section-header">Equipment</h2>
          <div className="equipment-list">
            {character.equipment.slice(0, 8).map((item) => (
              <span key={item.id} className="equipment-item">
                {item.name}
                {item.quantity > 1 && ` (${item.quantity})`}
              </span>
            ))}
            {character.equipment.length > 8 && (
              <span className="equipment-item more-items">
                +{character.equipment.length - 8} more...
              </span>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="character-section features-section">
          <h2 className="section-header">Features & Traits</h2>
          <div className="features-list">
            {character.features.slice(0, 4).map((feature) => (
              <span key={feature.id} className="feature-item">
                {feature.name}
              </span>
            ))}
            {character.features.length > 4 && (
              <span className="feature-item more-features">
                +{character.features.length - 4} more...
              </span>
            )}
          </div>
        </section>
      </div>
    </>
  );
};
