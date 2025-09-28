# Gemini Context

This file provides context for the Gemini AI assistant.

## Unit Testing

Unit tests have been created for the following files:

*   **`src/components/DiceRoller.tsx`**: A basic test to ensure the component renders without crashing.
*   **`src/utils/dice.ts`**: A comprehensive test suite covering:
    *   Parsing of dice expressions (e.g., "2d6+3").
    *   Dice rolling logic.
    *   Creation of dice roll objects, including advantage/disadvantage.
    *   Formatting of dice roll results.
*   **`src/stores/gameStore.ts`**: A test suite for the main Zustand store, including:
    *   Verification of the initial state.
    *   Testing of core actions like `setUser`, `setSession`, and `addDiceRoll`.
    *   Testing of scene management actions (`createScene`, `updateScene`, `deleteScene`).
    *   Verification of the event handling system for events like `dice/roll` and `user/join`.
    *   The persistence layer is mocked to isolate the store logic.
*   **`src/utils/assetManager.ts`**: A test suite for the asset manager, with mocks for `fetch` and `indexedDB`. The tests cover:
    *   Loading the asset manifest.
    *   Fetching assets by category.
    *   Searching for assets.
    *   Loading and caching assets in memory.

The unit tests can be run with the command `npm run test:unit`.
