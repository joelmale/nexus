# 🎲 Nexus VTT

![Nexus VTT Banner](public/assets/images/nexus-banner.png)

**A stunning, lightweight virtual tabletop for modern web browsers**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Glassmorphism](https://img.shields.io/badge/Design-Glassmorphism-blueviolet)](https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9)

## ✨ Features

### 🎨 **Stunning Glassmorphism Design**
- **Translucent glass panels** with backdrop blur effects
- **Smooth animations** and interactive hover states  
- **Modern gradient backgrounds** with floating particles
- **Responsive design** for desktop, tablet, and mobile

### 🎲 **Real-time Multiplayer Gaming**
- **Instant session creation** with 4-character room codes
- **Host/Player roles** - DM controls, players participate
- **Live dice rolling** with full expression support (2d6+3, 1d20, etc.)
- **Real-time synchronization** across all connected players

### 🏗️ **Hybrid Architecture**
- **Client-side authority** - game logic runs in host's browser
- **Minimal server** - just routes messages between players
- **No database required** - state persists locally via IndexedDB
- **Lightning fast** - instant responses, zero server lag

### 🛠️ **Developer-Friendly**
- **Modern TypeScript** codebase with full type safety
- **Hot module reloading** for rapid development
- **Intelligent port management** - auto-resolves conflicts
- **Comprehensive debugging** tools and logging

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/your-username/nexus-vtt.git
cd nexus-vtt

# Install all dependencies
npm install

# Start everything with one command
npm run start:all
```

The setup will start:
- ✅ **Frontend** on http://localhost:5173
- ✅ **WebSocket Server** on ws://localhost:5000/ws  
- ✅ **Asset Server** on http://localhost:8080

### Alternative Setup Methods

```bash
# Interactive setup menu (recommended for first time)
npm run setup

# Start individual services
npm run dev          # Frontend only
npm run server:dev   # WebSocket only
cd asset-server && npm run dev  # Assets only
```

## 🎯 Usage

### Creating a Game
1. **Enter your name** in the lobby
2. **Click "Host Game"** - you'll get a room code like "BOT1" 
3. **Share the room code** with your players
4. **Start playing!** Use the dice roller and prepare for upcoming features

### Joining a Game
1. **Enter your name** in the lobby
2. **Enter the room code** from your DM
3. **Click "Join Game"** 
4. **You're connected!** Roll dice and interact with other players

### Current Features (MVCR Complete)
- ✅ **Session Management** - Create/join games with room codes
- ✅ **Multi-tab Interface** - Lobby, Dice, Scenes, Settings
- ✅ **Real-time Dice Roller** - Full expression parsing with shared results
- ✅ **Scene Editor** - Background images, grid system, basic scene management
- ✅ **Asset Browser** - A professional asset browser with search, filtering, and caching.
- ✅ **Settings Panel** - A comprehensive settings panel for user customization.
- ✅ **Player Management** - See who's connected in real-time
- ✅ **Color Schemes** - Customizable glassmorphism themes

## 🗂️ Project Structure

```
nexus-vtt/
├── src/                    # React frontend application
│   ├── components/         # React components (Lobby, DiceRoller, Layout, Settings, AssetBrowser)
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # WebSocket service, dice utilities
│   └── styles/            # Glassmorphism CSS styling
├── server/                 # Minimal WebSocket relay server
│   ├── index.ts           # Main server with port management
│   └── types.ts           # Server type definitions
├── public/                 # Static assets
│   └── assets/            # Organized graphics and icons
├── scripts/               # Development and asset management scripts
└── docs/                  # Documentation and guides
```

## 🎨 Asset Management

### Adding Your Graphics
```bash
# Process your asset collection
node scripts/process-assets.js /path/to/your/assets ./asset-server/assets

# Example: Process maps from external drive
node scripts/process-assets.js /Volumes/PS2000w/DnD_Assets/maps ./asset-server/assets

# Start asset server
cd asset-server && npm run dev
```

### Supported Asset Types
- **Maps**: Dungeons, cities, wilderness, interiors, battlemaps
- **Tokens**: Characters, monsters, objects, NPCs
- **Art**: Character portraits, scene art, concept art
- **Handouts**: Documents, letters, notices, player maps
- **Reference**: Rules, charts, tables, guides

### Asset Processing Features
- **WebP Conversion**: Reduces file sizes by ~40% while maintaining quality
- **Thumbnail Generation**: 300x300 previews for fast browsing
- **Smart Categorization**: Automatic organization by content type
- **Metadata Extraction**: Searchable tags and descriptions
- **Standardized Structure**: Organized folder hierarchy

### Asset Browser Integration
The Scene Editor includes a professional asset browser:
- 🔍 **Search and filter** by name, category, or tags
- 📁 **Category organization** with subcategories
- 🖼️ **Thumbnail grid** for quick visual selection
- ⚡ **Lazy loading** with smart caching
- 📱 **Mobile responsive** design

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start frontend (port 5173)
npm run server:dev       # Start WebSocket server (port 5000)
cd asset-server && npm run dev  # Start asset server (port 8080)
npm run start:all        # Start all three servers at once
npm run setup           # Interactive setup menu

# Asset Processing
node scripts/process-assets.js <input> <output>  # Process assets
npm install sharp       # Install image processing library

# Build & Quality
npm run build           # Production build
npm run lint            # TypeScript and ESLint checks
npm run type-check      # TypeScript validation only

# Port Management (if defaults are busy)
npm run dev:3000        # Frontend on specific port
npm run server:dev:5001 # WebSocket on specific port
PORT=8081 npm run dev   # Asset server on different port (in asset-server/)
```

### Architecture Deep Dive

#### Frontend (React + TypeScript)
- **Zustand + Immer**: Immutable state management with reactive updates
- **WebSocket Service**: Robust connection handling with auto-reconnect
- **Asset Manager**: Smart caching and lazy loading for images
- **Component Architecture**: Modular design with glassmorphism styling
- **Type Safety**: Full TypeScript coverage with strict mode

#### Backend (Node.js + WebSocket)
- **Minimal Relay**: ~300 lines of code, just routes messages
- **Room Management**: 4-character codes, host/player roles
- **No Game Logic**: All logic runs in host browser
- **Port Intelligence**: Auto-detects conflicts, suggests alternatives

#### Asset Server (Express.js + Sharp)
- **Image Processing**: Converts all images to optimized WebP format
- **Smart Caching**: HTTP caching headers and client-side IndexedDB
- **RESTful API**: Search, categorization, and metadata endpoints
- **Standardized Structure**: Organized asset hierarchy
- **CORS Support**: Cross-origin requests for development

#### State Synchronization
```typescript
// Host browser: Source of truth
Host makes change → Generate event → Send to server → Broadcast to players

// Player browsers: Apply updates  
Receive event → Update local state → Re-render UI

// Asset Server: Serve optimized content
Request asset → Check cache → Serve WebP/thumbnail → Update manifest

// Server: Message router only
Receive message → Route to room members → No processing
```

## 🚧 Roadmap

### Phase 1: Scene Management (In Progress)
- [x] **Interactive battle maps** with background images
- [x] **Grid system** with customizable spacing and snapping  
- [ ] **Pan and zoom** controls for navigation
- [ ] **Scene switching** for multiple encounters

### Phase 2: Token System
- [ ] **Character and NPC tokens** with drag-and-drop movement
- [ ] **Token library** for organizing character art
- [ ] **Health and status tracking** with visual indicators
- [ ] **Multi-select** and group movement

### Phase 3: Initiative & Combat  
- [ ] **Initiative tracker** with automatic turn management
- [ ] **Combat flow** with round counting and turn indicators
- [ ] **Status effects** and condition management
- [ ] **Integrated dice rolling** for attacks and saves

### Phase 4: Drawing & Measurement
- [ ] **Drawing tools** for tactical annotations
- [ ] **Measurement tools** for distance and area
- [ ] **Real-time collaboration** on drawings
- [ ] **Layer management** for organization

### Phase 5: Advanced Features
- [ ] **Fog of war** and dynamic lighting
- [ ] **Hex grid support** and grid-less mode
- [ ] **Session persistence** and save/load
- [ ] **Asset sharing** and template system

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes and test thoroughly
4. **Commit** with clear messages: `git commit -m 'Add amazing feature'`
5. **Push** to your branch: `git push origin feature/amazing-feature`
6. **Open** a Pull Request

### Development Guidelines
- **Follow TypeScript best practices** with strict typing
- **Maintain glassmorphism design consistency** 
- **Test on multiple browsers** and screen sizes
- **Update documentation** for new features
- **Keep the hybrid architecture** - minimal server, client authority

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎮 Inspiration

Nexus VTT is inspired by the brilliant architecture of [Ogres VTT](https://github.com/samcf/ogres) by samcf. We've preserved the genius hybrid client-server design while modernizing the technology stack and adding stunning glassmorphism aesthetics.

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **Documentation**: [Wiki](https://github.com/your-username/nexus-vtt/wiki)
- **Issues**: [Bug Reports & Feature Requests](https://github.com/your-username/nexus-vtt/issues)
- **Discussions**: [Community Chat](https://github.com/your-username/nexus-vtt/discussions)

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/your-username/nexus-vtt?style=social)
![GitHub forks](https://img.shields.io/github/forks/your-username/nexus-vtt?style=social)
![GitHub issues](https://img.shields.io/github/issues/your-username/nexus-vtt)
![GitHub pull requests](https://img.shields.io/github/issues-pr/your-username/nexus-vtt)

---

**Built with ❤️ for the tabletop gaming community**

*Ready to revolutionize your virtual game nights? Start rolling! 🎲*
