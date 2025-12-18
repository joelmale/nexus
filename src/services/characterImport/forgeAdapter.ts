/**
 * Schema adapter for transforming 5e Character Forge exports to NexusVTT format
 */

import type { Character, AbilityScores, Skill, CharacterClass, CharacterRace, CharacterBackground, Equipment, Spell, Feature } from '@/types/character';
import type { ForgeCharacter, ForgeAbility, ImportMetadata } from './forgeTypes';
import { STANDARD_SKILLS } from '@/types/character';

export class ForgeCharacterAdapter {
  /**
   * Validate that the data is a Forge character export
   */
  validate(data: unknown): data is ForgeCharacter {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const char = data as Record<string, unknown>;

    // Check for Forge-specific fields
    const hasForgeFields = (
      'species' in char &&
      'edition' in char &&
      typeof char.abilities === 'object' &&
      'STR' in char.abilities
    );

    return hasForgeFields;
  }

  /**
   * Transform Forge character to NexusVTT format
   */
  transform(forgeChar: ForgeCharacter, playerId: string = ''): Character {
    return {
      // Basic Information
      id: crypto.randomUUID(), // Generate new ID for VTT
      playerId,
      name: forgeChar.name || 'Unnamed Character',
      race: this.mapSpeciesToRace(forgeChar),
      classes: this.mapClasses(forgeChar),
      background: this.mapBackground(forgeChar),
      alignment: forgeChar.alignment || '',
      level: forgeChar.level || 1,

      // Core Stats
      abilities: this.mapAbilities(forgeChar.abilities),
      skills: this.mapSkills(forgeChar.skills, forgeChar.abilities),
      proficiencyBonus: forgeChar.proficiencyBonus || 2,
      passivePerception: this.calculatePassivePerception(forgeChar),

      // Combat Stats - Initialize fresh session state
      hitPoints: {
        maximum: forgeChar.maxHitPoints || 1,
        current: forgeChar.maxHitPoints || 1, // Full HP on import
        temporary: 0,
      },
      hitDice: {
        total: forgeChar.hitDice?.max || 1,
        remaining: forgeChar.hitDice?.max || 1, // Full hit dice on import
      },
      armorClass: forgeChar.armorClass || 10,
      initiative: forgeChar.initiative || 0,
      speed: forgeChar.speed || 30,

      // Proficiencies
      languageProficiencies: forgeChar.languages || ['Common'],
      toolProficiencies: forgeChar.proficiencies?.tools || [],
      weaponProficiencies: forgeChar.proficiencies?.weapons || [],
      armorProficiencies: forgeChar.proficiencies?.armor || [],

      // Features and Traits
      features: this.mapFeatures(forgeChar),
      attacks: [], // Will be populated from equipment/spells if needed
      equipment: this.mapEquipment(forgeChar),
      spells: this.mapSpells(forgeChar),

      // Spellcasting
      spellcasting: forgeChar.spellcasting ? this.mapSpellcasting(forgeChar) : undefined,

      // Personality
      personalityTraits: this.extractPersonalityTraits(forgeChar),
      ideals: this.extractIdeals(forgeChar),
      bonds: this.extractBonds(forgeChar),
      flaws: this.extractFlaws(forgeChar),

      // Other
      inspiration: forgeChar.inspiration || false,
      experiencePoints: forgeChar.experiencePoints || 0,
      notes: this.generateImportNotes(forgeChar),

      // Metadata
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '1.0',
    };
  }

  /**
   * Map Forge species to NexusVTT race
   */
  private mapSpeciesToRace(forgeChar: ForgeCharacter): CharacterRace {
    return {
      name: forgeChar.species,
      subrace: forgeChar.selectedSpeciesVariant,
      traits: forgeChar.featuresAndTraits?.speciesTraits || [],
      abilityScoreIncrease: {}, // Not tracked in Forge export, already applied to scores
      languages: forgeChar.languages || [],
      proficiencies: [],
      speed: forgeChar.speed,
    };
  }

  /**
   * Map Forge class to NexusVTT classes array
   */
  private mapClasses(forgeChar: ForgeCharacter): CharacterClass[] {
    const hitDieMap: Record<number, string> = {
      6: 'd6',
      8: 'd8',
      10: 'd10',
      12: 'd12',
    };

    return [{
      name: forgeChar.class,
      level: forgeChar.level,
      hitDie: hitDieMap[forgeChar.hitDice?.dieType || 8] || 'd8',
      subclass: forgeChar.subclass || undefined,
    }];
  }

  /**
   * Map Forge background to NexusVTT background
   */
  private mapBackground(forgeChar: ForgeCharacter): CharacterBackground {
    const bgFeatures = forgeChar.featuresAndTraits?.backgroundFeatures || [];
    const mainFeature = bgFeatures[0]?.description || '';

    return {
      name: forgeChar.background,
      skillProficiencies: [], // Already applied in skills
      languages: forgeChar.languages || [],
      equipment: [],
      feature: mainFeature,
      description: bgFeatures.map(f => `${f.name}: ${f.description}`).join('\n\n'),
    };
  }

  /**
   * Map Forge abilities to NexusVTT format
   */
  private mapAbilities(forgeAbilities: ForgeCharacter['abilities']): AbilityScores {
    const abilityMap: Record<ForgeAbility, keyof AbilityScores> = {
      STR: 'strength',
      DEX: 'dexterity',
      CON: 'constitution',
      INT: 'intelligence',
      WIS: 'wisdom',
      CHA: 'charisma',
    };

    const abilities: Partial<AbilityScores> = {};

    for (const [forgeKey, nexusKey] of Object.entries(abilityMap)) {
      const forgeAbility = forgeAbilities[forgeKey as ForgeAbility];
      abilities[nexusKey] = {
        score: forgeAbility.score,
        modifier: forgeAbility.modifier,
        savingThrow: forgeAbility.modifier, // Will be enhanced with proficiency if needed
        proficient: false, // Default, can be enhanced later
      };
    }

    return abilities as AbilityScores;
  }

  /**
   * Map Forge skills to NexusVTT format
   */
  private mapSkills(forgeSkills: ForgeCharacter['skills'], forgeAbilities: ForgeCharacter['abilities']): Skill[] {
    return STANDARD_SKILLS.map(standardSkill => {
      // Find matching Forge skill (handle name variations)
      const forgeSkillKey = Object.keys(forgeSkills).find(key => {
        const normalizedForge = key.replace(/\s+/g, '');
        const normalizedStandard = standardSkill.name.replace(/\s+/g, '');
        return normalizedForge === normalizedStandard;
      }) as keyof typeof forgeSkills;

      const forgeSkill = forgeSkillKey ? forgeSkills[forgeSkillKey] : null;

      return {
        name: standardSkill.name,
        ability: standardSkill.ability,
        proficient: forgeSkill?.proficient || false,
        expertise: forgeSkill?.expertise || false,
        modifier: forgeSkill?.value || forgeAbilities[this.abilityKeyToForge(standardSkill.ability)].modifier,
      };
    });
  }

  /**
   * Helper to convert ability key format
   */
  private abilityKeyToForge(nexusKey: keyof AbilityScores): ForgeAbility {
    const map: Record<keyof AbilityScores, ForgeAbility> = {
      strength: 'STR',
      dexterity: 'DEX',
      constitution: 'CON',
      intelligence: 'INT',
      wisdom: 'WIS',
      charisma: 'CHA',
    };
    return map[nexusKey];
  }

  /**
   * Map Forge features to NexusVTT format
   */
  private mapFeatures(forgeChar: ForgeCharacter): Feature[] {
    const features: Feature[] = [];

    // Add class features
    const classFeatures = forgeChar.featuresAndTraits?.classFeatures || [];
    classFeatures.forEach(featureName => {
      features.push({
        id: crypto.randomUUID(),
        name: featureName,
        source: 'class',
        description: '', // Detailed descriptions not in export
      });
    });

    // Add species traits as features
    const speciesTraits = forgeChar.featuresAndTraits?.speciesTraits || [];
    speciesTraits.forEach(traitName => {
      features.push({
        id: crypto.randomUUID(),
        name: traitName,
        source: 'race',
        description: '',
      });
    });

    // Add background features
    const bgFeatures = forgeChar.featuresAndTraits?.backgroundFeatures || [];
    bgFeatures.forEach(bgFeature => {
      features.push({
        id: crypto.randomUUID(),
        name: bgFeature.name,
        source: 'background',
        description: bgFeature.description,
      });
    });

    return features;
  }

  /**
   * Map Forge equipment to NexusVTT format
   */
  private mapEquipment(forgeChar: ForgeCharacter): Equipment[] {
    const inventory = forgeChar.inventory || [];

    return inventory.map(item => ({
      id: item.id || crypto.randomUUID(),
      name: item.name,
      type: this.guessEquipmentType(item),
      quantity: item.quantity || 1,
      weight: item.weight || 0,
      description: item.description,
      attuned: item.attuned,
      equipped: item.equipped,
    }));
  }

  /**
   * Guess equipment type from name/description
   */
  private guessEquipmentType(item: { name?: string; type?: string }): Equipment['type'] {
    const name = item.name?.toLowerCase() || '';
    const type = item.type?.toLowerCase() || '';

    if (name.includes('sword') || name.includes('bow') || type.includes('weapon')) {
      return 'weapon';
    }
    if (name.includes('armor') || name.includes('shield') || type.includes('armor')) {
      return 'armor';
    }
    if (name.includes('potion') || name.includes('scroll')) {
      return 'consumable';
    }
    if (name.includes('tool')) {
      return 'tool';
    }
    return 'other';
  }

  /**
   * Map Forge spells to NexusVTT format
   */
  private mapSpells(forgeChar: ForgeCharacter): Spell[] {
    if (!forgeChar.spellcasting) return [];

    const allSpellSlugs = new Set([
      ...(forgeChar.spellcasting.cantripsKnown || []),
      ...(forgeChar.spellcasting.spellsKnown || []),
      ...(forgeChar.spellcasting.spellbook || []),
      ...(forgeChar.spellcasting.preparedSpells || []),
    ]);

    return Array.from(allSpellSlugs).map(slug => ({
      id: crypto.randomUUID(),
      name: this.spellSlugToName(slug),
      level: 0, // Would need spell database to determine
      school: '',
      castingTime: '',
      range: '',
      duration: '',
      concentration: false,
      ritual: false,
      description: '',
      components: {
        verbal: false,
        somatic: false,
        material: false,
      },
      prepared: forgeChar.spellcasting?.preparedSpells?.includes(slug),
      known: forgeChar.spellcasting?.spellsKnown?.includes(slug) ||
             forgeChar.spellcasting?.cantripsKnown?.includes(slug),
    }));
  }

  /**
   * Convert spell slug to readable name
   */
  private spellSlugToName(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Map spellcasting data
   */
  private mapSpellcasting(forgeChar: ForgeCharacter) {
    const sc = forgeChar.spellcasting!;

    const abilityMap: Record<ForgeAbility, keyof AbilityScores> = {
      STR: 'strength',
      DEX: 'dexterity',
      CON: 'constitution',
      INT: 'intelligence',
      WIS: 'wisdom',
      CHA: 'charisma',
    };

    return {
      class: forgeChar.class,
      ability: abilityMap[sc.ability],
      spellSaveDC: sc.spellSaveDC,
      spellAttackBonus: sc.spellAttackBonus,
      spellSlots: sc.spellSlots.map((total, index) => ({
        level: index,
        total,
        used: sc.usedSpellSlots?.[index] || 0,
      })),
      spellsKnown: this.mapSpells(forgeChar),
      cantripsKnown: sc.cantripsKnown.length,
    };
  }

  /**
   * Calculate passive perception
   */
  private calculatePassivePerception(forgeChar: ForgeCharacter): number {
    const perceptionSkill = forgeChar.skills?.Perception;
    if (perceptionSkill) {
      return 10 + perceptionSkill.value;
    }
    return 10 + forgeChar.abilities.WIS.modifier;
  }

  /**
   * Extract personality traits
   */
  private extractPersonalityTraits(forgeChar: ForgeCharacter): string[] {
    const traits = forgeChar.featuresAndTraits?.personality;
    if (!traits) return [];
    return traits.split('\n').filter(t => t.trim());
  }

  /**
   * Extract ideals
   */
  private extractIdeals(forgeChar: ForgeCharacter): string[] {
    const ideals = forgeChar.featuresAndTraits?.ideals;
    if (!ideals) return [];
    return ideals.split('\n').filter(t => t.trim());
  }

  /**
   * Extract bonds
   */
  private extractBonds(forgeChar: ForgeCharacter): string[] {
    const bonds = forgeChar.featuresAndTraits?.bonds;
    if (!bonds) return [];
    return bonds.split('\n').filter(t => t.trim());
  }

  /**
   * Extract flaws
   */
  private extractFlaws(forgeChar: ForgeCharacter): string[] {
    const flaws = forgeChar.featuresAndTraits?.flaws;
    if (!flaws) return [];
    return flaws.split('\n').filter(t => t.trim());
  }

  /**
   * Generate import notes for the character
   */
  private generateImportNotes(forgeChar: ForgeCharacter): string {
    const notes: string[] = [];

    notes.push(`Imported from 5e Character Forge (${forgeChar.edition} Edition)`);
    notes.push(`Import Date: ${new Date().toLocaleDateString()}`);

    if (forgeChar._export) {
      notes.push(`Export Version: ${forgeChar._export.version}`);
      if (forgeChar._export.compatibilityNotes) {
        notes.push('\nCompatibility Notes:');
        notes.push(...forgeChar._export.compatibilityNotes.map(n => `- ${n}`));
      }
    }

    notes.push('\nSession state (current HP, spell slots, etc.) has been reset to maximum values.');

    return notes.join('\n');
  }

  /**
   * Generate import metadata
   */
  generateMetadata(forgeChar: ForgeCharacter, _originalFileName?: string): ImportMetadata {
    return {
      sourceType: 'forge',
      sourceVersion: forgeChar.edition,
      importedAt: Date.now(),
      originalId: forgeChar.id,
    };
  }
}
