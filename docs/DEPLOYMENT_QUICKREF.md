# Deployment Quick Reference

One-page cheat sheet for deploying and managing Nexus VTT on your homelab using Portainer.

## 🚀 Initial Deployment (One-Time Setup)

### Method 1: Portainer GUI (Recommended)

**Prerequisites:**
- Portainer installed and accessible (e.g., `https://portainer.yourdomain.com`)
- Docker Swarm initialized
- Domain pointing to your server (e.g., `app.nexusvtt.com`)

**Steps:**

1. **Navigate to Portainer**
   - Open Portainer UI in browser
   - Select your Swarm environment (usually "primary")

2. **Create New Stack**
   - Sidebar → **Stacks** → **Add stack** button
   - Name: `nexus`
   - Build method: **Git Repository**

3. **Configure Git Repository**
   - Repository URL: `https://github.com/yourusername/nexus`
   - Repository reference: `refs/heads/main`
   - Compose path: `docker/docker-compose.homelab.yml`

4. **Set Environment Variables**
   Click "Add environment variable" for each:

   ```
   GITHUB_REPO=yourusername/nexus
   VERSION=latest
   POSTGRES_PASSWORD=<generate with: openssl rand -base64 32>
   POSTGRES_USER=nexus
   POSTGRES_DB=nexus
   REDIS_PASSWORD=<generate with: openssl rand -base64 32>
   JWT_SECRET=<generate with: openssl rand -base64 32>
   SESSION_SECRET=<generate with: openssl rand -base64 32>
   CORS_ORIGIN=https://app.nexusvtt.com
   ```

   **Optional (for OAuth):**
   ```
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxx
   DISCORD_CLIENT_ID=1234567890
   DISCORD_CLIENT_SECRET=xxx
   ```

5. **Deploy Stack**
   - Scroll down → Click **Deploy the stack**
   - Wait for services to start (watch progress in Portainer)

6. **Verify Deployment**
   - Stacks → nexus → Should show 5 services running (green indicators)
   - Click each service to check logs and status

### Method 2: CLI (Alternative)

```bash
# 1. On Swarm Manager
ssh user@swarm-manager-ip
sudo mkdir -p /opt/nexus-vtt && cd /opt/nexus-vtt
git clone https://github.com/yourusername/nexus.git .

# 2. Configure Environment
cp .env.homelab.example .env.homelab
nano .env.homelab  # Fill in: GITHUB_REPO, passwords, secrets

# 3. Deploy Stack
export $(cat .env.homelab | xargs)
docker stack deploy -c docker/docker-compose.homelab.yml nexus

# 4. Verify
docker stack services nexus
docker service logs nexus_backend -f
```

---

## 🌐 Nginx Proxy Manager Setup (One-Time)

**Create Proxy Host:**
- Domain: `app.nexusvtt.com`
- Forward to: `swarm-manager-ip:3000`
- SSL: Request Let's Encrypt cert
- Advanced tab: Add `/api`, `/auth`, `/ws` location blocks

**Advanced Config Template:**
```nginx
location / { proxy_pass http://SWARM_IP:3000; }
location ~ ^/(api|auth|health) { proxy_pass http://SWARM_IP:5000; }
location /ws {
    proxy_pass http://SWARM_IP:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

---

## 🔄 GitHub Auto-Deploy Setup (One-Time)

### Step 1: Create Webhook in Portainer

1. **Open Portainer** → **Stacks** → Click on **nexus** stack
2. Find **Webhook** section (near top of stack details)
3. Click **Add a webhook** (or webhook icon)
4. Copy the generated webhook URL (looks like: `https://portainer.yourdomain.com/api/webhooks/abc123...`)

### Step 2: Add Webhook to GitHub Secrets

1. **Go to GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `PORTAINER_WEBHOOK_URL`
4. Value: Paste the webhook URL from Portainer
5. Click **Add secret**

### Step 3: Enable GitHub Actions Permissions

1. **Settings** → **Actions** → **General**
2. **Workflow permissions** → Select **Read and write permissions**
3. **Save**

### Step 4: Test Auto-Deploy

```bash
# Make an empty commit to trigger deployment
git commit -m "test: trigger auto-deploy" --allow-empty
git push origin main
```

**Watch the deployment:**
- GitHub: **Actions** tab → See workflow running
- Portainer: **Stacks** → **nexus** → Services updating (yellow → green)

---

## 🖥️ Portainer GUI Management

### Viewing Stack Status

**Navigation:** Portainer → Stacks → nexus

**What you see:**
- **Services:** List of all 5 services (frontend, backend, postgres, redis, traefik)
- **Status indicators:**
  - 🟢 Green: Running normally (e.g., 2/2 replicas)
  - 🟡 Yellow: Updating/deploying
  - 🔴 Red: Failed/error state
  - ⚪ Gray: Stopped

### Viewing Service Logs

1. **Stacks** → **nexus**
2. Click on a service name (e.g., **nexus_backend**)
3. Click **Logs** tab
4. Options:
   - **Auto-refresh:** Toggle for live log streaming
   - **Lines:** Select how many lines to show (100, 500, 1000, all)
   - **Download:** Save logs to file
   - **Search:** Filter logs by keyword

**Tip:** Open logs in multiple browser tabs to monitor frontend + backend simultaneously.

### Scaling Services

**Via Portainer GUI:**
1. **Stacks** → **nexus** → Click service (e.g., **nexus_backend**)
2. Click **Scale** button (or edit icon)
3. Adjust **Replicas** number (e.g., 3 → 5)
4. Click **Apply** or **Scale**
5. Watch as new replicas start (status changes)

**Quick scale buttons may show:** ➖ (scale down) | Current: 3 | ➕ (scale up)

### Manual Update/Redeploy

**When to use:** Force pull latest images without waiting for GitHub Actions

1. **Stacks** → **nexus**
2. Click **Pull and redeploy** button (or **Update** button)
3. Select update options:
   - **Pull latest images:** Check this
   - **Prune old versions:** Optional (saves disk space)
4. Click **Update stack**
5. Watch services restart with new images

### Inspecting Containers

1. **Stacks** → **nexus** → Click service
2. Click on a specific container/task (e.g., **nexus_backend.1**)
3. Tabs available:
   - **Stats:** CPU, memory, network I/O (real-time graphs)
   - **Logs:** Container-specific logs
   - **Inspect:** Raw JSON configuration
   - **Console:** Attach shell to container
   - **Exec Console:** Run commands inside container

### Managing Volumes

**Navigation:** Portainer → Volumes

**Nexus volumes:**
- `nexus_postgres-data` - PostgreSQL database files
- `nexus_redis-data` - Redis cache data

**Actions:**
- **Browse:** View files inside volume
- **Download:** Backup volume as tar.gz
- **Upload:** Restore files to volume (⚠️ USE WITH CAUTION)

### Network Inspection

**Navigation:** Portainer → Networks → `nexus_nexus-network`

**See:**
- Connected services
- IP address assignments
- Network driver (overlay for Swarm)

---

## 📋 Common Operations

### Stack Management

**Portainer GUI:**
- **Deploy/Update:** Stacks → nexus → **Pull and redeploy** button
- **Stop All Services:** Stacks → nexus → **Stop** button
- **Start All Services:** Stacks → nexus → **Start** button
- **Remove Stack:** Stacks → nexus → **Delete this stack** (⚠️ DATA LOSS if volumes removed)

**CLI Alternative:**
```bash
# Deploy/Update stack
docker stack deploy -c docker/docker-compose.homelab.yml nexus

# Remove stack
docker stack rm nexus

# List services
docker stack services nexus

# Service details
docker service ps nexus_backend --no-trunc
```

### Viewing Logs

**Portainer GUI:**
- Stacks → nexus → [service name] → **Logs** tab
- Toggle **Auto-refresh** for live streaming
- Use **Search** box to filter log lines

**CLI Alternative:**
```bash
# Follow logs
docker service logs -f nexus_backend
docker service logs -f nexus_frontend

# Last N lines
docker service logs --tail 100 nexus_backend

# Logs since timestamp
docker service logs --since 2024-01-03T10:00:00 nexus_backend
```

### Scaling Services

**Portainer GUI:**
- Stacks → nexus → [service] → **Scale** button
- Adjust replica count → **Apply**

**CLI Alternative:**
```bash
# Scale services
docker service scale nexus_backend=5
docker service scale nexus_frontend=3

# Check current scale
docker service ls | grep nexus
```

### Service Updates

**Portainer GUI:**
- Stacks → nexus → **Pull and redeploy** (updates all services)
- OR: Single service → **Update service** → Change image tag

**CLI Alternative:**
```bash
# Pull latest images
docker service update --image ghcr.io/yourusername/nexus/frontend:latest nexus_frontend
docker service update --image ghcr.io/yourusername/nexus/backend:latest nexus_backend

# Force update (no image change)
docker service update --force nexus_backend

# Rollback to previous version
docker service rollback nexus_backend
```

### Database Operations

**Portainer GUI:**
- **Backup:** Volumes → `nexus_postgres-data` → **Download**
- **Console access:** Stacks → nexus → nexus_postgres → Container → **Exec Console**
  - Shell: `/bin/bash`
  - Connect → Run: `psql -U nexus nexus`

**CLI Alternative:**
```bash
# Backup
CONTAINER=$(docker ps -q -f name=nexus_postgres)
docker exec $CONTAINER pg_dump -U nexus nexus | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
docker cp backup.sql.gz $CONTAINER:/tmp/
docker exec -it $CONTAINER bash
gunzip /tmp/backup.sql.gz
psql -U nexus nexus < /tmp/backup.sql

# Access psql
docker exec -it $(docker ps -q -f name=nexus_postgres) psql -U nexus nexus
```

---

## 🔍 Troubleshooting

### Service Won't Start (Red Status in Portainer)

**Portainer GUI:**
1. Stacks → nexus → Click failing service
2. Check **Logs** tab for error messages
3. Check **Tasks** or **Containers** list - hover over red icon for error details
4. Common issues:
   - Missing environment variables
   - Database not ready (wait 30s and retry)
   - Image pull failures (check network/credentials)

**CLI Alternative:**
```bash
docker service ps nexus_backend --no-trunc
docker service logs nexus_backend
```

### Can't Access App

**Steps:**
1. **Check DNS:**
   ```bash
   nslookup app.nexusvtt.com
   # Should return your server IP
   ```

2. **Test Locally (Portainer Console):**
   - Stacks → nexus → nexus_backend → Container → **Exec Console**
   - Run: `curl http://localhost:5000/health`
   - Should return: `{"status":"ok"}`

3. **Check NPM Config:**
   - NPM UI → Proxy Hosts → app.nexusvtt.com
   - Verify forward IP points to swarm manager
   - Check SSL certificate is issued and valid

4. **Check Service Ports (Portainer):**
   - Stacks → nexus → Service details
   - Verify Published Ports match NPM configuration:
     - Frontend: 3000
     - Backend: 5000

### API/WebSocket Errors

**Test endpoints:**
```bash
curl https://app.nexusvtt.com/health
curl https://app.nexusvtt.com/api/health
```

**Check CORS (Portainer):**
1. Stacks → nexus → nexus_backend → **Environment variables** section
2. Verify `CORS_ORIGIN=https://app.nexusvtt.com`

**Update CORS (Portainer):**
1. Stacks → nexus → nexus_backend → **Update service**
2. Environment variables → Add/edit `CORS_ORIGIN`
3. **Update service**

**CLI Alternative:**
```bash
docker service update --env-add CORS_ORIGIN=https://app.nexusvtt.com nexus_backend
```

### Database Connection Issues

**Portainer GUI:**
1. **Check Postgres Logs:** Stacks → nexus → nexus_postgres → Logs
2. **Test Connection from Backend:**
   - nexus_backend → Container → **Exec Console**
   - Run:
     ```sh
     apk add postgresql-client
     psql -h postgres -U nexus -d nexus
     ```
3. **Check Network:** Networks → nexus_nexus-network → Verify both postgres and backend connected

**CLI Alternative:**
```bash
docker service logs nexus_postgres
docker exec -it $(docker ps -q -f name=nexus_backend) sh
psql -h postgres -U nexus -d nexus
```

---

## 🎯 Health Checks

**Portainer Quick Check:**
- Stacks → nexus → All services should show green 🟢 with correct replica count (e.g., 2/2, 3/3)

**Detailed Checks:**

**Frontend:**
```bash
curl -I https://app.nexusvtt.com
# Expected: HTTP/2 200
```
*Portainer: nexus_frontend → Logs should show "Server running on port 80"*

**Backend:**
```bash
curl https://app.nexusvtt.com/health
# Expected: {"status":"ok"}
```
*Portainer: nexus_backend → Logs should show "Server listening on port 5000"*

**Database:**
```bash
docker exec $(docker ps -q -f name=nexus_postgres) pg_isready -U nexus
# Expected: accepting connections
```
*Portainer: nexus_postgres → Logs should show "database system is ready to accept connections"*

**Redis:**
```bash
docker exec $(docker ps -q -f name=nexus_redis) redis-cli ping
# Expected: PONG
```
*Portainer: nexus_redis → Logs should show "Ready to accept connections"*

---

## 📊 Monitoring

### Portainer Dashboard

**Real-time Stack Monitoring:**
- **Home** → Environment → Click your Swarm
- See cluster-wide stats: CPU, memory, running containers
- Quick glance at all stacks and their health

**Stack-Specific Monitoring:**
- Stacks → nexus
- Overview shows: Service count, running tasks, update status
- Click any service for detailed metrics

**Service Resource Usage:**
- Stacks → nexus → [service] → Container → **Stats** tab
- Real-time graphs: CPU %, Memory MB, Network I/O
- Useful for identifying resource bottlenecks

**Container Metrics:**
- Live updating graphs per container
- Historical data (if Portainer analytics enabled)
- Set alerts for high resource usage (Portainer Business Edition)

### CLI Monitoring

```bash
# Resource usage (all containers)
docker stats

# Service status (watch mode)
watch docker stack services nexus

# Container list
docker ps -f name=nexus

# Network inspect
docker network inspect nexus_nexus-network
```

---

## 🔐 Security

### Managing Secrets

**Update Environment Variable (Portainer):**
1. Stacks → nexus → **Editor** tab
2. Scroll to **Environment variables** section
3. Edit value (e.g., change JWT_SECRET)
4. **Update the stack** button
5. Services automatically restart with new secrets

**Generate New Secrets:**
```bash
# Generate secure random strings
openssl rand -base64 32
```

**View Current Environment (Portainer):**
- Stacks → nexus → Service → **Environment** section
- ⚠️ Secrets are visible here - be careful who has access

**CLI Alternative:**
```bash
# View environment (redact before sharing)
docker service inspect nexus_backend --format='{{json .Spec.TaskTemplate.ContainerSpec.Env}}'

# Update secret
docker service update --env-add NEW_SECRET=value nexus_backend
```

---

## 🗂️ File Locations

| Item | Location |
|------|----------|
| Portainer Stack Config | Portainer → Stacks → nexus → **Editor** tab |
| Docker Compose File | `docker/docker-compose.homelab.yml` (in GitHub repo) |
| Environment Variables | Stored in Portainer stack configuration |
| Webhook URL | Portainer → Stacks → nexus → **Webhooks** section |
| Deployment files (if using CLI) | `/opt/nexus-vtt/` on Swarm manager |
| Postgres data | Docker volume: `nexus_postgres-data` |
| Redis data | Docker volume: `nexus_redis-data` |
| Portainer data | Docker volume: `portainer_data` |

---

## 🔄 Deployment Workflow

```
Local Machine:
  git commit && git push origin main
    ↓
GitHub Actions:
  ✅ Build Docker images (frontend + backend)
  ✅ Push to ghcr.io (GitHub Container Registry)
  ✅ Trigger Portainer webhook
    ↓
Portainer: 📊 WATCH HERE IN GUI
  ✅ Receive webhook (visible in Portainer events)
  ✅ Pull new images from ghcr.io
  ✅ Update services (rolling, 1 replica at a time)
  ✅ Services turn yellow 🟡 during update
  ✅ Health checks pass → Services turn green 🟢
    ↓
Docker Swarm:
  ✅ Deploy updated containers
  ✅ Old containers terminated gracefully
    ↓
Nginx Proxy Manager:
  ✅ Route traffic to healthy containers
  ✅ Zero-downtime deployment
    ↓
Live on https://app.nexusvtt.com 🎉
```

**Monitoring Deployment in Portainer:**
1. After `git push`, open: Stacks → nexus
2. Watch service status icons change: 🟢 → 🟡 → 🟢
3. Click any service to see logs during update
4. Typical deployment time: 2-5 minutes

---

## 🗺️ GUI vs CLI: When to Use Each

### Use Portainer GUI When:

✅ **Learning the system** - Visual feedback helps understanding
✅ **Monitoring in real-time** - Live logs, stats, status indicators
✅ **Quick one-off changes** - Scale service, view logs, restart container
✅ **Troubleshooting** - Inspect container, check environment, view network
✅ **Team collaboration** - Multiple users can access same interface
✅ **Infrequent operations** - Don't need to remember CLI syntax

### Use CLI When:

✅ **Scripting/automation** - Integrate with other tools, cron jobs
✅ **Batch operations** - Update multiple services at once
✅ **Remote management** - SSH is often lighter than web UI
✅ **No GUI access** - Headless servers, restricted networks
✅ **Advanced operations** - Complex docker commands, debugging
✅ **Personal preference** - CLI power users may be faster

### Example Scenarios:

| Task | Best Method | Why |
|------|-------------|-----|
| First-time deployment | **GUI** | Easier to configure environment variables |
| Checking if services are healthy | **GUI** | Visual status indicators at a glance |
| Viewing live logs during troubleshooting | **GUI** | Auto-refresh and search features |
| Scaling backend from 3 to 5 replicas | **GUI** | Click button, done in 5 seconds |
| Creating automated backup script | **CLI** | Scriptable, runs in cron |
| Updating 10 environment variables | **GUI** | Form-based editing is clearer |
| Accessing database console | **Either** | GUI has built-in console, CLI is direct |
| Emergency rollback at 3am | **CLI** | Faster if you're already in terminal |

**Pro Tip:** Use both! GUI for daily monitoring, CLI for scripts and automation.

---

## 🆘 Emergency Commands

### Complete Restart

**Portainer GUI:**
1. Stacks → nexus → **Stop stack** → Wait 30 seconds
2. **Start stack** → Wait for all services to turn green 🟢

**CLI Alternative:**
```bash
docker stack rm nexus && sleep 30 && docker stack deploy -c docker/docker-compose.homelab.yml nexus
```

### Rebuild Single Service

**Portainer GUI:**
1. Stacks → nexus → [service name]
2. **Update service** → Check **Force update**
3. **Update service** button

**CLI Alternative:**
```bash
docker service update --force nexus_backend
```

### Maintenance Mode (Scale Down)

**Portainer GUI:**
1. Stacks → nexus → nexus_backend → **Scale** → Set to 0
2. Stacks → nexus → nexus_frontend → **Scale** → Set to 0

**CLI Alternative:**
```bash
docker service scale nexus_backend=0 nexus_frontend=0
```

### Exit Maintenance Mode (Scale Up)

**Portainer GUI:**
1. Restore original replica counts via **Scale** button
   - Backend: 3 replicas
   - Frontend: 2 replicas

**CLI Alternative:**
```bash
docker service scale nexus_backend=3 nexus_frontend=2
```

### Nuclear Option: Reset Everything (⚠️ DATA LOSS!)

**Portainer GUI:**
1. Stacks → nexus → **Delete this stack**
2. Check **Automatically remove the stack's volumes**
3. Confirm deletion
4. Redeploy using "Initial Deployment" steps

**CLI Alternative:**
```bash
docker stack rm nexus
docker volume rm nexus_postgres-data nexus_redis-data
docker stack deploy -c docker/docker-compose.homelab.yml nexus
```

---

## 📝 Environment Variables Reference

Configure these in: **Portainer → Stacks → nexus → Editor → Environment variables**

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `GITHUB_REPO` | `username/nexus` | ✅ | Your GitHub repo path |
| `VERSION` | `latest` or `v1.0.0` | ✅ | Image tag to deploy |
| `POSTGRES_PASSWORD` | `<32-char secret>` | ✅ | Generate with `openssl rand -base64 32` |
| `POSTGRES_USER` | `nexus` | ✅ | Database username |
| `POSTGRES_DB` | `nexus` | ✅ | Database name |
| `REDIS_PASSWORD` | `<32-char secret>` | ✅ | Generate with `openssl rand -base64 32` |
| `JWT_SECRET` | `<32-char secret>` | ✅ | Generate with `openssl rand -base64 32` |
| `SESSION_SECRET` | `<32-char secret>` | ✅ | Generate with `openssl rand -base64 32` |
| `CORS_ORIGIN` | `https://app.nexusvtt.com` | ✅ | Your public domain |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | ❌ | For Google OAuth login |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` | ❌ | For Google OAuth login |
| `DISCORD_CLIENT_ID` | `1234567890` | ❌ | For Discord OAuth login |
| `DISCORD_CLIENT_SECRET` | `xxx` | ❌ | For Discord OAuth login |

**Tip:** Copy these to a password manager before deploying!

---

## 📞 Support Resources

- **Full Deployment Guide:** `docs/HOMELAB_DEPLOYMENT.md`
- **NPM Configuration:** `docs/NPM_CONFIGURATION.md`
- **Portainer Documentation:** https://docs.portainer.io/
- **Docker Swarm Docs:** https://docs.docker.com/engine/swarm/
- **NPM Docs:** https://nginxproxymanager.com/guide/
- **GitHub Issues:** https://github.com/yourusername/nexus/issues

---

**Pro Tips:**

💡 **Bookmark Portainer:** Set `https://portainer.yourdomain.com` as a browser bookmark for quick access

💡 **Multi-Monitor Setup:** Keep Portainer open on one screen while working on another

💡 **Mobile Access:** Portainer is mobile-responsive - monitor your deployment from your phone!

💡 **Browser Extensions:** Consider "Tab Reloader" extension to auto-refresh Portainer during deployments

💡 **Keyboard Shortcut:** Add Portainer to your OS quick launcher (Cmd+Space on Mac, Win+S on Windows)

---

**Last Updated:** 2025-01-04
