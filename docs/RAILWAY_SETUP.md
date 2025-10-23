# Railway.app Deployment Guide for Nexus VTT

This guide explains how to deploy Nexus VTT to Railway using the multi-container Docker setup.

## Overview

The application consists of three services on Railway:
1. **frontend** - Static Nginx server serving the React UI
2. **backend** - Node.js/Express WebSocket server
3. **postgres** - PostgreSQL database for persistence

Railway automatically builds and deploys services based on `railway.json`.

## Prerequisites

- GitHub account connected to Railway
- Your Nexus VTT repository pushed to GitHub
- OAuth credentials (Google and/or Discord) for authentication

## Deployment Steps

### Step 1: Create a New Railway Project

1. Go to [Railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `nexus` repository
4. Railway will automatically detect the `railway.json` and start deploying

### Step 2: Add PostgreSQL Database

1. In your Railway project dashboard, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway creates a new database service with a `DATABASE_URL` connection string

### Step 3: Configure Backend Environment Variables

Navigate to your **backend** service → **Variables** tab and add:

**Required Variables:**
```
DATABASE_URL=${postgres.DATABASE_URL}
SESSION_SECRET=<generate-a-random-secret>
PORT=${{RAILWAY_PORT}}
NODE_ENV=production
```

**OAuth Configuration (Google):**
```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

**OAuth Configuration (Discord):**
```
DISCORD_CLIENT_ID=<your-discord-client-id>
DISCORD_CLIENT_SECRET=<your-discord-client-secret>
```

**CORS and Frontend URL:**
```
CORS_ORIGIN=https://<your-frontend-domain>.up.railway.app
FRONTEND_URL=https://<your-frontend-domain>.up.railway.app
```

> **Note:** The `DATABASE_URL` variable reference (`${postgres.DATABASE_URL}`) will automatically link to your PostgreSQL service.

### Step 4: Configure Frontend Environment Variables

Navigate to your **frontend** service → **Variables** tab and add:

```
VITE_WS_PORT=443
VITE_ASSET_SERVER_URL=https://<your-backend-domain>.up.railway.app
```

> **Important:** Replace `<your-backend-domain>` with the actual domain Railway assigns to your backend service. You can find this in the backend service **Settings** → **Domains**.

### Step 5: Update OAuth Redirect URLs

**For Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to your OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://<your-backend-domain>.up.railway.app/auth/google/callback`

**For Discord OAuth:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Navigate to your application's OAuth2 settings
3. Add redirect URL:
   - `https://<your-backend-domain>.up.railway.app/auth/discord/callback`

### Step 6: Enable Public Domains

1. Go to **backend** service → **Settings** → **Networking**
2. Click **"Generate Domain"** to create a public URL
3. Go to **frontend** service → **Settings** → **Networking**
4. Click **"Generate Domain"** to create a public URL

### Step 7: Update Environment Variables with Domains

Now that you have the actual domains:

1. Update **backend** service variables:
   - `CORS_ORIGIN` → Your frontend domain
   - `FRONTEND_URL` → Your frontend domain

2. Update **frontend** service variables:
   - `VITE_ASSET_SERVER_URL` → Your backend domain

3. Redeploy both services for changes to take effect

### Step 8: Verify Deployment

1. Visit your **frontend** URL
2. Test authentication by signing in with Google or Discord
3. Create a test campaign to verify database connectivity
4. Start a game session to test WebSocket connectivity

---

## Environment Variables Reference

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `${postgres.DATABASE_URL}` |
| `SESSION_SECRET` | Secret for session encryption | Random 32+ char string |
| `PORT` | Server port (use Railway's) | `${{RAILWAY_PORT}}` |
| `NODE_ENV` | Environment mode | `production` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://nexus.up.railway.app` |
| `FRONTEND_URL` | Frontend redirect URL | `https://nexus.up.railway.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | From Google Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | From Google Console |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID | From Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret | From Discord Developer Portal |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_WS_PORT` | WebSocket port (443 for HTTPS) | `443` |
| `VITE_ASSET_SERVER_URL` | Backend server URL | `https://backend.up.railway.app` |

---

## Troubleshooting

### Backend Build Fails

**Symptom:** Backend service fails during build with TypeScript errors

**Solution:**
- Check the build logs in Railway dashboard
- Ensure all TypeScript files compile locally: `npm run build:server`
- Verify `tsconfig.server.json` is present in your repository

### Frontend Can't Connect to Backend

**Symptom:** Frontend loads but shows "Cannot connect to server"

**Solution:**
- Verify `VITE_ASSET_SERVER_URL` points to backend domain (with `https://`)
- Check `VITE_WS_PORT` is set to `443`
- Ensure backend has a public domain generated
- Check CORS settings in backend variables

### Database Connection Errors

**Symptom:** Backend crashes with "could not connect to server"

**Solution:**
- Verify `DATABASE_URL` is set correctly as `${postgres.DATABASE_URL}`
- Ensure PostgreSQL service is running (check in Railway dashboard)
- Check database service hasn't been deleted or is in sleep mode

### Authentication Redirect Fails

**Symptom:** OAuth returns "redirect_uri_mismatch" error

**Solution:**
- Verify OAuth redirect URLs match your backend domain exactly
- Check Google/Discord developer console for correct redirect URIs
- Ensure `FRONTEND_URL` is set correctly in backend variables

### 502 Bad Gateway Errors

**Symptom:** Intermittent 502 errors when accessing application

**Solution:**
- Check if services are running in Railway dashboard
- Review health check status (look for red indicators)
- Verify environment variables are correct
- Check build and deployment logs for errors

---

## Production Checklist

Before going live, ensure:

- [ ] All environment variables are configured
- [ ] OAuth redirect URLs are updated in provider consoles
- [ ] Database backups are enabled (Railway Pro plan)
- [ ] Custom domain configured (optional)
- [ ] Session secret is a strong random string (not from .env.example)
- [ ] Both services show "Active" status in Railway
- [ ] Health checks are passing (green indicators)
- [ ] Test authentication flow works end-to-end
- [ ] Test creating and joining game sessions

---

## Cost Optimization

Railway offers:
- **Hobby Plan:** $5/month with $5 usage credit
- **Pro Plan:** $20/month with $20 usage credit

**Tips to minimize costs:**
- Monitor usage in Railway dashboard
- Set up usage alerts
- Use sleep mode for dev/staging deployments
- Optimize Docker image sizes
- Consider consolidating services if possible

---

## Next Steps

- Set up monitoring and logging
- Configure custom domain (if desired)
- Enable database backups (Pro plan)
- Set up staging environment
- Configure CI/CD for automated deployments

For more help, visit [Railway Documentation](https://docs.railway.app) or the Railway Discord community.