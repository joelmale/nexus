# Asset Server

A lightweight HTTP server for serving map assets to Nexus VTT.

## Features

- **Static asset serving** with efficient caching headers
- **Manifest API** for asset metadata and search
- **Thumbnail generation** for fast browsing
- **Category filtering** and search functionality
- **CORS support** for cross-origin requests
- **Docker-ready** with volume mounting

## Quick Start

```bash
# Development
cd asset-server
npm install
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

- `GET /manifest.json` - Asset metadata and categories
- `GET /assets/:filename` - Full resolution images
- `GET /thumbnails/:filename` - Thumbnail images (300x300)
- `GET /search?q=term` - Search assets by name/tags
- `GET /category/:name` - Get assets by category

## Asset Processing

Process your map assets before starting the server:

```bash
# Process assets from your external drive
node ../scripts/process-assets.js /Volumes/PS2000w/DnD_Assets/maps ./assets

# This creates:
# - assets/ (optimized full images)  
# - thumbnails/ (300x300 previews)
# - manifest.json (metadata)
```

## Docker Usage

```bash
# Build and run with docker-compose (from project root)
docker-compose up asset-server

# Or standalone
docker build -f docker/assets.Dockerfile -t nexus-assets .
docker run -p 8080:8080 -v /path/to/your/maps:/app/source-assets nexus-assets
```

## Configuration

Environment variables:

- `PORT` - Server port (default: 8080)
- `ASSETS_PATH` - Path to processed assets (default: ./assets)
- `CORS_ORIGIN` - Allowed CORS origin (default: *)
- `CACHE_MAX_AGE` - Cache header value (default: 86400)
