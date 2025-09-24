# Backend Documentation

This document provides a detailed overview of the backend architecture of Nexus VTT.

## Project Structure

The backend code is located in the `server` directory:

```
server/
├── index.ts           # Main server with port management
└── types.ts           # Server type definitions
```

## Responsibilities

The backend is a lightweight WebSocket server with a minimal set of responsibilities:

- **Room Management:** Creating and managing game rooms with unique 4-character codes.
- **Connection Handling:** Managing WebSocket connections for each client.
- **Message Relaying:** Relaying messages between the host and players in a room.

## WebSocket Server

The server is built with the `ws` library for Node.js. The main server logic is in `server/index.ts`.

### `NexusServer`

The `NexusServer` class encapsulates the server's functionality:

- **`handleConnection(ws: WebSocket, req: any)`:** Handles a new WebSocket connection.
- **`handleHostConnection(connection: Connection, hostRoomCode?: string)`:** Handles a connection from a host.
- **`handleJoinConnection(connection: Connection, roomCode: string)`:** Handles a connection from a player joining a room.
- **`routeMessage(fromUuid: string, message: any)`:** Routes a message to the appropriate room or player.
- **`broadcastToRoom(roomCode: string, message: ServerMessage, excludeUuid?: string)`:** Broadcasts a message to all players in a room.
- **`handleDisconnect(uuid: string)`:** Handles a client disconnection.

## Message Protocol

The server and clients communicate using a simple JSON-based message protocol. All messages have the following basic structure:

```typescript
interface WebSocketMessage {
  type: string;
  data: any;
  src?: string; // Source client UUID
  dst?: string; // Destination client UUID
  timestamp: number;
}
```

### Message Types

- **`event`:** A game event, such as `session/created` or `dice/roll`.
- **`dice-roll`:** A dice roll result.
- **`state`:** A partial state update.
- **`error`:** An error message.

## Room Management

- **Room Creation:** A room is created when a host connects to the server.
- **Room Codes:** Each room is assigned a unique 4-character code.
- **Joining a Room:** Players can join a room by providing the room code.
- **Host Disconnection:** If the host disconnects, the room is destroyed, and all players are disconnected.
