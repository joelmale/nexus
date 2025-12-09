# Local Development Quick Start Guide

You're now on branch: `fix/3d-dice-and-improvements`

## Option 1: Local Development (Fastest - Vite Hot Reload)

### Prerequisites
- PostgreSQL running (via Docker or local install)
- Node.js 20+

### Setup Steps

1. **Start PostgreSQL** (if not running):
   ```bash
   # Using Docker (recommended):
   docker run -d \
     --name nexus-postgres \
     -e POSTGRES_USER=nexus \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=nexus \
     -p 5432:5432 \
     postgres:16-alpine

   # Initialize schema:
   docker exec -i nexus-postgres psql -U nexus -d nexus < server/schema.sql
   ```

2. **Create `.env` file** (if it doesn't exist):
   ```bash
   DATABASE_URL=postgresql://nexus:password@localhost:5432/nexus
   SESSION_SECRET=dev-session-secret
   JWT_SECRET=dev-jwt-secret
   FORCE_HTTPS=false
   ```

3. **Start development servers**:
   ```bash
   npm run start:all
   ```

   This will:
   - Auto-detect available ports (defaults: 5173 for frontend, 5001 for backend)
   - Start backend with hot reload (`tsx watch`)
   - Start frontend with Vite hot reload
   - Handle port conflicts intelligently

4. **Access the app**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5001

### Hot Reload Behavior
- ✅ **Frontend changes**: Instant update in browser (Vite HMR)
- ✅ **Backend changes**: Automatic restart (tsx watch)
- ✅ **CSS changes**: Instant update (Vite HMR)
- ✅ **TypeScript changes**: Instant compilation

---

## Option 2: Docker Compose (Full Stack)

### For integrated development with all services:

```bash
# Start everything (VTT + Document services):
docker compose -f docker-compose.integrated.yml up

# Or just VTT services:
# (You'll need to create docker-compose.dev.yml first)
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5001

**Features:**
- All services containerized
- Volume mounts for code changes
- Includes PostgreSQL, Redis, etc.

---

## Troubleshooting

### Port Already in Use
The `start:all` script will automatically:
1. Detect port conflicts
2. Offer to auto-select available ports
3. Update `.env` file accordingly

Or manually check:
```bash
lsof -i :5173  # Check frontend port
lsof -i :5001  # Check backend port

# Kill process if needed:
lsof -ti:5173 | xargs kill -9
```

### Database Connection Issues
```bash
# Verify PostgreSQL is running:
docker ps | grep postgres

# Check if schema is initialized:
docker exec nexus-postgres psql -U nexus -d nexus -c "\dt"

# Re-initialize if needed:
docker exec -i nexus-postgres psql -U nexus -d nexus < server/schema.sql
```

### Frontend Not Connecting to Backend
Check `.env` file has correct WebSocket URL:
```bash
VITE_WS_PORT=5001  # Must match backend PORT
```

---

## Development Workflow

### Working on 3D Dice Issue

1. **Start dev servers**: `npm run start:all`
2. **Open browser**: http://localhost:5173
3. **Open DevTools**: F12 → Console
4. **Test dice roll**: Create game → Roll dice
5. **Check console logs**: Look for 🎲 emoji logs
6. **Make changes** to `src/components/DiceBox3D.tsx`
7. **Browser auto-refreshes** with changes

### Committing Changes

```bash
# Check status:
git status

# Add files:
git add src/components/DiceBox3D.tsx

# Commit:
git commit -m "fix: description of fix"

# Push to feature branch:
git push origin fix/3d-dice-and-improvements
```

### Creating PR

When ready to merge back to main:
```bash
# Push final changes:
git push origin fix/3d-dice-and-improvements

# Go to GitHub and create Pull Request
# Or use gh CLI:
gh pr create --base main --head fix/3d-dice-and-improvements
```

---

## Useful Commands

```bash
# Frontend only:
npm run dev

# Backend only:
npm run server:dev

# Type checking:
npm run type-check

# Linting:
npm run lint

# Build for production:
npm run build

# Generate asset manifest:
npm run generate-default-manifest
```

---

## Current State

- ✅ Main branch has all cookie fixes deployed
- ✅ CSS lazy-loading fixed (no more MIME errors)
- 🔍 3D dice diagnostics added (investigating why canvas doesn't render)
- 🌿 On feature branch: `fix/3d-dice-and-improvements`

## Next Steps

1. Start local dev: `npm run start:all`
2. Test dice rolling and check console
3. Identify why 3D canvas isn't appearing
4. Fix the issue
5. Test thoroughly
6. Commit and push to feature branch
7. Create PR when ready
