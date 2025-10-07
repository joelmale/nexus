import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createServer, IncomingMessage } from 'http';
import type { Room, Connection, ServerMessage, GameState } from './types.js';

class NexusServer {
  private rooms = new Map<string, Room>();
  private connections = new Map<string, Connection>();
  private wss: WebSocketServer;
  private port: number;
  private httpServer: ReturnType<typeof createServer>;

  // Session recovery settings
  private readonly HIBERNATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private readonly ABANDONMENT_TIMEOUT = 60 * 60 * 1000; // 1 hour

  constructor(port: number) {
    this.port = port;

    // Create HTTP server for health checks
    this.httpServer = createServer((req, res) => {
      if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          rooms: this.rooms.size,
          connections: this.connections.size
        }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Attach WebSocket server to HTTP server
    this.wss = new WebSocketServer({
      server: this.httpServer,
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Listen on 0.0.0.0 for Railway
    this.httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Nexus server running on port ${port}`);
      console.log(`🌐 HTTP health: http://0.0.0.0:${port}/health`);
      console.log(`🌐 WebSocket: ws://0.0.0.0:${port}`);
    });
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const uuid = uuidv4();
    const url = new URL(req.url!, 'ws://localhost');
    const params = url.searchParams;

    console.log(`📡 New connection: ${uuid}`);

    const connection: Connection = {
      id: uuid,
      ws: ws as any,
    };

    this.connections.set(uuid, connection);

    const host = params.get('host');
    const join = params.get('join')?.toUpperCase();
    const reconnect = params.get('reconnect')?.toUpperCase();

    if (host) {
      this.handleHostConnection(connection, host);
    } else if (reconnect) {
      this.handleHostReconnection(connection, reconnect);
    } else if (join) {
      this.handleJoinConnection(connection, join);
    } else {
      this.handleDefaultConnection(connection);
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.routeMessage(uuid, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`📡 Connection closed: ${uuid}`);
      this.handleDisconnect(uuid);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${uuid}:`, error);
      this.handleDisconnect(uuid);
    });
  }

  private handleHostConnection(connection: Connection, hostRoomCode?: string) {
    const roomCode = hostRoomCode || this.generateRoomCode();
    
    if (this.rooms.has(roomCode)) {
      this.sendError(connection, 'Room already exists');
      return;
    }

    const room: Room = {
      code: roomCode,
      host: connection.id,
      players: new Set([connection.id]),
      connections: new Map([[connection.id, connection.ws]]),
      created: Date.now(),
      lastActivity: Date.now(),
      status: 'active',
    };

    this.rooms.set(roomCode, room);
    connection.room = roomCode;
    connection.user = { name: 'Host', type: 'host' };

    // Send consistent field names
    this.sendMessage(connection, {
      type: 'event',
      data: { 
        name: 'session/created', 
        roomCode, // Use roomCode for consistency
        room: roomCode, // Keep both for backward compatibility
        uuid: connection.id 
      },
      timestamp: Date.now(),
    });

    console.log(`🏠 Room created: ${roomCode} by ${connection.id}`);
  }

  private handleHostReconnection(connection: Connection, roomCode: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      this.sendError(connection, 'Room not found');
      return;
    }

    if (room.status === 'abandoned') {
      this.sendError(connection, 'Room has been abandoned');
      return;
    }

    // Reactivate hibernated room and restore host
    if (room.status === 'hibernating') {
      console.log(`🔄 Host reconnecting to hibernated room: ${roomCode}`);

      room.status = 'active';
      room.lastActivity = Date.now();

      // Clear hibernation timer
      if (room.hibernationTimer) {
        clearTimeout(room.hibernationTimer);
        room.hibernationTimer = undefined;
      }
    } else {
      console.log(`🔄 Host reconnecting to active room: ${roomCode}`);
    }

    // Set up host connection
    room.host = connection.id;
    room.players.add(connection.id);
    room.connections.set(connection.id, connection.ws);
    room.lastActivity = Date.now();
    connection.room = roomCode;
    connection.user = { name: 'Host', type: 'host' };

    // Send reconnection confirmation
    console.log(`🎮 Room gameState when reconnecting:`, room.gameState ? 'exists' : 'null', room.gameState);
    this.sendMessage(connection, {
      type: 'event',
      data: {
        name: 'session/reconnected',
        roomCode,
        room: roomCode,
        uuid: connection.id,
        hostId: room.host,
        roomStatus: room.status,
        gameState: room.gameState
      },
      timestamp: Date.now(),
    });

    // Notify all players about host reconnection
    this.broadcastToRoom(roomCode, {
      type: 'event',
      data: {
        name: 'session/host-reconnected',
        uuid: connection.id
      },
      timestamp: Date.now(),
    }, connection.id);

    console.log(`🏠 Host reconnected to room ${roomCode}: ${connection.id}`);
  }

  private handleJoinConnection(connection: Connection, roomCode: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      this.sendError(connection, 'Room not found');
      return;
    }

    // Attempt room recovery if needed
    if (room.status !== 'active') {
      const recovered = this.attemptRoomRecovery(roomCode, connection);
      if (!recovered) {
        this.sendError(connection, 'Room is no longer available');
        return;
      }
    }

    room.players.add(connection.id);
    room.connections.set(connection.id, connection.ws);
    room.lastActivity = Date.now();
    connection.room = roomCode;
    connection.user = { name: 'Player', type: 'player' };

    // Notify player they joined
    this.sendMessage(connection, {
      type: 'event',
      data: {
        name: 'session/joined',
        roomCode, // Use roomCode for consistency
        room: roomCode, // Keep both for backward compatibility
        uuid: connection.id,
        hostId: room.host,
        roomStatus: room.status,
        gameState: room.gameState // Send saved game state if available
      },
      timestamp: Date.now(),
    });

    // Notify other players
    this.broadcastToRoom(roomCode, {
      type: 'event',
      data: {
        name: 'session/join',
        uuid: connection.id
      },
      timestamp: Date.now(),
    }, connection.id);

    console.log(`👋 Player joined room ${roomCode}: ${connection.id}`);
  }

  private handleDefaultConnection(connection: Connection) {
    const roomCode = this.generateRoomCode();
    this.handleHostConnection(connection, roomCode);
  }

  private routeMessage(fromUuid: string, message: ServerMessage) {
    const connection = this.connections.get(fromUuid);
    if (!connection?.room) return;

    const room = this.rooms.get(connection.room);
    if (!room) return;

    // Update room activity
    room.lastActivity = Date.now();

    console.log(`📨 Message from ${fromUuid} in room ${connection.room}: ${message.type}`);

    // Handle game state updates
    if (message.type === 'game-state-update' && message.data) {
      this.updateRoomGameState(connection.room, message.data);
    }

    // Route to specific player or broadcast to room
    if (message.dst) {
      const targetConnection = this.connections.get(message.dst);
      if (targetConnection && room.connections.has(message.dst)) {
        this.sendMessage(targetConnection, {
          ...message,
          src: fromUuid,
          timestamp: Date.now(),
        });
      }
    } else {
      this.broadcastToRoom(connection.room, {
        ...message,
        src: fromUuid,
        timestamp: Date.now(),
      }, fromUuid);
    }
  }

  private updateRoomGameState(roomCode: string, gameStateUpdate: Partial<GameState>) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Initialize game state if it doesn't exist
    if (!room.gameState) {
      room.gameState = {
        scenes: [],
        activeSceneId: null,
        characters: [],
        initiative: {},
      };
    }

    // Update game state with new data
    if (gameStateUpdate.scenes) {
      room.gameState.scenes = gameStateUpdate.scenes;
    }
    if (gameStateUpdate.activeSceneId !== undefined) {
      room.gameState.activeSceneId = gameStateUpdate.activeSceneId;
    }
    if (gameStateUpdate.characters) {
      room.gameState.characters = gameStateUpdate.characters;
    }
    if (gameStateUpdate.initiative) {
      room.gameState.initiative = gameStateUpdate.initiative;
    }

    console.log(`💾 Game state updated for room ${roomCode}`);
  }

  private broadcastToRoom(roomCode: string, message: ServerMessage, excludeUuid?: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.connections.forEach((ws, uuid) => {
      if (uuid !== excludeUuid) {
        const connection = this.connections.get(uuid);
        if (connection) {
          this.sendMessage(connection, message);
        }
      }
    });
  }

  private sendMessage(connection: Connection, message: ServerMessage) {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private sendError(connection: Connection, error: string) {
    this.sendMessage(connection, {
      type: 'error',
      data: { message: error },
      timestamp: Date.now(),
    });
  }

  private handleDisconnect(uuid: string) {
    const connection = this.connections.get(uuid);
    if (!connection?.room) {
      this.connections.delete(uuid);
      return;
    }

    const room = this.rooms.get(connection.room);
    if (!room) {
      this.connections.delete(uuid);
      return;
    }

    if (room.host === uuid) {
      // Host left - hibernate room instead of destroying immediately
      console.log(`🏠 Host left, hibernating room: ${connection.room}`);

      this.hibernateRoom(connection.room);

      // Notify remaining players about hibernation
      this.broadcastToRoom(connection.room, {
        type: 'event',
        data: {
          name: 'session/hibernated',
          message: 'Host disconnected. Room will remain available for 10 minutes.',
          reconnectWindow: this.HIBERNATION_TIMEOUT
        },
        timestamp: Date.now(),
      });

    } else {
      // Player left - notify others and update room
      console.log(`👋 Player left room ${connection.room}: ${uuid}`);

      room.players.delete(uuid);
      room.connections.delete(uuid);
      room.lastActivity = Date.now();

      this.broadcastToRoom(connection.room, {
        type: 'event',
        data: { name: 'session/leave', uuid },
        timestamp: Date.now(),
      });
    }

    this.connections.delete(uuid);
  }

  private hibernateRoom(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room || room.status === 'hibernating') return;

    room.status = 'hibernating';
    room.lastActivity = Date.now();

    // Clear existing hibernation timer if any
    if (room.hibernationTimer) {
      clearTimeout(room.hibernationTimer);
    }

    // Set timer to abandon room after hibernation timeout
    room.hibernationTimer = setTimeout(() => {
      this.abandonRoom(roomCode);
    }, this.HIBERNATION_TIMEOUT);

    console.log(`😴 Room ${roomCode} hibernated, will be abandoned in ${this.HIBERNATION_TIMEOUT / 1000}s`);
  }

  private abandonRoom(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    console.log(`🗑️ Abandoning room: ${roomCode}`);

    // Clear hibernation timer
    if (room.hibernationTimer) {
      clearTimeout(room.hibernationTimer);
    }

    // Close any remaining connections
    room.connections.forEach((ws, connUuid) => {
      ws.close();
      this.connections.delete(connUuid);
    });

    // Remove room
    this.rooms.delete(roomCode);
  }

  private attemptRoomRecovery(roomCode: string, connection: Connection): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    if (room.status === 'abandoned') {
      return false;
    }

    if (room.status === 'hibernating') {
      // Reactivate hibernated room
      console.log(`🔄 Reactivating hibernated room: ${roomCode}`);

      room.status = 'active';
      room.lastActivity = Date.now();

      // Clear hibernation timer
      if (room.hibernationTimer) {
        clearTimeout(room.hibernationTimer);
        room.hibernationTimer = undefined;
      }

      // Notify all players about room reactivation
      this.broadcastToRoom(roomCode, {
        type: 'event',
        data: {
          name: 'session/reactivated',
          message: 'Room has been reactivated.',
          reconnectedBy: connection.id
        },
        timestamp: Date.now(),
      });

      return true;
    }

    return room.status === 'active';
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    do {
      result = '';
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(result));
    
    return result;
  }

  // Cleanup method for graceful shutdown
  public shutdown() {
    console.log('🛑 Shutting down Nexus server...');

    // Clear all hibernation timers
    this.rooms.forEach((room) => {
      if (room.hibernationTimer) {
        clearTimeout(room.hibernationTimer);
      }
    });

    // Close all WebSocket connections
    this.connections.forEach((connection) => {
      connection.ws.close();
    });

    // Clear all data
    this.rooms.clear();
    this.connections.clear();

    // Close the WebSocket server
    this.wss.close(() => {
      console.log('✅ WebSocket server closed');
    });

    // Close the HTTP server
    this.httpServer.close(() => {
      console.log('✅ HTTP server closed');
      console.log('✅ Server shutdown complete');
    });
  }

  // Statistics method for monitoring
  public getStats() {
    const activeRooms = Array.from(this.rooms.values()).filter(r => r.status === 'active').length;
    const hibernatingRooms = Array.from(this.rooms.values()).filter(r => r.status === 'hibernating').length;

    return {
      activeRooms,
      hibernatingRooms,
      totalRooms: this.rooms.size,
      totalConnections: this.connections.size,
      serverPort: this.port,
      rooms: Array.from(this.rooms.entries()).map(([code, room]) => ({
        code,
        playerCount: room.players.size,
        connectionCount: room.connections.size,
        status: room.status,
        created: new Date(room.created).toISOString(),
        lastActivity: new Date(room.lastActivity).toISOString(),
        hasGameState: !!room.gameState,
      })),
    };
  }
}

// Start the server with strict port requirement
const REQUIRED_PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

console.log(`🚀 Starting WebSocket server on port ${REQUIRED_PORT}...`);

const server = new NexusServer(REQUIRED_PORT);
    
// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.shutdown();
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  server.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  server.shutdown();
  process.exit(1);
});

// Optional: Log server statistics every 5 minutes
setInterval(() => {
  const stats = server.getStats();
  console.log(`📊 Server Stats: ${stats.activeRooms} active, ${stats.hibernatingRooms} hibernating, ${stats.totalConnections} connections on port ${stats.serverPort}`);
}, 5 * 60 * 1000);
