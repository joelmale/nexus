# Asset Server (Merged)

⚠️ **This standalone asset server has been merged into the main Nexus server.**

The asset serving functionality is now integrated into `server/index.ts` and runs on the same port as the WebSocket server (default: 5000).

## Migration Notes

The asset server is now part of the main server with these endpoints:
- `GET /manifest.json` - Asset metadata and categories
- `GET /assets/:filename` - Full resolution images
- `GET /thumbnails/:filename` - Thumbnail images (300x300)
- `GET /search?q=term` - Search assets by name/tags
- `GET /category/:name` - Get assets by category

## Configuration

Set these environment variables in the root `.env` file:
- `ASSETS_PATH` - Path to processed assets (default: ./asset-server/assets)
- `CACHE_MAX_AGE` - Cache header value in seconds (default: 86400)
- `CORS_ORIGIN` - Allowed CORS origin (default: *)

## Asset Processing

Process your map assets before starting the server:

```bash
# From project root
node scripts/process-assets.js /path/to/source/maps ./asset-server/assets
```

This creates:
- `assets/` - Optimized full images
- `thumbnails/` - 300x300 previews
- `manifest.json` - Metadata

## Usage

The assets are served automatically when you run:
```bash
npm run server:dev
# or
npm run start:all
```

Assets will be available at `http://localhost:5000/assets/`
