import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
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
    connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
  };

  return new DatabaseService(dbConfig);
}
