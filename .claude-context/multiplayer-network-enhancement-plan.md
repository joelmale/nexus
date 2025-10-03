# Multiplayer/Network Enhancement Implementation Plan

## Overview
Enhance the existing WebSocket-based multiplayer system with improved synchronization, connection resilience, host migration, and PostgreSQL-based persistent session storage for Docker Swarm and cloud deployment (AWS, Azure, Google Cloud).

## Current Architecture Analysis

### Server (`server/index.ts`)
- ✅ WebSocket server with `ws` library
- ✅ Room-based architecture with 4-character codes
- ✅ Basic hibernation (10 min timeout)
- ✅ In-memory game state storage
- ✅ Host reconnection support
- ❌ No database persistence (lost on restart)
- ❌ No host migration
- ❌ No heartbeat/ping mechanism
- ❌ Limited connection quality monitoring
- ❌ Not ready for horizontal scaling

### Client (`src/utils/websocket.ts`)
- ✅ WebSocket service with reconnection (max 5 attempts)
- ✅ Message queueing
- ✅ Event-based messaging
- ✅ IndexedDB for local storage
- ❌ No optimistic UI updates
- ❌ No latency monitoring
- ❌ Limited reconnection feedback
- ❌ No conflict resolution

---

## Phase 1: Connection Resilience & Quality Monitoring

### 1.1 Heartbeat/Ping-Pong Mechanism

**Goal**: Detect stale connections and measure latency

**Server Changes** (`server/index.ts`):
```typescript
interface Connection {
  id: string;
  ws: WebSocket;
  room?: string;
  user?: { name: string; type: 'host' | 'player' };
  lastPing: number;          // NEW
  latency: number;           // NEW
  isAlive: boolean;          // NEW
}

private startHeartbeat(connection: Connection) {
  const interval = setInterval(() => {
    if (!connection.isAlive) {
      console.log(`💔 Connection ${connection.id} is stale, terminating`);
      clearInterval(interval);
      connection.ws.terminate();
      return;
    }

    connection.isAlive = false;
    connection.lastPing = Date.now();
    connection.ws.ping();
  }, 30000); // Every 30 seconds

  connection.ws.on('pong', () => {
    connection.isAlive = true;
    connection.latency = Date.now() - connection.lastPing;

    // Send latency update to client
    this.sendMessage(connection, {
      type: 'ping',
      data: { latency: connection.latency },
      timestamp: Date.now()
    });
  });
}
```

**Client Changes** (`src/utils/websocket.ts`):
```typescript
interface ConnectionQuality {
  latency: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  packetLoss: number;
}

private connectionQuality: ConnectionQuality = {
  latency: 0,
  status: 'disconnected',
  packetLoss: 0
};

// In handleMessage():
case 'ping':
  this.updateConnectionQuality(message.data.latency);
  this.dispatchEvent(new CustomEvent('connectionQuality', {
    detail: this.connectionQuality
  }));
  break;

private updateConnectionQuality(latency: number) {
  this.connectionQuality.latency = latency;

  if (latency < 100) this.connectionQuality.status = 'excellent';
  else if (latency < 200) this.connectionQuality.status = 'good';
  else if (latency < 400) this.connectionQuality.status = 'fair';
  else this.connectionQuality.status = 'poor';
}
```

### 1.2 Enhanced Reconnection System

**Goal**: Better reconnection with exponential backoff and user feedback

**Client Changes** (`src/utils/websocket.ts`):
```typescript
private reconnectState: {
  isReconnecting: boolean;
  attempt: number;
  nextAttemptIn: number;
} = {
  isReconnecting: false,
  attempt: 0,
  nextAttemptIn: 0
};

private handleReconnect() {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    console.error('Max reconnection attempts reached');
    this.dispatchEvent(new CustomEvent('reconnectionFailed'));
    useGameStore.getState().setSession(null);
    toast.error('Connection Lost', {
      description: 'Unable to reconnect to server. Please refresh the page.'
    });
    return;
  }

  this.reconnectAttempts++;
  this.reconnectState.isReconnecting = true;
  this.reconnectState.attempt = this.reconnectAttempts;

  const delay = Math.min(
    this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
    30000 // Max 30 seconds
  );

  this.reconnectState.nextAttemptIn = delay;

  // Emit reconnection state for UI updates
  this.dispatchEvent(new CustomEvent('reconnecting', {
    detail: this.reconnectState
  }));

  toast.info('Reconnecting...', {
    description: `Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`
  });

  setTimeout(() => {
    const session = useGameStore.getState().session;
    if (session) {
      this.connect(session.roomCode, useGameStore.getState().user.type)
        .then(() => {
          this.reconnectState.isReconnecting = false;
          this.dispatchEvent(new CustomEvent('reconnected'));
          toast.success('Reconnected', {
            description: 'Connection to server restored.'
          });
        })
        .catch((error) => {
          console.error('Reconnection failed:', error);
          this.handleReconnect();
        });
    }
  }, delay);
}
```

### 1.3 Connection Status UI Component

**New Component** (`src/components/ConnectionStatus.tsx`):
```typescript
import { useEffect, useState } from 'react';
import { webSocketService } from '@/utils/websocket';

interface ConnectionQuality {
  latency: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
}

export const ConnectionStatus: React.FC = () => {
  const [quality, setQuality] = useState<ConnectionQuality>({
    latency: 0,
    status: 'disconnected'
  });
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const handleQuality = (e: Event) => {
      setQuality((e as CustomEvent).detail);
    };

    const handleReconnecting = () => setIsReconnecting(true);
    const handleReconnected = () => setIsReconnecting(false);

    webSocketService.addEventListener('connectionQuality', handleQuality);
    webSocketService.addEventListener('reconnecting', handleReconnecting);
    webSocketService.addEventListener('reconnected', handleReconnected);

    return () => {
      webSocketService.removeEventListener('connectionQuality', handleQuality);
      webSocketService.removeEventListener('reconnecting', handleReconnecting);
      webSocketService.removeEventListener('reconnected', handleReconnected);
    };
  }, []);

  if (quality.status === 'disconnected' || isReconnecting) {
    return (
      <div className="connection-status reconnecting">
        <span className="status-icon">🔄</span>
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className={`connection-status ${quality.status}`}>
      <span className="status-icon">
        {quality.status === 'excellent' && '🟢'}
        {quality.status === 'good' && '🟡'}
        {quality.status === 'fair' && '🟠'}
        {quality.status === 'poor' && '🔴'}
      </span>
      <span>{quality.latency}ms</span>
    </div>
  );
};
```

**CSS** (`src/styles/connection-status.css`):
```css
.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: var(--surface-secondary);
}

.connection-status.reconnecting {
  background: var(--warning-surface);
  color: var(--warning-text);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

---

## Phase 2: Player Synchronization Improvements

### 2.1 Optimistic UI Updates

**Goal**: Immediate local feedback with server reconciliation

**Pattern**:
1. Apply change locally immediately
2. Send change to server
3. Server validates and broadcasts
4. If server rejects, rollback local change

**Example: Token Movement**

**Client Store** (`src/stores/gameStore.ts`):
```typescript
interface PendingUpdate {
  id: string;
  type: string;
  localState: any;
  timestamp: number;
}

private pendingUpdates = new Map<string, PendingUpdate>();

// Optimistic token move
moveTokenOptimistic(sceneId: string, tokenId: string, position: Point) {
  const updateId = `token-move-${tokenId}-${Date.now()}`;

  // Store current state for potential rollback
  const token = this.getToken(sceneId, tokenId);
  this.pendingUpdates.set(updateId, {
    id: updateId,
    type: 'token-move',
    localState: { ...token },
    timestamp: Date.now()
  });

  // Apply locally immediately
  this.updateTokenPosition(sceneId, tokenId, position);

  // Send to server
  webSocketService.sendEvent({
    type: 'token/move',
    data: { sceneId, tokenId, position, updateId }
  });

  // Set timeout for automatic rollback if no confirmation
  setTimeout(() => {
    if (this.pendingUpdates.has(updateId)) {
      console.warn('Server confirmation timeout, rolling back', updateId);
      this.rollbackUpdate(updateId);
    }
  }, 5000);
}

confirmUpdate(updateId: string) {
  this.pendingUpdates.delete(updateId);
}

rollbackUpdate(updateId: string) {
  const update = this.pendingUpdates.get(updateId);
  if (!update) return;

  // Restore previous state
  switch (update.type) {
    case 'token-move':
      this.updateTokenPosition(
        update.localState.sceneId,
        update.localState.id,
        update.localState.position
      );
      break;
  }

  this.pendingUpdates.delete(updateId);
  toast.error('Action failed', { description: 'Change was not saved' });
}
```

**Server Changes** (`server/index.ts`):
```typescript
private routeMessage(fromUuid: string, message: any) {
  // ... existing code ...

  // Validate updates
  if (message.type === 'event' && message.data.updateId) {
    // Send confirmation back to originating client
    const connection = this.connections.get(fromUuid);
    if (connection) {
      this.sendMessage(connection, {
        type: 'update-confirmed',
        data: { updateId: message.data.updateId },
        timestamp: Date.now()
      });
    }
  }

  // Broadcast to room
  this.broadcastToRoom(connection.room, {
    ...message,
    src: fromUuid,
    timestamp: Date.now(),
  }, fromUuid);
}
```

### 2.2 Real-time Cursor/Pointer Sharing

**Goal**: Show where other players are looking/interacting

**New Message Type**:
```typescript
interface CursorUpdateEvent {
  type: 'cursor/update';
  data: {
    userId: string;
    userName: string;
    position: { x: number; y: number };
    sceneId: string;
  };
}
```

**Client Component** (`src/components/Scene/RemoteCursors.tsx`):
```typescript
interface RemoteCursor {
  userId: string;
  userName: string;
  position: { x: number; y: number };
  lastUpdate: number;
}

export const RemoteCursors: React.FC<{ sceneId: string }> = ({ sceneId }) => {
  const [cursors, setCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Throttled cursor position sender
    const sendCursorUpdate = throttle((e: MouseEvent) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      webSocketService.sendEvent({
        type: 'cursor/update',
        data: {
          userId: useGameStore.getState().user.id,
          userName: useGameStore.getState().user.name,
          position: { x, y },
          sceneId
        }
      });
    }, 50); // Update every 50ms max

    const handleCursorUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.type === 'cursor/update' && detail.data.sceneId === sceneId) {
        setCursors(prev => {
          const next = new Map(prev);
          next.set(detail.data.userId, {
            ...detail.data,
            lastUpdate: Date.now()
          });
          return next;
        });
      }
    };

    // Cleanup old cursors
    const cleanupInterval = setInterval(() => {
      setCursors(prev => {
        const next = new Map(prev);
        const now = Date.now();
        for (const [userId, cursor] of next) {
          if (now - cursor.lastUpdate > 3000) {
            next.delete(userId);
          }
        }
        return next;
      });
    }, 1000);

    canvasRef.current?.addEventListener('mousemove', sendCursorUpdate);
    webSocketService.addEventListener('message', handleCursorUpdate);

    return () => {
      canvasRef.current?.removeEventListener('mousemove', sendCursorUpdate);
      webSocketService.removeEventListener('message', handleCursorUpdate);
      clearInterval(cleanupInterval);
    };
  }, [sceneId]);

  return (
    <div ref={canvasRef} className="remote-cursors-layer">
      {Array.from(cursors.values()).map(cursor => (
        <div
          key={cursor.userId}
          className="remote-cursor"
          style={{
            left: cursor.position.x,
            top: cursor.position.y
          }}
        >
          <div className="cursor-pointer" />
          <div className="cursor-label">{cursor.userName}</div>
        </div>
      ))}
    </div>
  );
};
```

### 2.3 Conflict Resolution

**Goal**: Handle simultaneous edits gracefully

**Strategy: Last-Write-Wins with Timestamps**:
```typescript
// Server tracks version numbers
interface Room {
  // ... existing fields ...
  entityVersions: Map<string, number>; // entityId -> version
}

private handleConflict(
  roomCode: string,
  entityId: string,
  clientVersion: number,
  update: any
): boolean {
  const room = this.rooms.get(roomCode);
  if (!room) return false;

  const serverVersion = room.entityVersions.get(entityId) || 0;

  if (clientVersion < serverVersion) {
    // Client is behind, reject update
    console.log(`⚠️ Conflict: Client version ${clientVersion} < Server version ${serverVersion}`);
    return false;
  }

  // Accept update and increment version
  room.entityVersions.set(entityId, serverVersion + 1);
  return true;
}
```

---

## Phase 3: Host Migration

### 3.1 Automatic Host Transfer

**Goal**: When host disconnects, promote another player

**Server Changes** (`server/index.ts`):
```typescript
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
    console.log(`🏠 Host left room: ${connection.room}`);

    // Check if there are other players to promote
    const otherPlayers = Array.from(room.players).filter(id => id !== uuid);

    if (otherPlayers.length > 0) {
      // Promote first available player to host
      const newHost = otherPlayers[0];
      room.host = newHost;

      console.log(`👑 Promoting ${newHost} to host`);

      // Update database
      await this.db.updateRoomHost(connection.room, newHost);

      // Notify all players about host change
      this.broadcastToRoom(connection.room, {
        type: 'event',
        data: {
          name: 'session/host-migrated',
          newHostId: newHost,
          previousHostId: uuid,
          message: 'You are now the host!'
        },
        timestamp: Date.now(),
      });

      // Remove disconnected host from room
      room.players.delete(uuid);
      room.connections.delete(uuid);
      room.lastActivity = Date.now();

    } else {
      // No players left, hibernate room
      this.hibernateRoom(connection.room);

      this.broadcastToRoom(connection.room, {
        type: 'event',
        data: {
          name: 'session/hibernated',
          message: 'Host disconnected. Room will remain available for 10 minutes.',
          reconnectWindow: this.HIBERNATION_TIMEOUT
        },
        timestamp: Date.now(),
      });
    }

  } else {
    // Player left
    console.log(`👋 Player left room ${connection.room}: ${uuid}`);

    room.players.delete(uuid);
    room.connections.delete(uuid);
    room.lastActivity = Date.now();

    // Update database
    await this.db.removePlayer(uuid, connection.room);

    this.broadcastToRoom(connection.room, {
      type: 'event',
      data: { name: 'session/leave', uuid },
      timestamp: Date.now(),
    });
  }

  this.connections.delete(uuid);
}
```

**Client Store Updates** (`src/stores/gameStore.ts`):
```typescript
// In applyEvent():
case 'session/host-migrated': {
  const newHostId = event.data.newHostId;
  const currentUserId = this.user.id;

  if (newHostId === currentUserId) {
    // I'm the new host!
    this.user.type = 'host';
    toast.success('You are now the host!', {
      description: 'The previous host disconnected.'
    });
  } else {
    toast.info('New host assigned', {
      description: 'The host role has been transferred.'
    });
  }

  // Update session with new host
  if (this.session) {
    this.session.hostId = newHostId;
  }
  break;
}
```

### 3.2 Manual Host Transfer

**Goal**: Allow host to transfer control to another player

**New Event Type**:
```typescript
interface HostTransferEvent {
  type: 'session/transfer-host';
  data: {
    newHostId: string;
  };
}
```

**Server Handler**:
```typescript
private routeMessage(fromUuid: string, message: any) {
  const connection = this.connections.get(fromUuid);
  if (!connection?.room) return;

  const room = this.rooms.get(connection.room);
  if (!room) return;

  // Handle host transfer request
  if (message.type === 'event' && message.data.name === 'session/transfer-host') {
    // Only current host can transfer
    if (room.host !== fromUuid) {
      this.sendError(connection, 'Only the host can transfer host role');
      return;
    }

    const newHostId = message.data.newHostId;

    // Verify new host is in the room
    if (!room.players.has(newHostId)) {
      this.sendError(connection, 'Target player not in room');
      return;
    }

    // Transfer host
    const previousHost = room.host;
    room.host = newHostId;

    // Update database
    await this.db.updateRoomHost(connection.room, newHostId);

    console.log(`👑 Manual host transfer: ${previousHost} -> ${newHostId}`);

    // Notify all players
    this.broadcastToRoom(connection.room, {
      type: 'event',
      data: {
        name: 'session/host-migrated',
        newHostId,
        previousHostId: previousHost,
        manual: true
      },
      timestamp: Date.now(),
    });

    return; // Don't broadcast the original message
  }

  // ... rest of routing logic ...
}
```

**UI Component** (`src/components/HostControls.tsx`):
```typescript
export const HostControls: React.FC = () => {
  const { user, session } = useGameStore();
  const [players, setPlayers] = useState<Player[]>([]);

  if (user.type !== 'host') return null;

  const handleTransferHost = (playerId: string) => {
    if (confirm('Transfer host role to this player?')) {
      webSocketService.sendEvent({
        type: 'session/transfer-host',
        data: { newHostId: playerId }
      });
    }
  };

  return (
    <div className="host-controls">
      <h3>Host Controls</h3>
      <div className="player-list">
        {players.filter(p => p.id !== user.id).map(player => (
          <div key={player.id} className="player-item">
            <span>{player.name}</span>
            <button onClick={() => handleTransferHost(player.id)}>
              Make Host
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3.3 Co-DM Support

**Goal**: Multiple hosts with shared privileges

**Server Changes**:
```typescript
interface Room {
  // ... existing fields ...
  hosts: Set<string>;  // Changed from single host to multiple
  hostPermissions: Map<string, HostPermissions>;
}

interface HostPermissions {
  canEditScenes: boolean;
  canManagePlayers: boolean;
  canControlInitiative: boolean;
  canTransferHost: boolean;
}

const DEFAULT_HOST_PERMISSIONS: HostPermissions = {
  canEditScenes: true,
  canManagePlayers: true,
  canControlInitiative: true,
  canTransferHost: true,
};

const CO_DM_PERMISSIONS: HostPermissions = {
  canEditScenes: true,
  canManagePlayers: false,
  canControlInitiative: true,
  canTransferHost: false,
};

private async promoteToCoHost(roomCode: string, playerId: string) {
  const room = this.rooms.get(roomCode);
  if (!room) return;

  room.hosts.add(playerId);
  room.hostPermissions.set(playerId, CO_DM_PERMISSIONS);

  // Update database
  await this.db.addCoHost(roomCode, playerId, CO_DM_PERMISSIONS);

  this.broadcastToRoom(roomCode, {
    type: 'event',
    data: {
      name: 'session/co-host-added',
      coHostId: playerId
    },
    timestamp: Date.now(),
  });
}
```

---

## Phase 4: PostgreSQL Database Integration

### 4.1 Database Schema

**Schema** (`server/schema.sql`):
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms/Sessions table
CREATE TABLE rooms (
  code VARCHAR(4) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  primary_host_id UUID NOT NULL,
  CONSTRAINT status_check CHECK (status IN ('active', 'hibernating', 'abandoned'))
);

-- Hosts table (for co-host support)
CREATE TABLE hosts (
  room_code VARCHAR(4) REFERENCES rooms(code) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_primary BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_code, user_id)
);

-- Game state storage (with JSONB for efficient querying)
CREATE TABLE game_states (
  room_code VARCHAR(4) PRIMARY KEY REFERENCES rooms(code) ON DELETE CASCADE,
  state_data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID NOT NULL,
  room_code VARCHAR(4) REFERENCES rooms(code) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  connected BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, room_code)
);

-- Connection events log (for debugging/analytics)
CREATE TABLE connection_events (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(4) REFERENCES rooms(code) ON DELETE CASCADE,
  user_id UUID,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_last_activity ON rooms(last_activity);
CREATE INDEX idx_rooms_created_at ON rooms(created_at);
CREATE INDEX idx_players_room ON players(room_code);
CREATE INDEX idx_players_connected ON players(connected);
CREATE INDEX idx_connection_events_room ON connection_events(room_code);
CREATE INDEX idx_connection_events_timestamp ON connection_events(timestamp);
CREATE INDEX idx_game_states_updated_at ON game_states(updated_at);

-- Function to update last_activity automatically
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rooms SET last_activity = NOW() WHERE code = NEW.room_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update room activity
CREATE TRIGGER update_room_activity_on_game_state
AFTER INSERT OR UPDATE ON game_states
FOR EACH ROW EXECUTE FUNCTION update_room_activity();

-- Function to clean up old abandoned rooms
CREATE OR REPLACE FUNCTION cleanup_old_rooms(hours_old INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rooms
  WHERE status = 'abandoned'
    AND last_activity < NOW() - (hours_old || ' hours')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for room statistics
CREATE VIEW room_stats AS
SELECT
  status,
  COUNT(*) as room_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds,
  SUM((SELECT COUNT(*) FROM players p WHERE p.room_code = r.code AND p.connected = true)) as total_players
FROM rooms r
GROUP BY status;
```

### 4.2 Database Service Layer

**New File** (`server/database.ts`):
```typescript
import { Pool, PoolClient } from 'pg';
import type { HostPermissions } from './types';

interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  max?: number; // Max pool size
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

interface RoomRecord {
  code: string;
  created_at: Date;
  last_activity: Date;
  status: 'active' | 'hibernating' | 'abandoned';
  primary_host_id: string;
}

interface GameStateRecord {
  room_code: string;
  state_data: any; // JSONB
  version: number;
  updated_at: Date;
}

interface PlayerRecord {
  id: string;
  room_code: string;
  name: string;
  connected: boolean;
  last_seen: Date;
}

export class DatabaseService {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    // Support both connection string and individual parameters
    if (config.connectionString) {
      this.pool = new Pool({
        connectionString: config.connectionString,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        max: config.max || 20,
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
      });
    } else {
      this.pool = new Pool({
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.database || 'nexus',
        user: config.user || 'postgres',
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        max: config.max || 20,
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
      });
    }

    this.pool.on('error', (err) => {
      console.error('🗄️ Unexpected database pool error:', err);
    });

    this.pool.on('connect', () => {
      console.log('🗄️ New database connection established');
    });

    console.log('✅ Database connection pool created');
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('✅ Database connection successful');

      // Initialize schema if needed
      await this.initSchema();
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  private async initSchema(): Promise<void> {
    // Check if schema exists
    const result = await this.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'rooms'
      );
    `);

    if (!result.rows[0].exists) {
      console.log('🗄️ Schema not found, creating tables...');

      // Read and execute schema.sql
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, 'schema.sql');

      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await this.pool.query(schema);
        console.log('✅ Database schema created successfully');
      } else {
        throw new Error('schema.sql not found');
      }
    } else {
      console.log('✅ Database schema already exists');
    }
  }

  // =============================================================================
  // ROOM OPERATIONS
  // =============================================================================

  async createRoom(code: string, hostId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO rooms (code, primary_host_id)
       VALUES ($1, $2)
       ON CONFLICT (code) DO NOTHING`,
      [code, hostId]
    );

    // Add host to hosts table
    await this.pool.query(
      `INSERT INTO hosts (room_code, user_id, is_primary, permissions)
       VALUES ($1, $2, true, $3)`,
      [code, hostId, JSON.stringify({
        canEditScenes: true,
        canManagePlayers: true,
        canControlInitiative: true,
        canTransferHost: true,
      })]
    );

    console.log(`🗄️ Room created in database: ${code}`);
  }

  async getRoom(code: string): Promise<RoomRecord | null> {
    const result = await this.pool.query<RoomRecord>(
      'SELECT * FROM rooms WHERE code = $1',
      [code]
    );
    return result.rows[0] || null;
  }

  async updateRoomStatus(code: string, status: string): Promise<void> {
    await this.pool.query(
      `UPDATE rooms
       SET status = $1, last_activity = NOW()
       WHERE code = $2`,
      [status, code]
    );
  }

  async updateRoomActivity(code: string): Promise<void> {
    await this.pool.query(
      'UPDATE rooms SET last_activity = NOW() WHERE code = $1',
      [code]
    );
  }

  async updateRoomHost(code: string, newHostId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update primary host
      await client.query(
        'UPDATE rooms SET primary_host_id = $1 WHERE code = $2',
        [newHostId, code]
      );

      // Update hosts table - remove old primary flag
      await client.query(
        'UPDATE hosts SET is_primary = false WHERE room_code = $1',
        [code]
      );

      // Set new primary flag
      await client.query(
        `INSERT INTO hosts (room_code, user_id, is_primary, permissions)
         VALUES ($1, $2, true, $3)
         ON CONFLICT (room_code, user_id) DO UPDATE
         SET is_primary = true`,
        [code, newHostId, JSON.stringify({
          canEditScenes: true,
          canManagePlayers: true,
          canControlInitiative: true,
          canTransferHost: true,
        })]
      );

      await client.query('COMMIT');
      console.log(`🗄️ Room host updated: ${code} -> ${newHostId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteRoom(code: string): Promise<void> {
    await this.pool.query('DELETE FROM rooms WHERE code = $1', [code]);
    console.log(`🗄️ Room deleted from database: ${code}`);
  }

  async listActiveRooms(): Promise<RoomRecord[]> {
    const result = await this.pool.query<RoomRecord>(
      `SELECT * FROM rooms
       WHERE status IN ('active', 'hibernating')
       ORDER BY last_activity DESC`
    );
    return result.rows;
  }

  // =============================================================================
  // GAME STATE OPERATIONS
  // =============================================================================

  async saveGameState(roomCode: string, state: any): Promise<void> {
    await this.pool.query(
      `INSERT INTO game_states (room_code, state_data, version, updated_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (room_code) DO UPDATE SET
         state_data = $2,
         version = game_states.version + 1,
         updated_at = NOW()`,
      [roomCode, JSON.stringify(state)]
    );
  }

  async loadGameState(roomCode: string): Promise<any | null> {
    const result = await this.pool.query<GameStateRecord>(
      'SELECT state_data FROM game_states WHERE room_code = $1',
      [roomCode]
    );
    return result.rows[0]?.state_data || null;
  }

  async getGameStateVersion(roomCode: string): Promise<number> {
    const result = await this.pool.query<{ version: number }>(
      'SELECT version FROM game_states WHERE room_code = $1',
      [roomCode]
    );
    return result.rows[0]?.version || 0;
  }

  // =============================================================================
  // PLAYER OPERATIONS
  // =============================================================================

  async addPlayer(playerId: string, roomCode: string, name: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO players (id, room_code, name, connected, last_seen)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (id, room_code) DO UPDATE SET
         connected = true,
         last_seen = NOW()`,
      [playerId, roomCode, name]
    );
  }

  async removePlayer(playerId: string, roomCode: string): Promise<void> {
    await this.pool.query(
      `UPDATE players
       SET connected = false, last_seen = NOW()
       WHERE id = $1 AND room_code = $2`,
      [playerId, roomCode]
    );
  }

  async getRoomPlayers(roomCode: string): Promise<PlayerRecord[]> {
    const result = await this.pool.query<PlayerRecord>(
      'SELECT * FROM players WHERE room_code = $1',
      [roomCode]
    );
    return result.rows;
  }

  async getConnectedPlayers(roomCode: string): Promise<PlayerRecord[]> {
    const result = await this.pool.query<PlayerRecord>(
      'SELECT * FROM players WHERE room_code = $1 AND connected = true',
      [roomCode]
    );
    return result.rows;
  }

  // =============================================================================
  // CO-HOST OPERATIONS
  // =============================================================================

  async addCoHost(
    roomCode: string,
    userId: string,
    permissions: HostPermissions
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO hosts (room_code, user_id, permissions, is_primary)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (room_code, user_id) DO UPDATE SET
         permissions = $3`,
      [roomCode, userId, JSON.stringify(permissions)]
    );
  }

  async removeCoHost(roomCode: string, userId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM hosts
       WHERE room_code = $1 AND user_id = $2 AND is_primary = false`,
      [roomCode, userId]
    );
  }

  async getRoomHosts(roomCode: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM hosts WHERE room_code = $1',
      [roomCode]
    );
    return result.rows;
  }

  // =============================================================================
  // CONNECTION EVENTS (ANALYTICS)
  // =============================================================================

  async logConnectionEvent(
    roomCode: string,
    userId: string,
    eventType: string,
    metadata?: any
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO connection_events (room_code, user_id, event_type, metadata)
       VALUES ($1, $2, $3, $4)`,
      [roomCode, userId, eventType, metadata ? JSON.stringify(metadata) : null]
    );
  }

  async getConnectionEvents(roomCode: string, limit: number = 100): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM connection_events
       WHERE room_code = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [roomCode, limit]
    );
    return result.rows;
  }

  // =============================================================================
  // CLEANUP OPERATIONS
  // =============================================================================

  async cleanupOldRooms(hoursOld: number = 24): Promise<number> {
    const result = await this.pool.query(
      'SELECT cleanup_old_rooms($1)',
      [hoursOld]
    );
    return result.rows[0].cleanup_old_rooms;
  }

  async cleanupDisconnectedPlayers(hoursOld: number = 24): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM players
       WHERE connected = false
         AND last_seen < NOW() - ($1 || ' hours')::INTERVAL`,
      [hoursOld]
    );
    return result.rowCount || 0;
  }

  // =============================================================================
  // STATISTICS
  // =============================================================================

  async getStats() {
    const activeRooms = await this.pool.query(
      "SELECT COUNT(*) as count FROM rooms WHERE status = 'active'"
    );

    const hibernatingRooms = await this.pool.query(
      "SELECT COUNT(*) as count FROM rooms WHERE status = 'hibernating'"
    );

    const totalPlayers = await this.pool.query(
      'SELECT COUNT(*) as count FROM players WHERE connected = true'
    );

    const roomStats = await this.pool.query('SELECT * FROM room_stats');

    return {
      activeRooms: parseInt(activeRooms.rows[0].count),
      hibernatingRooms: parseInt(hibernatingRooms.rows[0].count),
      totalPlayers: parseInt(totalPlayers.rows[0].count),
      roomStatsByStatus: roomStats.rows,
    };
  }

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('🗄️ Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('🗄️ Database connection pool closed');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createDatabaseService(config?: DatabaseConfig): DatabaseService {
  // Use environment variables if config not provided
  const dbConfig: DatabaseConfig = config || {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
  };

  return new DatabaseService(dbConfig);
}
```

### 4.3 Integrate Database into Server

**Server Updates** (`server/index.ts`):
```typescript
import { DatabaseService, createDatabaseService } from './database.js';

class NexusServer {
  private db: DatabaseService;
  // ... existing fields ...

  constructor(port: number) {
    this.port = port;

    // Initialize database
    this.db = createDatabaseService();

    // Initialize database and load rooms
    this.initialize();

    // ... rest of constructor ...
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
          players: new Set(players.map(p => p.id)),
          connections: new Map(),
          created: roomRecord.created_at.getTime(),
          lastActivity: roomRecord.last_activity.getTime(),
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

  private async handleHostConnection(connection: Connection, hostRoomCode?: string) {
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
    }

    // Send consistent field names
    this.sendMessage(connection, {
      type: 'event',
      data: {
        name: 'session/created',
        roomCode,
        room: roomCode,
        uuid: connection.id
      },
      timestamp: Date.now(),
    });

    console.log(`🏠 Room created: ${roomCode} by ${connection.id}`);
  }

  private async updateRoomGameState(roomCode: string, gameStateUpdate: any) {
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

  private async handleDisconnect(uuid: string) {
    // ... existing disconnect logic with database updates ...
    // (See Phase 3.1 for full implementation)
  }

  private async abandonRoom(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    console.log(`🗑️ Abandoning room: ${roomCode}`);

    // Update database
    try {
      await this.db.updateRoomStatus(roomCode, 'abandoned');
      await this.db.logConnectionEvent(roomCode, '', 'room_abandoned');
    } catch (error) {
      console.error('Failed to update room status in database:', error);
    }

    // Clear hibernation timer
    if (room.hibernationTimer) {
      clearTimeout(room.hibernationTimer);
    }

    // Close remaining connections
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

  public async shutdown() {
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

    // Close database
    try {
      await this.db.close();
      console.log('✅ Database closed');
    } catch (error) {
      console.error('Failed to close database:', error);
    }

    // Close the WebSocket server
    this.wss.close(() => {
      console.log('✅ Server shutdown complete');
    });
  }
}
```

### 4.4 Periodic Database Cleanup

**Server Cleanup Jobs**:
```typescript
// In constructor or after initialization
setInterval(async () => {
  try {
    const deletedRooms = await this.db.cleanupOldRooms(24);
    const deletedPlayers = await this.db.cleanupDisconnectedPlayers(24);

    if (deletedRooms > 0 || deletedPlayers > 0) {
      console.log(`🧹 Cleaned up ${deletedRooms} old rooms and ${deletedPlayers} disconnected players`);
    }
  } catch (error) {
    console.error('Cleanup job failed:', error);
  }
}, 60 * 60 * 1000); // Every hour
```

---

## Phase 5: Cloud Deployment Setup

### 5.1 AWS Deployment

#### A. RDS PostgreSQL Setup

**Using AWS Console:**
1. Navigate to RDS → Create database
2. Choose PostgreSQL (version 16+)
3. Select template:
   - **Dev/Test**: db.t4g.micro (free tier eligible)
   - **Production**: db.t4g.medium or larger
4. Settings:
   - DB instance identifier: `nexus-vtt-db`
   - Master username: `nexus_admin`
   - Auto-generate password (save it!)
5. Storage:
   - Allocated: 20 GB (expandable)
   - Enable storage autoscaling
6. Connectivity:
   - VPC: Default or custom
   - Public access: No (if using ECS/EC2 in same VPC)
   - Security group: Create new `nexus-db-sg`
7. Additional configuration:
   - Initial database: `nexus`
   - Automated backups: 7 days retention
   - Enable encryption
8. Create database

**Using AWS CLI:**
```bash
aws rds create-db-instance \
  --db-instance-identifier nexus-vtt-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username nexus_admin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-name nexus \
  --backup-retention-period 7 \
  --storage-encrypted \
  --no-publicly-accessible
```

**Get Connection String:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier nexus-vtt-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

Connection string format:
```
postgresql://nexus_admin:PASSWORD@nexus-vtt-db.xxxxx.us-east-1.rds.amazonaws.com:5432/nexus
```

#### B. ECS Deployment (Fargate)

**Dockerfile** (`docker/backend.Dockerfile`):
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./
RUN npm ci --production

COPY server/ ./

# Build TypeScript
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

**Task Definition** (`aws-task-definition.json`):
```json
{
  "family": "nexus-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "nexus-server",
      "image": "YOUR_ECR_REPO/nexus-server:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "5000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:xxxxx:secret:nexus/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nexus-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -q --spider http://localhost:5000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**Service Definition** (`aws-service.json`):
```json
{
  "serviceName": "nexus-server",
  "cluster": "nexus-cluster",
  "taskDefinition": "nexus-server:1",
  "desiredCount": 3,
  "launchType": "FARGATE",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["subnet-xxxxx", "subnet-yyyyy"],
      "securityGroups": ["sg-xxxxx"],
      "assignPublicIp": "ENABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:xxxxx:targetgroup/nexus-tg",
      "containerName": "nexus-server",
      "containerPort": 5000
    }
  ],
  "healthCheckGracePeriodSeconds": 60
}
```

**Deploy Script** (`scripts/deploy-aws.sh`):
```bash
#!/bin/bash

# Build and push Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_REPO
docker build -f docker/backend.Dockerfile -t nexus-server:latest .
docker tag nexus-server:latest YOUR_ECR_REPO/nexus-server:latest
docker push YOUR_ECR_REPO/nexus-server:latest

# Register task definition
aws ecs register-task-definition --cli-input-json file://aws-task-definition.json

# Update service
aws ecs update-service \
  --cluster nexus-cluster \
  --service nexus-server \
  --task-definition nexus-server:LATEST

echo "Deployment complete!"
```

#### C. Application Load Balancer

**Create ALB:**
```bash
# Create target group
aws elbv2 create-target-group \
  --name nexus-tg \
  --protocol TCP \
  --port 5000 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-protocol TCP \
  --health-check-interval-seconds 30

# Create load balancer
aws elbv2 create-load-balancer \
  --name nexus-alb \
  --type network \
  --subnets subnet-xxxxx subnet-yyyyy \
  --scheme internet-facing

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol TCP \
  --port 5000 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

**Cost Estimate (us-east-1):**
- RDS db.t4g.micro: ~$15/month
- ECS Fargate (3 tasks, 0.5 vCPU, 1GB): ~$30/month
- ALB: ~$16/month
- Data transfer: Variable
- **Total: ~$60-80/month**

---

### 5.2 Azure Deployment

#### A. Azure Database for PostgreSQL

**Using Azure Portal:**
1. Create resource → Databases → Azure Database for PostgreSQL
2. Choose deployment:
   - **Flexible Server** (recommended)
3. Basics:
   - Resource group: `nexus-rg`
   - Server name: `nexus-vtt-db`
   - Region: Select nearest
   - PostgreSQL version: 16
   - Compute tier: Burstable (B1ms for dev, B2s for prod)
4. Authentication:
   - Username: `nexus_admin`
   - Password: Generate secure password
5. Networking:
   - Allow access from Azure services: Yes
   - Add current client IP for setup
6. Review + create

**Using Azure CLI:**
```bash
# Login
az login

# Create resource group
az group create --name nexus-rg --location eastus

# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group nexus-rg \
  --name nexus-vtt-db \
  --location eastus \
  --admin-user nexus_admin \
  --admin-password YOUR_SECURE_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32 \
  --public-access 0.0.0.0

# Create database
az postgres flexible-server db create \
  --resource-group nexus-rg \
  --server-name nexus-vtt-db \
  --database-name nexus

# Get connection string
az postgres flexible-server show-connection-string \
  --server-name nexus-vtt-db \
  --database-name nexus \
  --admin-user nexus_admin
```

Connection string format:
```
postgresql://nexus_admin:PASSWORD@nexus-vtt-db.postgres.database.azure.com:5432/nexus?sslmode=require
```

#### B. Azure Container Instances / App Service

**Option 1: Container Instances (Simpler)**

**Deploy Script** (`scripts/deploy-azure.sh`):
```bash
#!/bin/bash

# Build and push to Azure Container Registry
az acr login --name nexusvttcr
docker build -f docker/backend.Dockerfile -t nexus-server:latest .
docker tag nexus-server:latest nexusvttcr.azurecr.io/nexus-server:latest
docker push nexusvttcr.azurecr.io/nexus-server:latest

# Create container group
az container create \
  --resource-group nexus-rg \
  --name nexus-server \
  --image nexusvttcr.azurecr.io/nexus-server:latest \
  --cpu 1 \
  --memory 1 \
  --registry-login-server nexusvttcr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label nexus-vtt \
  --ports 5000 \
  --environment-variables \
    NODE_ENV=production \
    PORT=5000 \
  --secure-environment-variables \
    DATABASE_URL=$DATABASE_URL

echo "Deployment complete! Access at: nexus-vtt.eastus.azurecontainer.io:5000"
```

**Option 2: Azure Kubernetes Service (Production)**

**kubernetes/deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nexus-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nexus-server
  template:
    metadata:
      labels:
        app: nexus-server
    spec:
      containers:
      - name: nexus-server
        image: nexusvttcr.azurecr.io/nexus-server:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: nexus-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 60
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: nexus-server-service
spec:
  type: LoadBalancer
  ports:
  - port: 5000
    targetPort: 5000
  selector:
    app: nexus-server
```

**Deploy to AKS:**
```bash
# Create AKS cluster
az aks create \
  --resource-group nexus-rg \
  --name nexus-cluster \
  --node-count 3 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group nexus-rg --name nexus-cluster

# Create secret
kubectl create secret generic nexus-secrets \
  --from-literal=database-url="$DATABASE_URL"

# Deploy
kubectl apply -f kubernetes/deployment.yaml

# Get external IP
kubectl get service nexus-server-service
```

**Cost Estimate (East US):**
- Azure Database B1ms: ~$25/month
- Container Instances (1 vCPU, 1GB): ~$35/month
- OR AKS (3 B2s nodes): ~$75/month
- **Total: ~$60/month (ACI) or ~$100/month (AKS)**

---

### 5.3 Google Cloud Platform (GCP) Deployment

#### A. Cloud SQL for PostgreSQL

**Using GCP Console:**
1. Navigate to SQL → Create Instance → PostgreSQL
2. Instance ID: `nexus-vtt-db`
3. Password: Generate for `postgres` user
4. Database version: PostgreSQL 16
5. Configuration:
   - Region: `us-central1` (or nearest)
   - Zonal availability: Single zone (dev) or Highly available (prod)
   - Machine type: Lightweight (1 vCPU, 3.75 GB)
6. Connections:
   - Private IP: Enable (recommended)
   - Public IP: Optional (for development)
   - Authorized networks: Add your IP
7. Create instance

**Using gcloud CLI:**
```bash
# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Create Cloud SQL instance
gcloud sql instances create nexus-vtt-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup

# Create database
gcloud sql databases create nexus --instance=nexus-vtt-db

# Create user
gcloud sql users create nexus_admin \
  --instance=nexus-vtt-db \
  --password=YOUR_SECURE_PASSWORD

# Get connection name
gcloud sql instances describe nexus-vtt-db \
  --format="value(connectionName)"
```

Connection string format:
```
postgresql://nexus_admin:PASSWORD@/nexus?host=/cloudsql/PROJECT_ID:us-central1:nexus-vtt-db
```

**Using Cloud SQL Proxy (for local development):**
```bash
# Download proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Run proxy
./cloud-sql-proxy PROJECT_ID:us-central1:nexus-vtt-db &

# Connect via localhost
postgresql://nexus_admin:PASSWORD@localhost:5432/nexus
```

#### B. Cloud Run Deployment

**Dockerfile** (same as AWS)

**Deploy Script** (`scripts/deploy-gcp.sh`):
```bash
#!/bin/bash

PROJECT_ID="your-project-id"
REGION="us-central1"

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/nexus-server

# Deploy to Cloud Run
gcloud run deploy nexus-server \
  --image gcr.io/$PROJECT_ID/nexus-server \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 5000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=5000 \
  --set-secrets DATABASE_URL=nexus-database-url:latest \
  --add-cloudsql-instances $PROJECT_ID:$REGION:nexus-vtt-db

echo "Deployment complete!"
gcloud run services describe nexus-server --region $REGION --format="value(status.url)"
```

**cloudbuild.yaml** (CI/CD):
```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'docker/backend.Dockerfile', '-t', 'gcr.io/$PROJECT_ID/nexus-server:$COMMIT_SHA', '.']

  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/nexus-server:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'nexus-server'
      - '--image'
      - 'gcr.io/$PROJECT_ID/nexus-server:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/nexus-server:$COMMIT_SHA'
```

#### C. Google Kubernetes Engine (Production)

**Create GKE Cluster:**
```bash
gcloud container clusters create nexus-cluster \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type e2-medium \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 5 \
  --enable-autorepair \
  --enable-autoupgrade

# Get credentials
gcloud container clusters get-credentials nexus-cluster --region us-central1
```

**Use same Kubernetes manifests as Azure** (see section 5.2)

**Cost Estimate (us-central1):**
- Cloud SQL db-f1-micro: ~$10/month
- Cloud Run (pay per request): ~$5-20/month (variable)
- OR GKE (3 e2-medium nodes): ~$75/month
- **Total: ~$15-30/month (Cloud Run) or ~$85/month (GKE)**

---

## Phase 6: Environment Configuration

### 6.1 Environment Variables

**Create** `.env.example`:
```bash
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration (choose one based on cloud provider)

# AWS RDS
DATABASE_URL=postgresql://nexus_admin:PASSWORD@nexus-vtt-db.xxxxx.us-east-1.rds.amazonaws.com:5432/nexus

# Azure Database
DATABASE_URL=postgresql://nexus_admin:PASSWORD@nexus-vtt-db.postgres.database.azure.com:5432/nexus?sslmode=require

# Google Cloud SQL
DATABASE_URL=postgresql://nexus_admin:PASSWORD@/nexus?host=/cloudsql/PROJECT_ID:us-central1:nexus-vtt-db

# OR for local development
DATABASE_URL=postgresql://postgres:password@localhost:5432/nexus_dev

# Database Connection Pool
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_SSL=true

# Redis (optional, for session stickiness)
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info
```

### 6.2 Secrets Management

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name nexus/database-url \
  --secret-string "postgresql://..."
```

**Azure Key Vault:**
```bash
az keyvault create \
  --name nexus-keyvault \
  --resource-group nexus-rg \
  --location eastus

az keyvault secret set \
  --vault-name nexus-keyvault \
  --name database-url \
  --value "postgresql://..."
```

**Google Secret Manager:**
```bash
echo -n "postgresql://..." | gcloud secrets create nexus-database-url --data-file=-
```

---

## Phase 7: Monitoring & Observability

### 7.1 Health Check Endpoint

**Add to server** (`server/index.ts`):
```typescript
import express from 'express';

const app = express();

app.get('/health', async (req, res) => {
  const dbHealthy = await this.db.healthCheck();

  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: dbHealthy ? 'connected' : 'disconnected',
    activeRooms: this.rooms.size,
    activeConnections: this.connections.size,
  });
});

app.get('/metrics', async (req, res) => {
  const stats = await this.db.getStats();
  res.json({
    ...stats,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

app.listen(5001, () => {
  console.log('📊 Health check API running on port 5001');
});
```

### 7.2 Cloud-Specific Monitoring

**AWS CloudWatch:**
- Automatic ECS metrics
- Custom metrics via CloudWatch SDK
- Log groups for container logs

**Azure Monitor:**
- Application Insights for app metrics
- Log Analytics for container logs
- Alerts for health check failures

**Google Cloud Monitoring:**
- Cloud Logging for container logs
- Cloud Monitoring for metrics
- Uptime checks for health endpoint

---

## Phase 8: Additional Enhancements

### 8.1 Redis for Session Affinity (Optional)

**Why Redis?**
- Track which player is connected to which server instance
- Ensure WebSocket reconnections go to the same server
- Improves connection stability in multi-server setups

**Redis Setup** (all clouds have managed Redis):
- **AWS**: ElastiCache for Redis
- **Azure**: Azure Cache for Redis
- **GCP**: Memorystore for Redis

**Integration:**
```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL
});

// Store session-to-server mapping
await redis.set(`session:${roomCode}:${userId}`, serverInstanceId);

// Retrieve on reconnection
const targetServer = await redis.get(`session:${roomCode}:${userId}`);
```

### 8.2 Message Compression

```bash
npm install pako
```

```typescript
import pako from 'pako';

private sendMessage(connection: Connection, message: ServerMessage) {
  const json = JSON.stringify(message);

  // Compress if large
  if (json.length > 1024) {
    const compressed = pako.deflate(json);
    connection.ws.send(compressed);
  } else {
    connection.ws.send(json);
  }
}
```

---

## Implementation Timeline

### Week 1-2: Foundation & Resilience
- ✅ Phase 1: Connection resilience & monitoring
- ✅ Connection Status UI
- ✅ Enhanced reconnection

### Week 3-4: Synchronization
- ✅ Phase 2: Optimistic updates
- ✅ Remote cursors
- ✅ Conflict resolution

### Week 5-6: Host Migration
- ✅ Phase 3: Automatic host transfer
- ✅ Manual host transfer
- ✅ Co-DM support

### Week 7-9: Database & Deployment
- ✅ Phase 4: PostgreSQL integration
- ✅ Database schema & service layer
- ✅ Server integration
- ✅ Phase 5: Cloud deployment scripts (AWS, Azure, GCP)

### Week 10: Testing & Documentation
- Integration testing
- Load testing
- Documentation
- Deployment guides

---

## Dependencies

### Server
```json
{
  "dependencies": {
    "ws": "^8.14.2",
    "uuid": "^9.0.1",
    "pg": "^8.11.3",
    "express": "^4.18.2",
    "pako": "^2.1.0",
    "redis": "^4.6.10"
  },
  "devDependencies": {
    "@types/ws": "^8.5.10",
    "@types/uuid": "^9.0.7",
    "@types/pg": "^8.10.9",
    "@types/express": "^4.17.21",
    "@types/pako": "^2.0.3"
  }
}
```

### Client (no changes needed, already using IndexedDB)

---

## Testing Strategy

### Unit Tests
- Database service operations
- WebSocket reconnection logic
- Conflict resolution algorithms

### Integration Tests
- Full connection lifecycle
- Host migration scenarios
- Database persistence across restarts

### Load Tests
- 50 concurrent rooms
- 10 players per room
- Sustained connection load
- Database query performance

---

## Success Metrics

### Performance
- ✅ Average latency < 100ms
- ✅ 99th percentile latency < 500ms
- ✅ Reconnection success rate > 95%
- ✅ Database query time < 10ms

### Reliability
- ✅ Zero data loss during reconnection
- ✅ Successful host migration in 100% of cases
- ✅ Room persistence across server restarts
- ✅ Multi-server load balancing

### Scalability
- ✅ Support 100+ concurrent rooms
- ✅ 1000+ concurrent connections
- ✅ Horizontal scaling with load balancer

---

## Security Considerations

1. **Database**:
   - Use SSL/TLS for connections
   - Restrict access by IP/VPC
   - Regular automated backups
   - Encrypted at rest

2. **Secrets**:
   - Use cloud secret managers
   - Never commit credentials
   - Rotate passwords regularly

3. **Network**:
   - WebSocket over WSS (TLS)
   - CORS restrictions
   - Rate limiting

---

## Cost Comparison Summary

| Cloud Provider | Database | Compute | Load Balancer | Total/Month |
|---------------|----------|---------|---------------|-------------|
| **AWS** | $15 (RDS t4g.micro) | $30 (ECS Fargate 3x) | $16 (NLB) | **~$60-80** |
| **Azure** | $25 (B1ms) | $35 (Container Instances) | Included | **~$60** |
| **Azure (AKS)** | $25 (B1ms) | $75 (AKS 3 nodes) | Included | **~$100** |
| **GCP** | $10 (db-f1-micro) | $5-20 (Cloud Run) | Included | **~$15-30** |
| **GCP (GKE)** | $10 (db-f1-micro) | $75 (GKE 3 nodes) | Included | **~$85** |

**Winner for Cost**: GCP Cloud Run (~$15-30/month)
**Winner for Features**: AWS/Azure with managed services

---

## Conclusion

This comprehensive plan provides a production-ready multiplayer architecture with:
- ✅ PostgreSQL for persistent, scalable data storage
- ✅ Deployment guides for AWS, Azure, and Google Cloud
- ✅ Connection resilience and quality monitoring
- ✅ Optimistic UI updates and conflict resolution
- ✅ Automatic and manual host migration
- ✅ Co-DM support
- ✅ Horizontal scaling capability
- ✅ Production-ready monitoring and health checks

The system is designed to handle container orchestration (Docker Swarm, ECS, AKS, GKE) and provides a solid foundation for a professional VTT platform.
