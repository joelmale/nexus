# Adding Services Manually in Railway

If Railway only deployed one service automatically, you can manually add the missing service.

## Step-by-Step: Add Missing Service

### 1. Identify What's Already Deployed

Go to your Railway project dashboard and check which service is running:

**Backend indicators:**
- Build logs show: `tsc --project tsconfig.server.json`
- Runtime logs show: `🚀 Nexus server running on port`
- Uses `docker/backend.Dockerfile`

**Frontend indicators:**
- Build logs show: `vite build`
- Runtime logs show nginx messages
- Uses `docker/frontend.Dockerfile`

---

### 2. Add the Missing Service

#### Option A: From the Same Repository (Recommended)

1. In your Railway project, click **"+ New"** button
2. Select **"GitHub Repo"**
3. Choose the **same repository** (nexus)
4. Railway will ask how to configure it

#### Option B: Empty Service + Configuration

1. Click **"+ New"** → **"Empty Service"**
2. Name it appropriately (`frontend` or `backend`)
3. Go to **Settings**

---

### 3. Configure the New Service

Once you've added the service:

#### For Backend Service:

1. **Settings → Build:**
   - Builder: **Dockerfile**
   - Dockerfile Path: `docker/backend.Dockerfile`
   - Build Command: Leave empty (Dockerfile handles it)

2. **Settings → Deploy:**
   - Start Command: `npm run server:start`

3. **Variables tab** - Add these:
   ```
   DATABASE_URL=${postgres.DATABASE_URL}
   SESSION_SECRET=<generate-with-npm-run-railway:env>
   PORT=${{RAILWAY_PORT}}
   NODE_ENV=production
   GOOGLE_CLIENT_ID=<your-id>
   GOOGLE_CLIENT_SECRET=<your-secret>
   DISCORD_CLIENT_ID=<your-id>
   DISCORD_CLIENT_SECRET=<your-secret>
   ```
   (Will add CORS_ORIGIN and FRONTEND_URL after frontend domain is generated)

#### For Frontend Service:

1. **Settings → Build:**
   - Builder: **Dockerfile**
   - Dockerfile Path: `docker/frontend.Dockerfile`
   - Build Command: Leave empty (Dockerfile handles it)

2. **Settings → Deploy:**
   - Start Command: Leave empty (nginx starts automatically)

3. **Variables tab** - Add these:
   ```
   VITE_WS_PORT=443
   ```
   (Will add VITE_ASSET_SERVER_URL after backend domain is generated)

---

### 4. Connect to Database (Backend Only)

If you're adding the **backend** service:

1. Go to **Variables** tab
2. The `DATABASE_URL` should auto-link if you have PostgreSQL added
3. If not, click **"+ New Variable"** → **"Reference"**
4. Select your PostgreSQL database → `DATABASE_URL`

---

### 5. Generate Public Domains

For **both services**:

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the generated URL

**Important:** You'll need these URLs to update:
- Backend `CORS_ORIGIN` and `FRONTEND_URL`
- Frontend `VITE_ASSET_SERVER_URL`

---

### 6. Update Cross-Service Variables

After both services have domains:

#### Update Backend Variables:
```
CORS_ORIGIN=https://<frontend-domain>.up.railway.app
FRONTEND_URL=https://<frontend-domain>.up.railway.app
```

#### Update Frontend Variables:
```
VITE_ASSET_SERVER_URL=https://<backend-domain>.up.railway.app
```

Then **redeploy both services** for changes to take effect.

---

## Troubleshooting

### "Source not found" Error

**Problem:** Railway can't find the Dockerfile

**Solution:**
1. Make sure Dockerfile path is exactly: `docker/backend.Dockerfile` or `docker/frontend.Dockerfile`
2. Check the repository is connected correctly
3. Try using **"Deploy from GitHub repo"** instead of empty service

### Service Keeps Crashing

**Backend crashes:**
- Check DATABASE_URL is set and linked to PostgreSQL
- Verify all required environment variables are present
- Check logs for missing dependencies

**Frontend crashes:**
- Usually builds fine, check nginx logs
- Verify Dockerfile path is correct

### Can't Tell Which Service is Which

**Quick test:**
1. Click on the service
2. Go to **Deployments** → Latest deployment → **View Logs**
3. Look for these patterns:

**Backend logs:**
```
🚀 Nexus server running on port 5001
✅ Database connected
📋 Loaded manifest: X assets
```

**Frontend logs:**
```
nginx: [notice] start worker process
```

---

## Visual Guide

### Railway Dashboard Layout

```
┌─────────────────────────────────────┐
│  Your Project                       │
├─────────────────────────────────────┤
│  [+ New]   [Settings]              │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ backend  │  │ frontend │       │
│  │  Node.js │  │  nginx   │       │
│  │  Active  │  │  Active  │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌──────────┐                      │
│  │postgres  │                      │
│  │ Database │                      │
│  │  Active  │                      │
│  └──────────┘                      │
└─────────────────────────────────────┘
```

You should see **3 services total**:
- backend (Node.js app)
- frontend (nginx/static)
- postgres (database)

---

## Quick Reference

| Service | Dockerfile | Port | Logs Show |
|---------|-----------|------|-----------|
| **Backend** | `docker/backend.Dockerfile` | 5001 (internal) | "🚀 Nexus server running" |
| **Frontend** | `docker/frontend.Dockerfile` | 80 | "nginx: [notice]" |

---

## Need More Help?

- See the full setup guide: [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)
- Quick start guide: [RAILWAY_QUICK_START.md](./RAILWAY_QUICK_START.md)
