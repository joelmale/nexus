# Server Discovery System

## Overview

The frontend now automatically discovers which port the WebSocket server is running on using HTTP health checks. This solves the problem of the server starting on different ports (5000, 5001, 5002, 5003) depending on availability.

## How It Works

### Server Side

The server broadcasts its port via HTTP endpoints:

**GET /health**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "port": 5001,              // ✅ Current server port
  "wsUrl": "ws://localhost:5001",
  "rooms": 2,
  "connections": 4,
  "assetsLoaded": 150,
  "uptime": 3600
}
```

**GET /**
```json
{
  "status": "ok",
  "port": 5001,
  "wsUrl": "ws://localhost:5001",
  "rooms": 2,
  "connections": 4
}
```

### Frontend Side

**Connection Flow:**

1. **Discovery Phase** (Development only)
   ```
   Try HTTP GET http://localhost:5000/health (1 second timeout)
   Try HTTP GET http://localhost:5001/health (1 second timeout)
   Try HTTP GET http://localhost:5002/health (1 second timeout)
   Try HTTP GET http://localhost:5003/health (1 second timeout)
   ```

2. **First Successful Response**
   ```json
   {
     "status": "ok",
     "port": 5001  // ✅ Found it!
   }
   ```

3. **WebSocket Connection**
   - Connect to `ws://localhost:5001`
   - Cache port in localStorage as `nexus_ws_port: "5001"`

4. **Subsequent Connections**
   - Discovery runs again (in case server restarted)
   - Falls back to cached port if discovery fails
   - Falls back to trying all ports if both fail

## Priority Order

The frontend tries ports in this order:

1. **Discovered port** (from HTTP health check)
2. **Cached port** (from previous successful connection)
3. **Environment variable** (`VITE_WS_PORT`)
4. **Default ports** (5000, 5001, 5002, 5003)

## Console Output

### Successful Discovery
```
🔍 Discovering server via HTTP health checks...
✅ Found server on port 5001: { status: 'ok', port: 5001, ... }
🎯 Using discovered port: 5001
🔌 Attempting WebSocket connection to ws://localhost:5001...
✅ Connected to WebSocket on port 5001
```

### Discovery Failed (Fallback to Cache)
```
🔍 Discovering server via HTTP health checks...
❌ No server found via HTTP discovery
🔌 Attempting WebSocket connection to ws://localhost:5003...
✅ Connected to WebSocket on port 5003
```

## Developer Tools

### Clear Cached Port

If the server restarts on a different port and you want to force rediscovery:

**Browser Console:**
```javascript
window.webSocketService.clearCachedPort()
// ✅ Cleared cached WebSocket port - next connection will discover server
```

Then refresh the page or create a new connection.

### Check Current Connection

```javascript
window.webSocketService.isConnected()
// true or false
```

### Manual Disconnect

```javascript
window.webSocketService.disconnect()
// Manually disconnecting WebSocket
```

## Configuration

### Environment Variables

**.env file:**
```bash
# Preferred WebSocket port (will be tried first after discovery)
VITE_WS_PORT=5001

# WebSocket host (default: localhost)
VITE_WS_HOST=localhost
```

### npm Scripts

**Start server on specific port:**
```bash
npm run server:dev        # Port 5000
npm run server:dev:5001   # Port 5001
npm run server:dev:5002   # Port 5002
npm run server:dev:8080   # Port 8080
```

**Start everything with auto-port selection:**
```bash
npm run start:all
```

This script:
1. Checks which ports are available
2. Auto-selects available ports
3. Updates `.env` with selected ports
4. Starts both frontend and backend

## Production Behavior

**Discovery is disabled in production** - only the configured port is tried.

This prevents:
- Unnecessary HTTP requests
- Port scanning in production environments
- Delays from failed discovery attempts

Production uses:
1. `VITE_WS_PORT` environment variable
2. Default: `5000`

## Benefits

### ✅ Automatic Port Detection
- No manual port configuration needed
- Works even if server restarts on different port
- Handles macOS ControlCenter blocking port 5000

### ✅ Fast Connection
- Discovery happens in parallel (1 second per port max)
- Cache speeds up subsequent connections
- Fallback ensures connection even if discovery fails

### ✅ Developer Friendly
- Debug tools available in browser console
- Clear logging shows what's happening
- Easy to clear cache and force rediscovery

### ✅ Production Safe
- Discovery only runs in development
- No port scanning in production
- Single configured port in production

## Troubleshooting

### "Failed to connect to WebSocket on any available port"

**Possible causes:**
1. Server is not running
2. Server is running on non-standard port
3. Firewall blocking connections

**Solutions:**
```bash
# Check if server is running
lsof -i :5000
lsof -i :5001
lsof -i :5002
lsof -i :5003

# Start server
npm run server:dev

# Or start everything
npm run start:all
```

### Discovery finds wrong server

If you have multiple Node servers running:

```bash
# Check what's on each port
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health

# Kill unwanted servers
lsof -ti:5000 | xargs kill
```

### Cache issues

```javascript
// In browser console
window.webSocketService.clearCachedPort()
localStorage.clear()
location.reload()
```

## Future Enhancements

Possible improvements:

1. **UDP Broadcast Discovery**
   - Server broadcasts its port via UDP multicast
   - Faster than HTTP polling
   - No need to try multiple ports

2. **mDNS/Bonjour**
   - Auto-discovery via local network service discovery
   - Works across machines on same network
   - Standard protocol for service discovery

3. **Configuration API**
   - Persistent server port assignment
   - Admin panel for port management
   - Database-backed configuration

4. **Health Check Caching**
   - Cache health check results for 30 seconds
   - Reduce duplicate HTTP requests
   - Background refresh

## Related Files

- `server/index.ts:88-111` - Health endpoints
- `src/utils/websocket.ts:28-57` - Discovery logic
- `src/utils/websocket.ts:59-140` - Connection with fallback
- `scripts/start-all.js` - Port auto-selection script
