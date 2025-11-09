# Nexus VTT - Production Deployment Guide

## Quick Deployment Checklist

### 1. Configure Environment Variables in Portainer

Go to your `nexus_vtt_backend` service and set these environment variables:

#### **Required Variables**
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://nexus:password@nexus_vtt_postgres:5432/nexus

# OAuth Credentials (use your actual values from Google OAuth Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Security (generate new secure random strings!)
SESSION_SECRET=<run: openssl rand -base64 32>
JWT_SECRET=<run: openssl rand -base64 32>
```

#### **Optional Variables** (only if needed)
```bash
# Only set if you need to override defaults
# CORS_ORIGIN=https://app.nexusvtt.com
# DISCORD_CLIENT_ID=...
# DISCORD_CLIENT_SECRET=...
```

> **Note:** You do NOT need to set `FRONTEND_URL`, `GOOGLE_CALLBACK_URL`, or `DISCORD_CALLBACK_URL` anymore! The app now uses relative paths automatically when `NODE_ENV=production`.

---

### 2. Configure Google OAuth Console

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   https://app.nexusvtt.com/auth/google/callback
   ```
4. Save changes

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

---

## Environment Variable Reference

See `.env.production.template` for full reference with comments.

### Minimal Production Config
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://nexus:password@nexus_vtt_postgres:5432/nexus
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=generate-32-char-random-string
JWT_SECRET=generate-32-char-random-string
```

That's it! No need for `FRONTEND_URL`, `GOOGLE_CALLBACK_URL`, etc. when everything is on the same domain.
