import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import type { AssetManifest } from '../shared/types';

// Asset categories for directory structure
const ASSET_CATEGORIES = {
  'Maps': 'Maps',
  'Tokens': 'Tokens', 
  'Art': 'Art',
  'Handouts': 'Handouts',
  'Reference': 'Reference'
};

const app = express();
const PORT = process.env.PORT || 8080;
const ASSETS_PATH = process.env.ASSETS_PATH || path.join(__dirname, '../assets');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const CACHE_MAX_AGE = parseInt(process.env.CACHE_MAX_AGE || '86400');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: false
}));

// Cache headers for static assets
const setCacheHeaders = (res: express.Response, maxAge: number = CACHE_MAX_AGE) => {
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'ETag': `"${Date.now()}"`, // Simple ETag - in production use file hash
    'Vary': 'Accept-Encoding'
  });
};

// Load manifest
let manifest: AssetManifest | null = null;
const loadManifest = () => {
  try {
    const manifestPath = path.join(ASSETS_PATH, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      console.log(`📋 Loaded manifest: ${manifest?.totalAssets} assets in ${manifest?.categories.length} categories`);
    } else {
      console.warn('⚠️  No manifest.json found. Run asset processing first.');
      manifest = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        totalAssets: 0,
        categories: [],
        assets: []
      };
    }
  } catch (error) {
    console.error('❌ Failed to load manifest:', error);
    manifest = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalAssets: 0,
      categories: [],
      assets: []
    };
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    assetsLoaded: manifest?.totalAssets || 0,
    uptime: process.uptime()
  });
});

// Manifest endpoint
app.get('/manifest.json', (req, res) => {
  if (!manifest) {
    return res.status(503).json({ error: 'Manifest not loaded' });
  }
  
  setCacheHeaders(res, 300); // Cache manifest for 5 minutes
  res.json(manifest);
});

// Asset search
app.get('/search', (req, res) => {
  if (!manifest) {
    return res.status(503).json({ error: 'Manifest not loaded' });
  }
  
  const query = req.query.q as string;
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }
  
  const lowercaseQuery = query.toLowerCase();
  const results = manifest.assets.filter(asset =>
    asset.name.toLowerCase().includes(lowercaseQuery) ||
    asset.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
  
  setCacheHeaders(res, 60); // Cache search results for 1 minute
  res.json({
    query,
    results,
    total: results.length
  });
});

// Category filter
app.get('/category/:category', (req, res) => {
  if (!manifest) {
    return res.status(503).json({ error: 'Manifest not loaded' });
  }
  
  const category = req.params.category;
  const page = parseInt(req.query.page as string) || 0;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
  
  let filteredAssets = manifest.assets;
  if (category !== 'all') {
    filteredAssets = manifest.assets.filter(asset => asset.category === category);
  }
  
  const start = page * limit;
  const end = start + limit;
  const assets = filteredAssets.slice(start, end);
  
  setCacheHeaders(res, 300); // Cache for 5 minutes
  res.json({
    category,
    page,
    limit,
    assets,
    hasMore: end < filteredAssets.length,
    total: filteredAssets.length
  });
});

// Serve static assets with caching (new structure)
Object.values(ASSET_CATEGORIES).forEach(categoryName => {
  app.use(`/${categoryName}/assets`, (req, res, next) => {
    setCacheHeaders(res);
    next();
  }, express.static(path.join(ASSETS_PATH, categoryName, 'assets')));
  
  app.use(`/${categoryName}/thumbnails`, (req, res, next) => {
    setCacheHeaders(res);
    next();
  }, express.static(path.join(ASSETS_PATH, categoryName, 'thumbnails')));
});

// Legacy support for old structure
app.use('/assets', (req, res, next) => {
  setCacheHeaders(res);
  next();
}, express.static(path.join(ASSETS_PATH, 'assets')));

app.use('/thumbnails', (req, res, next) => {
  setCacheHeaders(res);
  next();
}, express.static(path.join(ASSETS_PATH, 'thumbnails')));

// Asset info endpoint
app.get('/asset/:id', (req, res) => {
  if (!manifest) {
    return res.status(503).json({ error: 'Manifest not loaded' });
  }
  
  const asset = manifest.assets.find(a => a.id === req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  
  setCacheHeaders(res, 86400); // Cache for 24 hours
  res.json(asset);
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    availableEndpoints: [
      '/health',
      '/manifest.json',
      '/search?q=term',
      '/category/:name',
      '/asset/:id',
      '/assets/:filename',
      '/thumbnails/:filename'
    ]
  });
});

app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  console.log('🚀 Starting Nexus VTT Asset Server...');
  console.log(`📁 Assets path: ${ASSETS_PATH}`);
  
  // Load manifest
  loadManifest();
  
  // Watch for manifest changes in development
  if (process.env.NODE_ENV !== 'production') {
    const manifestPath = path.join(ASSETS_PATH, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      fs.watchFile(manifestPath, () => {
        console.log('📋 Manifest changed, reloading...');
        loadManifest();
      });
    }
  }
  
  app.listen(PORT, () => {
    console.log(`✅ Asset server running on port ${PORT}`);
    console.log(`🌐 Endpoints:`);
    console.log(`   Health:     http://localhost:${PORT}/health`);
    console.log(`   Manifest:   http://localhost:${PORT}/manifest.json`);
    console.log(`   Search:     http://localhost:${PORT}/search?q=dungeon`);
    console.log(`   Category:   http://localhost:${PORT}/category/dungeons`);
    console.log(`   Assets:     http://localhost:${PORT}/assets/`);
    console.log(`   Thumbs:     http://localhost:${PORT}/thumbnails/`);
  });
};

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
