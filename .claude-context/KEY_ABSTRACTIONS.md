# Key Abstractions

Use this file to understand the core concepts and business logic of the Nexus VTT.

## Session Hibernation

**Why it exists**: To prevent data loss from accidental disconnects or browser refreshes.

**How it works**:
- When a host disconnects, the server-side room enters a "hibernating" state for 10 minutes instead of being destroyed.
- If the host reconnects within this window, the session is restored.
- The client also persists session data in `localStorage` as a fallback.
- See `SESSION_PERSISTENCE.md` for the full architecture.

## Dice Parsing

**Why it exists**: To allow users to type dice expressions (e.g., "2d6+3") like they would at a real table.

**How it works**:
- A regular expression-based parser in `src/utils/dice.ts` breaks down the expression.
- It supports standard dice, modifiers, and advantage/disadvantage keywords.
- The parser is designed to be robust and handle common user input variations.

## Character Stat Calculation

**Why it exists**: To automate the complex calculations of D&D 5e character sheets.

**How it works**:
- Core character stats are stored in the `characterStore`.
- When a base stat (like an ability score or proficiency) is updated, derived stats are automatically recalculated.
- For example, changing `strength` score will automatically update the `strength` modifier and any related skill modifiers.
- This logic is primarily handled within the `characterStore` and utility functions in `src/types/character.ts`.
