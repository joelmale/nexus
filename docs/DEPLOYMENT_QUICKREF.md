# Deployment Quick Reference

One-page cheat sheet for deploying and managing Nexus VTT on your homelab.

## 🚀 Initial Deployment (One-Time Setup)

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

## 🔄 GitHub Auto-Deploy Setup (One-Time)

**In Portainer:**
1. Stacks → nexus → Add webhook → Copy URL

**In GitHub:**
1. Settings → Secrets → Actions → New secret
2. Name: `PORTAINER_WEBHOOK_URL`
3. Value: Webhook URL from Portainer

**Enable Permissions:**
- Settings → Actions → General
- Workflow permissions: Read and write

**Test:**
```bash
git commit -m "test" --allow-empty
git push origin main
# Watch: GitHub Actions tab + Portainer
```

## 📋 Common Commands

### Stack Management
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

### Logs
```bash
# Follow logs
docker service logs -f nexus_backend
docker service logs -f nexus_frontend

# Last N lines
docker service logs --tail 100 nexus_backend

# All logs since timestamp
docker service logs --since 2024-01-03T10:00:00 nexus_backend
```

### Scaling
```bash
# Scale services
docker service scale nexus_backend=5
docker service scale nexus_frontend=3

# Check current scale
docker service ls | grep nexus
```

### Updates
```bash
# Pull latest images
docker service update --image ghcr.io/yourusername/nexus/frontend:latest nexus_frontend
docker service update --image ghcr.io/yourusername/nexus/backend:latest nexus_backend

# Force update
docker service update --force nexus_backend

# Rollback
docker service rollback nexus_backend
```

### Database
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

## 🔍 Troubleshooting

### Service Won't Start
```bash
docker service ps nexus_backend --no-trunc
docker service logs nexus_backend
# Check: env vars, postgres readiness, image availability
```

### Can't Access App
```bash
# 1. Check DNS
nslookup app.nexusvtt.com

# 2. Test locally on swarm
curl http://localhost:3000
curl http://localhost:5000/health

# 3. Check NPM config
# NPM UI → app.nexusvtt.com → Verify forward IP

# 4. Check SSL
# NPM UI → SSL Certificates → Verify cert issued
```

### API/WebSocket Errors
```bash
# Test endpoints
curl https://app.nexusvtt.com/health
curl https://app.nexusvtt.com/api/health

# Check CORS
docker service inspect nexus_backend --format='{{json .Spec.TaskTemplate.ContainerSpec.Env}}' | grep CORS

# Update CORS
docker service update --env-add CORS_ORIGIN=https://app.nexusvtt.com nexus_backend
```

### Database Connection Issues
```bash
# Check postgres
docker service logs nexus_postgres

# Test connection from backend
docker exec -it $(docker ps -q -f name=nexus_backend) sh
apk add postgresql-client
psql -h postgres -U nexus -d nexus
```

## 🎯 Health Checks

```bash
# Frontend
curl -I https://app.nexusvtt.com
# Expected: HTTP/2 200

# Backend
curl https://app.nexusvtt.com/health
# Expected: {"status":"ok"}

# Database
docker exec $(docker ps -q -f name=nexus_postgres) pg_isready -U nexus
# Expected: accepting connections

# Redis
docker exec $(docker ps -q -f name=nexus_redis) redis-cli ping
# Expected: PONG
```

## 📊 Monitoring

```bash
# Resource usage
docker stats

# Service status
watch docker stack services nexus

# Container list
docker ps -f name=nexus

# Network inspect
docker network inspect nexus_nexus-network
```

## 🔐 Security

```bash
# Generate secrets
openssl rand -base64 32

# View environment (redact before sharing)
docker service inspect nexus_backend --format='{{json .Spec.TaskTemplate.ContainerSpec.Env}}'

# Update secret
docker service update --env-add NEW_SECRET=value nexus_backend
```

## 🗂️ File Locations

| Item | Location |
|------|----------|
| Deployment files | `/opt/nexus-vtt/` |
| Environment config | `/opt/nexus-vtt/.env.homelab` |
| Compose file | `/opt/nexus-vtt/docker/docker-compose.homelab.yml` |
| Backups | `/opt/nexus-vtt/backups/` |
| Postgres data | Docker volume: `nexus_postgres-data` |
| Redis data | Docker volume: `nexus_redis-data` |

## 📝 Environment Variables Reference

| Variable | Example | Required |
|----------|---------|----------|
| `GITHUB_REPO` | `username/nexus` | ✅ |
| `VERSION` | `latest` or `v1.0.0` | ✅ |
| `POSTGRES_PASSWORD` | `<32-char secret>` | ✅ |
| `REDIS_PASSWORD` | `<32-char secret>` | ✅ |
| `JWT_SECRET` | `<32-char secret>` | ✅ |
| `SESSION_SECRET` | `<32-char secret>` | ✅ |
| `CORS_ORIGIN` | `https://app.nexusvtt.com` | ✅ |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | ❌ |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` | ❌ |
| `DISCORD_CLIENT_ID` | `1234567890` | ❌ |
| `DISCORD_CLIENT_SECRET` | `xxx` | ❌ |

## 🔄 Deployment Workflow

```
Local Machine:
  git commit && git push origin main
    ↓
GitHub Actions:
  ✅ Build Docker images
  ✅ Push to ghcr.io
  ✅ Trigger Portainer webhook
    ↓
Portainer:
  ✅ Pull new images
  ✅ Update services (rolling)
    ↓
Docker Swarm:
  ✅ Deploy updated containers
  ✅ Health checks pass
    ↓
Nginx Proxy Manager:
  ✅ Route traffic to new containers
    ↓
Live on https://app.nexusvtt.com 🎉
```

## 🆘 Emergency Commands

```bash
# Complete restart
docker stack rm nexus && sleep 30 && docker stack deploy -c docker/docker-compose.homelab.yml nexus

# Rebuild and restart single service
docker service update --force nexus_backend

# Scale down (maintenance mode)
docker service scale nexus_backend=0 nexus_frontend=0

# Scale back up
docker service scale nexus_backend=3 nexus_frontend=2

# Remove and recreate volumes (⚠️ DATA LOSS!)
docker stack rm nexus
docker volume rm nexus_postgres-data nexus_redis-data
docker stack deploy -c docker/docker-compose.homelab.yml nexus
```

## 📞 Support Resources

- **Deployment Guide:** `docs/HOMELAB_DEPLOYMENT.md`
- **NPM Config:** `docs/NPM_CONFIGURATION.md`
- **GitHub Issues:** `https://github.com/yourusername/nexus/issues`
- **Docker Swarm:** `https://docs.docker.com/engine/swarm/`
- **NPM Docs:** `https://nginxproxymanager.com/guide/`

---

**Pro Tip:** Bookmark this page and keep it handy for quick reference during deployments!
