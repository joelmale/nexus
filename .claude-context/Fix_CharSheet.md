# Character Creation Wizard Enhancement Plan

## Overview
The current character creation wizard is missing many fields from the Character data object. This plan outlines adding 3 new pages to cover all missing character fields while maintaining the existing wizard theme and style.

## Current Wizard Structure (3 steps)
1. **Core Concept** - Name, race, class, background, alignment, level
2. **Ability Scores** - STR, DEX, CON, INT, WIS, CHA with randomization
3. **Details & Personality** - Combat stats, personality traits, ideals, bonds, flaws

## Proposed New Structure (6 steps)
1. **Core Concept** - (unchanged)
2. **Ability Scores** - (unchanged)
3. **Details & Personality** - (unchanged)
4. **Proficiencies & Languages** - Language proficiencies, tool proficiencies, weapon/armor proficiencies
5. **Equipment & Features** - Starting equipment, racial/class features, attacks
6. **Final Details** - Spellcasting setup, experience points, inspiration, notes

## Missing Fields to Cover
Based on the Character interface analysis, these fields are not currently configurable in the wizard:

- `languageProficiencies` (beyond Common)
- `toolProficiencies`
- `weaponProficiencies`
- `armorProficiencies`
- `features` (racial/class/background features)
- `attacks`
- `equipment`
- `spells` (and spellcasting config)
- `experiencePoints`
- `inspiration`
- `notes`

## Implementation Details

### Page 4: Proficiencies & Languages
**UI Components:**
- Language selector (multi-select dropdown with D&D 5e languages)
- Tool proficiencies (checkbox grid for artisan's tools, musical instruments, gaming sets, other tools)
- Weapon proficiencies (checkboxes: simple weapons, martial weapons)
- Armor proficiencies (checkboxes: light/medium/heavy armor, shields)

**Data Sources:**
- Languages: Common, Elvish, Dwarvish, Halfling, Draconic, Gnomish, Orc, Infernal, Celestial, Abyssal, Primordial, Sylvan, etc.
- Tools: From PLACEHOLDER_TOOLS in dataManager (artisan's tools, musical instruments, gaming sets, thieves' tools, etc.)
- Weapon/Armor proficiencies: Standard D&D categories

### Page 5: Equipment & Features
**UI Components:**
- Starting equipment display (auto-populated based on class/background, with customization options)
- Racial features list (read-only display of racial traits and abilities)
- Class features list (read-only display of class features by level)
- Attacks section (calculated based on equipment and proficiencies)

**Data Sources:**
- Equipment: From PLACEHOLDER_EQUIPMENT in dataManager
- Features: From race/class/background data in dataManager
- Attacks: Calculated from equipment and weapon proficiencies

### Page 6: Spells & Final Details
**UI Components:**
- Spellcasting setup section (conditional - only shown for spellcasting classes)
  - Spellcasting ability dropdown
  - Spell save DC calculation display
  - Spell attack bonus calculation display
- Cantrips selection (if applicable)
- Spells known selection (if applicable)
- Experience points input (number input, default 0)
- Inspiration toggle (checkbox)
- Notes textarea (free-form text)

**Data Sources:**
- Spells: From PLACEHOLDER_SPELLS in dataManager
- Spellcasting rules: Based on class data

## Technical Implementation

### Files to Modify
1. `src/components/CharacterCreationWizard.tsx`
   - Add 3 new step components
   - Update totalSteps from 3 to 6
   - Update validation logic for new steps
   - Update progress indicators and labels
   - Update step rendering logic

2. `src/utils/characterGenerator.ts`
   - Enhance `generateRandomCharacter()` to populate new fields
   - Add randomization functions for proficiencies, equipment, etc.

3. `src/styles/character-creation-wizard.css`
   - Ensure new components follow existing styling patterns
   - Add any new CSS classes needed for proficiencies/equipment displays

### Key Implementation Points
- **Data Manager Integration**: Import and use dataManager to access tools, equipment, spells, etc.
- **Conditional Rendering**: Spellcasting section only shows for spellcasting classes
- **Auto-population**: Many fields should be auto-populated based on race/class/background choices
- **Validation**: Update `canProceedFromStep()` to handle new steps (most new steps can be optional)
- **Styling Consistency**: Use existing `.wizard-step`, `.form-grid`, `.form-section` patterns
- **Progress Indicators**: Update step labels to reflect new page names

### Random Character Generation Updates
The `generateRandomCharacter()` function needs to be enhanced to include:
- Random language selection (1-2 extra languages)
- Random tool proficiencies (1-2 based on background)
- Appropriate weapon/armor proficiencies based on class
- Starting equipment based on class/background
- Racial and class features
- Basic attacks
- Spellcasting setup for spellcasters

## Styling Requirements
All new pages must follow the existing wizard theme:
- Use `.wizard-step` container
- Form grids with `.form-grid` and `.form-section`
- Consistent button styling (`.dice-btn`, `.randomize-all-btn`)
- Proper spacing and typography
- Responsive design for mobile/tablet
- Theme support (solid theme variables)

## Validation Rules
- Steps 1-3: Required (existing validation)
- Step 4: Optional (proficiencies can be empty, will be auto-populated)
- Step 5: Optional (equipment/features auto-populated)
- Step 6: Optional (spellcasting only required for spellcasters, other fields optional)

## Testing Considerations
- Ensure random character generation works with all new fields
- Verify wizard navigation works with 6 steps
- Test responsive design on new pages
- Validate that auto-populated fields are correct based on race/class/background
- Ensure export functionality works with new fields</content>
</xai:function_call