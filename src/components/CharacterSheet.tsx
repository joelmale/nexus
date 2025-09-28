import React, { useState } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import type { Character, AbilityScores } from '@/types/character';

interface CharacterSheetProps {
  character: Character;
  readonly?: boolean;
}

interface AbilityScoreProps {
  name: string;
  ability: keyof AbilityScores;
  character: Character;
  readonly?: boolean;
}

const AbilityScore: React.FC<AbilityScoreProps> = ({ name, ability, character, readonly }) => {
  const { updateAbilityScore, updateSavingThrowProficiency } = useCharacterStore();
  const abilityData = character.abilities[ability];

  return (
    <div className="ability-score">
      <label className="ability-name">{name}</label>
      <div className="ability-score-display">
        <input
          type="number"
          value={abilityData.score}
          onChange={(e) => !readonly && updateAbilityScore(character.id, ability, parseInt(e.target.value, 10) || 10)}
          min="1"
          max="30"
          className="score-input"
          readOnly={readonly}
        />
        <div className="modifier">{abilityData.modifier >= 0 ? '+' : ''}{abilityData.modifier}</div>
      </div>

      <div className="saving-throw">
        <label className="save-label">
          <input
            type="checkbox"
            checked={abilityData.proficient || false}
            onChange={(e) => !readonly && updateSavingThrowProficiency(character.id, ability, e.target.checked)}
            disabled={readonly}
          />
          Save: {abilityData.savingThrow >= 0 ? '+' : ''}{abilityData.savingThrow}
        </label>
      </div>
    </div>
  );
};

const SkillsList: React.FC<{ character: Character; readonly?: boolean }> = ({ character, readonly }) => {
  const { updateSkillProficiency } = useCharacterStore();

  return (
    <div className="skills-section">
      <h4>Skills</h4>
      <div className="skills-list">
        {character.skills?.map((skill) => (
          <div key={skill.name} className="skill-item">
            <label className="skill-label">
              <input
                type="checkbox"
                checked={skill.proficient}
                onChange={(e) => !readonly && updateSkillProficiency(character.id, skill.name, e.target.checked)}
                disabled={readonly}
              />
              <input
                type="checkbox"
                checked={skill.expertise}
                onChange={(e) => !readonly && updateSkillProficiency(character.id, skill.name, skill.proficient, e.target.checked)}
                disabled={readonly || !skill.proficient}
                title="Expertise (double proficiency)"
                className="expertise-checkbox"
              />
              <span className="skill-name">{skill.name}</span>
              <span className="skill-modifier">
                {skill.modifier >= 0 ? '+' : ''}{skill.modifier}
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

const EquipmentList: React.FC<{ character: Character; readonly?: boolean }> = ({ character, readonly }) => {
  const { addEquipment, updateEquipment, removeEquipment, equipItem, unequipItem } = useCharacterStore();
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'weapon' | 'armor' | 'tool' | 'consumable' | 'treasure' | 'other'>('other');

  const handleAddEquipment = () => {
    if (newItemName.trim() && !readonly) {
      addEquipment(character.id, {
        name: newItemName.trim(),
        type: newItemType,
        quantity: 1,
        weight: 0,
        equipped: false,
      });
      setNewItemName('');
    }
  };

  return (
    <div className="equipment-section">
      <h4>Equipment</h4>

      {!readonly && (
        <div className="add-equipment">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Equipment name"
            className="equipment-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAddEquipment()}
          />
          <select
            value={newItemType}
            onChange={(e) => setNewItemType(e.target.value as any)}
            className="equipment-type-select"
          >
            <option value="weapon">Weapon</option>
            <option value="armor">Armor</option>
            <option value="tool">Tool</option>
            <option value="consumable">Consumable</option>
            <option value="treasure">Treasure</option>
            <option value="other">Other</option>
          </select>
          <button onClick={handleAddEquipment} className="add-equipment-btn">Add</button>
        </div>
      )}

      <div className="equipment-list">
        {character.equipment?.map((item) => (
          <div key={item.id} className={`equipment-item ${item.equipped ? 'equipped' : ''}`}>
            <div className="equipment-info">
              <input
                type="text"
                value={item.name}
                onChange={(e) => !readonly && updateEquipment(character.id, item.id, { name: e.target.value })}
                className="equipment-name"
                readOnly={readonly}
              />
              <span className="equipment-type">{item.type}</span>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => !readonly && updateEquipment(character.id, item.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                min="0"
                className="equipment-quantity"
                readOnly={readonly}
              />
            </div>

            {!readonly && (
              <div className="equipment-actions">
                <button
                  onClick={() => item.equipped ? unequipItem(character.id, item.id) : equipItem(character.id, item.id)}
                  className={`equip-btn ${item.equipped ? 'equipped' : ''}`}
                >
                  {item.equipped ? 'Unequip' : 'Equip'}
                </button>
                <button
                  onClick={() => removeEquipment(character.id, item.id)}
                  className="remove-equipment-btn"
                >
                  ❌
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, readonly = false }) => {
  const { updateCharacter, updateCharacterHP } = useCharacterStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'equipment' | 'spells' | 'notes'>('stats');

  const handleBasicInfoChange = (field: keyof Character, value: any) => {
    if (!readonly) {
      try {
        updateCharacter(character.id, { [field]: value });
      } catch (error) {
        console.error('Failed to update character:', error);
        // In a real app, you might want to show a toast notification
      }
    }
  };

  const handleHPChange = (field: 'current' | 'maximum' | 'temporary', value: number) => {
    if (!readonly) {
      try {
        if (field === 'current' || field === 'temporary') {
          updateCharacterHP(character.id, field === 'current' ? value : character.hitPoints.current, field === 'temporary' ? value : character.hitPoints.temporary);
        } else {
          updateCharacter(character.id, {
            hitPoints: {
              ...character.hitPoints,
              [field]: value,
            },
          });
        }
      } catch (error) {
        console.error('Failed to update character HP:', error);
        // In a real app, you might want to show a toast notification
      }
    }
  };

  return (
    <div className="character-sheet">
      {/* Basic Info Header */}
      <div className="character-header">
        <div className="character-basic-info">
          <input
            type="text"
            value={character.name}
            onChange={(e) => handleBasicInfoChange('name', e.target.value)}
            placeholder="Character Name"
            className="character-name"
            readOnly={readonly}
          />

          <div className="character-meta">
            <div className="meta-group">
              <label htmlFor="character-level">Level</label>
              <input
                type="number"
                id="character-level"
                value={character.level}
                onChange={(e) => handleBasicInfoChange('level', parseInt(e.target.value, 10) || 1)}
                min="1"
                max="20"
                className="level-input"
                readOnly={readonly}
              />
            </div>

            <div className="meta-group">
              <label htmlFor="character-race">Race</label>
              <input
                type="text"
                id="character-race"
                value={character.race?.name || ''}
                onChange={(e) => handleBasicInfoChange('race', { ...character.race, name: e.target.value })}
                placeholder="Race"
                className="race-input"
                readOnly={readonly}
              />
            </div>

            <div className="meta-group">
              <label htmlFor="character-class">Class</label>
              <input
                type="text"
                id="character-class"
                value={character.classes?.[0]?.name || ''}
                onChange={(e) => {
                  const newClass = { ...character.classes?.[0], name: e.target.value, level: character.level };
                  handleBasicInfoChange('classes', [newClass]);
                }}
                placeholder="Class"
                className="class-input"
                readOnly={readonly}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-block">
            <label htmlFor="character-ac">AC</label>
            <input
              type="number"
              id="character-ac"
              value={character.armorClass}
              onChange={(e) => handleBasicInfoChange('armorClass', parseInt(e.target.value, 10) || 10)}
              min="0"
              className="ac-input"
              readOnly={readonly}
            />
          </div>

          <div className="stat-block">
            <label>Initiative</label>
            <div className="initiative-display">
              {character.initiative >= 0 ? '+' : ''}{character.initiative}
            </div>
          </div>

          <div className="stat-block">
            <label htmlFor="character-speed">Speed</label>
            <input
              type="number"
              id="character-speed"
              value={character.speed}
              onChange={(e) => handleBasicInfoChange('speed', parseInt(e.target.value, 10) || 30)}
              min="0"
              className="speed-input"
              readOnly={readonly}
            />
            <span className="speed-unit">ft</span>
          </div>
        </div>
      </div>

      {/* Hit Points */}
      <div className="hit-points-section">
        <div className="hp-group">
          <label>Hit Points</label>
          <div className="hp-inputs">
            <input
              type="number"
              value={character.hitPoints.current}
              onChange={(e) => handleHPChange('current', parseInt(e.target.value, 10) || 0)}
              min="0"
              max={character.hitPoints.maximum}
              className="current-hp"
              readOnly={readonly}
              aria-label="Current Hit Points"
            />
            <span>/</span>
            <input
              type="number"
              value={character.hitPoints.maximum}
              onChange={(e) => handleHPChange('maximum', parseInt(e.target.value, 10) || 1)}
              min="1"
              className="max-hp"
              readOnly={readonly}
              aria-label="Maximum Hit Points"
            />
          </div>
        </div>

        <div className="temp-hp-group">
          <label htmlFor="character-temp-hp">Temp HP</label>
          <input
            type="number"
            id="character-temp-hp"
            value={character.hitPoints.temporary}
            onChange={(e) => handleHPChange('temporary', parseInt(e.target.value, 10) || 0)}
            min="0"
            className="temp-hp"
            readOnly={readonly}
          />
        </div>

        <div className="hp-bar">
          <div
            className="hp-fill"
            style={{
              width: `${(character.hitPoints.current / character.hitPoints.maximum) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="character-tabs">
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
        <button
          className={`tab-btn ${activeTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          ⚔️ Equipment
        </button>
        <button
          className={`tab-btn ${activeTab === 'spells' ? 'active' : ''}`}
          onClick={() => setActiveTab('spells')}
        >
          ✨ Spells
        </button>
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Notes
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'stats' && (
          <div className="stats-tab">
            {/* Ability Scores */}
            <div className="ability-scores">
              <h4>Ability Scores</h4>
              <div className="abilities-grid">
                <AbilityScore name="STR" ability="strength" character={character} readonly={readonly} />
                <AbilityScore name="DEX" ability="dexterity" character={character} readonly={readonly} />
                <AbilityScore name="CON" ability="constitution" character={character} readonly={readonly} />
                <AbilityScore name="INT" ability="intelligence" character={character} readonly={readonly} />
                <AbilityScore name="WIS" ability="wisdom" character={character} readonly={readonly} />
                <AbilityScore name="CHA" ability="charisma" character={character} readonly={readonly} />
              </div>
            </div>

            {/* Skills */}
            <SkillsList character={character} readonly={readonly} />

            {/* Other Stats */}
            <div className="other-stats">
              <div className="stat-item">
                <label>Proficiency Bonus</label>
                <span>+{character.proficiencyBonus}</span>
              </div>
              <div className="stat-item">
                <label>Passive Perception</label>
                <span>{character.passivePerception}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <EquipmentList character={character} readonly={readonly} />
        )}

        {activeTab === 'spells' && (
          <div className="spells-tab">
            <div className="placeholder-content">
              <h4>Spellcasting</h4>
              <p>Spell management will be implemented in future updates.</p>
              {character.spellcasting && (
                <div className="spellcasting-info">
                  <p>Spellcasting Class: {character.spellcasting.class}</p>
                  <p>Spell Save DC: {character.spellcasting.spellSaveDC}</p>
                  <p>Spell Attack Bonus: +{character.spellcasting.spellAttackBonus}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-tab">
            <div className="notes-section">
              <h4>Character Notes</h4>
              <textarea
                value={character.notes}
                onChange={(e) => handleBasicInfoChange('notes', e.target.value)}
                placeholder="Add notes about your character..."
                className="character-notes"
                rows={6}
                readOnly={readonly}
              />
            </div>

            <div className="personality-section">
              <h4>Personality</h4>
              <div className="personality-grid">
                <div>
                  <label>Personality Traits</label>
                  <textarea
                    value={character.personalityTraits?.join('\n') || ''}
                    onChange={(e) => handleBasicInfoChange('personalityTraits', e.target.value.split('\n').filter(t => t.trim()))}
                    rows={2}
                    className="personality-input"
                    readOnly={readonly}
                  />
                </div>
                <div>
                  <label>Ideals</label>
                  <textarea
                    value={character.ideals?.join('\n') || ''}
                    onChange={(e) => handleBasicInfoChange('ideals', e.target.value.split('\n').filter(t => t.trim()))}
                    rows={2}
                    className="personality-input"
                    readOnly={readonly}
                  />
                </div>
                <div>
                  <label>Bonds</label>
                  <textarea
                    value={character.bonds?.join('\n') || ''}
                    onChange={(e) => handleBasicInfoChange('bonds', e.target.value.split('\n').filter(t => t.trim()))}
                    rows={2}
                    className="personality-input"
                    readOnly={readonly}
                  />
                </div>
                <div>
                  <label>Flaws</label>
                  <textarea
                    value={character.flaws?.join('\n') || ''}
                    onChange={(e) => handleBasicInfoChange('flaws', e.target.value.split('\n').filter(t => t.trim()))}
                    rows={2}
                    className="personality-input"
                    readOnly={readonly}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};