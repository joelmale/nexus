import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Character,
  CharacterCreationState,
  Mob,
  MobGroup,
  AbilityScores,
  Equipment,
  CharacterImportSource,
  CharacterExportFormat,
} from '@/types/character';
import type { PlayerCharacter } from '@/types/game';
import { useInitiativeStore } from '@/stores/initiativeStore';
import {
  createEmptyCharacter,
  calculateAbilityModifier,
  calculateProficiencyBonus,
  calculatePassivePerception,
  STANDARD_SKILLS,
} from '@/types/character';

interface CharacterState {
  // Characters
  characters: Character[];
  activeCharacterId: string | null;

  // Character Creation
  creationState: CharacterCreationState | null;

  // Mobs (DM only)
  mobs: Mob[];
  mobGroups: MobGroup[];
  selectedMobs: string[]; // For combat

  // Import/Export
  supportedImports: CharacterImportSource[];
  supportedExports: CharacterExportFormat[];
}

interface CharacterStore extends CharacterState {
  // Character Management
  createCharacter: (playerId: string) => string;
  updateCharacter: (characterId: string, updates: Partial<Character>) => void;
  deleteCharacter: (characterId: string) => void;
  setActiveCharacter: (characterId: string | null) => void;
  getCharacter: (characterId: string) => Character | undefined;
  getCharactersByPlayer: (playerId: string) => Character[];

  // Character Stats Calculation
  updateAbilityScore: (
    characterId: string,
    ability: keyof AbilityScores,
    score: number,
  ) => void;
  updateSkillProficiency: (
    characterId: string,
    skillName: string,
    proficient: boolean,
    expertise?: boolean,
  ) => void;
  updateSavingThrowProficiency: (
    characterId: string,
    ability: keyof AbilityScores,
    proficient: boolean,
  ) => void;
  recalculateStats: (characterId: string) => void;

  // Equipment Management
  addEquipment: (characterId: string, equipment: Omit<Equipment, 'id'>) => void;
  updateEquipment: (
    characterId: string,
    equipmentId: string,
    updates: Partial<Equipment>,
  ) => void;
  removeEquipment: (characterId: string, equipmentId: string) => void;
  equipItem: (characterId: string, equipmentId: string) => void;
  unequipItem: (characterId: string, equipmentId: string) => void;

  // Combat Integration
  addCharacterToCombat: (characterId: string) => void;
  removeCharacterFromCombat: (characterId: string) => void;
  updateCharacterHP: (
    characterId: string,
    current: number,
    temporary?: number,
  ) => void;

  // Character Creation Wizard
  startCharacterCreation: (
    playerId: string,
    method: 'guided' | 'manual' | 'import',
  ) => void;
  updateCreationState: (updates: Partial<CharacterCreationState>) => void;
  nextCreationStep: () => void;
  previousCreationStep: () => void;
  completeCharacterCreation: () => Promise<{
    id: string;
    character: Character;
  } | null>;
  cancelCharacterCreation: () => void;

  // Mob Management (DM only)
  addMob: (mob: Omit<Mob, 'id'>) => string;
  updateMob: (mobId: string, updates: Partial<Mob>) => void;
  deleteMob: (mobId: string) => void;
  getMob: (mobId: string) => Mob | undefined;

  // Mob Groups
  createMobGroup: (name: string, mobIds: string[]) => string;
  updateMobGroup: (groupId: string, updates: Partial<MobGroup>) => void;
  deleteMobGroup: (groupId: string) => void;

  // Combat Preparation
  selectMobForCombat: (mobId: string) => void;
  deselectMobForCombat: (mobId: string) => void;
  clearSelectedMobs: () => void;
  getSelectedMobs: () => Mob[];

  // Import/Export
  importCharacter: (source: string, data: unknown) => Promise<string>;
  importCharactersFromFiles: (files: File[] | FileList) => Promise<{ successful: number; failed: number; errors: string[] }>;
  exportCharacter: (characterId: string, format: string) => Promise<string>;

  // Utility
  reset: () => void;
}

const initialState: CharacterState = {
  characters: [],
  activeCharacterId: null,
  creationState: null,
  mobs: [],
  mobGroups: [],
  selectedMobs: [],
  supportedImports: [
    {
      type: 'forge',
      name: '5e Character Forge',
      description: 'Import from 5e Character Forge',
      icon: '⚒️',
      supported: true,
    },
    {
      type: 'json',
      name: 'Nexus VTT JSON',
      description: 'Native Nexus character format',
      icon: '📄',
      supported: true,
    },
    {
      type: 'ddb',
      name: 'D&D Beyond',
      description: 'Import from D&D Beyond character sheet',
      icon: '🐉',
      supported: false, // Future implementation
    },
    {
      type: 'roll20',
      name: 'Roll20',
      description: 'Import from Roll20 character sheet',
      icon: '🎲',
      supported: false, // Future implementation
    },
    {
      type: 'google-sheets',
      name: 'Google Sheets',
      description: 'Import from Google Sheets template',
      icon: '📊',
      supported: false, // Future implementation
    },
    {
      type: 'pdf',
      name: 'PDF Character Sheet',
      description: 'Extract data from fillable PDF',
      icon: '📋',
      supported: false, // Future implementation
    },
  ],
  supportedExports: [
    {
      type: 'json',
      name: 'Nexus VTT JSON',
      description: 'Native format for backup/sharing',
      icon: '📄',
    },
    {
      type: 'pdf',
      name: 'PDF Character Sheet',
      description: 'Printable character sheet',
      icon: '📋',
    },
    {
      type: 'text',
      name: 'Text Summary',
      description: 'Human-readable character summary',
      icon: '📝',
    },
  ],
};

export const useCharacterStore = create<CharacterStore>()(
  immer((set, get) => ({
    ...initialState,

    // Character Management
    createCharacter: (playerId) => {
      const character = createEmptyCharacter(playerId) as Character;

      set((state) => {
        state.characters.push(character);
        console.log('state.characters', state.characters);
      });

      return character.id!;
    },

    updateCharacter: (characterId, updates) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character) {
          Object.assign(character, updates);
          character.updatedAt = Date.now();

          // Recalculate dependent stats if ability scores changed
          if (updates.abilities) {
            get().recalculateStats(characterId);
          }
        }
      }),

    deleteCharacter: (characterId) =>
      set((state) => {
        const index = state.characters.findIndex((c) => c.id === characterId);
        if (index !== -1) {
          state.characters.splice(index, 1);
          if (state.activeCharacterId === characterId) {
            state.activeCharacterId = null;
          }
        }
      }),

    setActiveCharacter: (characterId) =>
      set((state) => {
        state.activeCharacterId = characterId;
      }),

    getCharacter: (characterId) => {
      return get().characters.find((c) => c.id === characterId);
    },

    getCharactersByPlayer: (playerId) => {
      return get().characters.filter((c) => c.playerId === playerId);
    },

    // Character Stats Calculation
    updateAbilityScore: (characterId, ability, score) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character && character.abilities) {
          character.abilities[ability].score = Math.max(1, Math.min(30, score));
          character.abilities[ability].modifier =
            calculateAbilityModifier(score);
          character.updatedAt = Date.now();
        }
      }),

    updateSkillProficiency: (
      characterId,
      skillName,
      proficient,
      expertise = false,
    ) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character && character.skills) {
          const skill = character.skills.find((s) => s.name === skillName);
          if (skill) {
            skill.proficient = proficient;
            skill.expertise = expertise && proficient; // Can't have expertise without proficiency
            character.updatedAt = Date.now();
          }
        }
      }),

    updateSavingThrowProficiency: (characterId, ability, proficient) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character && character.abilities) {
          character.abilities[ability].proficient = proficient;
          character.updatedAt = Date.now();
        }
      }),

    recalculateStats: (characterId) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (!character || !character.abilities) return;

        const proficiencyBonus = calculateProficiencyBonus(
          character.level || 1,
        );
        character.proficiencyBonus = proficiencyBonus;

        // Recalculate ability modifiers and saving throws
        Object.entries(character.abilities).forEach(
          ([_abilityName, ability]) => {
            ability.modifier = calculateAbilityModifier(ability.score);
            ability.savingThrow =
              ability.modifier + (ability.proficient ? proficiencyBonus : 0);
          },
        );

        // Recalculate skills
        if (character.skills) {
          character.skills.forEach((skill) => {
            const abilityModifier =
              character.abilities![skill.ability].modifier;
            const profBonus = skill.proficient ? proficiencyBonus : 0;
            const expertiseBonus = skill.expertise ? proficiencyBonus : 0;
            skill.modifier = abilityModifier + profBonus + expertiseBonus;
          });
        }

        // Recalculate passive perception
        character.passivePerception = calculatePassivePerception(
          character.abilities,
          character.skills || [],
          proficiencyBonus,
        );

        // Recalculate initiative (Dex modifier)
        character.initiative = character.abilities.dexterity.modifier;

        character.updatedAt = Date.now();
      }),

    // Equipment Management
    addEquipment: (characterId, equipmentData) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character) {
          const equipment = { ...equipmentData, id: crypto.randomUUID() };
          character.equipment = character.equipment || [];
          character.equipment.push(equipment);
          character.updatedAt = Date.now();
        }
      }),

    updateEquipment: (characterId, equipmentId, updates) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character && character.equipment) {
          const equipment = character.equipment.find(
            (e) => e.id === equipmentId,
          );
          if (equipment) {
            Object.assign(equipment, updates);
            character.updatedAt = Date.now();
          }
        }
      }),

    removeEquipment: (characterId, equipmentId) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character && character.equipment) {
          const index = character.equipment.findIndex(
            (e) => e.id === equipmentId,
          );
          if (index !== -1) {
            character.equipment.splice(index, 1);
            character.updatedAt = Date.now();
          }
        }
      }),

    equipItem: (characterId, equipmentId) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character && character.equipment) {
          const equipment = character.equipment.find(
            (e) => e.id === equipmentId,
          );
          if (equipment) {
            equipment.equipped = true;
            character.updatedAt = Date.now();
          }
        }
      }),

    unequipItem: (characterId, equipmentId) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character && character.equipment) {
          const equipment = character.equipment.find(
            (e) => e.id === equipmentId,
          );
          if (equipment) {
            equipment.equipped = false;
            character.updatedAt = Date.now();
          }
        }
      }),

    // Combat Integration
    addCharacterToCombat: (characterId) => {
      const character = get().getCharacter(characterId);
      if (character) {
        // Add to initiative tracker

        const { addEntry } = useInitiativeStore.getState();
        addEntry({
          name: character.name,
          type: 'player',
          initiative: character.initiative || 0,
          maxHP: character.hitPoints?.maximum || 1,
          currentHP: character.hitPoints?.current || 1,
          tempHP: character.hitPoints?.temporary || 0,
          armorClass: character.armorClass || 10,
          conditions: [],
          isActive: false,
          isReady: false,
          isDelayed: false,
          notes: '',
          deathSaves: { successes: 0, failures: 0 },
          initiativeModifier: character.initiative || 0,
          dexterityModifier: character.abilities?.dexterity?.modifier || 0,
          playerId: character.playerId,
        });
      }
    },

    removeCharacterFromCombat: (characterId) => {
      const character = get().getCharacter(characterId);
      if (character) {
        // Remove from initiative tracker

        const { entries, removeEntry } = useInitiativeStore.getState();
        const entry = entries.find((e) => e.playerId === character.playerId);
        if (entry) {
          removeEntry(entry.id);
        }
      }
    },

    updateCharacterHP: (characterId, current, temporary = 0) =>
      set((state) => {
        const character = state.characters.find((c) => c.id === characterId);
        if (character && character.hitPoints) {
          character.hitPoints.current = Math.max(
            0,
            Math.min(character.hitPoints.maximum, current),
          );
          character.hitPoints.temporary = Math.max(0, temporary);
          character.updatedAt = Date.now();
        }
      }),

    // Character Creation Wizard
    startCharacterCreation: (playerId, method) =>
      set((state) => {
        state.creationState = {
          playerId,
          step: 1,
          totalSteps: method === 'guided' ? 8 : 4,
          character: createEmptyCharacter(playerId),
          method,
          isComplete: false,
        };
      }),

    updateCreationState: (updates) =>
      set((state) => {
        if (state.creationState) {
          Object.assign(state.creationState, updates);
        }
      }),

    nextCreationStep: () =>
      set((state) => {
        if (
          state.creationState &&
          state.creationState.step < state.creationState.totalSteps
        ) {
          state.creationState.step += 1;
        }
      }),

    previousCreationStep: () =>
      set((state) => {
        if (state.creationState && state.creationState.step > 1) {
          state.creationState.step -= 1;
        }
      }),

    completeCharacterCreation: async () => {
      // Get the current state
      const { creationState, characters } = get();

      if (creationState && creationState.character) {
        // This is the original, "frozen" character object from the state
        const baseCharacter = creationState.character as Character;

        // Prepare the final skills array. If the base character has no skills,
        // create the default list. Otherwise, use the existing one.
        const finalSkills =
          !baseCharacter.skills || baseCharacter.skills.length === 0
            ? STANDARD_SKILLS.map((skill) => ({
                ...skill,
                proficient: false,
                expertise: false,
                modifier: baseCharacter.abilities![skill.ability].modifier,
              }))
            : baseCharacter.skills;

        // Assemble a completely NEW character object with all the final properties
        const completedCharacter = {
          ...baseCharacter, // Copy all original properties
          id: baseCharacter.id || crypto.randomUUID(), // Add or overwrite properties
          createdAt: Date.now(),
          updatedAt: Date.now(),
          skills: finalSkills, // Add the prepared skills array
        };

        // Update the state using the new, non-frozen object
        set({
          // Create a new array instead of mutating the old one with .push()
          characters: [...characters, completedCharacter],
          creationState: null,
          activeCharacterId: completedCharacter.id,
        });

        // Recalculate stats using the new character's ID
        get().recalculateStats(completedCharacter.id);

        // Save to IndexedDB
        try {
          const { getLinearFlowStorage } = await import(
            '@/services/linearFlowStorage'
          );
          const storage = getLinearFlowStorage();

          // Convert character to the format expected by the storage system (PlayerCharacter)
          const characterForStorage: PlayerCharacter = {
            id: completedCharacter.id,
            name: completedCharacter.name,
            race: completedCharacter.race?.name || '',
            class: completedCharacter.classes?.[0]?.name || '',
            background: completedCharacter.background?.name || '',
            level: completedCharacter.level,
            stats: {
              strength: completedCharacter.abilities?.strength?.score || 10,
              dexterity: completedCharacter.abilities?.dexterity?.score || 10,
              constitution:
                completedCharacter.abilities?.constitution?.score || 10,
              intelligence:
                completedCharacter.abilities?.intelligence?.score || 10,
              wisdom: completedCharacter.abilities?.wisdom?.score || 10,
              charisma: completedCharacter.abilities?.charisma?.score || 10,
            },
            createdAt: completedCharacter.createdAt,
            playerId: storage['getBrowserId'](), // Use browser ID as player ID for storage
          };

          storage.saveCharacter(characterForStorage);
          console.log(
            '💾 Character saved to IndexedDB:',
            completedCharacter.name,
          );
        } catch (error) {
          console.error('❌ Failed to save character to IndexedDB:', error);
          // Continue anyway - character is still in memory
        }

        // Return the new character object and ID
        return { id: completedCharacter.id, character: completedCharacter };
      }

      // Return null if no character was in the creation state
      return null;
    },

    cancelCharacterCreation: () =>
      set((state) => {
        state.creationState = null;
      }),

    // Mob Management
    addMob: (mobData) => {
      const mob = { ...mobData, id: crypto.randomUUID() };
      set((state) => {
        state.mobs.push(mob);
      });
      return mob.id;
    },

    updateMob: (mobId, updates) =>
      set((state) => {
        const mob = state.mobs.find((m) => m.id === mobId);
        if (mob) {
          Object.assign(mob, updates);
        }
      }),

    deleteMob: (mobId) =>
      set((state) => {
        const index = state.mobs.findIndex((m) => m.id === mobId);
        if (index !== -1) {
          state.mobs.splice(index, 1);
          // Remove from selected mobs
          const selectedIndex = state.selectedMobs.indexOf(mobId);
          if (selectedIndex !== -1) {
            state.selectedMobs.splice(selectedIndex, 1);
          }
        }
      }),

    getMob: (mobId) => {
      return get().mobs.find((m) => m.id === mobId);
    },

    // Mob Groups
    createMobGroup: (name, mobIds) => {
      const group: MobGroup = {
        id: crypto.randomUUID(),
        name,
        mobs: mobIds.map((id) => get().getMob(id)).filter(Boolean) as Mob[],
        environment: '',
        encounterLevel: 'Medium',
      };

      set((state) => {
        state.mobGroups.push(group);
      });

      return group.id;
    },

    updateMobGroup: (groupId, updates) =>
      set((state) => {
        const group = state.mobGroups.find((g) => g.id === groupId);
        if (group) {
          Object.assign(group, updates);
        }
      }),

    deleteMobGroup: (groupId) =>
      set((state) => {
        const index = state.mobGroups.findIndex((g) => g.id === groupId);
        if (index !== -1) {
          state.mobGroups.splice(index, 1);
        }
      }),

    // Combat Preparation
    selectMobForCombat: (mobId) =>
      set((state) => {
        if (!state.selectedMobs.includes(mobId)) {
          state.selectedMobs.push(mobId);
        }
      }),

    deselectMobForCombat: (mobId) =>
      set((state) => {
        const index = state.selectedMobs.indexOf(mobId);
        if (index !== -1) {
          state.selectedMobs.splice(index, 1);
        }
      }),

    clearSelectedMobs: () =>
      set((state) => {
        state.selectedMobs = [];
      }),

    getSelectedMobs: () => {
      const state = get();
      return state.selectedMobs
        .map((id) => state.mobs.find((m) => m.id === id))
        .filter(Boolean) as Mob[];
    },

    // Import/Export
    importCharacter: async (source, data) => {
      const { characterImportService } = await import('@/services/characterImport');

      const result = await characterImportService.importFromData(data, source);

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      if (!result.character) {
        throw new Error('No character data in import result');
      }

      // Add the imported character to the store
      const character = result.character as Character;
      set((state) => {
        state.characters.push(character);
      });

      return character.id;
    },

    importCharactersFromFiles: async (files) => {
      const { characterImportService } = await import('@/services/characterImport');

      const batchResult = await characterImportService.importFromFiles(files);

      const errors: string[] = [];

      // Process successful imports
      for (const result of batchResult.results) {
        if (result.success && result.character) {
          const character = result.character as Character;

          // Add to store
          set((state) => {
            state.characters.push(character);
          });
        } else if (result.error) {
          errors.push(result.error);
        }
      }

      return {
        successful: batchResult.successful,
        failed: batchResult.failed,
        errors,
      };
    },

    exportCharacter: async (characterId, format) => {
      const character = get().getCharacter(characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      switch (format) {
        case 'json':
          return JSON.stringify(character, null, 2);
        case 'text':
          return `Character: ${character.name}\nLevel ${character.level}\n...`; // Simplified
        default:
          throw new Error(`Export format ${format} not supported`);
      }
    },

    // Utility
    reset: () => set(() => ({ ...initialState })),
  })),
);

// Helper hooks
export const useCharacters = () => {
  const store = useCharacterStore();
  return {
    characters: store.characters,
    activeCharacter: store.activeCharacterId
      ? store.getCharacter(store.activeCharacterId)
      : null,
    createCharacter: store.createCharacter,
    updateCharacter: store.updateCharacter,
    deleteCharacter: store.deleteCharacter,
    setActiveCharacter: store.setActiveCharacter,
  };
};

export const useCharacterCreation = () => {
  const store = useCharacterStore();
  return {
    creationState: store.creationState,
    startCharacterCreation: store.startCharacterCreation,
    updateCreationState: store.updateCreationState,
    nextCreationStep: store.nextCreationStep,
    previousCreationStep: store.previousCreationStep,
    completeCharacterCreation: store.completeCharacterCreation,
    cancelCharacterCreation: store.cancelCharacterCreation,
  };
};

export const useMobs = () => {
  const store = useCharacterStore();
  return {
    mobs: store.mobs,
    mobGroups: store.mobGroups,
    selectedMobs: store.getSelectedMobs(),
    addMob: store.addMob,
    updateMob: store.updateMob,
    deleteMob: store.deleteMob,
    selectMobForCombat: store.selectMobForCombat,
    deselectMobForCombat: store.deselectMobForCombat,
    clearSelectedMobs: store.clearSelectedMobs,
  };
};
