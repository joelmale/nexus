import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration options for database connection
 * @interface DatabaseConfig
 */
interface DatabaseConfig {
  /** PostgreSQL connection string (e.g., postgres://user:pass@host:port/dbname) */
  connectionString?: string;
  /** Whether to use SSL for database connection */
  ssl?: boolean;
}

/**
 * Represents a user record from the database
 * @interface UserRecord
 */
interface UserRecord {
  /** Unique user identifier (UUID) */
  id: string;
  /** User's email address (nullable for guest users) */
  email: string | null;
  /** User's display name */
  name: string;
  /** URL to user's avatar/profile picture */
  avatarUrl: string | null;
  /** OAuth provider ('google', 'discord', 'guest') */
  provider: string;
  /** Timestamp when user was created */
  createdAt: Date;
  /** Timestamp when user was last updated */
  updatedAt: Date;
}

/**
 * OAuth profile data from external providers
 * @interface OAuthProfile
 */
interface OAuthProfile {
  /** User's email from OAuth provider */
  email: string | null;
  /** User's display name from OAuth provider */
  name: string;
  /** Avatar URL from OAuth provider */
  avatarUrl: string | null;
  /** OAuth provider identifier */
  provider: string;
}

/**
 * Represents a campaign record from the database
 * @interface CampaignRecord
 */
interface CampaignRecord {
  /** Unique campaign identifier (UUID) */
  id: string;
  /** Campaign name/title */
  name: string;
  /** Campaign description */
  description: string | null;
  /** User ID of the Dungeon Master */
  dmId: string;
  /** JSONB data containing scenes and campaign details */
  scenes: unknown;
  /** Timestamp when campaign was created */
  createdAt: Date;
  /** Timestamp when campaign was last updated */
  updatedAt: Date;
}

/**
 * Represents a character record from the database
 * @interface CharacterRecord
 */
interface CharacterRecord {
  /** Unique character identifier (UUID) */
  id: string;
  /** Character name */
  name: string;
  /** User ID of the character owner */
  ownerId: string;
  /** JSONB data containing character details (race, class, stats, etc.) */
  data: unknown;
  /** Timestamp when character was created */
  createdAt: Date;
  /** Timestamp when character was last updated */
  updatedAt: Date;
}

/**
 * Represents a session record from the database
 * @interface SessionRecord
 */
interface SessionRecord {
  /** Unique session identifier (CUID format, 25 chars) */
  id: string;
  /** Short join code for players (e.g., "ABC123") */
  joinCode: string;
  /** Associated campaign ID */
  campaignId: string;
  /** Primary host/DM user ID */
  primaryHostId: string;
  /** Session status: active, hibernating, or abandoned */
  status: 'active' | 'hibernating' | 'abandoned';
  /** JSONB data containing current game state */
  gameState: unknown;
  /** Timestamp when session was created */
  createdAt: Date;
  /** Timestamp of last activity in this session */
  lastActivity: Date;
}

/**
 * Represents a player in a session
 * @interface PlayerRecord
 */
interface PlayerRecord {
  /** Unique player record identifier (UUID) */
  id: string;
  /** Associated user ID */
  userId: string;
  /** Associated session ID */
  sessionId: string;
  /** Optional associated character ID */
  characterId: string | null;
  /** Whether the player is currently connected */
  isConnected: boolean;
  /** Timestamp when player was last seen */
  lastSeen: Date;
}

/**
 * Represents a host/co-host in a session
 * @interface HostRecord
 */
interface HostRecord {
  /** Unique host record identifier (UUID) */
  id: string;
  /** Associated user ID */
  userId: string;
  /** Associated session ID */
  sessionId: string;
  /** JSONB permissions data */
  permissions: unknown;
  /** Whether this is the primary host */
  isPrimary: boolean;
}

/**
 * Database service class for managing PostgreSQL operations
 * Handles all database interactions for users, campaigns, sessions, and game state
 * @class DatabaseService
 */
export class DatabaseService {
  private pool: Pool;

  /**
   * Creates a new DatabaseService instance
   * @param {DatabaseConfig} config - Database configuration options
   */
  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });

    // Handle unexpected database pool errors
    this.pool.on('error', (err: Error) => {
      console.error('🗄️ Unexpected database pool error:', err);
    });

    // Log successful connections in development
    this.pool.on('connect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🗄️ New database connection established');
      }
    });

    console.log('✅ Database connection pool created');
  }

  /**
   * Initializes database connection and schema
   * Verifies connectivity and creates tables if needed
   * @returns {Promise<void>}
   * @throws {Error} If database connection or schema creation fails
   */
  async initialize(): Promise<void> {
    try {
      // Test database connection
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

  /**
   * Initializes database schema from schema.sql file
   * Checks if tables exist and creates them if needed
   * @private
   * @returns {Promise<void>}
   * @throws {Error} If schema.sql file is not found or execution fails
   */
  private async initSchema(): Promise<void> {
    // Check if users table exists as a proxy for schema initialization
    const result = await this.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (!result.rows[0].exists) {
      console.log('🗄️ Schema not found, creating tables...');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const schemaPath = path.join(__dirname, 'schema.sql');

      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await this.pool.query(schema);
        console.log('✅ Database schema created successfully');
      } else {
        throw new Error('schema.sql not found at: ' + schemaPath);
      }
    } else {
      console.log('✅ Database schema already exists');
    }
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  /**
   * Retrieves a user by their unique ID
   * @param {string} id - User UUID
   * @returns {Promise<UserRecord | null>} User record or null if not found
   */
  async getUserById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRecord>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * Finds an existing user by OAuth profile or creates a new one
   * Uses email as the unique identifier for OAuth users
   * @param {OAuthProfile} profile - OAuth profile data from provider
   * @returns {Promise<UserRecord>} The found or newly created user record
   */
  async findOrCreateUserByOAuth(profile: OAuthProfile): Promise<UserRecord> {
    const { email, name, avatarUrl, provider } = profile;

    // Use INSERT ... ON CONFLICT to atomically find or create
    const result = await this.pool.query<UserRecord>(
      `INSERT INTO users (email, name, "avatarUrl", provider)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) WHERE email IS NOT NULL DO UPDATE
       SET name = EXCLUDED.name,
           "avatarUrl" = EXCLUDED."avatarUrl",
           "updatedAt" = NOW()
       RETURNING *`,
      [email, name, avatarUrl, provider],
    );

    return result.rows[0];
  }

  /**
   * Creates a new guest user (no email or OAuth provider)
   * @param {string} name - Guest user's display name
   * @returns {Promise<UserRecord>} The newly created guest user record
   */
  async createGuestUser(name: string): Promise<UserRecord> {
    const result = await this.pool.query<UserRecord>(
      `INSERT INTO users (email, name, "avatarUrl", provider)
       VALUES (NULL, $1, NULL, 'guest')
       RETURNING *`,
      [name],
    );

    return result.rows[0];
  }

  // ============================================================================
  // CAMPAIGN OPERATIONS
  // ============================================================================

  /**
   * Creates a new campaign for a Dungeon Master
   * @param {string} dmId - User ID of the DM creating the campaign
   * @param {string} name - Campaign name/title
   * @param {string} [description] - Optional campaign description
   * @returns {Promise<CampaignRecord>} The newly created campaign record
   */
  async createCampaign(
    dmId: string,
    name: string,
    description?: string,
  ): Promise<CampaignRecord> {
    const result = await this.pool.query<CampaignRecord>(
      `INSERT INTO campaigns (name, description, "dmId", scenes)
       VALUES ($1, $2, $3, '[]'::jsonb)
       RETURNING *`,
      [name, description || null, dmId],
    );

    console.log(`🗄️ Campaign created: ${result.rows[0].id} by DM ${dmId}`);
    return result.rows[0];
  }

  /**
   * Retrieves all campaigns where the user is the DM
   * @param {string} userId - User ID to lookup campaigns for
   * @returns {Promise<CampaignRecord[]>} Array of campaign records
   */
  async getCampaignsByUser(userId: string): Promise<CampaignRecord[]> {
    const result = await this.pool.query<CampaignRecord>(
      'SELECT * FROM campaigns WHERE "dmId" = $1 ORDER BY "createdAt" DESC',
      [userId],
    );

    return result.rows;
  }

  /**
   * Retrieves a single campaign by ID
   * @param {string} campaignId - Campaign UUID
   * @returns {Promise<CampaignRecord | null>} Campaign record or null if not found
   */
  async getCampaignById(campaignId: string): Promise<CampaignRecord | null> {
    const result = await this.pool.query<CampaignRecord>(
      'SELECT * FROM campaigns WHERE id = $1',
      [campaignId],
    );

    return result.rows[0] || null;
  }

  /**
   * Updates campaign details
   * @param {string} campaignId - Campaign UUID to update
   * @param {Partial<CampaignRecord>} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<CampaignRecord>,
  ): Promise<void> {
    const allowedFields = ['name', 'description', 'scenes'];
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query based on provided fields
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        updateFields.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return; // Nothing to update
    }

    values.push(campaignId);

    await this.pool.query(
      `UPDATE campaigns SET ${updateFields.join(', ')}, "updatedAt" = NOW() WHERE id = $${paramIndex}`,
      values,
    );

    console.log(`🗄️ Campaign updated: ${campaignId}`);
  }

  // ============================================================================
  // CHARACTER OPERATIONS
  // ============================================================================

  /**
   * Creates a new character
   * @param {string} ownerId - User ID of the character owner
   * @param {string} name - Character name
   * @param {unknown} data - Character data (race, class, stats, etc.)
   * @returns {Promise<CharacterRecord>} The created character record
   */
  async createCharacter(
    ownerId: string,
    name: string,
    data: unknown = {},
  ): Promise<CharacterRecord> {
    const result = await this.pool.query<CharacterRecord>(
      `INSERT INTO characters (name, "ownerId", data)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, ownerId, JSON.stringify(data)],
    );

    console.log(
      `🗄️ Character created: ${result.rows[0].id} for user ${ownerId}`,
    );
    return result.rows[0];
  }

  /**
   * Retrieves all characters owned by a user
   * @param {string} userId - User ID to lookup characters for
   * @returns {Promise<CharacterRecord[]>} Array of character records
   */
  async getCharactersByUser(userId: string): Promise<CharacterRecord[]> {
    const result = await this.pool.query<CharacterRecord>(
      'SELECT * FROM characters WHERE "ownerId" = $1 ORDER BY "createdAt" DESC',
      [userId],
    );

    return result.rows;
  }

  /**
   * Retrieves a single character by ID
   * @param {string} characterId - Character UUID
   * @returns {Promise<CharacterRecord | null>} Character record or null if not found
   */
  async getCharacterById(characterId: string): Promise<CharacterRecord | null> {
    const result = await this.pool.query<CharacterRecord>(
      'SELECT * FROM characters WHERE id = $1',
      [characterId],
    );

    return result.rows[0] || null;
  }

  /**
   * Updates character details
   * @param {string} characterId - Character UUID to update
   * @param {Partial<CharacterRecord>} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateCharacter(
    characterId: string,
    updates: Partial<CharacterRecord>,
  ): Promise<void> {
    const allowedFields = ['name', 'data'];
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query based on provided fields
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        updateFields.push(`"${key}" = $${paramIndex}`);
        // Stringify data field if it's an object
        values.push(key === 'data' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return; // Nothing to update
    }

    values.push(characterId);

    await this.pool.query(
      `UPDATE characters SET ${updateFields.join(', ')}, "updatedAt" = NOW() WHERE id = $${paramIndex}`,
      values,
    );

    console.log(`🗄️ Character updated: ${characterId}`);
  }

  /**
   * Deletes a character
   * @param {string} characterId - Character UUID to delete
   * @returns {Promise<void>}
   */
  async deleteCharacter(characterId: string): Promise<void> {
    await this.pool.query('DELETE FROM characters WHERE id = $1', [
      characterId,
    ]);

    console.log(`🗄️ Character deleted: ${characterId}`);
  }

  // ============================================================================
  // SESSION OPERATIONS
  // ============================================================================

  /**
   * Generates a unique 4-character join code for a session
   * @private
   * @returns {Promise<string>} Unique join code (e.g., "ABC1")
   */
  private async generateUniqueJoinCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      // Generate random 4-character code
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Check if code is already in use
      const exists = await this.pool.query(
        'SELECT 1 FROM sessions WHERE "joinCode" = $1',
        [code],
      );

      if (exists.rows.length === 0) {
        return code;
      }

      attempts++;
    }

    throw new Error(
      'Failed to generate unique join code after ' + maxAttempts + ' attempts',
    );
  }

  /**
   * Creates a new game session linked to a campaign
   * Automatically creates a host record and adds the host as a player
   * @param {string} campaignId - Campaign UUID this session belongs to
   * @param {string} hostId - User ID of the primary host/DM
   * @returns {Promise<{ sessionId: string; joinCode: string }>} Session details
   */
  async createSession(
    campaignId: string,
    hostId: string,
  ): Promise<{ sessionId: string; joinCode: string }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate unique session ID (using UUID as CUID alternative)
      const sessionId = uuidv4();
      const joinCode = await this.generateUniqueJoinCode();

      // Create session record
      await client.query(
        `INSERT INTO sessions (id, "joinCode", "campaignId", "primaryHostId", "gameState")
         VALUES ($1, $2, $3, $4, '{}'::jsonb)`,
        [sessionId, joinCode, campaignId, hostId],
      );

      // Create host record
      await client.query(
        `INSERT INTO hosts (id, "userId", "sessionId", "isPrimary", permissions)
         VALUES (uuid_generate_v4(), $1, $2, true, '{}'::jsonb)`,
        [hostId, sessionId],
      );

      // Add host as a player
      await client.query(
        `INSERT INTO players (id, "userId", "sessionId", "isConnected")
         VALUES (uuid_generate_v4(), $1, $2, true)`,
        [hostId, sessionId],
      );

      await client.query('COMMIT');

      console.log(
        `🗄️ Session created: ${joinCode} (${sessionId}) by host ${hostId}`,
      );

      return { sessionId, joinCode };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to create session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a session by its join code
   * @param {string} joinCode - The short join code (e.g., "ABC1")
   * @returns {Promise<SessionRecord | null>} Session record or null if not found
   */
  async getSessionByJoinCode(joinCode: string): Promise<SessionRecord | null> {
    const result = await this.pool.query<SessionRecord>(
      'SELECT * FROM sessions WHERE "joinCode" = $1',
      [joinCode],
    );

    return result.rows[0] || null;
  }

  /**
   * Updates the status of a session
   * @param {string} sessionId - Session ID to update
   * @param {string} status - New status: 'active', 'hibernating', or 'abandoned'
   * @returns {Promise<void>}
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'active' | 'hibernating' | 'abandoned',
  ): Promise<void> {
    await this.pool.query(
      `UPDATE sessions SET status = $1, "lastActivity" = NOW() WHERE id = $2`,
      [status, sessionId],
    );

    console.log(`🗄️ Session ${sessionId} status updated to: ${status}`);
  }

  /**
   * Saves the current game state for a session
   * @param {string} sessionId - Session ID to update
   * @param {unknown} gameState - Game state object (will be stored as JSONB)
   * @returns {Promise<void>}
   */
  async saveGameState(sessionId: string, gameState: unknown): Promise<void> {
    await this.pool.query(
      `UPDATE sessions SET "gameState" = $1, "lastActivity" = NOW() WHERE id = $2`,
      [JSON.stringify(gameState), sessionId],
    );

    console.log(`🗄️ Game state saved for session: ${sessionId}`);
  }

  /**
   * Deletes a session and all associated records
   * Cascading deletes will remove related players and hosts
   * @param {string} sessionId - Session ID to delete
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    console.log(`🗄️ Session deleted: ${sessionId}`);
  }

  // ============================================================================
  // PLAYER OPERATIONS
  // ============================================================================

  /**
   * Adds a player to a session
   * @param {string} userId - User ID of the player
   * @param {string} sessionId - Session ID to join
   * @returns {Promise<void>}
   */
  async addPlayerToSession(
    userId: string,
    sessionId: string,
    characterId?: string | null,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO players (id, "userId", "sessionId", "characterId", "isConnected")
       VALUES (uuid_generate_v4(), $1, $2, $3, true)
       ON CONFLICT ("userId", "sessionId") DO UPDATE
       SET "isConnected" = true, "characterId" = EXCLUDED."characterId", "lastSeen" = NOW()`,
      [userId, sessionId, characterId || null],
    );

    console.log(
      `🗄️ Player ${userId} added to session ${sessionId}${characterId ? ` with character ${characterId}` : ''}`,
    );
  }

  /**
   * Removes a player from a session
   * @param {string} userId - User ID of the player to remove
   * @param {string} sessionId - Session ID to remove from
   * @returns {Promise<void>}
   */
  async removePlayerFromSession(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    await this.pool.query(
      'DELETE FROM players WHERE "userId" = $1 AND "sessionId" = $2',
      [userId, sessionId],
    );

    console.log(`🗄️ Player ${userId} removed from session ${sessionId}`);
  }

  /**
   * Gets the character associated with a player in a session
   * @param {string} userId - User ID of the player
   * @param {string} sessionId - Session ID
   * @returns {Promise<CharacterRecord | null>} Character record or null if no character linked
   */
  async getPlayerCharacter(
    userId: string,
    sessionId: string,
  ): Promise<CharacterRecord | null> {
    const result = await this.pool.query<PlayerRecord>(
      'SELECT "characterId" FROM players WHERE "userId" = $1 AND "sessionId" = $2',
      [userId, sessionId],
    );

    if (!result.rows[0] || !result.rows[0].characterId) {
      return null;
    }

    return await this.getCharacterById(result.rows[0].characterId);
  }

  /**
   * Updates a player's connection status
   * @param {string} userId - User ID of the player
   * @param {string} sessionId - Session ID
   * @param {boolean} isConnected - New connection status
   * @returns {Promise<void>}
   */
  async updatePlayerConnection(
    userId: string,
    sessionId: string,
    isConnected: boolean,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE players
       SET "isConnected" = $1, "lastSeen" = NOW()
       WHERE "userId" = $2 AND "sessionId" = $3`,
      [isConnected, userId, sessionId],
    );
  }

  /**
   * Gets all players for a session
   * @param {string} sessionId - Session ID to lookup
   * @returns {Promise<PlayerRecord[]>} Array of player records
   */
  async getPlayersBySession(sessionId: string): Promise<PlayerRecord[]> {
    const result = await this.pool.query<PlayerRecord>(
      'SELECT * FROM players WHERE "sessionId" = $1',
      [sessionId],
    );

    return result.rows;
  }

  // ============================================================================
  // HOST OPERATIONS
  // ============================================================================

  /**
   * Adds a co-host to a session
   * @param {string} userId - User ID to make co-host
   * @param {string} sessionId - Session ID
   * @param {unknown} [permissions] - Optional permissions object
   * @returns {Promise<void>}
   */
  async addCoHost(
    userId: string,
    sessionId: string,
    permissions?: unknown,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO hosts (id, "userId", "sessionId", "isPrimary", permissions)
       VALUES (uuid_generate_v4(), $1, $2, false, $3)
       ON CONFLICT ("userId", "sessionId") DO UPDATE
       SET permissions = EXCLUDED.permissions`,
      [userId, sessionId, JSON.stringify(permissions || {})],
    );

    console.log(`🗄️ Co-host ${userId} added to session ${sessionId}`);
  }

  /**
   * Removes a co-host from a session
   * @param {string} userId - User ID of the co-host to remove
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async removeCoHost(userId: string, sessionId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM hosts WHERE "userId" = $1 AND "sessionId" = $2 AND "isPrimary" = false',
      [userId, sessionId],
    );

    console.log(`🗄️ Co-host ${userId} removed from session ${sessionId}`);
  }

  /**
   * Transfers primary host privileges to a new user
   * @param {string} sessionId - Session ID
   * @param {string} newHostId - User ID of the new primary host
   * @returns {Promise<void>}
   */
  async transferPrimaryHost(
    sessionId: string,
    newHostId: string,
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Remove primary flag from current host
      await client.query(
        `UPDATE hosts SET "isPrimary" = false WHERE "sessionId" = $1 AND "isPrimary" = true`,
        [sessionId],
      );

      // Set new primary host (create record if doesn't exist)
      await client.query(
        `INSERT INTO hosts (id, "userId", "sessionId", "isPrimary", permissions)
         VALUES (uuid_generate_v4(), $1, $2, true, '{}'::jsonb)
         ON CONFLICT ("userId", "sessionId") DO UPDATE
         SET "isPrimary" = true`,
        [newHostId, sessionId],
      );

      // Update session's primaryHostId
      await client.query(
        `UPDATE sessions SET "primaryHostId" = $1 WHERE id = $2`,
        [newHostId, sessionId],
      );

      await client.query('COMMIT');

      console.log(
        `🗄️ Primary host transferred to ${newHostId} in session ${sessionId}`,
      );
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to transfer primary host:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets all hosts (primary and co-hosts) for a session
   * @param {string} sessionId - Session ID to lookup
   * @returns {Promise<HostRecord[]>} Array of host records
   */
  async getHostsBySession(sessionId: string): Promise<HostRecord[]> {
    const result = await this.pool.query<HostRecord>(
      'SELECT * FROM hosts WHERE "sessionId" = $1',
      [sessionId],
    );

    return result.rows;
  }

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  /**
   * Closes the database connection pool
   * Should be called when shutting down the application
   * @returns {Promise<void>}
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('🗄️ Database connection pool closed');
  }

  /**
   * Gets the underlying database pool for advanced operations
   * Use with caution - prefer using the provided methods
   * @returns {Pool} The PostgreSQL connection pool
   */
  getPool(): Pool {
    return this.pool;
  }
}

/**
 * Creates and configures a new DatabaseService instance
 * Reads configuration from environment variables
 * @param {DatabaseConfig} [config] - Optional configuration override
 * @returns {DatabaseService} Configured database service instance
 * @throws {Error} If DATABASE_URL environment variable is not set
 */
export function createDatabaseService(
  config?: DatabaseConfig,
): DatabaseService {
  let dbConfig: DatabaseConfig;

  if (config) {
    dbConfig = config;
  } else {
    // Use DATABASE_URL (not VITE_DATABASE_URL) for server-side code
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable must be set');
    }

    dbConfig = {
      connectionString,
      ssl: process.env.DB_SSL === 'true',
    };
  }

  return new DatabaseService(dbConfig);
}
