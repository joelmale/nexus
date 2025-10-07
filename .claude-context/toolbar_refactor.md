# Toolbar and Selection Refactor

This document outlines the process of refactoring the selection model to unify interactions with different object types on the canvas.

## Initial Problem

The "Select/Move" tool (`select`) was exhibiting conflicting behavior. When a user tried to select a drawn object, it would often select a token instead, or vice-versa. This was because the selection logic for tokens and drawings was handled in separate, conflicting code paths. The `SceneCanvas.tsx` component maintained two separate state arrays, `selectedDrawings` and `selectedTokens`, which was the root cause of the issue.

## Initial (Incorrect) Plan

My initial proposal was to create a new, dedicated tool for token manipulation (e.g., a 'token' tool). This was correctly identified by the user as a suboptimal approach that would lead to more fragmented tooling. The user requested a more robust solution where the same set of tools could operate on any type of object (tokens, drawings, props, etc.).

## The Agreed-Upon Plan: A Unified Selection Model

We decided to refactor the codebase to use a single, unified selection model. The core idea was to treat every object on the canvas as a generic "selectable object."

The plan was as follows:

1.  **Centralize Selection State:** Create a single source of truth for the current selection in the main `gameStore` (Zustand).
2.  **Refactor `SceneCanvas.tsx`:** Modify the main canvas component to use this new centralized state instead of its local, separate selection states.
3.  **Update Tooling:** Ensure that tools and UI components (like the properties panel) correctly use the unified selection data.

## Implementation Steps

The refactoring was carried out in the following stages:

### Stage 1: Update `gameStore.ts` (The Single Source of Truth)

1.  **Updated `SceneState` Type:** The `SceneState` interface in `src/types/game.ts` was modified to include the new selection array:
    ```typescript
    export interface SceneState {
      // ...
      activeTool: string;
      selectedObjectIds: string[]; // IDs of selected objects (tokens, drawings, etc.)
    }
    ```
2.  **Modified `initialState`:** The `initialState` object in `src/stores/gameStore.ts` was updated to include the new empty array:
    ```typescript
    sceneState: {
      // ...
      activeTool: 'select' as const,
      selectedObjectIds: [],
    },
    ```
3.  **Added Selection Actions:** New actions were added to the `gameStore` to manage the selection state:
    *   `setSelection(objectIds: string[])`
    *   `addToSelection(objectIds: string[])`
    *   `removeFromSelection(objectIds: string[])`
    *   `clearSelection()`

### Stage 2: Refactor `SceneCanvas.tsx`

1.  **Removed Local State:** The `useState` variables for `selectedDrawings` and `selectedTokens` were completely removed.
2.  **Adopted Centralized State:** The component was updated to get the `selectedObjectIds` array and the new selection actions from the `useGameStore()` hook.
3.  **Updated Interaction Handlers:**
    *   `handleSelectionChange`: This function (called by the `DrawingTools` component) was modified to calculate the complete list of selected drawing and token IDs and update the store using `setSelection()`.
    *   `handleTokenSelect`: This function was updated to use `setSelection()` for single-select and `addToSelection()` for multi-select (Shift-click).
    *   `handleClosePropertiesPanel`: This was updated to call the new `clearSelection()` action.
4.  **Updated Child Components:**
    *   The `isSelected` prop of the `TokenRenderer` component was changed to check if the token's ID is included in the `selectedObjectIds` array.
    *   The `SelectionOverlay` component was updated to use `selectedObjectIds` for rendering the selection box and `clearSelection` for its clear action.

### Stage 3: Resolving Type Errors

After the initial refactoring, the TypeScript compiler reported errors because other parts of the application that used `SceneState` were not updated.

1.  **`hybridStateManager.ts`:** The `createInitialGameState` function was updated to include `selectedObjectIds: []` in its `sceneState` definition.
2.  **`hybridGameStore.ts`:** The initial state and the `reset` action in this store were also updated to include `selectedObjectIds: []`.

After these changes, all type errors related to the refactor were resolved.

### Stage 4: Filtering for the `DrawingPropertiesPanel`

A final issue was addressed: the `DrawingPropertiesPanel` was being shown for any selected object, including tokens, which was incorrect.

1.  **Filtered Selection:** In `SceneCanvas.tsx`, the `useSceneDrawings` hook was used to get a list of all drawings in the scene.
2.  **Created `selectedDrawingIds`:** A new memoized variable, `selectedDrawingIds`, was created by filtering the main `selectedObjectIds` array to only include IDs that belong to drawings.
3.  **Updated Panel Logic:** The `DrawingPropertiesPanel` was updated to only render when `selectedDrawingIds.length > 0` and to receive this filtered list as its prop.

## Final Outcome

The refactoring was successful. The selection system is now unified, resolving the original bug and providing a scalable foundation for future development. The `select` tool now works consistently across different object types.
