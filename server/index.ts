import { WebSocketServer, WebSocket } from 'ws';

import { v4 as uuidv4 } from 'uuid';
import { IncomingMessage } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type {
  Room,
  Connection,
  ServerMessage,
  GameState,
  ServerDiceRollResultMessage,
} from './types.js';
import type { AssetManifest } from '../shared/types.js';
import {
  createServerDiceRoll,
  validateDiceRollRequest,
  type DiceRollRequest,
} from './diceRoller.js';
import { DatabaseService, createDatabaseService } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asset categories for directory structure
const ASSET_CATEGORIES = {
  Maps: 'Maps',
  Tokens: 'Tokens',
  Art: 'Art',
  Handouts: 'Handouts',
  Reference: 'Reference',
};

class NexusServer {
  private rooms = new Map<string, Room>();
  private connections = new Map<string, Connection>();
  private wss: WebSocketServer;
  private port: number;
  private app: express.Application;
  private httpServer: ReturnType<typeof express.application.listen>;
  private manifest: AssetManifest | null = null;
  private db: DatabaseService;

  // Configuration
  private readonly ASSETS_PATH =
    process.env.ASSETS_PATH || path.join(__dirname, '../asset-server/assets');
  private readonly CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
  private readonly CACHE_MAX_AGE = parseInt(
    process.env.CACHE_MAX_AGE || '86400',
  );

  // Session recovery settings
  private readonly HIBERNATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private readonly ABANDONMENT_TIMEOUT = 60 * 60 * 1000; // 1 hour

  // Heartbeat settings
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 10 * 1000; // 10 seconds timeout
  private readonly MAX_CONSECUTIVE_MISSES = 3; // Max missed pongs before considering connection poor
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(port: number) {
    this.port = port;
    this.db = createDatabaseService();

    // Create Express app
    this.app = express();

    // Middleware
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      }),
    );
    this.app.use(compression());
    this.app.use(
      cors({
        origin: this.CORS_ORIGIN,
        credentials: false,
      }),
    );
    this.app.use(express.json());

    // Setup routes
    this.setupAssetRoutes();
    this.setupHealthRoutes();

    // Create HTTP server from Express app
    this.httpServer = this.app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Nexus server running on port ${port}`);
      console.log(`🌐 HTTP health: http://0.0.0.0:${port}/health`);
      console.log(`🌐 WebSocket: ws://0.0.0.0:${port}`);
      console.log(`📁 Assets: http://0.0.0.0:${port}/assets/`);
    });

    // Attach WebSocket server to HTTP server
    this.wss = new WebSocketServer({
      server: this.httpServer,
      perMessageDeflate: false,
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Load asset manifest
    this.loadManifest();
    this.initialize();
  }

  private async initialize() {
    try {
      await this.db.initialize();
      await this.loadRoomsFromDatabase();
      console.log('✅ Server initialization complete');
    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      process.exit(1);
    }
  }

  private async loadRoomsFromDatabase() {
    try {
      const rooms = await this.db.listActiveRooms();

      for (const roomRecord of rooms) {
        const gameState = await this.db.loadGameState(roomRecord.code);
        const players = await this.db.getRoomPlayers(roomRecord.code);

        // Restore room to memory (without active connections)
        const room: Room = {
          code: roomRecord.code,
          host: roomRecord.primary_host_id,
          coHosts: new Set(), // This will be populated from the hosts table
          players: new Set(players.map(p => p.id)),
          connections: new Map(),
          created: new Date(roomRecord.created_at).getTime(),
          lastActivity: new Date(roomRecord.last_activity).getTime(),
          status: roomRecord.status,
          gameState: gameState || undefined,
          entityVersions: new Map(),
        };

        this.rooms.set(roomRecord.code, room);

        // If hibernating, restart timer
        if (room.status === 'hibernating') {
          this.hibernateRoom(room.code);
        }
      }

      console.log(`📦 Loaded ${rooms.length} rooms from database`);
    } catch (error) {
      console.error('❌ Failed to load rooms from database:', error);
    }
  }

  private setupHealthRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '1.0.0',
        port: this.port, // ✅ Broadcast server port for discovery
        wsUrl: `ws://localhost:${this.port}`,
        rooms: this.rooms.size,
        connections: this.connections.size,
        assetsLoaded: this.manifest?.totalAssets || 0,
        uptime: process.uptime(),
      });
    });

    this.app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        port: this.port, // ✅ Include port in root endpoint too
        wsUrl: `ws://localhost:${this.port}`,
        rooms: this.rooms.size,
        connections: this.connections.size,
      });
    });
  }

  private setupAssetRoutes() {
    // Cache headers helper
    const setCacheHeaders = (
      res: express.Response,
      maxAge: number = this.CACHE_MAX_AGE,
    ) => {
      res.set({
        'Cache-Control': `public, max-age=${maxAge}`,
        ETag: `"${Date.now()}"`,
        Vary: 'Accept-Encoding',
      });
    };

    // Manifest endpoint
    this.app.get('/manifest.json', (req, res) => {
      if (!this.manifest) {
        return res.status(503).json({ error: 'Manifest not loaded' });
      }

      setCacheHeaders(res, 300); // Cache manifest for 5 minutes
      res.json(this.manifest);
    });

    // Asset search
    this.app.get('/search', (req, res) => {
      if (!this.manifest) {
        return res.status(503).json({ error: 'Manifest not loaded' });
      }

      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res
          .status(400)
          .json({ error: 'Query must be at least 2 characters' });
      }

      const lowercaseQuery = query.toLowerCase();
      const results = this.manifest.assets.filter(
        (asset) =>
          asset.name.toLowerCase().includes(lowercaseQuery) ||
          asset.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
      );

      setCacheHeaders(res, 60); // Cache search results for 1 minute
      res.json({
        query,
        results,
        total: results.length,
      });
    });

    // Category filter
    this.app.get('/category/:category', (req, res) => {
      if (!this.manifest) {
        return res.status(503).json({ error: 'Manifest not loaded' });
      }

      const category = req.params.category;
      const page = parseInt(req.query.page as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      let filteredAssets = this.manifest.assets;
      if (category !== 'all') {
        filteredAssets = this.manifest.assets.filter(
          (asset) => asset.category === category,
        );
      }

      const start = page * limit;
      const end = start + limit;
      const assets = filteredAssets.slice(start, end);

      setCacheHeaders(res, 300);
      res.json({
        category,
        page,
        limit,
        assets,
        hasMore: end < filteredAssets.length,
        total: filteredAssets.length,
      });
    });

    // Asset info endpoint
    this.app.get('/asset/:id', (req, res) => {
      if (!this.manifest) {
        return res.status(503).json({ error: 'Manifest not loaded' });
      }

      const asset = this.manifest.assets.find((a) => a.id === req.params.id);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      setCacheHeaders(res, 86400);
      res.json(asset);
    });

    // Serve static assets with caching (new structure)
    Object.values(ASSET_CATEGORIES).forEach((categoryName) => {
      this.app.use(
        `/${categoryName}/assets`,
        (req, res, next) => {
          setCacheHeaders(res);
          next();
        },
        express.static(path.join(this.ASSETS_PATH, categoryName, 'assets')),
      );

      this.app.use(
        `/${categoryName}/thumbnails`,
        (req, res, next) => {
          setCacheHeaders(res);
          next();
        },
        express.static(path.join(this.ASSETS_PATH, categoryName, 'thumbnails')),
      );
    });

    // Legacy support for old structure
    this.app.use(
      '/assets',
      (req, res, next) => {
        setCacheHeaders(res);
        next();
      },
      express.static(path.join(this.ASSETS_PATH, 'assets')),
    );

    this.app.use(
      '/thumbnails',
      (req, res, next) => {
        setCacheHeaders(res);
        next();
      },
      express.static(path.join(this.ASSETS_PATH, 'thumbnails')),
    );

    // 404 handler for API routes
    this.app.use((req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/manifest') ||
        req.path.startsWith('/search') ||
        req.path.startsWith('/category') ||
        req.path.startsWith('/asset/')
      ) {
        res.status(404).json({
          error: 'Not found',
          availableEndpoints: [
            '/health',
            '/manifest.json',
            '/search?q=term',
            '/category/:name',
            '/asset/:id',
            '/assets/:filename',
            '/thumbnails/:filename',
          ],
        });
      } else {
        next();
      }
    });
  }

  private loadManifest() {
    try {
      const manifestPath = path.join(this.ASSETS_PATH, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log(
          `📋 Loaded manifest: ${this.manifest?.totalAssets} assets in ${this.manifest?.categories.length} categories`,
        );
      } else {
        console.warn('⚠️  No manifest.json found at', manifestPath);
        this.manifest = {
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          totalAssets: 0,
          categories: [],
          assets: [],
        };
      }
    } catch (error) {
      console.error('❌ Failed to load manifest:', error);
      this.manifest = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        totalAssets: 0,
        categories: [],
        assets: [],
      };
    }

    // Watch for manifest changes in development
    if (process.env.NODE_ENV !== 'production') {
      const manifestPath = path.join(this.ASSETS_PATH, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        fs.watchFile(manifestPath, () => {
          console.log('📋 Manifest changed, reloading...');
          this.loadManifest();
        });
      }
    }
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const uuid = uuidv4();
    const url = new URL(req.url!, 'ws://localhost');
    const params = url.searchParams;

    console.log(`📡 New connection: ${uuid}`);

    const connection: Connection = {
      id: uuid,
      ws: ws,
      consecutiveMisses: 0,
      connectionQuality: 'excellent',
    };

    this.connections.set(uuid, connection);

    // Start heartbeat for new connections
    this.startHeartbeatForConnection(connection);

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

  private async handleHostConnection(connection: Connection, hostRoomCode?: string) {
    const roomCode = hostRoomCode || this.generateRoomCode();

    if (this.rooms.has(roomCode)) {
      this.sendError(connection, 'Room already exists');
      return;
    }

    const room: Room = {
      code: roomCode,
      host: connection.id,
      coHosts: new Set(),
      players: new Set([connection.id]),
      connections: new Map([[connection.id, connection.ws]]),
      created: Date.now(),
      lastActivity: Date.now(),
      status: 'active',
      entityVersions: new Map(),
    };

    this.rooms.set(roomCode, room);
    connection.room = roomCode;
    connection.user = { name: 'Host', type: 'host' };

    // Persist to database
    try {
      await this.db.createRoom(roomCode, connection.id);
      await this.db.addPlayer(connection.id, roomCode, 'Host');
      await this.db.logConnectionEvent(roomCode, connection.id, 'host_created');
    } catch (error) {
      console.error('Failed to persist room to database:', error);
      // Should we send an error to the client?
    }

    // Send consistent field names
    this.sendMessage(connection, {
      type: 'event',
      data: {
        name: 'session/created',
        roomCode, // Use roomCode for consistency
        room: roomCode, // Keep both for backward compatibility
        uuid: connection.id,
        hostId: connection.id,
        coHostIds: Array.from(room.coHosts),
        players: [{
          id: connection.id,
          name: connection.user?.name || 'Host',
          type: 'host',
          color: 'blue',
          connected: true,
          canEditScenes: true,
        }],
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
    console.log(
      `🎮 Room gameState when reconnecting:`,
      room.gameState ? 'exists' : 'null',
      room.gameState,
    );
    this.sendMessage(connection, {
      type: 'event',
      data: {
        name: 'session/reconnected',
        roomCode,
        room: roomCode,
        uuid: connection.id,
        hostId: room.host,
        roomStatus: room.status,
        gameState: room.gameState,
      },
      timestamp: Date.now(),
    });

    // Notify all players about host reconnection
    this.broadcastToRoom(
      roomCode,
      {
        type: 'event',
        data: {
          name: 'session/host-reconnected',
          uuid: connection.id,
        },
        timestamp: Date.now(),
      },
      connection.id,
    );

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
        coHostIds: Array.from(room.coHosts),
        roomStatus: room.status,
        gameState: room.gameState, // Send saved game state if available
        players: Array.from(room.players).map(playerId => {
          const conn = this.connections.get(playerId);
          return {
            id: playerId,
            name: conn?.user?.name || 'Unknown',
            type: playerId === room.host ? 'host' : (room.coHosts.has(playerId) ? 'host' : 'player'),
            color: 'blue', // Default color
            connected: true,
            canEditScenes: playerId === room.host || room.coHosts.has(playerId),
          };
        }),
      },
      timestamp: Date.now(),
    });

    // Notify other players
    this.broadcastToRoom(
      roomCode,
      {
        type: 'event',
        data: {
          name: 'session/join',
          uuid: connection.id,
        },
        timestamp: Date.now(),
      },
      connection.id,
    );

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

    console.log(
      `📨 Message from ${fromUuid} in room ${connection.room}: ${message.type}`,
    );

    // Handle heartbeat messages
    if (message.type === 'heartbeat') {
      const heartbeatData = message.data as {
        type: 'ping' | 'pong';
        id: string;
      };
      if (heartbeatData.type === 'pong') {
        this.handleHeartbeatPong(fromUuid, heartbeatData.id);
      }
      return; // Don't route heartbeat messages to rooms
    }

    // Handle dice roll requests (server-authoritative)
    if (
      message.type === 'event' &&
      message.data?.name === 'dice/roll-request'
    ) {
      this.handleDiceRollRequest(
        fromUuid,
        connection,
        message.data as unknown as DiceRollRequest,
      );
      return;
    }

    // Handle host management events
    if (message.type === 'event') {
      const eventName = message.data?.name;
      if (eventName === 'host/transfer') {
        this.handleHostTransfer(fromUuid, connection, room, message.data);
        return;
      } else if (eventName === 'host/add-cohost') {
        this.handleAddCoHost(fromUuid, connection, room, message.data);
        return;
      } else if (eventName === 'host/remove-cohost') {
        this.handleRemoveCoHost(fromUuid, connection, room, message.data);
        return;
      }
    }

    // Handle game state updates
    if (
      message.type === 'event' &&
      message.data?.name === 'game-state-update'
    ) {
      this.updateRoomGameState(
        connection.room,
        message.data as unknown as GameState,
      );
    }

    // Handle conflict resolution for token events
    if (
      message.type === 'event' &&
      ['token/move', 'token/update', 'token/delete'].includes(
        (message.data as any)?.name,
      )
    ) {
      const eventData = message.data as any;
      const entityId = eventData.tokenId;
      const expectedVersion = eventData.expectedVersion;

      if (entityId && expectedVersion !== undefined) {
        const currentVersion = room.entityVersions.get(entityId) || 0;

        // Check for version conflict
        if (expectedVersion < currentVersion) {
          console.warn(
            `⚠️ Version conflict detected for ${entityId}: expected ${expectedVersion}, current ${currentVersion}`,
          );

          // Send conflict rejection to client
          this.sendMessage(connection, {
            type: 'error',
            data: {
              message: `Update rejected due to version conflict for ${entityId} (expected v${expectedVersion}, current v${currentVersion})`,
              code: 409, // Conflict status code
            },
            timestamp: Date.now(),
          });

          // Don't route this conflicting update
          return;
        }

        // Update version on successful update
        room.entityVersions.set(entityId, expectedVersion + 1);
      }
    }

    // Send confirmation for optimistic updates (but not for cursor events)
    if (
      message.type === 'event' &&
      (message.data as any)?.updateId &&
      (message.data as any)?.name !== 'cursor/update'
    ) {
      // Send confirmation back to originating client
      this.sendMessage(connection, {
        type: 'update-confirmed',
        data: { updateId: (message.data as any).updateId },
        timestamp: Date.now(),
      });
    }

    // Handle chat messages
    if ((message as any).type === 'chat-message') {
      this.handleChatMessage(fromUuid, connection, message);
      return;
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
      this.broadcastToRoom(
        connection.room,
        {
          ...message,
          src: fromUuid,
          timestamp: Date.now(),
        },
        fromUuid,
      );
    }
  }

  private handleChatMessage(
    fromUuid: string,
    connection: Connection,
    message: any,
  ) {
    if (!connection.room) return;

    const room = this.rooms.get(connection.room);
    if (!room) return;

    const content = message.data?.content || '';
    console.log(
      `💬 Chat message from ${fromUuid} in room ${connection.room}: ${content}`,
    );

    // For now, broadcast all chat messages to the room
    // TODO: Add whisper support and message filtering
    this.broadcastToRoom(
      connection.room,
      {
        ...message,
        src: fromUuid,
        timestamp: Date.now(),
      },
      fromUuid,
    );
  }

  private handleDiceRollRequest(
    fromUuid: string,
    connection: Connection,
    data: DiceRollRequest,
  ) {
    console.log(`🎲 Dice roll request from ${fromUuid}:`, data);

    // Validate the request
    const validation = validateDiceRollRequest(data);
    if (!validation.valid) {
      this.sendError(
        connection,
        validation.error || 'Invalid dice roll request',
      );
      return;
    }

    // Get user info
    const userName = connection.user?.name || 'Unknown Player';
    const isHost = connection.user?.type === 'host';

    // Generate the dice roll on the server (cryptographically secure)
    const roll = createServerDiceRoll(data.expression, fromUuid, userName, {
      isPrivate: isHost && data.isPrivate,
      advantage: data.advantage,
      disadvantage: data.disadvantage,
    });

    if (!roll) {
      this.sendError(connection, 'Failed to create dice roll');
      return;
    }

    console.log(`🎲 Dice roll generated:`, {
      id: roll.id,
      expression: roll.expression,
      total: roll.total,
      crit: roll.crit,
    });

    // Broadcast the result to all clients in the room
    this.broadcastToRoom(connection.room!, {
      type: 'event',
      data: {
        name: 'dice/roll-result',
        roll,
      } as ServerDiceRollResultMessage['data'],
      src: fromUuid,
      timestamp: Date.now(),
    });
  }

  private async updateRoomGameState(
    roomCode: string,
    gameStateUpdate: Partial<GameState>,
  ) {
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

    // Persist to database
    try {
      await this.db.saveGameState(roomCode, room.gameState);
      console.log(`💾 Game state updated and persisted for room ${roomCode}`);
    } catch (error) {
      console.error('Failed to persist game state:', error);
    }
  }

  private broadcastToRoom(
    roomCode: string,
    message: ServerMessage,
    excludeUuid?: string,
  ) {
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

  private async handleDisconnect(uuid: string) {
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

    try {
      await this.db.removePlayer(uuid, connection.room);
      await this.db.logConnectionEvent(connection.room, uuid, 'disconnected');
    } catch (error) {
      console.error('Failed to update player status in database:', error);
    }

    if (room.host === uuid) {
      // Host left - attempt automatic host transfer
      console.log(
        `👑 Host left room ${connection.room}, attempting automatic transfer`,
      );

      const newHost = this.selectNewHost(room, uuid);
      if (newHost) {
        // Transfer host privileges
        room.host = newHost;
        room.coHosts.delete(uuid); // Remove old host from co-hosts if they were one

        try {
          await this.db.updateRoomHost(connection.room, newHost);
        } catch (error) {
          console.error('Failed to update host in database:', error);
        }

        // Update the new host's connection info
        const newHostConnection = this.connections.get(newHost);
        if (newHostConnection) {
          newHostConnection.user = {
            name: newHostConnection.user?.name || 'Host',
            type: 'host',
          };
        }

        console.log(
          `👑 Host transferred to: ${newHost} in room ${connection.room}`,
        );

        // Notify all players about the host change
        this.broadcastToRoom(connection.room, {
          type: 'event',
          data: {
            name: 'session/host-changed',
            newHostId: newHost,
            reason: 'host-disconnected',
            message:
              'The host has disconnected. Host privileges have been transferred.',
          },
          timestamp: Date.now(),
        });

        // Update room activity and continue normally
        room.lastActivity = Date.now();
      } else {
        // No suitable host found, hibernate room
        console.log(
          `🏠 No suitable host found, hibernating room: ${connection.room}`,
        );
        this.hibernateRoom(connection.room);

        // Notify remaining players about hibernation
        this.broadcastToRoom(connection.room, {
          type: 'event',
          data: {
            name: 'session/hibernated',
            message:
              'Host disconnected and no players available to take over. Room will remain available for 10 minutes.',
            reconnectWindow: this.HIBERNATION_TIMEOUT,
          },
          timestamp: Date.now(),
        });
      }
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

    // Stop heartbeat if no connections remain
    if (this.connections.size === 0) {
      this.stopHeartbeat();
    }
  }

  private async hibernateRoom(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room || room.status === 'hibernating') return;

    room.status = 'hibernating';
    room.lastActivity = Date.now();

    try {
      await this.db.updateRoomStatus(roomCode, 'hibernating');
    } catch (error) {
      console.error('Failed to update room status to hibernating in db', error);
    }

    // Clear existing hibernation timer if any
    if (room.hibernationTimer) {
      clearTimeout(room.hibernationTimer);
    }

    // Set timer to abandon room after hibernation timeout
    room.hibernationTimer = setTimeout(() => {
      this.abandonRoom(roomCode);
    }, this.HIBERNATION_TIMEOUT);

    console.log(
      `😴 Room ${roomCode} hibernated, will be abandoned in ${this.HIBERNATION_TIMEOUT / 1000}s`,
    );
  }

  private async abandonRoom(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    console.log(`🗑️ Abandoning room: ${roomCode}`);

    try {
      await this.db.updateRoomStatus(roomCode, 'abandoned');
      await this.db.logConnectionEvent(roomCode, '', 'room_abandoned');
    } catch (error) {
      console.error('Failed to update room status to abandoned in db', error);
    }

    // Clear hibernation timer
    if (room.hibernationTimer) {
      clearTimeout(room.hibernationTimer);
    }

    // Close any remaining connections
    room.connections.forEach((ws, connUuid) => {
      ws.close();
      this.connections.delete(connUuid);
    });

    // Remove from memory
    this.rooms.delete(roomCode);

    // Schedule deletion from database
    setTimeout(async () => {
      try {
        await this.db.deleteRoom(roomCode);
        console.log(`🗑️ Deleted abandoned room from database: ${roomCode}`);
      } catch (error) {
        console.error('Failed to delete room from database:', error);
      }
    }, this.ABANDONMENT_TIMEOUT);
  }

  private attemptRoomRecovery(
    roomCode: string,
    _connection: Connection,
  ): boolean {
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
          reconnectedBy: _connection.id,
        },
        timestamp: Date.now(),
      });

      return true;
    }

    return room.status === 'active';
  }

  private selectNewHost(room: Room, excludeUuid?: string): string | null {
    // Priority order for new host selection:
    // 1. Existing co-hosts (if any)
    // 2. Players who have been in the room longest
    // 3. Any remaining player

    const candidates = Array.from(room.players).filter(uuid => uuid !== excludeUuid);

    if (candidates.length === 0) {
      return null;
    }

    // First, check if there are any co-hosts
    for (const candidate of candidates) {
      if (room.coHosts.has(candidate)) {
        return candidate;
      }
    }

    // If no co-hosts, select the first candidate (they've been in the room)
    return candidates[0];
  }

  private handleHostTransfer(fromUuid: string, connection: Connection, room: Room, data: any) {
    // Only current host can transfer host privileges
    if (room.host !== fromUuid) {
      this.sendError(connection, 'Only the current host can transfer host privileges');
      return;
    }

    const targetUserId = data.targetUserId;
    if (!targetUserId || !room.players.has(targetUserId)) {
      this.sendError(connection, 'Invalid target user for host transfer');
      return;
    }

    // Transfer host privileges
    const oldHost = room.host;
    room.host = targetUserId;
    room.coHosts.delete(targetUserId); // Remove from co-hosts if they were one

    // Update connection info
    const oldHostConnection = this.connections.get(oldHost);
    const newHostConnection = this.connections.get(targetUserId);

    if (oldHostConnection) {
      oldHostConnection.user = { name: oldHostConnection.user?.name || 'Player', type: 'player' };
    }
    if (newHostConnection) {
      newHostConnection.user = { name: newHostConnection.user?.name || 'Host', type: 'host' };
    }

    console.log(`👑 Manual host transfer in room ${room.code}: ${oldHost} -> ${targetUserId}`);

    // Notify all players about the host change
    this.broadcastToRoom(room.code, {
      type: 'event',
      data: {
        name: 'session/host-changed',
        oldHostId: oldHost,
        newHostId: targetUserId,
        reason: 'manual-transfer',
        message: 'Host privileges have been transferred.',
      },
      timestamp: Date.now(),
    });
  }

  private handleAddCoHost(fromUuid: string, connection: Connection, room: Room, data: any) {
    // Only current host can add co-hosts
    if (room.host !== fromUuid) {
      this.sendError(connection, 'Only the current host can add co-hosts');
      return;
    }

    const targetUserId = data.targetUserId;
    if (!targetUserId || !room.players.has(targetUserId)) {
      this.sendError(connection, 'Invalid target user for co-host addition');
      return;
    }

    if (room.coHosts.has(targetUserId)) {
      this.sendError(connection, 'User is already a co-host');
      return;
    }

    room.coHosts.add(targetUserId);

    // Update connection info to reflect co-host status
    const targetConnection = this.connections.get(targetUserId);
    if (targetConnection) {
      targetConnection.user = { name: targetConnection.user?.name || 'Co-Host', type: 'host' };
    }

    console.log(`👥 Added co-host in room ${room.code}: ${targetUserId}`);

    // Notify all players about the co-host addition
    this.broadcastToRoom(room.code, {
      type: 'event',
      data: {
        name: 'session/cohost-added',
        coHostId: targetUserId,
        message: 'A new co-host has been added to the session.',
      },
      timestamp: Date.now(),
    });
  }

  private handleRemoveCoHost(fromUuid: string, connection: Connection, room: Room, data: any) {
    // Only current host can remove co-hosts
    if (room.host !== fromUuid) {
      this.sendError(connection, 'Only the current host can remove co-hosts');
      return;
    }

    const targetUserId = data.targetUserId;
    if (!targetUserId || !room.coHosts.has(targetUserId)) {
      this.sendError(connection, 'Invalid target user for co-host removal');
      return;
    }

    room.coHosts.delete(targetUserId);

    // Update connection info to reflect player status
    const targetConnection = this.connections.get(targetUserId);
    if (targetConnection) {
      targetConnection.user = { name: targetConnection.user?.name || 'Player', type: 'player' };
    }

    console.log(`👥 Removed co-host in room ${room.code}: ${targetUserId}`);

    // Notify all players about the co-host removal
    this.broadcastToRoom(room.code, {
      type: 'event',
      data: {
        name: 'session/cohost-removed',
        coHostId: targetUserId,
        message: 'A co-host has been removed from the session.',
      },
      timestamp: Date.now(),
    });
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

  // Heartbeat methods
  private startHeartbeat() {
    if (this.heartbeatTimer) return; // Already running

    console.log('💓 Starting heartbeat mechanism');
    this.heartbeatTimer = setInterval(() => {
      this.connections.forEach((connection) => {
        this.sendHeartbeatPing(connection);
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('💓 Stopped heartbeat mechanism');
    }
  }

  private startHeartbeatForConnection(_connection: Connection) {
    // Start heartbeat if this is the first connection
    if (this.connections.size === 1) {
      this.startHeartbeat();
    }
  }

  private sendHeartbeatPing(connection: Connection) {
    const pingId = uuidv4();
    connection.lastPing = Date.now();
    connection.pendingPing = pingId;

    this.sendMessage(connection, {
      type: 'heartbeat',
      data: { type: 'ping', id: pingId },
      timestamp: Date.now(),
    });

    // Set timeout for pong response
    setTimeout(() => {
      if (connection.pendingPing === pingId) {
        // Missed pong - handle as unresponsive
        this.handleMissedPong(connection.id);
      }
    }, this.HEARTBEAT_TIMEOUT);
  }

  private handleHeartbeatPong(fromUuid: string, pongId: string) {
    const connection = this.connections.get(fromUuid);
    if (!connection || connection.pendingPing !== pongId) return;

    const responseTime = Date.now() - (connection.lastPing || 0);
    connection.lastPong = Date.now();
    connection.pendingPing = undefined;
    connection.consecutiveMisses = 0; // Reset consecutive misses

    // Update connection quality based on response time
    this.updateConnectionQuality(connection, responseTime);
  }

  private handleMissedPong(uuid: string) {
    const connection = this.connections.get(uuid);
    if (!connection) return;

    connection.consecutiveMisses += 1;
    connection.pendingPing = undefined;

    // Update quality based on consecutive misses
    if (connection.consecutiveMisses >= this.MAX_CONSECUTIVE_MISSES) {
      connection.connectionQuality = 'critical';
      console.warn(
        `⚠️ Connection ${uuid} has critical quality (${connection.consecutiveMisses} missed pings)`,
      );
    } else if (connection.consecutiveMisses >= 2) {
      connection.connectionQuality = 'poor';
    } else if (connection.consecutiveMisses >= 1) {
      connection.connectionQuality = 'good';
    }
  }

  private updateConnectionQuality(
    connection: Connection,
    responseTime: number,
  ) {
    if (responseTime < 100) {
      connection.connectionQuality = 'excellent';
    } else if (responseTime < 500) {
      connection.connectionQuality = 'good';
    } else if (responseTime < 2000) {
      connection.connectionQuality = 'poor';
    } else {
      connection.connectionQuality = 'critical';
    }
  }

  // Cleanup method for graceful shutdown
  public async shutdown() {
    console.log('🛑 Shutting down Nexus server...');

    // Stop heartbeat mechanism
    this.stopHeartbeat();

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

    // Close database
    try {
      await this.db.close();
      console.log('✅ Database closed');
    } catch (error) {
      console.error('Failed to close database:', error);
    }

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
    const activeRooms = Array.from(this.rooms.values()).filter(
      (r) => r.status === 'active',
    ).length;
    const hibernatingRooms = Array.from(this.rooms.values()).filter(
      (r) => r.status === 'hibernating',
    ).length;

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
setInterval(
  () => {
    const stats = server.getStats();
    console.log(
      `📊 Server Stats: ${stats.activeRooms} active, ${stats.hibernatingRooms} hibernating, ${stats.totalConnections} connections on port ${stats.serverPort}`,
    );
  },
  5 * 60 * 1000,
);
