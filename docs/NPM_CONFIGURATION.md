# Nginx Proxy Manager Configuration Guide

Step-by-step guide for configuring Nginx Proxy Manager to route traffic to your Nexus VTT Docker Swarm deployment.

## Prerequisites

- ✅ Nginx Proxy Manager installed and accessible
- ✅ Docker Swarm running with Nexus stack deployed
- ✅ Domain `nexusvtt.com` pointing to your public IP
- ✅ Ports 80 and 443 forwarded to NPM host

## Service Endpoints

After deploying the stack, these services will be available:

| Service | Internal Port | Swarm Manager IP | Purpose |
|---------|--------------|------------------|---------|
| Frontend | 3000 | `swarm-manager-ip:3000` | React SPA |
| Backend | 5000 | `swarm-manager-ip:5000` | API + WebSocket |
| Assets | 8081 | `swarm-manager-ip:8081` | Static assets |

---

## 1. Frontend - `app.nexusvtt.com`

### Create Proxy Host

1. In NPM, go to **Hosts** → **Proxy Hosts** → **Add Proxy Host**

2. **Details Tab:**
   - **Domain Names:** `app.nexusvtt.com`
   - **Scheme:** `http`
   - **Forward Hostname/IP:** `swarm-manager-ip` (e.g., `192.168.1.100`)
   - **Forward Port:** `3000`
   - **Cache Assets:** ✅ Enable
   - **Block Common Exploits:** ✅ Enable
   - **Websockets Support:** ❌ Disable (not needed for frontend)

3. **SSL Tab:**
   - **SSL Certificate:** Request a new SSL Certificate
   - **Force SSL:** ✅ Enable
   - **HTTP/2 Support:** ✅ Enable
   - **HSTS Enabled:** ✅ Enable
   - **HSTS Subdomains:** ✅ Enable (if using www subdomain)
   - **Email:** Your email for Let's Encrypt
   - **I Agree to the Let's Encrypt Terms of Service:** ✅ Check

4. **Advanced Tab (Optional):**
   ```nginx
   # Custom Nginx configuration
   location / {
       proxy_pass http://swarm-manager-ip:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "no-referrer-when-downgrade" always;

       # Cache static assets
       location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

5. Click **Save**

---

## 2. Backend API - `app.nexusvtt.com/api` & `/ws`

Since NPM doesn't easily handle path-based routing within the same domain, we'll configure the backend as a **location block** within the frontend proxy host.

### Method 1: Update Frontend Proxy Host (Recommended)

1. Edit the `app.nexusvtt.com` proxy host you just created

2. Go to **Advanced Tab** and add this configuration:

   ```nginx
   # Frontend - Serve React SPA
   location / {
       proxy_pass http://swarm-manager-ip:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
   }

   # Backend API - HTTP endpoints
   location /api {
       proxy_pass http://swarm-manager-ip:5000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;

       # CORS headers (if needed)
       add_header Access-Control-Allow-Origin https://app.nexusvtt.com always;
       add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
       add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
   }

   # Backend WebSocket - Critical for real-time features
   location /ws {
       proxy_pass http://swarm-manager-ip:5000;
       proxy_http_version 1.1;

       # WebSocket headers
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;

       # WebSocket timeouts (important!)
       proxy_connect_timeout 7d;
       proxy_send_timeout 7d;
       proxy_read_timeout 7d;
   }

   # Auth endpoints
   location /auth {
       proxy_pass http://swarm-manager-ip:5000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }

   # Health check
   location /health {
       proxy_pass http://swarm-manager-ip:5000;
       access_log off;
   }
   ```

3. Click **Save**

### Method 2: Separate Subdomain (Alternative)

If you prefer a separate API subdomain (`api.nexusvtt.com`):

1. Create a new proxy host:
   - **Domain Names:** `api.nexusvtt.com`
   - **Forward Hostname/IP:** `swarm-manager-ip`
   - **Forward Port:** `5000`
   - **Websockets Support:** ✅ Enable

2. Update your frontend environment variable:
   ```
   VITE_API_URL=https://api.nexusvtt.com
   VITE_WS_URL=wss://api.nexusvtt.com/ws
   ```

---

## 3. Root Domain - `nexusvtt.com` (Optional)

Redirect root domain to app subdomain:

1. Create a new proxy host:
   - **Domain Names:** `nexusvtt.com`, `www.nexusvtt.com`
   - **Scheme:** `http`
   - **Forward Hostname/IP:** `swarm-manager-ip`
   - **Forward Port:** `3000`

2. **SSL Tab:** Request SSL for both domains

3. **Advanced Tab:**
   ```nginx
   # Redirect to app subdomain
   return 301 https://app.nexusvtt.com$request_uri;
   ```

---

**Note:** Assets are served directly by the backend server on port 5000. There is no separate asset-server service needed.

---

## Verify Configuration

### 1. Test DNS Resolution

```bash
# From your local machine
nslookup app.nexusvtt.com
# Should return your public IP
```

### 2. Test SSL Certificate

```bash
curl -I https://app.nexusvtt.com
# Should return HTTP/2 200 with valid SSL
```

### 3. Test Frontend

Open browser:
```
https://app.nexusvtt.com
```

Should load the Nexus VTT login page.

### 4. Test Backend API

```bash
curl https://app.nexusvtt.com/api/health
# Should return: {"status":"ok"}
```

### 5. Test WebSocket (Optional - Requires wscat)

```bash
# Install wscat: npm install -g wscat
wscat -c wss://app.nexusvtt.com/ws
# Should connect successfully
```

---

## Common NPM Configuration Issues

### Issue: 502 Bad Gateway

**Cause:** NPM can't reach the backend service

**Solutions:**
1. Verify swarm services are running:
   ```bash
   docker service ls | grep nexus
   ```

2. Check if ports are accessible from NPM host:
   ```bash
   curl http://swarm-manager-ip:3000
   curl http://swarm-manager-ip:5000/health
   ```

3. Verify NPM can resolve the swarm manager IP:
   ```bash
   # SSH into NPM container
   docker exec -it npm ping swarm-manager-ip
   ```

### Issue: WebSocket Connection Failed

**Cause:** WebSocket headers not configured correctly

**Solution:**
Ensure these headers are in the `/ws` location block:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Issue: SSL Certificate Not Issued

**Cause:** DNS not propagated or port 80/443 blocked

**Solutions:**
1. Verify DNS propagation:
   ```bash
   dig app.nexusvtt.com
   ```

2. Ensure ports 80 and 443 are forwarded to NPM host

3. Check NPM logs:
   - In NPM UI: **Settings** → **Logs** → **Nginx Error Log**

4. Verify email is correct in SSL certificate request

### Issue: CORS Errors

**Cause:** Backend rejecting requests from frontend

**Solution:**
Update backend `CORS_ORIGIN` environment variable:
```env
CORS_ORIGIN=https://app.nexusvtt.com,https://nexusvtt.com
```

Redeploy stack:
```bash
docker service update --env-add CORS_ORIGIN=https://app.nexusvtt.com nexus_backend
```

---

## Advanced NPM Configuration

### Rate Limiting (DDoS Protection)

Add to Advanced tab:

```nginx
# Limit requests to 100/min per IP
limit_req_zone $binary_remote_addr zone=app_limit:10m rate=100r/m;

location / {
    limit_req zone=app_limit burst=20 nodelay;
    proxy_pass http://swarm-manager-ip:3000;
    # ... rest of config
}
```

### IP Whitelisting (Admin Access)

Restrict access to specific IPs:

```nginx
# Allow only these IPs
allow 192.168.1.0/24;  # Your local network
allow 1.2.3.4;         # Your VPN IP
deny all;              # Block everyone else
```

### Custom Error Pages

```nginx
error_page 502 503 504 /50x.html;
location = /50x.html {
    root /usr/share/nginx/html;
    internal;
}
```

---

## NPM + Docker Swarm Network

### Option 1: NPM on Same Swarm (Recommended)

If NPM is running as a Docker container on the same swarm:

1. Attach NPM to the nexus overlay network:
   ```bash
   docker network connect nexus-network npm-container
   ```

2. Use service names instead of IPs in NPM:
   - Frontend: `nexus_frontend:80`
   - Backend: `nexus_backend:5000`

### Option 2: NPM on Different Host

If NPM is on a separate machine:

1. Ensure swarm ports are published (already configured in docker-compose)
2. Use swarm manager's IP address
3. Ensure firewall allows NPM host to access swarm ports (3000, 5000, 8081)

---

## Complete NPM Configuration Summary

**Minimal Setup (Single Domain):**

Create ONE proxy host in NPM:

| Field | Value |
|-------|-------|
| Domain | `app.nexusvtt.com` |
| Forward Host | `swarm-manager-ip` |
| Forward Port | `3000` |
| Websockets | ❌ Disabled |
| SSL | ✅ Enabled with Let's Encrypt |

**Advanced Configuration (in Advanced tab):**

```nginx
# Frontend
location / {
    proxy_pass http://SWARM_IP:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Backend API
location ~ ^/(api|auth|health) {
    proxy_pass http://SWARM_IP:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# WebSocket
location /ws {
    proxy_pass http://SWARM_IP:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

Replace `SWARM_IP` with your actual swarm manager IP (e.g., `192.168.1.100`).

---

**That's it!** Your Nexus VTT should now be accessible at `https://app.nexusvtt.com` with automatic SSL via Let's Encrypt.
