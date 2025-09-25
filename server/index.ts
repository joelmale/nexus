import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { Room, Connection, ServerMessage } from './types.js';

class NexusServer {
  private rooms = new Map<string, Room>();
  private connections = new Map<string, Connection>();
  private wss: WebSocketServer;
  private port: number;

  constructor(port: number) {
    this.port = port;
    
    this.wss = new WebSocketServer({ 
      port,
      perMessageDeflate: false 
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log(`🚀 Nexus WebSocket server running on port ${port}`);
    console.log(`🌐 Connect to: ws://localhost:${port}/ws`);
  }

  private handleConnection(ws: WebSocket, req: any) {
    const uuid = uuidv4();
    const url = new URL(req.url!, 'ws://localhost');
    const params = url.searchParams;

    console.log(`📡 New connection: ${uuid}`);

    const connection: Connection = {
      id: uuid,
      ws,
    };

    this.connections.set(uuid, connection);

    const host = params.get('host');
    const join = params.get('join')?.toUpperCase();

    if (host) {
      this.handleHostConnection(connection, host);
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

  private handleJoinConnection(connection: Connection, roomCode: string) {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      this.sendError(connection, 'Room not found');
      return;
    }

    room.players.add(connection.id);
    room.connections.set(connection.id, connection.ws);
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
        hostId: room.host 
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

  private routeMessage(fromUuid: string, message: any) {
    const connection = this.connections.get(fromUuid);
    if (!connection?.room) return;

    const room = this.rooms.get(connection.room);
    if (!room) return;

    console.log(`📨 Message from ${fromUuid} in room ${connection.room}: ${message.type}`);

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
      // Host left - destroy room and notify all players
      console.log(`🏠 Host left, destroying room: ${connection.room}`);
      
      this.broadcastToRoom(connection.room, {
        type: 'event',
        data: { name: 'session/ended' },
        timestamp: Date.now(),
      });

      // Close all connections in the room
      room.connections.forEach((ws, connUuid) => {
        if (connUuid !== uuid) {
          ws.close();
        }
        this.connections.delete(connUuid);
      });

      this.rooms.delete(connection.room);
    } else {
      // Player left - notify others and update room
      console.log(`👋 Player left room ${connection.room}: ${uuid}`);
      
      room.players.delete(uuid);
      room.connections.delete(uuid);
      
      this.broadcastToRoom(connection.room, {
        type: 'event',
        data: { name: 'session/leave', uuid },
        timestamp: Date.now(),
      });
    }

    this.connections.delete(uuid);
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
    
    // Close all WebSocket connections
    this.connections.forEach((connection) => {
      connection.ws.close();
    });
    
    // Clear all data
    this.rooms.clear();
    this.connections.clear();
    
    // Close the WebSocket server
    this.wss.close(() => {
      console.log('✅ Server shutdown complete');
    });
  }

  // Statistics method for monitoring
  public getStats() {
    return {
      activeRooms: this.rooms.size,
      totalConnections: this.connections.size,
      serverPort: this.port,
      rooms: Array.from(this.rooms.entries()).map(([code, room]) => ({
        code,
        playerCount: room.players.size,
        created: new Date(room.created).toISOString(),
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
  console.log(`📊 Server Stats: ${stats.activeRooms} rooms, ${stats.totalConnections} connections on port ${stats.serverPort}`);
}, 5 * 60 * 1000);
