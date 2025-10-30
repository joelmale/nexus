// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

// Node.js core modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Express and middleware
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

// WebSocket and HTTP types
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

// Session and database
import session, { Session } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

// Authentication
import passport from './auth.js';

// UUID
import { v4 as uuidv4 } from 'uuid';

// Custom types
import type {
  Room,
  Connection,
  ServerMessage,
  ServerDiceRollResultMessage,
  GameState,
} from './types.js';

// Shared types
import type { AssetManifest } from '../shared/types.js';

// Services
import {
  DatabaseService,
  createDatabaseService,
  SessionRecord,
} from './database.js';
import {
  DocumentServiceClient,
  createDocumentServiceClient,
} from './services/documentServiceClient.js';

// Routes
import { createDocumentRoutes } from './routes/documents.js';

// Dice functions and types
import {
  validateDiceRollRequest,
  createServerDiceRoll,
  DiceRollRequest,
} from './diceRoller.js';

interface SessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  provider: string;
}

interface CustomSession extends Session {
  guestUser?: {
    id: string;
    name: string;
    provider: string;
  };
  passport?: {
    user?: SessionUser;
  };
}

interface RequestWithSession extends IncomingMessage {
  session: CustomSession;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  private documentClient: DocumentServiceClient;

  private readonly ASSETS_PATH =
    process.env.ASSETS_PATH || path.join(__dirname, '../asset-server/assets');
  private readonly CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
  private readonly CACHE_MAX_AGE = parseInt(
    process.env.CACHE_MAX_AGE || '86400',
  );
  private readonly HIBERNATION_TIMEOUT = 10 * 60 * 1000;
  private readonly ABANDONMENT_TIMEOUT = 60 * 60 * 1000;
  private readonly HEARTBEAT_INTERVAL = 30 * 1000;
  private readonly HEARTBEAT_TIMEOUT = 10 * 1000;
  private readonly MAX_CONSECUTIVE_MISSES = 3;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(port: number) {
    this.port = port;
    this.db = createDatabaseService();

    // Initialize document service client
    const docApiUrl = process.env.DOC_API_URL || 'http://localhost:3000';
    this.documentClient = createDocumentServiceClient(docApiUrl);

    this.app = express();

    this.app.use(
      helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }),
    );
    this.app.use(compression());
    this.app.use(cors({ origin: this.CORS_ORIGIN, credentials: true }));
    // Increase body size limit for token image uploads (base64 images can be large)
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Use DATABASE_URL for server-side PostgreSQL connection (VITE_ prefix is for client only)
    const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sessionStore = new (connectPgSimple(session))({
      pool: pgPool,
      createTableIfMissing: true,
    });

    const sessionMiddleware = session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'a-very-secret-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    });

    this.app.use(sessionMiddleware);
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    this.setupAuthRoutes();
    this.setupApiRoutes();
    this.setupDocumentRoutes();
    this.setupAssetRoutes();
    this.setupHealthRoutes();

    this.httpServer = this.app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Nexus server running on port ${port}`);
    });

    this.wss = new WebSocketServer({ noServer: true });

    this.httpServer.on(
      'upgrade',
      (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        sessionMiddleware(
          req as express.Request,
          {} as express.Response,
          () => {
            this.wss.handleUpgrade(req, socket, head, (ws) => {
              this.wss.emit('connection', ws, req);
            });
          },
        );
      },
    );

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req as RequestWithSession);
    });

    this.loadManifest();
    this.initialize();
  }

  private async initialize() {
    try {
      await this.db.initialize();
      // await this.loadRoomsFromDatabase(); // This needs to be updated for the new schema
      console.log('✅ Server initialization complete');
    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      process.exit(1);
    }
  }

  /**
   * Sets up authentication routes for OAuth and user management
   * @private
   * @returns {void}
   */
  private setupAuthRoutes(): void {
    this.app.get(
      '/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'] }),
    );
    this.app.get(
      '/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/' }),
      (req, res) => {
        res.redirect(
          process.env.FRONTEND_URL || 'http://localhost:5173/dashboard',
        );
      },
    );
    this.app.get('/auth/discord', passport.authenticate('discord'));
    this.app.get(
      '/auth/discord/callback',
      passport.authenticate('discord', { failureRedirect: '/' }),
      (req, res) => {
        res.redirect(
          process.env.FRONTEND_URL || 'http://localhost:5173/dashboard',
        );
      },
    );
    this.app.get('/auth/logout', (req, res, next) => {
      req.logout((err) => {
        if (err) {
          return next(err);
        }
        res.redirect('/');
      });
    });
    this.app.get('/auth/me', (req, res) => {
      if (req.isAuthenticated()) {
        res.json(req.user);
      } else {
        res.status(401).json({ message: 'Not authenticated' });
      }
    });
  }

  /**
   * Sets up API routes for guest users, campaigns, and characters
   * @private
   * @returns {void}
   */
  private setupApiRoutes(): void {
    // ============================================================================
    // GUEST USER ROUTES
    // ============================================================================

    /**
     * POST /api/guest-users
     * Creates a new guest user for non-authenticated gameplay
     * Body: { name: string }
     */
    this.app.post('/api/guest-users', async (req, res) => {
      try {
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return res.status(400).json({ error: 'Name is required' });
        }

        if (name.trim().length > 50) {
          return res
            .status(400)
            .json({ error: 'Name must be 50 characters or less' });
        }

        // Create guest user in database
        const guestUser = await this.db.createGuestUser(name.trim());

        // Create a session for the guest user (without using passport)
        (req.session as CustomSession).guestUser = {
          id: guestUser.id,
          name: guestUser.name,
          provider: 'guest',
        };

        res.status(201).json({
          id: guestUser.id,
          name: guestUser.name,
          provider: 'guest',
        });
      } catch (error) {
        console.error('Failed to create guest user:', error);
        res.status(500).json({ error: 'Failed to create guest user' });
      }
    });

    /**
     * GET /api/guest-me
     * Gets current guest user from session
     */
    this.app.get('/api/guest-me', (req, res) => {
      const guestUser = (req.session as CustomSession).guestUser;
      if (guestUser) {
        res.json(guestUser);
      } else {
        res.status(401).json({ message: 'Not a guest user' });
      }
    });

    // ============================================================================
    // CAMPAIGN ROUTES
    // ============================================================================

    /**
     * GET /api/campaigns
     * Gets all campaigns for the authenticated user
     * Requires authentication
     */
    this.app.get('/api/campaigns', async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const user = req.user as { id: string };
        const campaigns = await this.db.getCampaignsByUser(user.id);

        res.json(campaigns);
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
      }
    });

    /**
     * POST /api/campaigns
     * Creates a new campaign
     * Requires authentication
     * Body: { name: string, description?: string }
     */
    this.app.post('/api/campaigns', async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { name, description } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return res.status(400).json({ error: 'Campaign name is required' });
        }

        if (name.trim().length > 255) {
          return res
            .status(400)
            .json({ error: 'Campaign name must be 255 characters or less' });
        }

        const user = req.user as { id: string };
        const campaign = await this.db.createCampaign(
          user.id,
          name.trim(),
          description?.trim() || undefined,
        );

        res.status(201).json(campaign);
      } catch (error) {
        console.error('Failed to create campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
      }
    });

    /**
     * PUT /api/campaigns/:id
     * Updates a campaign
     * Requires authentication and ownership
     * Body: { name?: string, description?: string, scenes?: any }
     */
    this.app.put('/api/campaigns/:id', async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const campaignId = req.params.id;
        const updates = req.body;

        // Validate updates
        if (updates.name !== undefined) {
          if (
            typeof updates.name !== 'string' ||
            updates.name.trim().length === 0
          ) {
            return res
              .status(400)
              .json({ error: 'Campaign name cannot be empty' });
          }
          if (updates.name.trim().length > 255) {
            return res
              .status(400)
              .json({ error: 'Campaign name must be 255 characters or less' });
          }
          updates.name = updates.name.trim();
        }

        if (
          updates.description !== undefined &&
          typeof updates.description === 'string'
        ) {
          updates.description = updates.description.trim();
        }

        await this.db.updateCampaign(campaignId, updates);

        res.json({ success: true, message: 'Campaign updated successfully' });
      } catch (error) {
        console.error('Failed to update campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
      }
    });

    /**
     * GET /api/characters
     * Retrieves all characters owned by the authenticated user
     * Requires authentication
     */
    this.app.get('/api/characters', async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const user = req.user as { id: string };
        const characters = await this.db.getCharactersByUser(user.id);

        res.json(characters);
      } catch (error) {
        console.error('Failed to fetch characters:', error);
        res.status(500).json({ error: 'Failed to fetch characters' });
      }
    });

    /**
     * GET /api/characters/:id
     * Retrieves a specific character by ID
     * Requires authentication and ownership
     */
    this.app.get('/api/characters/:id', async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const characterId = req.params.id;
        const character = await this.db.getCharacterById(characterId);

        if (!character) {
          return res.status(404).json({ error: 'Character not found' });
        }

        // Verify ownership
        const user = req.user as { id: string };
        if (character.ownerId !== user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        res.json(character);
      } catch (error) {
        console.error('Failed to fetch character:', error);
        res.status(500).json({ error: 'Failed to fetch character' });
      }
    });

    /**
     * POST /api/characters
     * Creates a new character
     * Requires authentication
     * Body: { name: string, data?: object }
     */
    this.app.post('/api/characters', async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { name, data } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return res.status(400).json({ error: 'Character name is required' });
        }

        if (name.trim().length > 255) {
          return res
            .status(400)
            .json({ error: 'Character name must be 255 characters or less' });
        }

        const user = req.user as { id: string };
        const character = await this.db.createCharacter(
          user.id,
          name.trim(),
          data || {},
        );

        res.status(201).json(character);
      } catch (error) {
        console.error('Failed to create character:', error);
        res.status(500).json({ error: 'Failed to create character' });
      }
    });

    /**
     * PUT /api/characters/:id
     * Updates a character
     * Requires authentication and ownership
     * Body: { name?: string, data?: object }
     */
    this.app.put('/api/characters/:id', async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const characterId = req.params.id;
        const updates = req.body;

        // Verify ownership
        const character = await this.db.getCharacterById(characterId);
        if (!character) {
          return res.status(404).json({ error: 'Character not found' });
        }

        const user = req.user as { id: string };
        if (character.ownerId !== user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Validate updates
        if (updates.name !== undefined) {
          if (
            typeof updates.name !== 'string' ||
            updates.name.trim().length === 0
          ) {
            return res
              .status(400)
              .json({ error: 'Character name cannot be empty' });
          }
          if (updates.name.trim().length > 255) {
            return res
              .status(400)
              .json({ error: 'Character name must be 255 characters or less' });
          }
          updates.name = updates.name.trim();
        }

        await this.db.updateCharacter(characterId, updates);

        res.json({ success: true, message: 'Character updated successfully' });
      } catch (error) {
        console.error('Failed to update character:', error);
        res.status(500).json({ error: 'Failed to update character' });
      }
    });

    /**
     * DELETE /api/characters/:id
     * Deletes a character
     * Requires authentication and ownership
     */
    this.app.delete('/api/characters/:id', async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const characterId = req.params.id;

        // Verify ownership
        const character = await this.db.getCharacterById(characterId);
        if (!character) {
          return res.status(404).json({ error: 'Character not found' });
        }

        const user = req.user as { id: string };
        if (character.ownerId !== user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        await this.db.deleteCharacter(characterId);

        res.json({ success: true, message: 'Character deleted successfully' });
      } catch (error) {
        console.error('Failed to delete character:', error);
        res.status(500).json({ error: 'Failed to delete character' });
      }
    });

    /**
     * POST /api/tokens/save
     * Saves a customized token image to the server
     * Body: { tokenId: string, imageData: string (base64), name: string }
     */
    this.app.post('/api/tokens/save', async (req, res) => {
      try {
        const { tokenId, imageData, name } = req.body;

        if (!tokenId || !imageData || !name) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate that imageData is a base64 PNG
        if (!imageData.startsWith('data:image/png;base64,')) {
          return res.status(400).json({ error: 'Invalid image format' });
        }

        // Extract base64 data
        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Create custom tokens directory if it doesn't exist
        const customTokensDir = path.join(this.ASSETS_PATH, 'tokens', 'custom');
        if (!fs.existsSync(customTokensDir)) {
          fs.mkdirSync(customTokensDir, { recursive: true });
        }

        // Generate filename from tokenId
        const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedName}_${tokenId}.png`;
        const filepath = path.join(customTokensDir, filename);

        // Write the file
        fs.writeFileSync(filepath, buffer);

        // Return the server path
        const serverPath = `/assets/tokens/custom/${filename}`;

        console.log(`💾 Saved custom token: ${serverPath}`);
        res.json({
          success: true,
          path: serverPath,
          message: 'Token saved successfully'
        });
      } catch (error) {
        console.error('Failed to save token:', error);
        res.status(500).json({ error: 'Failed to save token' });
      }
    });
  }

  /**
   * Sets up document routes for accessing NexusCodex services
   * @private
   * @returns {void}
   */
  private setupDocumentRoutes(): void {
    const documentRoutes = createDocumentRoutes(this.documentClient);
    this.app.use('/api', documentRoutes);
    console.log('📚 Document routes initialized');
  }

  private setupHealthRoutes(): void {
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

    this.app.get('/manifest.json', (req, res) => {
      if (!this.manifest) {
        return res.status(503).json({ error: 'Manifest not loaded' });
      }
      setCacheHeaders(res, 300);
      res.json(this.manifest);
    });

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
      setCacheHeaders(res, 60);
      res.json({ query, results, total: results.length });
    });

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

    // Serve custom tokens directory
    this.app.use(
      '/assets/tokens/custom',
      (req, res, next) => {
        setCacheHeaders(res);
        next();
      },
      express.static(path.join(this.ASSETS_PATH, 'tokens', 'custom')),
    );

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

  private async handleConnection(ws: WebSocket, req: RequestWithSession) {
    const user = req.session?.passport?.user;
    const guestUser = req.session?.guestUser;
    const url = new URL(req.url!, 'ws://localhost');
    const params = url.searchParams;
    const userIdFromQuery = params.get('userId');

    // Priority: authenticated user > guest user > query param > new UUID
    let uuid = user?.id || guestUser?.id || userIdFromQuery || uuidv4();
    let displayName = user?.name || guestUser?.name || 'Guest';
    let userType = user ? 'Authenticated' : guestUser ? 'Guest' : 'Anonymous';

    // If we have a userId from query params but no authenticated user, try to look up the user
    if (userIdFromQuery && !user && !guestUser) {
      try {
        const dbUser = await this.db.getUserById(userIdFromQuery);
        if (dbUser) {
          uuid = dbUser.id;
          displayName = dbUser.name;
          userType = 'Authenticated';
          console.log(
            `✅ Found authenticated user from query param: ${dbUser.name}`,
          );
        }
      } catch (error) {
        console.warn(`⚠️ Failed to lookup user ${userIdFromQuery}:`, error);
      }
    }
    console.log(`📡 New connection: ${uuid} (${userType} as ${displayName})`);

    const connection: Connection = {
      id: uuid,
      ws: ws,
      consecutiveMisses: 0,
      connectionQuality: 'excellent',
    };

    this.connections.set(uuid, connection);

    this.startHeartbeatForConnection(connection);

    const host = params.get('host');
    const join = params.get('join')?.toUpperCase();
    const reconnect = params.get('reconnect')?.toUpperCase();
    const campaignId = params.get('campaignId'); // Get campaign ID from query params

    if (host) {
      await this.handleHostConnection(connection, host, campaignId);
    } else if (reconnect) {
      this.handleHostReconnection(connection, reconnect);
    } else if (join) {
      await this.handleJoinConnection(connection, join);
    } else {
      await this.handleDefaultConnection(connection, campaignId);
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as ServerMessage;
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

  /**
   * Handles a new host connection (creates campaign and session)
   * If campaignId is provided, uses existing campaign; otherwise creates a new one.
   * Creates session in database, then initializes in-memory room state.
   * @private
   * @param {Connection} connection - WebSocket connection object
   * @param {string} [hostRoomCode] - Optional specific room code to use
   * @param {string | null} [campaignId] - Optional campaign ID to use (from authenticated user)
   * @returns {Promise<void>}
   */
  private async handleHostConnection(
    connection: Connection,
    hostRoomCode?: string,
    campaignId?: string | null,
  ): Promise<void> {
    try {
      // Generate a room code if not provided
      const roomCode = hostRoomCode || this.generateRoomCode();

      // Check if room code already exists
      if (this.rooms.has(roomCode)) {
        this.sendError(connection, 'Room already exists');
        return;
      }

      let usedCampaignId;
      let campaignScenes: unknown[] = [];

      if (campaignId) {
        // Use existing campaign (authenticated user selected it)
        console.log(`🗂️ Using existing campaign: ${campaignId}`);
        usedCampaignId = campaignId;

        // Load campaign data
        const campaign = await this.db.getCampaignById(campaignId);
        if (campaign && campaign.scenes) {
          campaignScenes = Array.isArray(campaign.scenes)
            ? campaign.scenes
            : [];
          console.log(
            `📚 Loaded ${campaignScenes.length} scenes from campaign`,
          );
        }
      } else {
        // Create a default campaign for guest DM
        console.log(`🗂️ Creating new campaign for guest DM`);
        const campaign = await this.db.createCampaign(
          connection.id,
          `Campaign ${roomCode}`,
          'Auto-created campaign for quick session',
        );
        usedCampaignId = campaign.id;
      }

      // Create session linked to campaign
      const { sessionId, joinCode } = await this.db.createSession(
        usedCampaignId,
        connection.id,
      );

      // Create in-memory room state for real-time operations
      const room: Room = {
        code: joinCode,
        host: connection.id,
        coHosts: new Set(),
        players: new Set([connection.id]),
        connections: new Map([[connection.id, connection.ws]]),
        created: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
        entityVersions: new Map(),
      };

      this.rooms.set(joinCode, room);
      connection.room = joinCode;
      connection.user = { name: 'Host', type: 'host' };

      // Send session created confirmation to client
      this.sendMessage(connection, {
        type: 'event',
        data: {
          name: 'session/created',
          roomCode: joinCode,
          room: joinCode, // Keep for backward compatibility
          sessionId,
          campaignId: usedCampaignId,
          campaignScenes, // Include campaign scenes for loading into game state
          uuid: connection.id,
          hostId: connection.id,
          coHostIds: Array.from(room.coHosts),
          players: [
            {
              id: connection.id,
              name: connection.user?.name || 'Host',
              type: 'host',
              color: 'blue',
              connected: true,
              canEditScenes: true,
            },
          ],
        },
        timestamp: Date.now(),
      });

      console.log(
        `🏠 Session created: ${joinCode} (${sessionId}) for campaign ${usedCampaignId}`,
      );
    } catch (error) {
      console.error('Failed to create session:', error);
      this.sendError(connection, 'Failed to create session');
    }
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

  /**
   * Handles a player joining an existing room/session
   * Adds player to session in database and broadcasts to other players
   * @private
   * @param {Connection} connection - WebSocket connection object
   * @param {string} roomCode - Join code of the room to join
   * @returns {Promise<void>}
   */
  private async handleJoinConnection(
    connection: Connection,
    roomCode: string,
  ): Promise<void> {
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

    // Add player to in-memory room state
    room.players.add(connection.id);
    room.connections.set(connection.id, connection.ws);
    room.lastActivity = Date.now();
    connection.room = roomCode;
    connection.user = { name: 'Player', type: 'player' };

    // Add player to database session
    try {
      const session = await this.db.getSessionByJoinCode(roomCode);
      if (session) {
        await this.db.addPlayerToSession(connection.id, session.id);
      }
    } catch (error) {
      console.error('Failed to add player to session in database:', error);
    }

    // Notify player they joined
    this.sendMessage(connection, {
      type: 'event',
      data: {
        name: 'session/joined',
        roomCode,
        room: roomCode, // Keep for backward compatibility
        uuid: connection.id,
        hostId: room.host,
        coHostIds: Array.from(room.coHosts),
        roomStatus: room.status,
        gameState: room.gameState,
        players: Array.from(room.players).map((playerId) => {
          const conn = this.connections.get(playerId);
          return {
            id: playerId,
            name: conn?.user?.name || 'Unknown',
            type:
              playerId === room.host
                ? 'host'
                : room.coHosts.has(playerId)
                  ? 'host'
                  : 'player',
            color: 'blue',
            connected: true,
            canEditScenes: playerId === room.host || room.coHosts.has(playerId),
          };
        }),
      },
      timestamp: Date.now(),
    });

    // Notify other players about the new player
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

  private async handleDefaultConnection(
    connection: Connection,
    campaignId?: string | null,
  ) {
    const roomCode = this.generateRoomCode();
    await this.handleHostConnection(connection, roomCode, campaignId);
  }

  private routeMessage(fromUuid: string, message: ServerMessage) {
    // Handle heartbeat messages regardless of room state
    if (message.type === 'heartbeat') {
      const heartbeatData = message.data as {
        type: 'ping' | 'pong';
        id: string;
      };
      if (heartbeatData.type === 'pong') {
        this.handleHeartbeatPong(fromUuid, heartbeatData.id);
      }
      return;
    }

    const connection = this.connections.get(fromUuid);
    if (!connection?.room) return;

    const room = this.rooms.get(connection.room);
    if (!room) return;

    room.lastActivity = Date.now();

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

    if (message.type === 'event') {
      const eventName = message.data?.name;
      if (eventName === 'host/transfer') {
        this.handleHostTransfer(
          fromUuid,
          connection,
          room,
          message.data as unknown as { targetUserId: string },
        );
        return;
      } else if (eventName === 'host/add-cohost') {
        this.handleAddCoHost(
          fromUuid,
          connection,
          room,
          message.data as unknown as { targetUserId: string },
        );
        return;
      } else if (eventName === 'host/remove-cohost') {
        this.handleRemoveCoHost(
          fromUuid,
          connection,
          room,
          message.data as unknown as { targetUserId: string },
        );
        return;
      }
    }

    if (
      message.type === 'event' &&
      message.data?.name === 'game-state-update'
    ) {
      this.updateRoomGameState(
        connection.room,
        message.data as unknown as GameState,
      );
    }

    if (
      message.type === 'event' &&
      ['token/move', 'token/update', 'token/delete'].includes(
        (message.data as { name: string })?.name,
      )
    ) {
      const eventData = message.data as {
        name: string;
        tokenId: string;
        expectedVersion: number;
      };
      const entityId = eventData.tokenId;
      const expectedVersion = eventData.expectedVersion;

      if (entityId && expectedVersion !== undefined) {
        const currentVersion = room.entityVersions.get(entityId) || 0;

        if (expectedVersion < currentVersion) {
          console.warn(
            `⚠️ Version conflict detected for ${entityId}: expected ${expectedVersion}, current ${currentVersion}`,
          );

          this.sendMessage(connection, {
            type: 'error',
            data: {
              message: `Update rejected due to version conflict for ${entityId} (expected v${expectedVersion}, current v${currentVersion})`,
              code: 409,
            },
            timestamp: Date.now(),
          });

          return;
        }

        room.entityVersions.set(entityId, expectedVersion + 1);
      }
    }

    if (
      message.type === 'event' &&
      (message.data as unknown as { updateId: string })?.updateId &&
      (message.data as unknown as { name: string })?.name !== 'cursor/update'
    ) {
      this.sendMessage(connection, {
        type: 'update-confirmed',
        data: {
          updateId: (message.data as unknown as { updateId: string }).updateId,
        },
        timestamp: Date.now(),
      });
    }

    if ((message as any).type === 'chat-message') {
      this.handleChatMessage(
        fromUuid,
        connection,
        message as ServerMessage & { data: { content: string } },
      );
      return;
    }

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
    message: ServerMessage & { data: { content: string } },
  ) {
    if (!connection.room) return;
    const room = this.rooms.get(connection.room);
    if (!room) return;
    const content = message.data?.content || '';
    console.log(
      `💬 Chat message from ${fromUuid} in room ${connection.room}: ${content}`,
    );
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
    const validation = validateDiceRollRequest(data);
    if (!validation.valid) {
      this.sendError(
        connection,
        validation.error || 'Invalid dice roll request',
      );
      return;
    }
    const userName = connection.user?.name || 'Unknown Player';
    const isHost = connection.user?.type === 'host';
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

  /**
   * Updates and persists game state for a room/session
   * Merges partial updates into existing game state and saves to database
   * @private
   * @param {string} roomCode - Join code of the room
   * @param {Partial<GameState>} gameStateUpdate - Partial game state to merge
   * @returns {Promise<void>}
   */
  private async updateRoomGameState(
    roomCode: string,
    gameStateUpdate: Partial<GameState>,
  ): Promise<void> {
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

    // Merge partial updates into existing state
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

    // Persist to database (both session and campaign)
    try {
      const session = await this.db.getSessionByJoinCode(roomCode);
      if (session) {
        // Save full game state to session (for active session recovery)
        await this.db.saveGameState(session.id, room.gameState);

        // Save scenes to campaign (for multi-device persistence)
        if (room.gameState.scenes && session.campaignId) {
          await this.db.saveCampaignScenes(session.campaignId, room.gameState.scenes);
        }

        console.log(`💾 Game state updated and persisted for room ${roomCode}`);
      }
    } catch (error) {
      console.error('Failed to persist game state:', error);
    }
  }

  /**
   * Broadcasts a message to all connections in a room
   * @private
   * @param {string} roomCode - Join code of the room
   * @param {ServerMessage} message - Message to broadcast
   * @param {string} [excludeUuid] - Optional UUID to exclude from broadcast
   * @returns {void}
   */
  private broadcastToRoom(
    roomCode: string,
    message: ServerMessage,
    excludeUuid?: string,
  ): void {
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

  /**
   * Sends a message to a specific connection
   * Only sends if WebSocket connection is open
   * @private
   * @param {Connection} connection - Target connection
   * @param {ServerMessage} message - Message to send
   * @returns {void}
   */
  private sendMessage(connection: Connection, message: ServerMessage): void {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Sends an error message to a connection
   * @private
   * @param {Connection} connection - Target connection
   * @param {string} error - Error message text
   * @returns {void}
   */
  private sendError(connection: Connection, error: string): void {
    this.sendMessage(connection, {
      type: 'error',
      data: { message: error },
      timestamp: Date.now(),
    });
  }

  /**
   * Handles a WebSocket disconnection
   * Updates database and manages host transfer or room hibernation as needed
   * @private
   * @param {string} uuid - Connection UUID that disconnected
   * @returns {Promise<void>}
   */
  private async handleDisconnect(uuid: string): Promise<void> {
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

    // Get session from database to find sessionId
    let session: SessionRecord | null = null;
    try {
      session = await this.db.getSessionByJoinCode(connection.room);
    } catch (error) {
      console.error('Failed to fetch session from database:', error);
    }

    // Update player connection status in database
    if (session) {
      try {
        await this.db.updatePlayerConnection(uuid, session.id, false);
      } catch (error) {
        console.error('Failed to update player connection status:', error);
      }
    }

    // Handle host disconnection
    if (room.host === uuid) {
      console.log(
        `👑 Host left room ${connection.room}, attempting automatic transfer`,
      );
      const newHost = this.selectNewHost(room, uuid);

      if (newHost && session) {
        // Transfer host to another player
        room.host = newHost;
        room.coHosts.delete(uuid);

        try {
          await this.db.transferPrimaryHost(session.id, newHost);
        } catch (error) {
          console.error('Failed to transfer host in database:', error);
        }

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

        room.lastActivity = Date.now();
      } else {
        // No suitable replacement - hibernate the room
        console.log(
          `🏠 No suitable host found, hibernating room: ${connection.room}`,
        );
        this.hibernateRoom(connection.room);

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
      // Regular player disconnection
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

  /**
   * Hibernates a room when the host disconnects with no replacement
   * Room enters hibernation mode for HIBERNATION_TIMEOUT before being abandoned
   * @private
   * @param {string} roomCode - Join code of the room to hibernate
   * @returns {Promise<void>}
   */
  private async hibernateRoom(roomCode: string): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (!room || room.status === 'hibernating') return;

    room.status = 'hibernating';
    room.lastActivity = Date.now();

    // Update session status in database
    try {
      const session = await this.db.getSessionByJoinCode(roomCode);
      if (session) {
        await this.db.updateSessionStatus(session.id, 'hibernating');
      }
    } catch (error) {
      console.error('Failed to update session status to hibernating:', error);
    }

    // Clear any existing hibernation timer
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

  /**
   * Abandons a room after hibernation timeout expires
   * Closes all connections and schedules database cleanup
   * @private
   * @param {string} roomCode - Join code of the room to abandon
   * @returns {Promise<void>}
   */
  private async abandonRoom(roomCode: string): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    console.log(`🗑️ Abandoning room: ${roomCode}`);

    // Update session status in database
    try {
      const session = await this.db.getSessionByJoinCode(roomCode);
      if (session) {
        await this.db.updateSessionStatus(session.id, 'abandoned');
      }
    } catch (error) {
      console.error('Failed to update session status to abandoned:', error);
    }

    // Clear hibernation timer
    if (room.hibernationTimer) {
      clearTimeout(room.hibernationTimer);
    }

    // Close all remaining connections
    room.connections.forEach((ws, connUuid) => {
      ws.close();
      this.connections.delete(connUuid);
    });

    // Remove room from memory
    this.rooms.delete(roomCode);

    // Schedule database cleanup after abandonment timeout
    setTimeout(async () => {
      try {
        const session = await this.db.getSessionByJoinCode(roomCode);
        if (session) {
          await this.db.deleteSession(session.id);
          console.log(
            `🗑️ Deleted abandoned session from database: ${roomCode}`,
          );
        }
      } catch (error) {
        console.error('Failed to delete session from database:', error);
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
      console.log(`🔄 Reactivating hibernated room: ${roomCode}`);
      room.status = 'active';
      room.lastActivity = Date.now();
      if (room.hibernationTimer) {
        clearTimeout(room.hibernationTimer);
        room.hibernationTimer = undefined;
      }
      this.broadcastToRoom(roomCode, {
        type: 'event',
        data: {
          name: 'session/reactivated',
          message: 'Room has been reactivated.',
          reconnectBy: _connection.id,
        },
        timestamp: Date.now(),
      });
      return true;
    }
    return room.status === 'active';
  }

  private selectNewHost(room: Room, excludeUuid?: string): string | null {
    const candidates = Array.from(room.players).filter(
      (uuid) => uuid !== excludeUuid,
    );
    if (candidates.length === 0) {
      return null;
    }
    for (const candidate of candidates) {
      if (room.coHosts.has(candidate)) {
        return candidate;
      }
    }
    return candidates[0];
  }

  private handleHostTransfer(
    fromUuid: string,
    connection: Connection,
    room: Room,
    data: { targetUserId: string },
  ) {
    if (room.host !== fromUuid) {
      this.sendError(
        connection,
        'Only the current host can transfer host privileges',
      );
      return;
    }
    const targetUserId = data.targetUserId;
    if (!targetUserId || !room.players.has(targetUserId)) {
      this.sendError(connection, 'Invalid target user for host transfer');
      return;
    }
    const oldHost = room.host;
    room.host = targetUserId;
    room.coHosts.delete(targetUserId);
    const oldHostConnection = this.connections.get(oldHost);
    const newHostConnection = this.connections.get(targetUserId);
    if (oldHostConnection) {
      oldHostConnection.user = {
        name: oldHostConnection.user?.name || 'Player',
        type: 'player',
      };
    }
    if (newHostConnection) {
      newHostConnection.user = {
        name: newHostConnection.user?.name || 'Host',
        type: 'host',
      };
    }
    console.log(
      `👑 Manual host transfer in room ${room.code}: ${oldHost} -> ${targetUserId}`,
    );
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

  private handleAddCoHost(
    fromUuid: string,
    connection: Connection,
    room: Room,
    data: { targetUserId: string },
  ) {
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
    const targetConnection = this.connections.get(targetUserId);
    if (targetConnection) {
      targetConnection.user = {
        name: targetConnection.user?.name || 'Co-Host',
        type: 'host',
      };
    }
    console.log(`👥 Added co-host in room ${room.code}: ${targetUserId}`);
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

  private handleRemoveCoHost(
    fromUuid: string,
    connection: Connection,
    room: Room,
    data: { targetUserId: string },
  ) {
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
    const targetConnection = this.connections.get(targetUserId);
    if (targetConnection) {
      targetConnection.user = {
        name: targetConnection.user?.name || 'Player',
        type: 'player',
      };
    }
    console.log(`👥 Removed co-host in room ${room.code}: ${targetUserId}`);
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

  private startHeartbeat() {
    if (this.heartbeatTimer) return;
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
    setTimeout(() => {
      if (connection.pendingPing === pingId) {
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
    connection.consecutiveMisses = 0;
    this.updateConnectionQuality(connection, responseTime);
  }

  private handleMissedPong(uuid: string) {
    const connection = this.connections.get(uuid);
    if (!connection) return;
    connection.consecutiveMisses += 1;
    connection.pendingPing = undefined;
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

  public async shutdown() {
    console.log('🛑 Shutting down Nexus server...');
    this.stopHeartbeat();
    this.rooms.forEach((room) => {
      if (room.hibernationTimer) {
        clearTimeout(room.hibernationTimer);
      }
    });
    this.connections.forEach((connection) => {
      connection.ws.close();
    });
    this.rooms.clear();
    this.connections.clear();
    try {
      await this.db.close();
      console.log('✅ Database closed');
    } catch (error) {
      console.error('Failed to close database:', error);
    }
    this.wss.close(() => {
      console.log('✅ WebSocket server closed');
    });
    this.httpServer.close(() => {
      console.log('✅ HTTP server closed');
      console.log('✅ Server shutdown complete');
    });
  }

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

const REQUIRED_PORT = process.env.PORT ? parseInt(process.env.PORT) : 5001;
console.log(`🚀 Starting WebSocket server on port ${REQUIRED_PORT}...`);
new NexusServer(REQUIRED_PORT);
