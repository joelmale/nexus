# AWS Deployment Guide for Nexus VTT

This guide covers deploying Nexus VTT to AWS for multi-user testing with DM and players.

## Deployment Options

### Option 1: AWS Lightsail (Recommended for Testing)
**Best for:** Quick setup, low cost, simple management
**Cost:** ~$5-10/month
**Setup Time:** 15-30 minutes

### Option 2: AWS EC2 + Application Load Balancer
**Best for:** Production use, auto-scaling
**Cost:** ~$20-50/month
**Setup Time:** 1-2 hours

### Option 3: AWS ECS Fargate
**Best for:** Fully managed containers, no server management
**Cost:** ~$15-30/month
**Setup Time:** 1-2 hours

---

## Option 1: AWS Lightsail (Recommended)

### Prerequisites
- AWS Account
- Domain name (optional but recommended)
- SSH client

### Step 1: Create Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com)
2. Click "Create instance"
3. Select:
   - **Platform:** Linux/Unix
   - **Blueprint:** OS Only → Ubuntu 22.04 LTS
   - **Instance Plan:** $10/month (2GB RAM, 1 vCPU) - minimum recommended
4. Name your instance: `nexus-vtt`
5. Click "Create instance"

### Step 2: Configure Networking

1. In your instance page, go to "Networking" tab
2. Add the following firewall rules:
   ```
   Application: Custom
   Protocol: TCP
   Port: 80 (HTTP)

   Application: Custom
   Protocol: TCP
   Port: 443 (HTTPS)

   Application: Custom
   Protocol: TCP
   Port: 5000 (WebSocket Server)
   ```

### Step 3: Set Up Static IP (Optional but Recommended)

1. In Lightsail, go to "Networking" → "Create static IP"
2. Attach it to your instance
3. Note the IP address

### Step 4: Connect and Install Dependencies

1. Click "Connect using SSH" in Lightsail console
2. Run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Logout and login again for docker group to take effect
exit
```

### Step 5: Clone and Deploy

SSH back in and run:

```bash
# Clone repository
git clone https://github.com/joelmale/nexus.git
cd nexus

# Create environment file
cat > .env << 'EOF'
NODE_ENV=production
VITE_WS_URL=ws://YOUR_STATIC_IP:5000
VITE_API_URL=http://YOUR_STATIC_IP
PORT=5000
EOF

# Replace YOUR_STATIC_IP with your actual IP
nano .env  # Edit the file

# Build and start services
docker-compose -f docker/docker-compose.yml up -d --build

# Check logs
docker-compose -f docker/docker-compose.yml logs -f
```

### Step 6: Access Your Application

Open browser and go to:
- Frontend: `http://YOUR_STATIC_IP`
- WebSocket: `ws://YOUR_STATIC_IP:5000`

---

## Option 2: EC2 with Load Balancer (Production)

### Step 1: Create EC2 Instance

1. Go to EC2 Console
2. Click "Launch Instance"
3. Configure:
   - **Name:** nexus-vtt-server
   - **AMI:** Ubuntu 22.04 LTS
   - **Instance Type:** t3.small (2GB RAM minimum)
   - **Key Pair:** Create new or select existing
   - **Security Group:** Create new with ports 22, 80, 443, 5000

### Step 2: Install Docker (Same as Lightsail Step 4)

### Step 3: Set Up Application Load Balancer

1. Go to EC2 → Load Balancers → Create
2. Choose Application Load Balancer
3. Configure:
   - **Scheme:** Internet-facing
   - **Listeners:** HTTP (80), HTTPS (443)
   - **Availability Zones:** Select at least 2
4. Create Target Groups:
   - **Frontend:** Port 80
   - **WebSocket:** Port 5000
5. Register your EC2 instance as target

### Step 4: Configure SSL with ACM

1. Go to AWS Certificate Manager
2. Request public certificate for your domain
3. Validate domain ownership
4. Add certificate to ALB HTTPS listener

---

## Option 3: ECS Fargate (Fully Managed)

### Step 1: Create ECR Repositories

```bash
# Create repositories for frontend and backend
aws ecr create-repository --repository-name nexus-frontend
aws ecr create-repository --repository-name nexus-backend

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

### Step 2: Build and Push Images

```bash
# Build images
docker build -f docker/frontend.Dockerfile -t nexus-frontend .
docker build -f docker/backend.Dockerfile -t nexus-backend .

# Tag images
docker tag nexus-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nexus-frontend:latest
docker tag nexus-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nexus-backend:latest

# Push images
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nexus-frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nexus-backend:latest
```

### Step 3: Create ECS Cluster

1. Go to ECS Console
2. Click "Create Cluster"
3. Choose "Networking only" (Fargate)
4. Name: `nexus-vtt-cluster`

### Step 4: Create Task Definitions

Create two task definitions (one for frontend, one for backend) with your ECR image URLs.

### Step 5: Create Services

1. In your cluster, create two services
2. Configure load balancer integration
3. Set desired count to 1 for testing

---

## Domain Setup (Optional)

### Using Route 53

1. Go to Route 53 Console
2. Create Hosted Zone for your domain
3. Create A Record pointing to:
   - Lightsail: Static IP
   - EC2/ECS: Load Balancer DNS

### SSL Certificate

1. Use AWS Certificate Manager (ACM)
2. Request certificate for your domain
3. Validate via DNS or Email
4. Attach to Load Balancer

---

## Environment Variables

Create a `.env` file with:

```env
# Production Environment
NODE_ENV=production

# Frontend URLs
VITE_WS_URL=wss://yourdomain.com
VITE_API_URL=https://yourdomain.com

# Backend Configuration
PORT=5000
HOST=0.0.0.0

# Security (generate secure random strings)
SESSION_SECRET=your-super-secret-session-key-here
JWT_SECRET=your-super-secret-jwt-key-here

# CORS (adjust for your domain)
CORS_ORIGIN=https://yourdomain.com
```

---

## Quick Start Script for Lightsail

Save this as `deploy.sh`:

```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Clone repository
git clone https://github.com/joelmale/nexus.git
cd nexus

# Create .env file
read -p "Enter your Static IP or Domain: " DOMAIN
cat > .env << EOF
NODE_ENV=production
VITE_WS_URL=ws://${DOMAIN}:5000
VITE_API_URL=http://${DOMAIN}
PORT=5000
EOF

# Start services
docker-compose -f docker/docker-compose.yml up -d --build

echo "Deployment complete!"
echo "Access your app at: http://${DOMAIN}"
```

Make executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Monitoring and Maintenance

### View Logs
```bash
# All services
docker-compose -f docker/docker-compose.yml logs -f

# Specific service
docker-compose -f docker/docker-compose.yml logs -f backend
docker-compose -f docker/docker-compose.yml logs -f frontend
```

### Restart Services
```bash
docker-compose -f docker/docker-compose.yml restart
```

### Update Application
```bash
cd nexus
git pull
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml up -d --build
```

### Check Resource Usage
```bash
docker stats
```

---

## Testing Multi-User Setup

1. **DM Access:** Open `http://YOUR_IP` and create a session
2. **Player Access:** Share the room code with players
3. **Network Test:** Have players join from different networks

### Common Issues

**WebSocket Connection Failed**
- Check firewall allows port 5000
- Verify VITE_WS_URL in .env matches your server IP/domain
- Check browser console for CORS errors

**Can't Connect to Server**
- Verify instance is running
- Check security group/firewall rules
- Ensure port 80 and 5000 are open

**Slow Performance**
- Upgrade instance size (more RAM/CPU)
- Enable browser caching
- Use CloudFront CDN for static assets

---

## Cost Estimates

### Lightsail ($10/month instance)
- Instance: $10/month
- Static IP: Free
- **Total: ~$10/month**

### EC2 + ALB
- t3.small instance: ~$15/month
- Application Load Balancer: ~$16/month
- Data transfer: ~$5/month
- **Total: ~$36/month**

### ECS Fargate
- Fargate vCPU: ~$12/month
- Fargate Memory: ~$3/month
- Load Balancer: ~$16/month
- **Total: ~$31/month**

---

## Next Steps

1. Choose your deployment option
2. Follow the setup steps
3. Configure domain (if using)
4. Test with DM and players
5. Set up monitoring/backups
6. Configure SSL for production

For questions or issues, check the logs first, then review the troubleshooting section.
