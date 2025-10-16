# Development Guide

This guide covers the development environment, architecture, and workflow for Nexus VTT.

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **Docker Desktop** - Must be installed and running.

### Setup Steps

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/nexus-vtt.git
    cd nexus-vtt
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env.local` file in the project root and add the database connection string:
    ```
    DATABASE_URL="postgres://nexus:password@localhost:5432/nexus"
    ```

4.  **Start Development Database**
    In a separate terminal, run the following command to start the PostgreSQL container:
    ```bash
    docker compose -f docker/docker-compose.dev.yml up -d postgres-dev
    ```

5.  **Run the Application**
    Once the database is running, use this command to start the frontend and backend servers with hot-reloading:
    ```bash
    npm run start:all
    ```

## 🏗️ Architecture Overview

Nexus VTT uses a monorepo structure with two main services for development:

1.  **Frontend** (React + Vite)
    -   **Port:** 5173 (default)
    -   **Path:** `src/`
    -   **Purpose:** Renders the UI and contains all client-side game logic.

2.  **Backend** (Node.js + Express + WebSocket)
    -   **Port:** 5001 (default)
    -   **Path:** `server/`
    -   **Purpose:** Real-time message relay, session persistence, and serving assets.

3.  **Database** (PostgreSQL)
    -   **Port:** 5432 (default)
    -   **Managed by:** Docker Compose (`docker-compose.dev.yml`)
    -   **Purpose:** Persists all room and game state data.

### 🔄 Data Flow

```
User Action → Frontend Logic → WebSocket Event → Backend Server → PostgreSQL DB
                                          ↓
                                   Broadcast to other players
```

## 🛠️ Development Workflow

For most development, you only need two commands in separate terminals:

1.  **Start the Database (run once)**
    ```bash
    docker compose -f docker/docker-compose.dev.yml up -d postgres-dev
    ```

2.  **Start the Application Servers**
    ```bash
    npm run start:all
    ```

This single command starts both the frontend and backend with hot-reloading. Any changes you make in `src/` or `server/` will be applied automatically.\n\n### Adding New Features\n\n1. **Frontend Features**:\n   ```bash\n   # Create component in src/components/\n   # Add to appropriate tab or modal\n   # Update types in src/types/\n   # Add styles in src/styles/\n   ```\n\n2. **WebSocket Events**:\n   ```bash\n   # Add event type to server/types.ts\n   # Handle in server/index.ts\n   # Add frontend handling in src/utils/websocket.ts\n   ```\n\n3. **Asset Processing**:\n   ```bash\n   # Update scripts/process-assets.js\n   # Modify asset-server/src/index.ts\n   # Update shared/types.ts\n   ```\n\n## 🔧 Code Standards\n\n### TypeScript\n- **Strict mode enabled** - Full type safety\n- **Shared types** in `shared/types.ts`\n- **Interface-first design** - Define interfaces before implementation\n\n### React\n- **Functional components** with hooks\n- **Zustand for state** management\n- **Component composition** over inheritance\n\n### Styling\n- **Glassmorphism theme** - Consistent visual design\n- **CSS custom properties** - Theme-aware colors\n- **Mobile-first responsive** design\n\n### WebSocket\n- **Event-driven architecture** - No REST API for game logic\n- **Host authority** - Game state managed by host browser\n- **Minimal server** - Just message routing\n\n## 📂 Key Directories\n\n```\nsrc/\n├── components/\n│   ├── Scene/          # Scene management components\n│   ├── Lobby.tsx       # Game lobby\n│   ├── DiceRoller.tsx  # Dice rolling interface\n│   ├── Settings.tsx    # App settings and themes\n│   └── AssetBrowser.tsx # Asset selection modal\n├── stores/\n│   └── gameStore.ts    # Zustand state management\n├── utils/\n│   ├── websocket.ts    # WebSocket service\n│   ├── assetManager.ts # Asset loading and caching\n│   └── sceneUtils.ts   # Scene-related utilities\n└── styles/\n    ├── main.css        # Base styles and glassmorphism\n    ├── scenes.css      # Scene editor styles\n    ├── settings.css    # Settings modal styles\n    └── asset-browser.css # Asset browser styles\n```\n\n## 🔍 Debugging\n\n### Browser DevTools\n- **Console**: WebSocket connection status\n- **Network**: Asset loading performance\n- **Application → IndexedDB**: Cached assets and scene data\n\n### Server Logs\n```bash\n# All services show color-coded logs:\n# 🖥️  [FRONTEND] - Cyan\n# 🔌 [WEBSOCKET] - Purple\n# 📁 [ASSETS] - Yellow\n```\n\n### Common Issues\n\n**Port conflicts:**\n```bash\n# Check what's using ports\nlsof -i :5173\nlsof -i :5000 \nlsof -i :8080\n\n# Use alternative ports\nPORT=3000 npm run dev\nPORT=5001 npm run server:dev\nPORT=8081 npm run dev  # (in asset-server/)\n```\n\n**Asset processing fails:**\n```bash\n# Reinstall Sharp\nnpm uninstall sharp\nnpm install sharp\n```\n\n## 🧪 Testing\n\n### Manual Testing\n1. **Start all services**: `npm run start:all`\n2. **Open multiple browser tabs** to test multiplayer\n3. **Test asset loading** by uploading/browsing images\n4. **Test scene creation** with background images\n5. **Test dice rolling** between multiple players\n\n### Asset Processing Testing\n```bash\n# Test with a single image\nnode scripts/process-assets.js /path/to/test/image ./test-output\n\n# Check output structure\nls -la test-output/\n```\n\n## 📦 Building for Production\n\n```bash\n# Build frontend\nnpm run build\n\n# Build asset server\ncd asset-server\nnpm run build\n\n# Build WebSocket server\nnpm run server:build\n```\n\n## 🤝 Contributing\n\n### Development Setup\n1. **Fork the repository**\n2. **Create feature branch**: `git checkout -b feature/amazing-feature`\n3. **Install dependencies**: `npm install && cd asset-server && npm install`\n4. **Start development**: `npm run start:all`\n5. **Make changes and test**\n6. **Commit with clear messages**: `git commit -m 'Add amazing feature'`\n7. **Push and create PR**: `git push origin feature/amazing-feature`\n\n### Code Review Checklist\n- ✅ **TypeScript** - No `any` types, proper interfaces\n- ✅ **Responsive** - Works on desktop and mobile\n- ✅ **Glassmorphism** - Follows design system\n- ✅ **Performance** - Asset loading optimized\n- ✅ **Multiplayer** - Works with multiple clients\n- ✅ **Documentation** - README updated if needed\n\n### Release Process\n1. **Update version** in package.json files\n2. **Update changelog** with new features\n3. **Test production build** thoroughly\n4. **Tag release**: `git tag v1.2.0`\n5. **Push tags**: `git push origin --tags`\n6. **Deploy to production**\n\n---\n\n**Ready to contribute?** Check out our [good first issues](https://github.com/your-username/nexus-vtt/labels/good%20first%20issue) or join our [Discord community](https://discord.gg/nexus-vtt)!\n