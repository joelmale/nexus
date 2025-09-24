# Architecture

Nexus VTT employs a hybrid architecture that combines a lightweight WebSocket server with a client-authoritative game logic model. This design choice is intentional to minimize server costs and complexity while providing a highly responsive user experience.

## Core Concepts

- **Client-Side Authority:** The host of the game is the source of truth. All game state changes are initiated by the host and then broadcast to the other players.
- **Minimal Server:** The server's primary role is to act as a message relay, forwarding messages between the host and the players. It does not contain any game logic.
- **No Database:** The game state is not persisted on the server. The host's browser maintains the state, and it can be saved locally using IndexedDB in the future.

## Frontend

The frontend is a single-page application built with React and TypeScript. It is responsible for rendering the UI, managing the game state, and communicating with the server.

- **React:** The UI is built with React components.
- **Zustand:** State management is handled by Zustand, a small, fast, and scalable state management library.
- **Immer:** Zustand is used with the Immer middleware to allow for immutable state updates with a mutable-like syntax.
- **Vite:** The frontend is built and served with Vite, a fast and modern build tool.

For more details, see the [Frontend Documentation](./frontend.md).

## Backend

The backend is a lightweight WebSocket server built with Node.js and TypeScript. It is responsible for managing rooms and connections, and for relaying messages between clients.

- **Node.js:** The server is a Node.js application.
- **ws:** The WebSocket functionality is provided by the `ws` library.
- **tsx:** The server is run with `tsx` for on-the-fly TypeScript compilation.

For more details, see the [Backend Documentation](./backend.md).

## State Synchronization

State synchronization is achieved through a simple event-based system:

1. **Host Action:** The host performs an action in the UI (e.g., rolling a die).
2. **Event Generation:** The frontend generates an event that represents the action.
3. **Send to Server:** The event is sent to the WebSocket server.
4. **Broadcast to Players:** The server broadcasts the event to all other players in the room.
5. **Apply Event:** Each player's client receives the event and applies it to their local game state.
6. **UI Update:** The UI is re-rendered to reflect the new state.

This one-way data flow ensures that all clients are in sync with the host's state.
