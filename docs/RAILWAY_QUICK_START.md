# Railway Quick Start Guide

> **Quick reference for deploying Nexus VTT to Railway**
>
> For detailed instructions, see [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)

## Prerequisites Checklist

- [ ] GitHub account connected to Railway.app
- [ ] Repository pushed to GitHub
- [ ] Google OAuth credentials (optional)
- [ ] Discord OAuth credentials (optional)

---

## Deployment Steps (5-10 minutes)

### 1️⃣ Generate Environment Variables

Run this command to generate secure secrets:

```bash
npm run railway:env
```

Keep this output handy - you'll need it in step 4.

### 2️⃣ Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `nexus` repository
4. Railway auto-detects `railway.json` and starts deployment

### 3️⃣ Add PostgreSQL Database

1. In project dashboard, click **New** → **Database** → **Add PostgreSQL**
2. Wait for database to provision (~30 seconds)

### 4️⃣ Configure Backend Variables

Navigate to **backend service** → **Variables** tab:

```env
DATABASE_URL=${postgres.DATABASE_URL}
SESSION_SECRET=<from-step-1>
PORT=${{RAILWAY_PORT}}
NODE_ENV=production
CORS_ORIGIN=https://<frontend-domain>.up.railway.app
FRONTEND_URL=https://<frontend-domain>.up.railway.app
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
DISCORD_CLIENT_ID=<your-client-id>
DISCORD_CLIENT_SECRET=<your-client-secret>
```

### 5️⃣ Configure Frontend Variables

Navigate to **frontend service** → **Variables** tab:

```env
VITE_WS_PORT=443
VITE_ASSET_SERVER_URL=https://<backend-domain>.up.railway.app
```

### 6️⃣ Generate Public Domains

For **both services**:
1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy the generated URL

### 7️⃣ Update Domain References

Go back to **Step 4** and **Step 5** and replace:
- `<frontend-domain>` with actual frontend URL
- `<backend-domain>` with actual backend URL

Then **redeploy** both services.

### 8️⃣ Update OAuth Redirects

**Google Console:**
- URL: https://console.cloud.google.com
- Add redirect: `https://<backend-domain>/auth/google/callback`

**Discord Portal:**
- URL: https://discord.com/developers
- Add redirect: `https://<backend-domain>/auth/discord/callback`

### 9️⃣ Verify Deployment

1. Visit your frontend URL
2. Test sign-in with Google/Discord
3. Create a test campaign
4. Start a game session

---

## Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend won't build | Run `npm run build:server` locally to check for errors |
| Frontend can't connect | Check `VITE_ASSET_SERVER_URL` has `https://` and correct domain |
| Database errors | Verify `DATABASE_URL` is `${postgres.DATABASE_URL}` |
| OAuth errors | Ensure redirect URLs match exactly (no trailing slashes) |
| 502 errors | Check Railway dashboard for service status and logs |

---

## Need Help?

- 📚 [Full Setup Guide](./RAILWAY_SETUP.md)
- 🚂 [Railway Docs](https://docs.railway.app)
- 💬 Railway Discord Community

---

## Summary

**Total time:** ~10 minutes
**Services:** 3 (frontend, backend, postgres)
**Cost:** Starts at $5/month (Hobby plan with $5 credit)

✅ Once deployed, your VTT will be live at `https://<frontend-domain>.up.railway.app`
