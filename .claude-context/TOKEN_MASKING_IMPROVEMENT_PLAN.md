# Token Background Removal Improvement Plan

## Overview

The current color-based background removal for tokens is limited and unreliable. This plan outlines the development of a more robust, user-friendly system based on shape-based masking. This will allow users to define the shape of their token (e.g., circle, square, hexagon) and mask the original image, providing a clean and predictable result regardless of the image's background.

## Key Features

*   **Shape-Based Masking:** Instead of guessing the background, the user defines the foreground by selecting a shape.
*   **Interactive Tool:** A user-friendly interface within the `TokenConfigPanel` will allow for real-time positioning and resizing of the mask.
*   **Client-Side Processing:** The entire process will be handled on the client-side using the HTML5 Canvas API for speed and efficiency.
*   **Support for Common Shapes:** The tool will support circles, squares, and hexagons to cover the most common token styles.
*   **(Optional) Edge Feathering:** A feature to create softer edges for a more polished look.

## Proposed Workflow

1.  **Select Tool:** In the `TokenConfigPanel`, the user will have an option to "Mask with Shape" in addition to the existing "Auto Remove Background".
2.  **Choose Shape:** The user selects a shape (Circle, Square, or Hexagon) from a simple toolbar.
3.  **Position and Resize:** An interactive, semi-transparent overlay of the selected shape appears on the token preview. The user can drag and resize this shape to perfectly frame the desired part of the image.
4.  **Apply Mask:** The user clicks an "Apply Mask" button.
5.  **Preview:** The token preview updates instantly to show the masked image with a transparent background.
6.  **Save:** The masked image is saved as the new token image.

## Technical Implementation

*   **Frontend:** The UI will be built in React within the `TokenConfigPanel.tsx` component.
*   **Canvas API:** The core masking logic will use the HTML5 Canvas API.
    *   The original image will be drawn onto a canvas.
    *   The user-defined shape will be drawn on top.
    *   `ctx.globalCompositeOperation = 'destination-in'` will be used to apply the mask.
    *   The resulting image will be exported as a PNG data URL.
*   **State Management:** The position, size, and shape of the mask will be managed in the component's React state.

## Development Plan

### Phase 1: Core Functionality (Circle Mask)

1.  **UI Elements:** Add a "Mask with Shape" button and a shape selector (initially just for circles) to `TokenConfigPanel.tsx`.
2.  **Interactive Overlay:** Create a new component that renders a draggable and resizable circle overlay on the token preview.
3.  **Canvas Logic:** Implement the `applyMask` function that takes an image and mask parameters (shape, x, y, radius) and returns a new data URL with the masked image.
4.  **Integration:** Wire up the UI to the canvas logic and the "Save" button.

### Phase 2: Additional Shapes

1.  **Square Mask:** Add a square shape option and the corresponding canvas drawing logic.
2.  **Hexagon Mask:** Add a hexagon shape option. This will require a function to draw a regular hexagon path on the canvas.

### Phase 3: Polish and Extra Features

1.  **Edge Feathering:** Add a slider to control the `ctx.shadowBlur` property on the mask before applying it, creating a soft edge.
2.  **Save Mask Parameters:** (Optional) Extend the `Token` type to store the mask parameters, allowing users to edit the mask later.

## Benefits

*   **High Reliability:** Works with any image, regardless of background complexity.
*   **Great User Experience:** Intuitive and visual tool that gives the user full control.
*   **No External Dependencies:** Can be implemented with existing browser technologies.
*   **Improved Quality:** Produces clean, professional-looking tokens.
