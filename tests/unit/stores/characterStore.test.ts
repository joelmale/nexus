import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import type { Character } from '@/types/character';
import { createEmptyCharacter, calculateAbilityModifier } from '@/types/character';
vi.mock('@/services/linearFlowStorage', () => ({
  getLinearFlowStorage: vi.fn(() => ({
    saveCharacter: vi.fn(),
    getBrowserId: vi.fn(() => 'browser-id'),
  })),
}));

// Mock the character types utilities
describe('CharacterStore', () => {
  vi.mock('@/types/character', async () => {
    const actual = await vi.importActual('@/types/character');
    return {
      ...actual,
      createEmptyCharacter: vi.fn(),
      calculateAbilityModifier: (score: number) => Math.floor((score - 10) / 2),
      calculateProficiencyBonus: (level: number) => Math.ceil(level / 4) + 1,
      calculatePassivePerception: vi.fn().mockReturnValue(10),
    };
  });
  let idCounter = 0;
  const createMockCharacter = (playerId: string): Character => {
    idCounter++;
    return JSON.parse(JSON.stringify({
      id: `char-${idCounter}`,
      playerId,
      name: `Test Character ${idCounter}`,
      level: 1,
      race: { name: 'Human', subrace: '', traits: [], abilityScoreIncrease: {}, languages: [], proficiencies: [] },
      classes: [{ name: 'Fighter', level: 1, hitDie: 'd10' }],
      background: { name: 'Soldier', skillProficiencies: [], languages: [], equipment: [], feature: '' },
      abilities: {
        strength: { score: 10, modifier: 0, savingThrow: 0 },
        dexterity: { score: 10, modifier: 0, savingThrow: 0 },
        constitution: { score: 10, modifier: 0, savingThrow: 0 },
        intelligence: { score: 10, modifier: 0, savingThrow: 0 },
        wisdom: { score: 10, modifier: 0, savingThrow: 0 },
        charisma: { score: 10, modifier: 0, savingThrow: 0 },
      },
      skills: [
        { name: 'Athletics', ability: 'strength', proficient: false, expertise: false, modifier: 0 },
        { name: 'Acrobatics', ability: 'dexterity', proficient: false, expertise: false, modifier: 0 },
        { name: 'Perception', ability: 'wisdom', proficient: false, expertise: false, modifier: 0 },
        { name: 'Stealth', ability: 'dexterity', proficient: false, expertise: false, modifier: 0 },
      ],
      hitPoints: { maximum: 10, current: 10, temporary: 0 },
      armorClass: 10,
      proficiencyBonus: 2,
      passivePerception: 10,
      equipment: [],
      spells: [],
      features: [],
      attacks: [],
      languageProficiencies: ['Common'],
      toolProficiencies: [],
      weaponProficiencies: [],
      armorProficiencies: [],
      personalityTraits: [],
      ideals: [],
      bonds: [],
      flaws: [],
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '1.0',
      alignment: 'Neutral',
      experiencePoints: 0,
      hitDice: { total: 1, remaining: 1 },
      inspiration: false,
    }));
  };

  beforeEach(() => {
    act(() => {
      useCharacterStore.getState().reset();
    });
    idCounter = 0;
    vi.mocked(createEmptyCharacter).mockImplementation(createMockCharacter);
  });

  describe('Character Creation', () => {
    it('should create a new character with valid player ID', () => {
      const playerId = 'player-123';
      let characterId: string | undefined;

      act(() => {
        characterId = useCharacterStore.getState().createCharacter(playerId);
      });

      const { characters } = useCharacterStore.getState();
      expect(characterId).toBe('char-1');
      expect(characters).toHaveLength(1);
      expect(characters[0].playerId).toBe(playerId);
      expect(createEmptyCharacter).toHaveBeenCalledWith(playerId);
    });

    it('should update an existing character', () => {
      const playerId = 'player-123';
      let characterId: string | undefined;
      act(() => {
        characterId = useCharacterStore.getState().createCharacter(playerId);
      });

      const updates = {
        name: 'Updated Name',
        level: 2,
      };

      act(() => {
        useCharacterStore.getState().updateCharacter(characterId!, updates);
      });

      const character = useCharacterStore.getState().getCharacter(characterId!);
      expect(character?.name).toBe('Updated Name');
      expect(character?.level).toBe(2);
      expect(character?.updatedAt).toBeGreaterThan(character?.createdAt || 0);
    });

    it('should delete a character', () => {
      const playerId = 'player-123';
      let characterId: string | undefined;
      act(() => {
        characterId = useCharacterStore.getState().createCharacter(playerId);
      });

      expect(useCharacterStore.getState().characters).toHaveLength(1);

      act(() => {
        useCharacterStore.getState().deleteCharacter(characterId!);
      });

      expect(useCharacterStore.getState().characters).toHaveLength(0);
      expect(useCharacterStore.getState().getCharacter(characterId!)).toBeUndefined();
    });

    it('should set and get active character', () => {
      const playerId = 'player-123';
      let characterId: string | undefined;
      act(() => {
        characterId = useCharacterStore.getState().createCharacter(playerId);
      });

      expect(useCharacterStore.getState().activeCharacterId).toBeNull();

      act(() => {
        useCharacterStore.getState().setActiveCharacter(characterId!);
      });

      expect(useCharacterStore.getState().activeCharacterId).toBe(characterId);

      act(() => {
        useCharacterStore.getState().setActiveCharacter(null);
      });

      expect(useCharacterStore.getState().activeCharacterId).toBeNull();
    });

    it('should get characters by player ID', () => {
      const playerId1 = 'player-1';
      const playerId2 = 'player-2';
      let char1: string | undefined, char2: string | undefined, char3: string | undefined;

      act(() => {
        char1 = useCharacterStore.getState().createCharacter(playerId1);
        char2 = useCharacterStore.getState().createCharacter(playerId1);
        char3 = useCharacterStore.getState().createCharacter(playerId2);
      });

      const player1Characters = useCharacterStore.getState().getCharactersByPlayer(playerId1);
      const player2Characters = useCharacterStore.getState().getCharactersByPlayer(playerId2);

      expect(player1Characters).toHaveLength(2);
      expect(player2Characters).toHaveLength(1);
      expect(player1Characters.map(c => c.id)).toContain(char1);
      expect(player1Characters.map(c => c.id)).toContain(char2);
      expect(player2Characters.map(c => c.id)).toContain(char3);
    });
  });

  describe('Character Stats Management', () => {
    let characterId: string;

    beforeEach(() => {
      act(() => {
        characterId = useCharacterStore.getState().createCharacter('player-123');
      });
    });

    it('should update ability scores and recalculate modifiers', () => {
      act(() => {
        useCharacterStore.getState().updateAbilityScore(characterId, 'strength', 16);
      });

      const character = useCharacterStore.getState().getCharacter(characterId);
      expect(character?.abilities.strength.score).toBe(16);
      expect(character?.abilities.strength.modifier).toBe(calculateAbilityModifier(16));
    });

    it('should update skill proficiency', () => {
      act(() => {
        useCharacterStore.getState().updateSkillProficiency(characterId, 'Athletics', true, false);
      });

      const character = useCharacterStore.getState().getCharacter(characterId);
      const athleticsSkill = character?.skills.find(s => s.name === 'Athletics');
      expect(athleticsSkill?.proficient).toBe(true);
      expect(athleticsSkill?.expertise).toBe(false);
    });

    it('should update skill expertise', () => {
      act(() => {
        useCharacterStore.getState().updateSkillProficiency(characterId, 'Stealth', true, true);
      });

      const character = useCharacterStore.getState().getCharacter(characterId);
      const stealthSkill = character?.skills.find(s => s.name === 'Stealth');
      expect(stealthSkill?.proficient).toBe(true);
      expect(stealthSkill?.expertise).toBe(true);
    });

    it('should update saving throw proficiency', () => {
      act(() => {
        useCharacterStore.getState().updateSavingThrowProficiency(characterId, 'constitution', true);
      });

      const character = useCharacterStore.getState().getCharacter(characterId);
      expect(character?.abilities.constitution.proficient).toBe(true);
    });

    it('should recalculate all stats correctly', () => {
      act(() => {
        useCharacterStore.getState().updateAbilityScore(characterId, 'strength', 16);
        useCharacterStore.getState().updateAbilityScore(characterId, 'dexterity', 14);
        useCharacterStore.getState().updateSkillProficiency(characterId, 'Athletics', true);
      });

      act(() => {
        useCharacterStore.getState().recalculateStats(characterId);
      });

      const character = useCharacterStore.getState().getCharacter(characterId);
      expect(character?.abilities.strength.modifier).toBe(3);
      expect(character?.abilities.dexterity.modifier).toBe(2);

      const athleticsSkill = character?.skills.find(s => s.name === 'Athletics');
      expect(athleticsSkill?.modifier).toBe(3 + 2); // STR modifier + proficiency bonus
    });
  });

  describe('Equipment Management', () => {
    let characterId: string;

    beforeEach(() => {
      act(() => {
        characterId = useCharacterStore.getState().createCharacter('player-123');
      });
    });

    it('should add equipment to character', () => {
      const equipment = {
        name: 'Longsword',
        type: 'weapon',
        weight: 3,
        cost: { amount: 15, currency: 'gp' },
        properties: ['versatile'],
        equipped: false,
        quantity: 1,
      };

      act(() => {
        useCharacterStore.getState().addEquipment(characterId, equipment);
      });

      const character = useCharacterStore.getState().getCharacter(characterId);
      expect(character?.equipment).toHaveLength(1);
      expect(character?.equipment[0].name).toBe('Longsword');
      expect(character?.equipment[0].equipped).toBe(false);
    });

    it('should update existing equipment', () => {
      const equipment = {
        name: 'Shield',
        type: 'armor',
        weight: 6,
        cost: { amount: 10, currency: 'gp' },
        equipped: false,
        quantity: 1,
      };

      act(() => {
        useCharacterStore.getState().addEquipment(characterId, equipment);
      });
      const character = useCharacterStore.getState().getCharacter(characterId);
      const equipmentId = character?.equipment[0]?.id;

      if (!equipmentId) throw new Error('Equipment not found');

      act(() => {
        useCharacterStore.getState().updateEquipment(characterId, equipmentId, { equipped: true });
      });

      const updatedCharacter = useCharacterStore.getState().getCharacter(characterId);
      expect(updatedCharacter?.equipment[0].equipped).toBe(true);
    });

    it('should remove equipment from character', () => {
      const equipment = {
        name: 'Dagger',
        type: 'weapon',
        weight: 1,
        cost: { amount: 2, currency: 'gp' },
        equipped: false,
        quantity: 1,
      };

      act(() => {
        useCharacterStore.getState().addEquipment(characterId, equipment);
      });
      const character = useCharacterStore.getState().getCharacter(characterId);
      const equipmentId = character?.equipment[0]?.id;

      if (!equipmentId) throw new Error('Equipment not found');

      act(() => {
        useCharacterStore.getState().removeEquipment(characterId, equipmentId);
      });

      const updatedCharacter = useCharacterStore.getState().getCharacter(characterId);
      expect(updatedCharacter?.equipment).toHaveLength(0);
    });

    it('should equip and unequip items', () => {
      const equipment = {
        name: 'Plate Armor',
        type: 'armor',
        weight: 65,
        cost: { amount: 1500, currency: 'gp' },
        equipped: false,
        quantity: 1,
      };

      act(() => {
        useCharacterStore.getState().addEquipment(characterId, equipment);
      });
      const character = useCharacterStore.getState().getCharacter(characterId);
      const equipmentId = character?.equipment[0]?.id;

      if (!equipmentId) throw new Error('Equipment not found');

      act(() => {
        useCharacterStore.getState().equipItem(characterId, equipmentId);
      });
      let updatedCharacter = useCharacterStore.getState().getCharacter(characterId);
      expect(updatedCharacter?.equipment[0].equipped).toBe(true);

      act(() => {
        useCharacterStore.getState().unequipItem(characterId, equipmentId);
      });
      updatedCharacter = useCharacterStore.getState().getCharacter(characterId);
      expect(updatedCharacter?.equipment[0].equipped).toBe(false);
    });
  });

  describe('Character Creation Wizard', () => {
    it('should start character creation with guided method', () => {
      const playerId = 'player-123';

      act(() => {
        useCharacterStore.getState().startCharacterCreation(playerId, 'guided');
      });

      const { creationState } = useCharacterStore.getState();
      expect(creationState).toBeDefined();
      expect(creationState?.playerId).toBe(playerId);
      expect(creationState?.method).toBe('guided');
      expect(creationState?.step).toBe(1);
    });

    it('should update creation state', () => {
      const playerId = 'player-123';
      act(() => {
        useCharacterStore.getState().startCharacterCreation(playerId, 'manual');
      });

      const updates = {
        character: {
          name: 'Test Character',
          race: { name: 'Elf' },
        },
      };

      act(() => {
        useCharacterStore.getState().updateCreationState(updates);
      });

      const { creationState } = useCharacterStore.getState();
      expect(creationState?.character?.name).toBe('Test Character');
      expect(creationState?.character?.race?.name).toBe('Elf');
    });

    it('should navigate through creation steps', () => {
      const playerId = 'player-123';
      act(() => {
        useCharacterStore.getState().startCharacterCreation(playerId, 'guided');
      });

      expect(useCharacterStore.getState().creationState?.step).toBe(1);

      act(() => {
        useCharacterStore.getState().nextCreationStep();
      });
      expect(useCharacterStore.getState().creationState?.step).toBe(2);

      act(() => {
        useCharacterStore.getState().nextCreationStep();
      });
      expect(useCharacterStore.getState().creationState?.step).toBe(3);

      act(() => {
        useCharacterStore.getState().previousCreationStep();
      });
      expect(useCharacterStore.getState().creationState?.step).toBe(2);
    });

    it('should not go below step 1 or above total steps', () => {
      const playerId = 'player-123';
      act(() => {
        useCharacterStore.getState().startCharacterCreation(playerId, 'guided');
      });

      act(() => {
        useCharacterStore.getState().previousCreationStep();
      });
      expect(useCharacterStore.getState().creationState?.step).toBe(1);

      const totalSteps = useCharacterStore.getState().creationState?.totalSteps || 4;
      for (let i = 1; i < totalSteps; i++) {
        act(() => {
          useCharacterStore.getState().nextCreationStep();
        });
      }

      act(() => {
        useCharacterStore.getState().nextCreationStep();
      });
      expect(useCharacterStore.getState().creationState?.step).toBe(totalSteps);
    });

    it('should complete character creation and add to characters list', () => {
      const playerId = 'player-123';
      act(() => {
        useCharacterStore.getState().startCharacterCreation(playerId, 'manual');
      });

      act(() => {
        useCharacterStore.getState().updateCreationState({
          character: {
            name: 'Test Character',
            race: { name: 'Human' },
            classes: [{ name: 'Fighter', level: 1 }],
            abilities: {
              strength: { score: 10, modifier: 0, savingThrow: 0 },
              dexterity: { score: 10, modifier: 0, savingThrow: 0 },
              constitution: { score: 10, modifier: 0, savingThrow: 0 },
              intelligence: { score: 10, modifier: 0, savingThrow: 0 },
              wisdom: { score: 10, modifier: 0, savingThrow: 0 },
              charisma: { score: 10, modifier: 0, savingThrow: 0 },
            },
          },
        });
      });

      let characterId: string | undefined;
      act(() => {
        characterId = useCharacterStore.getState().completeCharacterCreation();
      });

      const { characters, creationState } = useCharacterStore.getState();
      expect(characterId).toBeDefined();
      expect(characters).toHaveLength(1);
      expect(creationState).toBeNull();
      expect(characters[0].name).toBe('Test Character');
    });

    it('should cancel character creation', () => {
      const playerId = 'player-123';
      act(() => {
        useCharacterStore.getState().startCharacterCreation(playerId, 'guided');
      });

      expect(useCharacterStore.getState().creationState).toBeDefined();

      act(() => {
        useCharacterStore.getState().cancelCharacterCreation();
      });

      const { characters, creationState } = useCharacterStore.getState();
      expect(creationState).toBeNull();
      expect(characters).toHaveLength(0);
    });
  });

  describe('Combat Integration', () => {
    let characterId: string;

    beforeEach(() => {
      act(() => {
        characterId = useCharacterStore.getState().createCharacter('player-123');
      });
    });

    it('should update character HP', () => {
      act(() => {
        useCharacterStore.getState().updateCharacterHP(characterId, 8, 2);
      });

      const character = useCharacterStore.getState().getCharacter(characterId);
      expect(character?.hitPoints.current).toBe(8);
      expect(character?.hitPoints.temporary).toBe(2);
    });

    it('should update character HP without temporary HP', () => {
      act(() => {
        useCharacterStore.getState().updateCharacterHP(characterId, 5);
      });

      const character = useCharacterStore.getState().getCharacter(characterId);
      expect(character?.hitPoints.current).toBe(5);
      expect(character?.hitPoints.temporary).toBe(0);
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state', () => {
      const playerId = 'player-123';
      act(() => {
        useCharacterStore.getState().createCharacter(playerId);
        useCharacterStore.getState().startCharacterCreation(playerId, 'guided');
      });

      expect(useCharacterStore.getState().characters).toHaveLength(1);
      expect(useCharacterStore.getState().creationState).toBeDefined();

      act(() => {
        useCharacterStore.getState().reset();
      });

      const { characters, activeCharacterId, creationState, mobs, mobGroups, selectedMobs } = useCharacterStore.getState();
      expect(characters).toHaveLength(0);
      expect(activeCharacterId).toBeNull();
      expect(creationState).toBeNull();
      expect(mobs).toHaveLength(0);
      expect(mobGroups).toHaveLength(0);
      expect(selectedMobs).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle updates to non-existent character gracefully', () => {
      act(() => {
        expect(() => {
          useCharacterStore.getState().updateCharacter('non-existent', { name: 'Test' });
        }).not.toThrow();
      });

      act(() => {
        expect(() => {
          useCharacterStore.getState().updateAbilityScore('non-existent', 'strength', 16);
        }).not.toThrow();
      });

      act(() => {
        expect(() => {
          useCharacterStore.getState().updateCharacterHP('non-existent', 10);
        }).not.toThrow();
      });
    });

    it('should handle deletion of non-existent character gracefully', () => {
      act(() => {
        expect(() => {
          useCharacterStore.getState().deleteCharacter('non-existent');
        }).not.toThrow();
      });

      expect(useCharacterStore.getState().characters).toHaveLength(0);
    });
  });
});