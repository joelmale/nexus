// D&D 5e Character Sheet Types and Interfaces

export interface Ability {
  score: number;
  modifier: number;
  savingThrow: number;
  proficient?: boolean; // For saving throws
}

export interface AbilityScores {
  strength: Ability;
  dexterity: Ability;
  constitution: Ability;
  intelligence: Ability;
  wisdom: Ability;
  charisma: Ability;
}

export interface Skill {
  name: string;
  ability: keyof AbilityScores;
  proficient: boolean;
  expertise: boolean; // Double proficiency bonus
  modifier: number;
}

export interface SpellSlot {
  level: number;
  total: number;
  used: number;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialComponent?: string;
  };
  prepared?: boolean; // For prepared casters
  known?: boolean; // For known casters
}

export interface Feature {
  id: string;
  name: string;
  source: string; // class, race, feat, etc.
  description: string;
  uses?: {
    total: number;
    used: number;
    resetOn: 'short-rest' | 'long-rest' | 'dawn' | 'week';
  };
}

export interface Equipment {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'tool' | 'consumable' | 'treasure' | 'other';
  quantity: number;
  weight: number;
  description?: string;
  attuned?: boolean;
  equipped?: boolean;
  cost?: { amount: number; currency: string };
  // Weapon properties
  damage?: {
    dice: string;
    type: string;
  };
  properties?: string[];
  // Armor properties
  armorClass?: number;
  stealthDisadvantage?: boolean;
}

export interface AttackAction {
  id: string;
  name: string;
  type: 'weapon' | 'spell' | 'other';
  attackBonus: number;
  damage: {
    dice: string;
    type: string;
    bonus: number;
  };
  additionalDamage?: {
    dice: string;
    type: string;
    condition?: string;
  };
  range: string;
  description?: string;
}

export interface CharacterClass {
  name: string;
  level: number;
  hitDie: string; // e.g., "d10"
  subclass?: string;
  // Enhanced: Level-scaled properties for randomization
  proficienciesByLevel?: {
    [level: number]: {
      weaponProficiencies: string[];
      armorProficiencies: string[];
      toolProficiencies: string[];
      skillProficiencies: string[];
    };
  };
  featuresByLevel?: {
    [level: number]: Feature[];
  };
  spellsByLevel?: {
    [level: number]: Spell[];
  };
  subclassOptions?: string[];
  spellcasting?: {
    type: 'full' | 'half' | 'third' | 'pact' | 'none';
    ability?: keyof AbilityScores;
  };
}

export interface CharacterBackground {
  name: string;
  skillProficiencies: string[];
  languages: string[];
  equipment: string[];
  feature: string;
  description?: string;
  // Enhanced: Additional background properties for randomization
  toolProficiencies?: string[];
  personalityTraits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  equipmentPack?: string;
}

export interface CharacterRace {
  name: string;
  subrace?: string;
  traits: string[];
  abilityScoreIncrease: Partial<Record<keyof AbilityScores, number>>;
  languages: string[];
  proficiencies: string[];
  // Enhanced: Racial features and traits for randomization
  features?: Feature[];
  subraceFeatures?: { [subrace: string]: Feature[] };
  size?: 'small' | 'medium';
  speed?: number;
}

// Equipment and Inventory Types
export interface Weapon {
  id: string;
  name: string;
  type: 'simple' | 'martial';
  category: 'melee' | 'ranged';
  damage: string; // e.g., "1d8", "2d6+2"
  properties: string[]; // e.g., ["versatile", "finesse", "light"]
  weight?: number;
  cost?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';
}

export interface Armor {
  id: string;
  name: string;
  type: 'light' | 'medium' | 'heavy' | 'shield';
  ac: number;
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
  weight?: number;
  cost?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';
}

export interface Tool {
  id: string;
  name: string;
  category: string; // e.g., "artisan", "gaming", "musical"
  weight?: number;
  cost?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';
}

// Personality Data
export interface PersonalityData {
  traits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
}

export interface Character {
  // Basic Information
  id: string;
  playerId: string; // Link to player
  name: string;
  race: CharacterRace;
  classes: CharacterClass[]; // Support multiclassing
  background: CharacterBackground;
  alignment: string;
  level: number; // Total character level

  // Core Stats
  abilities: AbilityScores;
  skills: Skill[];
  proficiencyBonus: number;
  passivePerception: number;

  // Combat Stats
  hitPoints: {
    maximum: number;
    current: number;
    temporary: number;
  };
  hitDice: {
    total: number;
    remaining: number;
  };
  armorClass: number;
  initiative: number;
  speed: number;

  // Proficiencies
  languageProficiencies: string[];
  toolProficiencies: string[];
  weaponProficiencies: string[];
  armorProficiencies: string[];

  // Features and Traits
  features: Feature[];
  attacks: AttackAction[];
  equipment: Equipment[];
  spells: Spell[];

  // Spellcasting (if applicable)
  spellcasting?: {
    class: string;
    ability: keyof AbilityScores;
    spellSaveDC: number;
    spellAttackBonus: number;
    spellSlots: SpellSlot[];
    spellsKnown: Spell[];
    cantripsKnown: number;
    spellsPerDay?: number;
    ritualCasting?: boolean;
  };

  // Personality
  personalityTraits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];

  // Other
  inspiration: boolean;
  experiencePoints: number;
  notes: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
  version: string; // For compatibility with imports
}

// Character Creation Wizard State
export interface CharacterCreationState {
  playerId?: string;
  step: number;
  totalSteps: number;
  character: Partial<Character>;
  method: 'guided' | 'manual' | 'import';
  isComplete: boolean;
}

// Import/Export Support
export interface CharacterImportSource {
  type: 'forge' | 'roll20' | 'ddb' | 'google-sheets' | 'pdf' | 'json';
  name: string;
  description: string;
  icon: string;
  supported: boolean;
}

export interface CharacterExportFormat {
  type: 'pdf' | 'json' | 'roll20' | 'text';
  name: string;
  description: string;
  icon: string;
}

// Mob Management (for DM)
export interface Mob {
  id: string;
  name: string;
  type:
    | 'beast'
    | 'humanoid'
    | 'monstrosity'
    | 'undead'
    | 'fiend'
    | 'celestial'
    | 'elemental'
    | 'fey'
    | 'dragon'
    | 'giant'
    | 'construct'
    | 'ooze'
    | 'plant'
    | 'aberration';
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  challengeRating: string;
  armorClass: number;
  hitPoints: {
    maximum: number;
    dice: string; // e.g., "8d8+16"
  };
  speed: {
    walk: number;
    fly?: number;
    swim?: number;
    climb?: number;
    burrow?: number;
  };
  abilities: AbilityScores;
  savingThrows?: Partial<Record<keyof AbilityScores, number>>;
  skills?: Record<string, number>;
  damageResistances?: string[];
  damageImmunities?: string[];
  damageVulnerabilities?: string[];
  conditionImmunities?: string[];
  senses: string[];
  languages: string[];
  actions: AttackAction[];
  legendaryActions?: AttackAction[];
  reactions?: AttackAction[];
  traits: Feature[];
  description?: string;
  environment?: string[];
  source: string; // Monster Manual, Volo's, etc.
}

export interface MobGroup {
  id: string;
  name: string;
  mobs: Mob[];
  description?: string;
  environment: string;
  encounterLevel: string; // Easy, Medium, Hard, Deadly
}

// Helper functions
export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateProficiencyBonus(level: number): number {
  // Handle edge cases for levels below 1
  const normalizedLevel = Math.max(1, level);
  return Math.ceil(normalizedLevel / 4) + 1;
}

export function calculatePassivePerception(
  abilities: AbilityScores,
  skills: Skill[],
  proficiencyBonus: number,
): number {
  const perceptionSkill = skills.find((skill) => skill.name === 'Perception');
  const wisdomModifier = abilities.wisdom.modifier;

  if (!perceptionSkill) {
    // If no perception skill found, just use wisdom modifier
    return 10 + wisdomModifier;
  }

  // Calculate based on skill proficiency and expertise
  let bonus = wisdomModifier;
  if (perceptionSkill.proficient) {
    bonus += perceptionSkill.expertise
      ? proficiencyBonus * 2
      : proficiencyBonus;
  }

  return 10 + bonus;
}

export function createEmptyCharacter(playerId: string): Character {
  const abilities: AbilityScores = {
    strength: { score: 10, modifier: 0, savingThrow: 0 },
    dexterity: { score: 10, modifier: 0, savingThrow: 0 },
    constitution: { score: 10, modifier: 0, savingThrow: 0 },
    intelligence: { score: 10, modifier: 0, savingThrow: 0 },
    wisdom: { score: 10, modifier: 0, savingThrow: 0 },
    charisma: { score: 10, modifier: 0, savingThrow: 0 },
  };

  // Create skills from standard skills with all disabled initially
  const skills: Skill[] = STANDARD_SKILLS.map((standardSkill) => ({
    ...standardSkill,
    proficient: false,
    expertise: false,
    modifier: 0,
  }));

  const proficiencyBonus = calculateProficiencyBonus(1);
  const passivePerception = calculatePassivePerception(
    abilities,
    skills,
    proficiencyBonus,
  );

  return {
    id: crypto.randomUUID(),
    playerId,
    name: '',
    level: 1,
    race: {
      name: '',
      subrace: '',
      traits: [],
      abilityScoreIncrease: {},
      languages: [],
      proficiencies: [],
    },
    classes: [],
    background: {
      name: '',
      skillProficiencies: [],
      languages: [],
      equipment: [],
      feature: '',
      description: '',
    },
    alignment: '',
    abilities,
    hitPoints: {
      maximum: 1,
      current: 1,
      temporary: 0,
    },
    hitDice: {
      total: 1,
      remaining: 1,
    },
    armorClass: 10,
    initiative: 0,
    speed: 30,
    proficiencyBonus,
    passivePerception,
    skills,
    languageProficiencies: ['Common'],
    toolProficiencies: [],
    weaponProficiencies: [],
    armorProficiencies: [],
    features: [],
    attacks: [],
    equipment: [],
    spells: [],
    personalityTraits: [],
    ideals: [],
    bonds: [],
    flaws: [],
    inspiration: false,
    experiencePoints: 0,
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0',
  };
}

// D&D 5e Standard Skills
export const STANDARD_SKILLS: Omit<
  Skill,
  'modifier' | 'proficient' | 'expertise'
>[] = [
  { name: 'Acrobatics', ability: 'dexterity' },
  { name: 'Animal Handling', ability: 'wisdom' },
  { name: 'Arcana', ability: 'intelligence' },
  { name: 'Athletics', ability: 'strength' },
  { name: 'Deception', ability: 'charisma' },
  { name: 'History', ability: 'intelligence' },
  { name: 'Insight', ability: 'wisdom' },
  { name: 'Intimidation', ability: 'charisma' },
  { name: 'Investigation', ability: 'intelligence' },
  { name: 'Medicine', ability: 'wisdom' },
  { name: 'Nature', ability: 'intelligence' },
  { name: 'Perception', ability: 'wisdom' },
  { name: 'Performance', ability: 'charisma' },
  { name: 'Persuasion', ability: 'charisma' },
  { name: 'Religion', ability: 'intelligence' },
  { name: 'Sleight of Hand', ability: 'dexterity' },
  { name: 'Stealth', ability: 'dexterity' },
  { name: 'Survival', ability: 'wisdom' },
];

// D&D 5e Classes (for character creation wizard)
export const CHARACTER_CLASSES = [
  { name: 'Barbarian', hitDie: 'd12', primaryAbility: 'strength' },
  { name: 'Bard', hitDie: 'd8', primaryAbility: 'charisma' },
  { name: 'Cleric', hitDie: 'd8', primaryAbility: 'wisdom' },
  { name: 'Druid', hitDie: 'd8', primaryAbility: 'wisdom' },
  { name: 'Fighter', hitDie: 'd10', primaryAbility: 'strength' },
  { name: 'Monk', hitDie: 'd8', primaryAbility: 'dexterity' },
  { name: 'Paladin', hitDie: 'd10', primaryAbility: 'strength' },
  { name: 'Ranger', hitDie: 'd10', primaryAbility: 'dexterity' },
  { name: 'Rogue', hitDie: 'd8', primaryAbility: 'dexterity' },
  { name: 'Sorcerer', hitDie: 'd6', primaryAbility: 'charisma' },
  { name: 'Warlock', hitDie: 'd8', primaryAbility: 'charisma' },
  { name: 'Wizard', hitDie: 'd6', primaryAbility: 'intelligence' },
];

// D&D 5e Races (basic list for character creation)
export const CHARACTER_RACES = [
  { name: 'Human', subraces: ['Variant Human'] },
  { name: 'Elf', subraces: ['High Elf', 'Wood Elf', 'Dark Elf (Drow)'] },
  { name: 'Dwarf', subraces: ['Mountain Dwarf', 'Hill Dwarf'] },
  { name: 'Halfling', subraces: ['Lightfoot', 'Stout'] },
  { name: 'Dragonborn', subraces: [] },
  { name: 'Gnome', subraces: ['Forest Gnome', 'Rock Gnome'] },
  { name: 'Half-Elf', subraces: [] },
  { name: 'Half-Orc', subraces: [] },
  { name: 'Tiefling', subraces: [] },
];
