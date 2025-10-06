# Free Cloud Deployment Options for Nexus VTT

This guide covers **completely free** options for deploying Nexus VTT to test with multiple users.

---

## Option 1: Render.com (Recommended - Easiest)

**Free Tier:**
- 750 hours/month free (enough for testing)
- Automatic HTTPS
- Auto-deploys from GitHub
- Sleeps after 15 min inactivity (spins up in ~30 seconds)

### Setup Steps:

1. **Sign up at [Render.com](https://render.com)** (free GitHub login)

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub: `https://github.com/joelmale/nexus`
   - Configure:
     - **Name:** nexus-vtt
     - **Region:** Choose closest to you
     - **Branch:** main
     - **Build Command:** `npm install && npm run build && npm run build:server`
     - **Start Command:** `npm run server:start`
     - **Instance Type:** Free

3. **Add Environment Variables**
   ```
   NODE_ENV=production
   PORT=5000
   ```

4. **Deploy!**
   - Render will give you a URL like: `https://nexus-vtt.onrender.com`
   - First deploy takes 5-10 minutes

5. **Update Frontend WebSocket URL**
   - In Render dashboard, add environment variable:
     ```
     VITE_WS_URL=wss://nexus-vtt.onrender.com
     ```

**Pros:**
- ✅ Completely free
- ✅ HTTPS included
- ✅ Auto-deploys on git push
- ✅ Super easy setup

**Cons:**
- ⚠️ Sleeps after inactivity (wakes up in 30s)
- ⚠️ Limited to 750 hours/month

---

## Option 2: Railway.app (Best Performance)

**Free Tier:**
- $5 credit/month (renews monthly)
- No sleep mode
- Faster than Render
- Great WebSocket support

### Setup Steps:

1. **Sign up at [Railway.app](https://railway.app)** (GitHub login)

2. **Deploy from GitHub**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select: `joelmale/nexus`
   - Railway auto-detects it's a Node.js app

3. **Configure Service**
   - Railway creates a service automatically
   - Go to Settings → Generate Domain (gets you a `.railway.app` domain)

4. **Add Environment Variables**
   ```
   NODE_ENV=production
   PORT=${{PORT}}
   VITE_WS_URL=wss://your-app.railway.app
   ```

5. **Deploy**
   - Railway auto-deploys
   - Takes 2-3 minutes

**Pros:**
- ✅ No sleep mode
- ✅ Better performance
- ✅ Great for WebSockets
- ✅ $5/month free credit

**Cons:**
- ⚠️ Limited to $5/month usage
- ⚠️ May exceed free tier with heavy use

---

## Option 3: Fly.io (Advanced - Best for Production Testing)

**Free Tier:**
- 3 shared VMs (256MB RAM each)
- 160GB bandwidth/month
- Persistent storage
- Multiple regions

### Setup Steps:

1. **Install Fly CLI**
   ```bash
   # macOS
   brew install flyctl

   # Linux/WSL
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   flyctl auth login
   ```

3. **Create fly.toml in project root**
   ```toml
   app = "nexus-vtt"
   primary_region = "iad"

   [build]
     [build.args]
       NODE_ENV = "production"

   [env]
     PORT = "8080"
     NODE_ENV = "production"

   [http_service]
     internal_port = 8080
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
     processes = ["app"]

   [[services]]
     protocol = "tcp"
     internal_port = 8080

     [[services.ports]]
       port = 80
       handlers = ["http"]

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]

   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 256
   ```

4. **Create Dockerfile (if not exists)**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   RUN npm run build && npm run build:server
   EXPOSE 8080
   CMD ["npm", "run", "server:start"]
   ```

5. **Deploy**
   ```bash
   flyctl launch
   flyctl deploy
   ```

6. **Get URL**
   ```bash
   flyctl apps open
   ```

**Pros:**
- ✅ No sleep mode
- ✅ Multiple regions
- ✅ Better resources
- ✅ Production-grade

**Cons:**
- ⚠️ More complex setup
- ⚠️ Limited free resources

---

## Option 4: Oracle Cloud (Most Resources)

**Free Tier Forever:**
- 4 ARM CPUs + 24GB RAM (shared across VMs)
- OR 2 AMD CPUs + 1GB RAM each
- 200GB storage
- 10TB bandwidth/month

### Setup Steps:

1. **Sign up at [Oracle Cloud](https://www.oracle.com/cloud/free/)**
   - Requires credit card (not charged)
   - Get $300 credit for 30 days PLUS always-free resources

2. **Create Compute Instance**
   - Compute → Instances → Create Instance
   - **Shape:** VM.Standard.A1.Flex (ARM, free forever)
   - **CPUs:** 2 (or up to 4 total across all VMs)
   - **Memory:** 12GB (or up to 24GB total)
   - **OS:** Ubuntu 22.04
   - **Boot volume:** 50GB

3. **Configure Networking**
   - Virtual Cloud Networks → Security Lists → Default
   - Add Ingress Rules:
     - Port 80 (HTTP)
     - Port 443 (HTTPS)
     - Port 5000 (WebSocket)

4. **SSH and Install**
   ```bash
   # Connect via SSH (use provided key)
   ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP

   # Run deployment script
   curl -fsSL https://raw.githubusercontent.com/joelmale/nexus/main/scripts/deploy-oracle.sh | bash
   ```

**Pros:**
- ✅ Most generous free tier
- ✅ Always free (forever)
- ✅ Great performance
- ✅ No sleep mode

**Cons:**
- ⚠️ More setup required
- ⚠️ Requires credit card
- ⚠️ ARM architecture (may need platform-specific builds)

---

## Option 5: Netlify + Backend Hosting

**Free Tier:**
- 100GB bandwidth/month
- Automatic HTTPS
- Great for frontend

### Split Deployment:

1. **Frontend on Netlify**
   - Deploy frontend only
   - Auto-builds from GitHub

2. **Backend on Render/Railway**
   - Deploy WebSocket server separately
   - Connect frontend to backend

**Setup:**
```bash
# 1. Frontend on Netlify
# Link GitHub repo at netlify.com
# Build command: npm run build
# Publish directory: dist

# 2. Backend on Render
# See Render setup above
```

**Pros:**
- ✅ Best frontend performance
- ✅ Easy setup
- ✅ Generous bandwidth

**Cons:**
- ⚠️ Need two services
- ⚠️ Backend still needs Render/Railway

---

## Quick Comparison

| Service | Free Resources | Sleep Mode | Setup Time | Best For |
|---------|---------------|------------|------------|----------|
| **Render** | 750hrs/mo | Yes (15min) | 5 min | Quick testing |
| **Railway** | $5 credit/mo | No | 3 min | Best balance |
| **Fly.io** | 3 VMs 256MB | Auto-scale | 10 min | Production test |
| **Oracle** | 24GB RAM | Never | 30 min | Heavy usage |
| **Netlify+Render** | Split hosting | Frontend:No Backend:Yes | 10 min | Best performance |

---

## Recommended Approach (Easiest)

### For Quick Testing: Railway.app

1. Go to [Railway.app](https://railway.app)
2. Sign in with GitHub
3. New Project → Deploy from GitHub
4. Select your repo
5. Railway auto-detects and deploys
6. Get your URL from Settings → Generate Domain
7. Share with players!

**Total time: ~3 minutes** ⚡

---

## Environment Variables Template

```env
# For all platforms
NODE_ENV=production
PORT=5000  # or 8080 for Fly.io

# Update these with your actual URL
VITE_WS_URL=wss://your-app.railway.app
VITE_API_URL=https://your-app.railway.app

# Optional security
SESSION_SECRET=generate-random-string-here
```

---

## Troubleshooting Free Tier

### Render Sleep Mode
**Problem:** App goes to sleep after 15 minutes

**Solutions:**
1. Send a request every 10 minutes (use UptimeRobot.com - also free)
2. Upgrade to paid plan ($7/mo for no sleep)
3. Accept the 30-second wake-up time

### Railway Credit Limit
**Problem:** Exceeded $5 monthly credit

**Solutions:**
1. Monitor usage in dashboard
2. Optimize code to use less resources
3. Use multiple free accounts (not recommended)
4. Switch to Render for remainder of month

### Oracle Always Busy
**Problem:** Can't create ARM instances

**Solutions:**
1. Try different regions
2. Try at different times (less busy hours)
3. Use AMD instances instead (less free resources)

---

## Monitoring Your Free Tier

### Railway
- Dashboard shows credit usage
- $5/month resets on signup date

### Render
- Shows hours used out of 750
- Resets monthly

### Fly.io
- `flyctl status` shows resource usage
- Dashboard shows metrics

### Oracle
- Always free resources never expire
- Monitor usage in cloud console

---

## Next Steps

1. **Choose a platform** (Railway recommended)
2. **Deploy** (follow steps above)
3. **Test with friends**
4. **Monitor usage**
5. **Upgrade if needed**

For testing with DM + 4 players, any of these options will work fine!

---

## Cost Comparison (if you need to upgrade)

| Service | First Paid Tier |
|---------|----------------|
| Render | $7/mo (no sleep) |
| Railway | $20/mo credit |
| Fly.io | Pay as you go (~$5-10/mo) |
| Oracle | $0 (always free enough) |
| AWS Lightsail | $10/mo |

**Recommendation:** Start free on Railway, upgrade to Render $7/mo if you need 24/7 uptime.
