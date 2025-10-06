# Railway.app Setup Guide for Nexus VTT

## Quick Setup (5 minutes)

### Step 1: Deploy to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "Login" and use GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `joelmale/nexus`
5. Railway will start building automatically

### Step 2: Configure Environment Variables

In your Railway project dashboard:

1. Click on your service
2. Go to "Variables" tab
3. Add these variables:

```
NODE_ENV=production
PORT=5000
```

**Important:** Railway automatically provides a `PORT` variable, but we set it explicitly for consistency.

### Step 3: Generate Public Domain

1. In your service, go to "Settings" tab
2. Scroll to "Networking" section
3. Click "Generate Domain"
4. You'll get a URL like: `https://nexus-vtt-production.up.railway.app`

### Step 4: Update WebSocket URL (Important!)

After you get your domain, add this environment variable:

```
VITE_WS_URL=wss://your-generated-domain.railway.app
```

Replace `your-generated-domain` with your actual Railway domain.

### Step 5: Redeploy

1. Click "Deploy" to trigger a new deployment with the updated variables
2. Wait 2-3 minutes for build to complete

---

## Troubleshooting

### "Application failed to respond"

**Cause:** Server might not be listening on the correct port

**Fix:**
1. Check that `PORT=5000` is set in variables
2. Make sure server is starting correctly in logs
3. Check that your server binds to `0.0.0.0` not `localhost`

### Build fails

**Cause:** Missing dependencies or build command issues

**Fix:**
1. Check build logs for errors
2. Ensure `build:all` script exists in package.json
3. Try manually setting build command in Railway settings:
   ```
   npm install && npm run build:all
   ```

### WebSocket connection failed

**Cause:** Frontend trying to connect to wrong WebSocket URL

**Fix:**
1. Ensure `VITE_WS_URL` is set to `wss://your-domain.railway.app`
2. Note: Use `wss://` (secure WebSocket) not `ws://`
3. Redeploy after updating

### Port 1573 doesn't work

**Cause:** Railway assigns ports automatically via `$PORT` variable

**Fix:**
- Don't try to manually set port to 1573
- Use `PORT=5000` in environment variables
- Railway handles the external port mapping automatically
- Your app listens on port 5000 internally
- Railway exposes it on port 443 (HTTPS) externally

---

## Understanding Railway Networking

Railway's networking works differently than traditional hosting:

```
Internet (HTTPS/443) → Railway Proxy → Your App (PORT 5000)
```

- **External:** Users access via HTTPS (port 443)
- **Internal:** Your app runs on PORT from env variable
- **Domain:** Railway provides `*.railway.app` domain
- **SSL:** Automatic HTTPS, no configuration needed

You don't need to specify port 1573 or any specific port. Railway handles this automatically.

---

## Checking Deployment Status

### View Logs
1. Go to your service in Railway
2. Click "Deployments" tab
3. Click the latest deployment
4. View logs in real-time

### Check Health
Once deployed, check:
- **Frontend:** `https://your-app.railway.app`
- **Health:** `https://your-app.railway.app/health`
- **WebSocket:** Should connect automatically when you open the app

---

## Environment Variables Reference

Required variables:

```bash
NODE_ENV=production
PORT=5000
VITE_WS_URL=wss://your-app.railway.app
```

Optional variables (for future features):

```bash
# Database (if you add one later)
DATABASE_URL=postgresql://...

# Session secrets (generate random strings)
SESSION_SECRET=your-random-secret-here
JWT_SECRET=another-random-secret-here

# CORS (if needed)
CORS_ORIGIN=https://your-app.railway.app
```

---

## Complete Setup Checklist

- [ ] Project deployed to Railway
- [ ] Environment variables set (`NODE_ENV`, `PORT`)
- [ ] Public domain generated
- [ ] `VITE_WS_URL` set to Railway domain
- [ ] Redeployed with new variables
- [ ] Can access frontend at Railway URL
- [ ] WebSocket connects (check browser console)
- [ ] Can create and join sessions

---

## Custom Domain (Optional)

If you want to use your own domain:

1. In Railway, go to Settings → Domains
2. Click "Custom Domain"
3. Enter your domain (e.g., `nexus.yourdomain.com`)
4. Add CNAME record in your DNS:
   ```
   CNAME nexus.yourdomain.com → your-app.railway.app
   ```
5. Wait for DNS propagation (5-60 minutes)
6. Update `VITE_WS_URL` to use your custom domain
7. Redeploy

---

## Monitoring & Maintenance

### Check Resource Usage
- Railway dashboard shows CPU/Memory usage
- Free tier: $5 credit/month
- Typical usage: ~$0.50-2/month for light testing

### View Metrics
- Deployments tab shows build/deploy history
- Metrics tab shows resource usage over time

### Auto-Deploy
- Railway auto-deploys when you push to GitHub
- Disable in Settings → Auto-Deploy if needed

---

## Testing Multi-User

Once deployed:

1. **DM:** Open your Railway URL
2. **DM:** Create a session, get room code
3. **Players:** Share Railway URL + room code
4. **Players:** Join using the room code

All users should connect to the same instance automatically.

---

## Common Railway Issues

### "Service Unavailable"
- Wait 30 seconds, Railway might be starting
- Check deployment logs for errors

### "Build Failed"
- Check logs for specific error
- Ensure all dependencies are in package.json
- Try clearing cache: Redeploy with "Clear cache" option

### "WebSocket Connection Failed"
- Ensure `VITE_WS_URL` uses `wss://` not `ws://`
- Check browser console for exact error
- Verify domain matches Railway-provided domain

---

## Support

If you encounter issues:

1. Check Railway logs first
2. Check browser console (F12)
3. Verify all environment variables are set
4. Try redeploying

Railway community: [discord.gg/railway](https://discord.gg/railway)
