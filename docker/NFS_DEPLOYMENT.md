# PostgreSQL and Redis on NFS - Deployment Guide

This docker-compose.yml now stores PostgreSQL and Redis data on your Synology NFS share at `/mnt/docker-nas-vol1/nexusvtt/`.

## Prerequisites

✅ NFS share from Synology is mounted at `/mnt/docker-nas-vol1/` on all Docker Swarm nodes
✅ NFS version 4 is being used (better locking support)
✅ All swarm nodes can access the NFS mount

## Before Deploying

### 1. Create Directories on NFS Share

SSH into your swarm manager node and run:

```bash
# Create directories for PostgreSQL and Redis
mkdir -p /mnt/docker-nas-vol1/nexusvtt/postgres
mkdir -p /mnt/docker-nas-vol1/nexusvtt/redis

# Set restrictive permissions (databases should only be accessible by service)
chmod 700 /mnt/docker-nas-vol1/nexusvtt/postgres
chmod 700 /mnt/docker-nas-vol1/nexusvtt/redis

# Verify the directories exist
ls -la /mnt/docker-nas-vol1/nexusvtt/
```

### 2. Verify NFS Mount

Ensure the NFS mount is working properly:

```bash
# Check if mount is active
mount | grep docker-nas-vol1

# Test write permissions
touch /mnt/docker-nas-vol1/nexusvtt/test.txt
rm /mnt/docker-nas-vol1/nexusvtt/test.txt
```

Expected output:
```
//your-synology-ip/docker-nas-vol1 on /mnt/docker-nas-vol1 type nfs4 (rw,...)
```

## Deployment

### Option A: Fresh Deployment (No Existing Data)

If you're deploying for the first time:

```bash
# Deploy the stack
docker stack deploy -c docker/docker-compose.yml nexus-prod

# Check that services are running
docker service ls

# Check PostgreSQL logs
docker service logs nexus-prod_postgres --tail 50

# Check Redis logs
docker service logs nexus-prod_redis --tail 50
```

### Option B: Migration from Local Volumes (Existing Data)

If you have existing data in local Docker volumes, you need to migrate it:

```bash
# 1. Stop the stack
docker stack rm nexus-prod

# Wait for services to stop
sleep 30

# 2. Find the existing volume data
docker volume ls | grep postgres
docker volume ls | grep redis

# 3. Copy data from old volumes to NFS
# For PostgreSQL:
docker run --rm \
  -v nexus-prod_postgres-data:/source:ro \
  -v /mnt/docker-nas-vol1/nexusvtt/postgres:/dest \
  alpine sh -c "cp -av /source/. /dest/"

# For Redis:
docker run --rm \
  -v nexus-prod_redis-data:/source:ro \
  -v /mnt/docker-nas-vol1/nexusvtt/redis:/dest \
  alpine sh -c "cp -av /source/. /dest/"

# 4. Verify permissions
chmod -R 700 /mnt/docker-nas-vol1/nexusvtt/postgres
chmod -R 700 /mnt/docker-nas-vol1/nexusvtt/redis

# 5. Deploy with new configuration
docker stack deploy -c docker/docker-compose.yml nexus-prod

# 6. Verify data is accessible
docker exec $(docker ps -q -f name=nexus-prod_postgres) psql -U nexus -d nexus -c "\dt"
```

## Verification

After deployment, verify everything is working:

### 1. Check Service Status

```bash
# All services should show 1/1 replicas
docker service ls

# Expected output:
# nexus-prod_postgres    replicated  1/1
# nexus-prod_redis       replicated  1/1
# nexus-prod_backend     replicated  3/3
# nexus-prod_frontend    replicated  2/2
```

### 2. Check PostgreSQL

```bash
# View PostgreSQL logs
docker service logs nexus-prod_postgres --tail 50

# Should see:
# "database system is ready to accept connections"

# Test database connection
docker exec $(docker ps -q -f name=nexus-prod_postgres) \
  psql -U nexus -d nexus -c "SELECT version();"
```

### 3. Check Redis

```bash
# View Redis logs
docker service logs nexus-prod_redis --tail 50

# Should see:
# "Ready to accept connections"

# Test Redis connection
docker exec $(docker ps -q -f name=nexus-prod_redis) \
  redis-cli -a $REDIS_PASSWORD ping
```

### 4. Check NFS Storage

```bash
# Verify data is being written to NFS
ls -lah /mnt/docker-nas-vol1/nexusvtt/postgres/
ls -lah /mnt/docker-nas-vol1/nexusvtt/redis/

# Check disk usage
du -sh /mnt/docker-nas-vol1/nexusvtt/postgres
du -sh /mnt/docker-nas-vol1/nexusvtt/redis
```

## Troubleshooting

### PostgreSQL Won't Start

**Symptom:** PostgreSQL service keeps restarting

**Check:**
```bash
# View detailed logs
docker service logs nexus-prod_postgres --tail 100

# Common issues:
# 1. Permission denied - run: chmod 700 /mnt/docker-nas-vol1/nexusvtt/postgres
# 2. NFS mount not accessible - verify mount: mount | grep docker-nas-vol1
# 3. Directory not empty - if corrupted, backup and rm -rf the directory
```

### Permission Denied Errors

**Symptom:** `permission denied` in logs

**Fix:**
```bash
# Set correct ownership (postgres runs as UID 999 typically)
chown -R 999:999 /mnt/docker-nas-vol1/nexusvtt/postgres
chmod -R 700 /mnt/docker-nas-vol1/nexusvtt/postgres
```

### NFS Connection Issues

**Symptom:** Services can't access NFS mount

**Check:**
```bash
# Verify NFS mount on all nodes
docker node ls  # List all nodes
ssh node1 "mount | grep docker-nas-vol1"
ssh node2 "mount | grep docker-nas-vol1"

# Remount if needed
umount /mnt/docker-nas-vol1
mount -t nfs4 your-synology-ip:/volume1/docker-nas-vol1 /mnt/docker-nas-vol1
```

### Database Corruption

**Symptom:** PostgreSQL reports corruption after network interruption

**Recovery:**
```bash
# 1. Stop the stack
docker stack rm nexus-prod

# 2. Backup current data
cp -r /mnt/docker-nas-vol1/nexusvtt/postgres /mnt/docker-nas-vol1/nexusvtt/postgres.backup.$(date +%Y%m%d)

# 3. Try PostgreSQL recovery
docker run --rm \
  -v /mnt/docker-nas-vol1/nexusvtt/postgres:/var/lib/postgresql/data \
  postgres:16-alpine \
  postgres --single -D /var/lib/postgresql/data/pgdata

# 4. If recovery fails, restore from backup or reinitialize
```

## Performance Tuning

If you experience slow performance:

### 1. Check Network Latency

```bash
# Ping Synology NAS
ping your-synology-ip

# Check NFS mount options
mount | grep docker-nas-vol1

# Should show: rsize=1048576,wsize=1048576 (1MB read/write)
```

### 2. Optimize NFS Mount Options

Add these to your `/etc/fstab` on all swarm nodes:

```bash
your-synology-ip:/volume1/docker-nas-vol1 /mnt/docker-nas-vol1 nfs4 rw,async,nfsvers=4,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,_netdev 0 0
```

Then remount:
```bash
umount /mnt/docker-nas-vol1
mount /mnt/docker-nas-vol1
```

### 3. Monitor I/O Performance

```bash
# Install iotop if needed
apt-get install iotop

# Monitor disk I/O during database operations
iotop -o
```

## Backup Strategy

With NFS storage, backups are simpler:

### Automated Database Backups

```bash
# Create backup script on manager node
cat > /usr/local/bin/nexus-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/mnt/docker-nas-vol1/nexusvtt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec $(docker ps -q -f name=nexus-prod_postgres) \
  pg_dump -U nexus nexus | gzip > $BACKUP_DIR/nexus_${TIMESTAMP}.sql.gz

# Backup Redis
docker exec $(docker ps -q -f name=nexus-prod_redis) \
  redis-cli -a $REDIS_PASSWORD --rdb /data/dump.rdb
cp /mnt/docker-nas-vol1/nexusvtt/redis/dump.rdb $BACKUP_DIR/redis_${TIMESTAMP}.rdb

# Keep only last 7 days
find $BACKUP_DIR -name "nexus_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "redis_*.rdb" -mtime +7 -delete

echo "✅ Backup completed: $TIMESTAMP"
EOF

chmod +x /usr/local/bin/nexus-backup.sh
```

### Schedule with Cron

```bash
# Run daily at 2 AM
crontab -e

# Add line:
0 2 * * * /usr/local/bin/nexus-backup.sh >> /var/log/nexus-backup.log 2>&1
```

## Benefits of NFS Storage

✅ **Centralized Backups**: Backup directly from Synology
✅ **Easy Migration**: Move data between swarm nodes easily
✅ **Snapshotting**: Use Synology's snapshot features
✅ **Redundancy**: Synology RAID protects your data
✅ **Monitoring**: Monitor disk usage via Synology UI

## Important Notes

⚠️ **Network Stability**: Ensure stable network between swarm and NAS
⚠️ **File Locking**: Use NFSv4 for proper lock support
⚠️ **Single Node**: Keep postgres/redis on manager node (placement constraint)
⚠️ **Performance**: Slight latency vs local storage (acceptable for VTT)

---

**After deployment, your database will persist on the NFS share and survive:**
- Container restarts
- Stack redeployments
- Node failures (data remains on NFS)
- Docker updates
