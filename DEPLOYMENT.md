# Nexus VTT - Production Deployment Guide

## Quick Deployment Checklist

### 1. Configure Environment Variables in Portainer

Go to your `nexus_vtt_backend` service and set these environment variables:

#### **Required Variables**
```bash
NODE_ENV=production
PORT=5000

# Database connection
# IMPORTANT: Service name is "postgres" (from docker-compose.yml), not "nexus_vtt_postgres"
# Docker Swarm handles service discovery - use the service name from the compose file
DATABASE_URL=postgresql://nexus:YOUR_POSTGRES_PASSWORD@postgres:5432/nexus
POSTGRES_DB=nexus
POSTGRES_USER=nexus
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# Redis connection
# Service name is "redis" (from docker-compose.yml)
REDIS_PASSWORD=YOUR_SECURE_REDIS_PASSWORD

# OAuth Callback URLs (MUST be absolute URLs for OAuth providers)
GOOGLE_CALLBACK_URL=https://app.nexusvtt.com/auth/google/callback
DISCORD_CALLBACK_URL=https://app.nexusvtt.com/auth/discord/callback

# OAuth Credentials (use your actual values from OAuth consoles)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Security (generate new secure random strings!)
SESSION_SECRET=<run: openssl rand -base64 32>
JWT_SECRET=<run: openssl rand -base64 32>
```

#### **Optional Variables** (only if needed)
```bash
# Only set if you need to override defaults
# CORS_ORIGIN=https://app.nexusvtt.com
```

> **Important:** `GOOGLE_CALLBACK_URL` and `DISCORD_CALLBACK_URL` **MUST** be set to absolute URLs (with https://) in production. OAuth providers require this for security.

---

### 2. Configure OAuth Providers

#### Google OAuth Console

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   https://app.nexusvtt.com/auth/google/callback
   ```
4. Save changes

#### Discord Developer Portal

1. Go to [Discord Developer Portal - Applications](https://discord.com/developers/applications)
2. Select your application (or create a new one)
3. Go to **OAuth2** section
4. Add redirect URI:
   ```
   https://app.nexusvtt.com/auth/discord/callback
   ```
5. Save changes
6. Copy your **Client ID** and **Client Secret** for the environment variables

---

### 3. Build and Push Docker Images

Run these commands from your local machine:

```bash
# Navigate to project directory
cd /Users/JoelN/Coding/nexus

# Build backend image
docker build -f docker/backend.Dockerfile -t ghcr.io/joelmale/nexus/backend:latest .

# Build frontend image
docker build -f docker/frontend.Dockerfile -t ghcr.io/joelmale/nexus/frontend:latest .

# Push to GitHub Container Registry
docker push ghcr.io/joelmale/nexus/backend:latest
docker push ghcr.io/joelmale/nexus/frontend:latest
```

---

### 4. Update Services in Portainer

1. Go to Portainer → Stacks → nexus_vtt
2. For **both** `nexus_vtt_backend` and `nexus_vtt_frontend` services:
   - Click "Update the service"
   - Enable "Pull latest image"
   - Click "Update"
3. Wait for services to restart

---

### 5. Verify Deployment

After deployment, test these:

#### WebSocket Connection
1. Go to https://app.nexusvtt.com
2. Click "Start as Guest DM"
3. Enter a name
4. Click "Create Game"
5. Should connect successfully (no "Failed to create room" error)

#### Google OAuth
1. Go to https://app.nexusvtt.com
2. Click the Login button
3. Click "Google"
4. Should redirect to Google login
5. After login, should redirect back to https://app.nexusvtt.com/dashboard

#### Check Browser Console
Open DevTools (F12) and look for:
- ✅ `Connected to WebSocket in production mode`
- ✅ No errors about "localhost"
- ✅ No "connection refused" errors

---

## What Changed (Technical Details)

### Frontend Changes
- **WebSocket**: Uses `wss://app.nexusvtt.com/ws` in production (relative path)
- **Asset Manager**: Uses relative paths like `/manifest.json` in production
- **Document Service**: Uses relative paths like `/api/documents` in production

### Backend Changes
- **Trust Proxy**: Express now trusts nginx X-Forwarded-* headers
- **Secure Cookies**: Work correctly behind HTTPS proxy
- **OAuth Redirects**: Use relative path `/dashboard` in production
- **Health Endpoints**: Return relative `/ws` path in production

### Infrastructure
- **nginx**: Proxies `/ws`, `/api`, `/auth` to `nexus_vtt_backend:5000`
- **All services on same domain**: No CORS issues, no absolute URLs needed

---

## Troubleshooting

### WebSocket connection fails
- **Check**: Browser console shows what URL it's trying to connect to
- **Expected**: `wss://app.nexusvtt.com/ws`
- **Fix**: Make sure `NODE_ENV=production` is set in backend service

### OAuth redirects to localhost
- **Check**: Network tab in DevTools, look at the redirect URL
- **Expected**: Should redirect to `/dashboard` or `https://app.nexusvtt.com/dashboard`
- **Fix**: Make sure `NODE_ENV=production` is set in backend service

### "Connection Refused" or 502 errors
- **Check**: Make sure backend service is running and healthy
- **Check**: nginx can reach `nexus_vtt_backend:5000`
- **Fix**: Check service logs in Portainer

### Session/cookies not working
- **Check**: Make sure `SESSION_SECRET` is set
- **Check**: Make sure cookies are being set (DevTools → Application → Cookies)
- **Fix**: Verify `trust proxy` is enabled (already in code)

### Google OAuth fails with "redirect_uri_mismatch"
- **Fix**: Add `https://app.nexusvtt.com/auth/google/callback` to Google OAuth Console
- **Check**: Make sure `GOOGLE_CALLBACK_URL` environment variable is set in Portainer

### Discord OAuth fails with "invalid oauth2 redirect_uri"
- **Fix**: Add `https://app.nexusvtt.com/auth/discord/callback` to Discord Developer Portal (OAuth2 section)
- **Check**: Make sure `DISCORD_CALLBACK_URL` environment variable is set in Portainer
- **Check**: URL must match exactly (including https://)

### OAuth redirects to dashboard but then back to lobby ("User not authenticated")
- **Symptom**: Console shows `GET /auth/me 401 (Unauthorized)`
- **Cause**: Session cookies not being forwarded by nginx proxy
- **Fix**: nginx config already includes cookie forwarding headers (in latest version)
- **Check**: Make sure you've deployed the latest frontend image with updated nginx.conf
- **Check**: In browser DevTools → Application → Cookies, verify `connect.sid` cookie is set for app.nexusvtt.com

### Guest DM creation fails with "Failed to create session"
- **Symptom**: WebSocket connects but server returns "Failed to create session" error
- **Cause**: Database connection failing - usually wrong service name in DATABASE_URL
- **Fix**: Make sure `DATABASE_URL` uses service name `postgres`, not `nexus_vtt_postgres`
  ```
  DATABASE_URL=postgresql://nexus:password@postgres:5432/nexus
  ```
- **Check**: Backend service logs for database connection errors
- **Check**: PostgreSQL service is running and healthy
- **Check**: `POSTGRES_PASSWORD` matches in both DATABASE_URL and postgres service

---

## Environment Variable Reference

See `.env.production.template` for full reference with comments.

### Minimal Production Config
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://nexus:password@nexus_vtt_postgres:5432/nexus

# OAuth Callback URLs (REQUIRED - absolute URLs for OAuth providers)
GOOGLE_CALLBACK_URL=https://app.nexusvtt.com/auth/google/callback
DISCORD_CALLBACK_URL=https://app.nexusvtt.com/auth/discord/callback

# OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Security
SESSION_SECRET=generate-32-char-random-string
JWT_SECRET=generate-32-char-random-string
```

**Note:** While most of the app uses relative URLs when behind nginx, OAuth providers (Google, Discord) **require absolute callback URLs** for security. Make sure these match exactly what you configured in the OAuth provider consoles.
