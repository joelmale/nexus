# Homelab Deployment Guide

Complete guide for deploying Nexus VTT to your Proxmox Docker Swarm cluster with Portainer and automatic GitHub deployments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [DNS Configuration](#dns-configuration)
4. [Portainer Setup](#portainer-setup)
5. [GitHub Secrets Configuration](#github-secrets-configuration)
6. [Deployment](#deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Infrastructure

- ✅ Docker Swarm cluster (2 Proxmox nodes)
- ✅ Portainer running on the swarm
- ✅ Domain: `nexusvtt.com`
- ✅ Ports 80 and 443 forwarded to swarm manager

### Software Requirements

- Docker Engine 24.0+
- Docker Compose v2
- Portainer 2.19+
- Git

---

## Initial Setup

### 1. Prepare Your Swarm Manager Node

SSH into your swarm manager node:

```bash
ssh user@your-swarm-manager-ip
```

Create the deployment directory:

```bash
sudo mkdir -p /opt/nexus-vtt
sudo chown $USER:$USER /opt/nexus-vtt
cd /opt/nexus-vtt
```

Clone the repository:

```bash
git clone https://github.com/yourusername/nexus.git .
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.homelab.example .env.homelab
```

Edit the file with your values:

```bash
nano .env.homelab
```

**Important values to configure:**

```bash
# Your GitHub username/org
GITHUB_REPO=yourusername/nexus

# Your email for Let's Encrypt SSL certificates
ACME_EMAIL=your-email@example.com

# Generate secure passwords (use: openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
```

**Save these passwords securely** - you'll need them for database access.

### 3. Initialize Docker Secrets (Optional - More Secure)

For production, use Docker secrets instead of environment variables:

```bash
# Create secrets
echo "your-postgres-password" | docker secret create postgres_password -
echo "your-redis-password" | docker secret create redis_password -
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-session-secret" | docker secret create session_secret -
```

If using secrets, modify `docker-compose.homelab.yml` to reference them.

---

## DNS Configuration

Configure your DNS records at your registrar (where you bought nexusvtt.com):

### A Records

Point these to your **public IP** (or use CNAME to your dynamic DNS):

| Record Type | Hostname | Value | TTL |
|------------|----------|-------|-----|
| A | @ | `your.public.ip` | 300 |
| A | app | `your.public.ip` | 300 |
| A | assets | `your.public.ip` | 300 |
| A | traefik | `your.public.ip` | 300 |

### Wildcard (Optional)

Alternatively, use a wildcard:

| Record Type | Hostname | Value | TTL |
|------------|----------|-------|-----|
| A | * | `your.public.ip` | 300 |

### Verify DNS Propagation

```bash
# Check from your local machine
dig app.nexusvtt.com
nslookup app.nexusvtt.com

# Should return your public IP
```

### Router/Firewall Port Forwarding

Configure port forwarding on your router:

| External Port | Internal IP | Internal Port | Protocol |
|--------------|-------------|---------------|----------|
| 80 | swarm-manager-ip | 80 | TCP |
| 443 | swarm-manager-ip | 443 | TCP |

---

## Portainer Setup

### 1. Access Portainer

Navigate to your Portainer instance:
```
https://portainer.nexusvtt.com
```

### 2. Create a Stack

1. Go to **Stacks** → **Add Stack**
2. Name: `nexus-vtt`
3. Build method: **Git Repository**

**Git Configuration:**
- Repository URL: `https://github.com/yourusername/nexus`
- Reference: `refs/heads/main`
- Compose path: `docker/docker-compose.homelab.yml`

**Environment Variables:**

Load from `.env.homelab` or add manually:

```
GITHUB_REPO=yourusername/nexus
VERSION=latest
DOMAIN=nexusvtt.com
ACME_EMAIL=your-email@example.com
POSTGRES_PASSWORD=your-postgres-password
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

4. Click **Deploy the stack**

### 3. Create Portainer Webhook

This enables GitHub to trigger automatic redeployments.

1. Navigate to **Stacks** → **nexus-vtt**
2. Scroll to **Webhooks** section
3. Click **Add a webhook**
4. Name: `github-deploy`
5. **Copy the webhook URL** - you'll need this for GitHub secrets

The URL will look like:
```
https://portainer.nexusvtt.com/api/webhooks/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 4. Create Portainer API Token (Alternative Method)

If you prefer using the Portainer API directly:

1. Go to **Account** → **Access Tokens**
2. Create a new token: `github-actions`
3. **Copy the token** - you'll need this for GitHub secrets

---

## GitHub Secrets Configuration

### 1. Navigate to Repository Settings

Go to your GitHub repository:
```
https://github.com/yourusername/nexus/settings/secrets/actions
```

### 2. Add Repository Secrets

Click **New repository secret** and add the following:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `PORTAINER_WEBHOOK_URL` | `https://portainer.nexusvtt.com/api/webhooks/xxx...` | Webhook URL from Portainer |
| `PORTAINER_URL` | `https://portainer.nexusvtt.com` | Your Portainer URL |
| `PORTAINER_API_TOKEN` | `ptr_xxx...` | API token (if using API method) |

### 3. Enable GitHub Container Registry (GHCR)

The workflow is already configured to use GHCR. No additional setup needed - it uses the automatic `GITHUB_TOKEN`.

### 4. Verify Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select: **Read and write permissions**
4. Check: **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

---

## Deployment

### Option 1: Deploy via Portainer (Manual)

1. Go to Portainer → **Stacks** → **nexus-vtt**
2. Click **Update the stack**
3. Select **Re-pull image and redeploy**
4. Click **Update**

### Option 2: Deploy via GitHub Actions (Automatic)

Simply push to the `main` branch:

```bash
git add .
git commit -m "Deploy to homelab"
git push origin main
```

The workflow will:
1. ✅ Build Docker images
2. ✅ Push to GitHub Container Registry (ghcr.io)
3. ✅ Trigger Portainer webhook
4. ✅ Portainer pulls new images and redeploys
5. ✅ Health check verifies deployment

### Option 3: Deploy via Git Tag (Versioned)

Create a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers the workflow and creates a GitHub release.

---

## Verify Deployment

### 1. Check Stack Status in Portainer

1. Go to **Stacks** → **nexus-vtt**
2. All services should be green/running

### 2. Check Service Health

```bash
# SSH into swarm manager
ssh user@swarm-manager-ip

# Check running services
docker stack services nexus

# Check service logs
docker service logs nexus_frontend -f
docker service logs nexus_backend -f
docker service logs nexus_traefik -f
```

### 3. Test Frontend Access

Open your browser:
```
https://app.nexusvtt.com
```

You should see the Nexus VTT login page.

### 4. Test Backend Health

```bash
curl https://app.nexusvtt.com/api/health
```

Should return: `{"status":"ok"}`

### 5. Verify SSL Certificate

Check that Let's Encrypt certificate was issued:

```bash
# In browser, click the padlock icon
# Certificate should be issued by "Let's Encrypt"

# Or via command line:
echo | openssl s_client -servername app.nexusvtt.com -connect app.nexusvtt.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Monitoring & Maintenance

### View Logs

**Via Portainer:**
1. Go to **Stacks** → **nexus-vtt**
2. Click on any service
3. Click **Logs** tab

**Via CLI:**

```bash
# All services
docker service logs nexus_backend
docker service logs nexus_frontend
docker service logs nexus_traefik

# Follow logs live
docker service logs -f nexus_backend

# Last 100 lines
docker service logs --tail 100 nexus_backend
```

### Scale Services

**Via Portainer:**
1. Go to **Stacks** → **nexus-vtt** → **frontend**
2. Click **Scale** tab
3. Adjust replicas

**Via CLI:**

```bash
# Scale backend to 5 replicas
docker service scale nexus_backend=5

# Scale frontend to 3 replicas
docker service scale nexus_frontend=3
```

### Update Images

**Automatic (via GitHub):**
Just push to `main` branch - the webhook handles the rest.

**Manual:**

```bash
# Pull latest images
docker service update --image ghcr.io/yourusername/nexus/frontend:latest nexus_frontend
docker service update --image ghcr.io/yourusername/nexus/backend:latest nexus_backend
```

### Database Backups

Create a backup script:

```bash
# /opt/nexus-vtt/scripts/backup-db.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/nexus-vtt/backups
mkdir -p $BACKUP_DIR

# Find postgres container
CONTAINER=$(docker ps -q -f name=nexus_postgres)

# Backup
docker exec $CONTAINER pg_dump -U nexus nexus | gzip > $BACKUP_DIR/nexus_$TIMESTAMP.sql.gz

# Keep last 30 days
find $BACKUP_DIR -name "nexus_*.sql.gz" -mtime +30 -delete

echo "Backup completed: nexus_$TIMESTAMP.sql.gz"
```

Make executable and run:

```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

**Automate with cron:**

```bash
crontab -e
# Add this line (daily at 2 AM):
0 2 * * * /opt/nexus-vtt/scripts/backup-db.sh
```

### Restore Database

```bash
# Copy backup to container
docker cp backups/nexus_20250103_020000.sql.gz $(docker ps -q -f name=nexus_postgres):/tmp/

# Restore
docker exec -it $(docker ps -q -f name=nexus_postgres) bash
gunzip /tmp/nexus_20250103_020000.sql.gz
psql -U nexus nexus < /tmp/nexus_20250103_020000.sql
```

---

## Troubleshooting

### Issue: Services Won't Start

**Check logs:**

```bash
docker service ps nexus_backend --no-trunc
docker service logs nexus_backend
```

**Common causes:**
- Missing environment variables
- Database not ready (check postgres logs)
- Image pull failed (check registry access)

### Issue: SSL Certificate Not Issued

**Check Traefik logs:**

```bash
docker service logs nexus_traefik | grep acme
```

**Common causes:**
- DNS not propagated yet (wait 5-10 minutes)
- Port 80/443 not forwarded correctly
- Email in ACME_EMAIL is invalid
- Rate limited by Let's Encrypt (5 failures per hour)

**Force certificate renewal:**

```bash
# Remove certificate data
docker volume rm nexus_traefik-certificates

# Redeploy stack
docker stack deploy -c docker/docker-compose.homelab.yml nexus
```

### Issue: Frontend Shows "API Connection Error"

**Check backend health:**

```bash
curl https://app.nexusvtt.com/api/health
```

**Verify environment variables:**

```bash
docker service inspect nexus_backend --format='{{json .Spec.TaskTemplate.ContainerSpec.Env}}'
```

**Check CORS_ORIGIN:**
Should include `https://app.nexusvtt.com`

### Issue: WebSocket Connection Fails

**Check browser console:**
Look for WebSocket errors (F12 → Console)

**Verify Traefik routing:**

```bash
# Check backend labels
docker service inspect nexus_backend --format='{{json .Spec.Labels}}'
```

**Test WebSocket endpoint:**

```bash
# Install wscat: npm install -g wscat
wscat -c wss://app.nexusvtt.com/ws
```

### Issue: Database Connection Refused

**Check postgres service:**

```bash
docker service ps nexus_postgres
docker service logs nexus_postgres
```

**Test database connection:**

```bash
# From backend container
docker exec -it $(docker ps -q -f name=nexus_backend) sh
apk add postgresql-client
psql -h postgres -U nexus -d nexus
```

### Issue: Images Not Pulling from GHCR

**Verify GitHub Package permissions:**

1. Go to package settings: `https://github.com/users/yourusername/packages/container/nexus%2Ffrontend/settings`
2. Scroll to **Manage Actions access**
3. Add repository: `yourusername/nexus` with **Read** permission

**Login to GHCR manually:**

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u yourusername --password-stdin
docker pull ghcr.io/yourusername/nexus/frontend:latest
```

### Issue: Portainer Webhook Not Working

**Test webhook manually:**

```bash
curl -X POST "https://portainer.nexusvtt.com/api/webhooks/YOUR-WEBHOOK-ID"
```

**Check GitHub Actions logs:**
- Go to **Actions** tab in GitHub
- Click on latest workflow run
- Check "Trigger Portainer Deployment" step

### Completely Reset Deployment

If you need to start fresh:

```bash
# Remove stack
docker stack rm nexus

# Wait for services to stop
sleep 30

# Remove volumes (WARNING: destroys data)
docker volume rm nexus_postgres-data
docker volume rm nexus_redis-data
docker volume rm nexus_traefik-certificates

# Redeploy
docker stack deploy -c docker/docker-compose.homelab.yml nexus
```

---

## Security Checklist

- [ ] Changed all default passwords
- [ ] Using Docker secrets for sensitive data
- [ ] Enabled Traefik dashboard authentication
- [ ] Configured database backups
- [ ] Limited Portainer access to trusted IPs
- [ ] Enabled firewall on swarm nodes
- [ ] SSL certificates auto-renewing
- [ ] Monitoring disk space usage
- [ ] Reviewed Docker image security (Snyk/Trivy)

---

## Performance Tuning

### Optimize for Small Homelab (2 nodes)

```yaml
# Reduce replicas for resource-constrained environments
frontend:
  deploy:
    replicas: 1  # Was 2

backend:
  deploy:
    replicas: 2  # Was 3
```

### Add Resource Limits

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
```

---

## Advanced: Multi-Environment Setup

You can run multiple environments (staging, production) on the same swarm:

**Staging:**
```bash
docker stack deploy -c docker/docker-compose.homelab.yml nexus-staging
```

**Production:**
```bash
docker stack deploy -c docker/docker-compose.homelab.yml nexus-prod
```

Use different domains:
- Staging: `staging.nexusvtt.com`
- Production: `app.nexusvtt.com`

---

## Support & Resources

- **GitHub Issues:** https://github.com/yourusername/nexus/issues
- **Docker Swarm Docs:** https://docs.docker.com/engine/swarm/
- **Traefik Docs:** https://doc.traefik.io/traefik/
- **Portainer Docs:** https://docs.portainer.io/

---

**Last Updated:** 2025-01-03
