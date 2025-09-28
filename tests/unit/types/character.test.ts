import { describe, it, expect } from 'vitest';
import {
  calculateAbilityModifier,
  calculateProficiencyBonus,
  calculatePassivePerception,
  createEmptyCharacter,
  STANDARD_SKILLS
} from '@/types/character';
import type { Character, AbilityScores } from '@/types/character';

describe('Character Utility Functions', () => {
  describe('calculateAbilityModifier', () => {
    it('should calculate correct modifiers for various ability scores', () => {
      expect(calculateAbilityModifier(1)).toBe(-5);
      expect(calculateAbilityModifier(8)).toBe(-1);
      expect(calculateAbilityModifier(9)).toBe(-1);
      expect(calculateAbilityModifier(10)).toBe(0);
      expect(calculateAbilityModifier(11)).toBe(0);
      expect(calculateAbilityModifier(12)).toBe(1);
      expect(calculateAbilityModifier(13)).toBe(1);
      expect(calculateAbilityModifier(14)).toBe(2);
      expect(calculateAbilityModifier(15)).toBe(2);
      expect(calculateAbilityModifier(16)).toBe(3);
      expect(calculateAbilityModifier(17)).toBe(3);
      expect(calculateAbilityModifier(18)).toBe(4);
      expect(calculateAbilityModifier(20)).toBe(5);
      expect(calculateAbilityModifier(30)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(calculateAbilityModifier(0)).toBe(-5);
      expect(calculateAbilityModifier(-1)).toBe(-6);
      expect(calculateAbilityModifier(100)).toBe(45);
    });
  });

  describe('calculateProficiencyBonus', () => {
    it('should calculate correct proficiency bonus for character levels', () => {
      expect(calculateProficiencyBonus(1)).toBe(2);
      expect(calculateProficiencyBonus(2)).toBe(2);
      expect(calculateProficiencyBonus(3)).toBe(2);
      expect(calculateProficiencyBonus(4)).toBe(2);
      expect(calculateProficiencyBonus(5)).toBe(3);
      expect(calculateProficiencyBonus(6)).toBe(3);
      expect(calculateProficiencyBonus(7)).toBe(3);
      expect(calculateProficiencyBonus(8)).toBe(3);
      expect(calculateProficiencyBonus(9)).toBe(4);
      expect(calculateProficiencyBonus(10)).toBe(4);
      expect(calculateProficiencyBonus(11)).toBe(4);
      expect(calculateProficiencyBonus(12)).toBe(4);
      expect(calculateProficiencyBonus(13)).toBe(5);
      expect(calculateProficiencyBonus(14)).toBe(5);
      expect(calculateProficiencyBonus(15)).toBe(5);
      expect(calculateProficiencyBonus(16)).toBe(5);
      expect(calculateProficiencyBonus(17)).toBe(6);
      expect(calculateProficiencyBonus(18)).toBe(6);
      expect(calculateProficiencyBonus(19)).toBe(6);
      expect(calculateProficiencyBonus(20)).toBe(6);
    });

    it('should handle edge cases', () => {
      expect(calculateProficiencyBonus(0)).toBe(2); // Minimum level 1
      expect(calculateProficiencyBonus(-1)).toBe(2); // Minimum level 1
      expect(calculateProficiencyBonus(21)).toBe(7); // Beyond level 20
    });
  });

  describe('calculatePassivePerception', () => {
    const mockAbilities: AbilityScores = {
      strength: { score: 10, modifier: 0, savingThrow: 0 },
      dexterity: { score: 10, modifier: 0, savingThrow: 0 },
      constitution: { score: 10, modifier: 0, savingThrow: 0 },
      intelligence: { score: 10, modifier: 0, savingThrow: 0 },
      wisdom: { score: 14, modifier: 2, savingThrow: 2 },
      charisma: { score: 10, modifier: 0, savingThrow: 0 },
    };

    it('should calculate passive perception without proficiency', () => {
      const skills = STANDARD_SKILLS.map(skill => ({
        ...skill,
        proficient: false,
        expertise: false,
        modifier: skill.ability === 'wisdom' ? 2 : 0,
      }));

      const passivePerception = calculatePassivePerception(mockAbilities, skills, 2);
      expect(passivePerception).toBe(12); // 10 + wisdom modifier (2)
    });

    it('should calculate passive perception with proficiency', () => {
      const skills = STANDARD_SKILLS.map(skill => ({
        ...skill,
        proficient: skill.name === 'Perception',
        expertise: false,
        modifier: skill.ability === 'wisdom' ? (skill.name === 'Perception' ? 4 : 2) : 0,
      }));

      const passivePerception = calculatePassivePerception(mockAbilities, skills, 2);
      expect(passivePerception).toBe(14); // 10 + wisdom modifier (2) + proficiency (2)
    });

    it('should calculate passive perception with expertise', () => {
      const skills = STANDARD_SKILLS.map(skill => ({
        ...skill,
        proficient: skill.name === 'Perception',
        expertise: skill.name === 'Perception',
        modifier: skill.ability === 'wisdom' ? (skill.name === 'Perception' ? 6 : 2) : 0,
      }));

      const passivePerception = calculatePassivePerception(mockAbilities, skills, 2);
      expect(passivePerception).toBe(16); // 10 + wisdom modifier (2) + double proficiency (4)
    });

    it('should handle high wisdom scores', () => {
      const highWisdomAbilities: AbilityScores = {
        ...mockAbilities,
        wisdom: { score: 20, modifier: 5, savingThrow: 5 },
      };

      const skills = STANDARD_SKILLS.map(skill => ({
        ...skill,
        proficient: skill.name === 'Perception',
        expertise: true,
        modifier: skill.ability === 'wisdom' ? (skill.name === 'Perception' ? 11 : 5) : 0,
      }));

      const passivePerception = calculatePassivePerception(highWisdomAbilities, skills, 3);
      expect(passivePerception).toBe(21); // 10 + wisdom modifier (5) + double proficiency (6)
    });
  });

  describe('createEmptyCharacter', () => {
    it('should create a character with default values', () => {
      const playerId = 'player-123';
      const character = createEmptyCharacter(playerId);

      expect(character.playerId).toBe(playerId);
      expect(character.name).toBe('');
      expect(character.level).toBe(1);
      expect(character.hitPoints.maximum).toBe(1);
      expect(character.hitPoints.current).toBe(1);
      expect(character.hitPoints.temporary).toBe(0);
      expect(character.armorClass).toBe(10);
      expect(character.proficiencyBonus).toBe(2);
      expect(character.passivePerception).toBe(10);
    });

    it('should create character with proper ability scores', () => {
      const playerId = 'player-123';
      const character = createEmptyCharacter(playerId);

      expect(character.abilities.strength.score).toBe(10);
      expect(character.abilities.strength.modifier).toBe(0);
      expect(character.abilities.dexterity.score).toBe(10);
      expect(character.abilities.dexterity.modifier).toBe(0);
      expect(character.abilities.constitution.score).toBe(10);
      expect(character.abilities.constitution.modifier).toBe(0);
      expect(character.abilities.intelligence.score).toBe(10);
      expect(character.abilities.intelligence.modifier).toBe(0);
      expect(character.abilities.wisdom.score).toBe(10);
      expect(character.abilities.wisdom.modifier).toBe(0);
      expect(character.abilities.charisma.score).toBe(10);
      expect(character.abilities.charisma.modifier).toBe(0);
    });

    it('should create character with all standard skills', () => {
      const playerId = 'player-123';
      const character = createEmptyCharacter(playerId);

      expect(character.skills).toHaveLength(STANDARD_SKILLS.length);

      // Check that all standard skills are present
      STANDARD_SKILLS.forEach(standardSkill => {
        const characterSkill = character.skills.find(s => s.name === standardSkill.name);
        expect(characterSkill).toBeDefined();
        expect(characterSkill?.ability).toBe(standardSkill.ability);
        expect(characterSkill?.proficient).toBe(false);
        expect(characterSkill?.expertise).toBe(false);
        expect(characterSkill?.modifier).toBe(0);
      });
    });

    it('should create character with empty arrays for collections', () => {
      const playerId = 'player-123';
      const character = createEmptyCharacter(playerId);

      expect(character.equipment).toEqual([]);
      expect(character.spells).toEqual([]);
      expect(character.features).toEqual([]);
      expect(character.classes).toEqual([]);
    });

    it('should create character with valid timestamps', () => {
      const playerId = 'player-123';
      const beforeCreation = Date.now();
      const character = createEmptyCharacter(playerId);
      const afterCreation = Date.now();

      expect(character.createdAt).toBeGreaterThanOrEqual(beforeCreation);
      expect(character.createdAt).toBeLessThanOrEqual(afterCreation);
      expect(character.updatedAt).toBe(character.createdAt);
    });

    it('should create character with unique ID', () => {
      const playerId = 'player-123';
      const character1 = createEmptyCharacter(playerId);
      const character2 = createEmptyCharacter(playerId);

      expect(character1.id).toBeDefined();
      expect(character2.id).toBeDefined();
      expect(character1.id).not.toBe(character2.id);
    });

    it('should create character with default personality structure', () => {
      const playerId = 'player-123';
      const character = createEmptyCharacter(playerId);

      expect(character.personalityTraits).toBeDefined();
      expect(character.ideals).toBeDefined();
      expect(character.bonds).toBeDefined();
      expect(character.flaws).toBeDefined();
      expect(character.personalityTraits).toEqual([]);
      expect(character.ideals).toEqual([]);
      expect(character.bonds).toEqual([]);
      expect(character.flaws).toEqual([]);
    });
  });

  describe('STANDARD_SKILLS', () => {
    it('should contain all D&D 5e skills', () => {
      const expectedSkills = [
        'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception',
        'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine',
        'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion',
        'Sleight of Hand', 'Stealth', 'Survival'
      ];

      expect(STANDARD_SKILLS).toHaveLength(expectedSkills.length);

      expectedSkills.forEach(skillName => {
        const skill = STANDARD_SKILLS.find(s => s.name === skillName);
        expect(skill).toBeDefined();
      });
    });

    it('should map skills to correct abilities', () => {
      const skillAbilityMap = {
        'Acrobatics': 'dexterity',
        'Animal Handling': 'wisdom',
        'Arcana': 'intelligence',
        'Athletics': 'strength',
        'Deception': 'charisma',
        'History': 'intelligence',
        'Insight': 'wisdom',
        'Intimidation': 'charisma',
        'Investigation': 'intelligence',
        'Medicine': 'wisdom',
        'Nature': 'intelligence',
        'Perception': 'wisdom',
        'Performance': 'charisma',
        'Persuasion': 'charisma',
        'Religion': 'intelligence',
        'Sleight of Hand': 'dexterity',
        'Stealth': 'dexterity',
        'Survival': 'wisdom'
      };

      Object.entries(skillAbilityMap).forEach(([skillName, expectedAbility]) => {
        const skill = STANDARD_SKILLS.find(s => s.name === skillName);
        expect(skill?.ability).toBe(expectedAbility);
      });
    });
  });
});