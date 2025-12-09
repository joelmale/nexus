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
- **Minimal server** - routes messages and persists session data
- **PostgreSQL Backend** - Game sessions are persisted in a database for resilience.
- **Lightning fast** - instant responses, zero server lag

### 🛠️ **Developer-Friendly**

- **Modern TypeScript** codebase with full type safety
- **Hot module reloading** for rapid development
- **Intelligent port management** - auto-resolves conflicts
- **Comprehensive debugging** tools and logging

## Routing

The application uses React Router for URL-based routing.
Each major view has its own URL:

- `/lobby` - Create or join games
- `/lobby/dm-setup` - Configure DM game
- `/lobby/player-setup` - Configure player
- `/lobby/game/:roomCode` - Active game
- `/dashboard` - User dashboard

See [docs/routing-architecture.md](docs/routing-architecture.md) for details.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Docker Desktop** - Must be installed and running.
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Setup

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-username/nexus-vtt.git
    cd nexus-vtt
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Configure Environment** (Optional)
    Create `.env.local` if you need custom configuration:

    ```bash
    DATABASE_URL="postgres://nexus:password@localhost:5432/nexus"
    ```

4.  **Start Everything** 🚀

    ```bash
    npm run start:all
    ```

That's it! The script will:
- ✅ **Automatically start PostgreSQL** if Docker is running
- ✅ **Start Frontend** on http://localhost:5173
- ✅ **Start Backend** on http://localhost:5001

**Note:** Make sure Docker Desktop is running before starting.

### Alternative Setup Methods

```bash
# Start frontend only (for UI work)
npm run dev

# Start backend only (requires PostgreSQL running)
npm run server:dev

# Database management
npm run db:start     # Start PostgreSQL manually
npm run db:stop      # Stop PostgreSQL
npm run db:logs      # View PostgreSQL logs
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

#### 🚀 **Quick Start Commands**

```bash
npm run start:all        # Start all servers (frontend + backend) - Full development
npm run dev              # Start frontend only - Quick UI development
```

**When to Use Which:**
- **`npm run dev`** - Frontend only, perfect for UI work
- **`npm run start:all`** - Full stack, needed for multiplayer features and WebSocket server

**Custom Ports:** Use environment variables instead of dedicated scripts:
```bash
PORT=3000 npm run dev              # Frontend on port 3000
PORT=5002 npm run server:dev       # Backend on port 5002
```

#### 🏗️ **Build Commands**

```bash
npm run build           # Production build (frontend)
npm run build:server    # Build server TypeScript
npm run build:all       # Build both frontend and server
npm run server:start    # Start production server (after build)
npm run preview         # Preview production build
```

#### 🧪 **Testing & Quality**

```bash
# Type Checking & Linting
npm run type-check      # TypeScript validation only
npm run lint            # ESLint + TypeScript checks

# Unit & Integration Tests
npm run test            # Run all tests once
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests
npm run test:e2e        # Run end-to-end tests
npm run test:all        # Run all tests (unit + integration + e2e)
npm run test:ci         # CI pipeline tests (lint + type-check + tests)
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Layout & Visual Tests
npm run test:layout     # Run Playwright layout tests
npm run test:visual     # Visual regression testing
```

**Run Specific Tests:**
```bash
npm test -- path/to/test.ts        # Run specific test file
npm run test:layout -- --grep "pattern"  # Filter layout tests
```

#### 🗄️ **Database Management**

```bash
npm run db:start        # Start PostgreSQL (auto-runs in start:all)
npm run db:stop         # Stop PostgreSQL
npm run db:down         # Stop and remove PostgreSQL container
npm run db:reset        # Reset database (removes all data!)
npm run db:logs         # View PostgreSQL logs
npm run db:shell        # Open PostgreSQL shell
```

**Note:** `npm run start:all` automatically starts PostgreSQL if it's not running.

#### 🐳 **Docker Commands**

```bash
npm run docker:dev       # Start development environment
npm run docker:dev:build # Build and start dev environment
npm run docker:dev:down  # Stop development environment
```

**Direct Make Commands:** For production Docker operations, use Make directly:
```bash
make build              # Production build with Docker
make deploy             # Deploy to production
make logs               # View container logs
```

#### 🎨 **Asset Management**

```bash
npm run generate-assets        # Generate thumbnails and manifest
npm run generate-thumbnails    # Generate asset thumbnails only
npm run generate-default-manifest  # Generate asset manifest only
npm run organize-assets        # Organize asset directory structure
npm run update-assets          # Update asset references in code
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

## 🧪 Test Suite & NIST Security Controls

Nexus VTT maintains a comprehensive test suite of **270 tests** across **18 test files**, mapped to NIST 800-53 Rev 5 security controls to ensure security, reliability, and data integrity.

### Test Coverage Overview

| Category            | Tests   | Files  | Coverage                       |
| ------------------- | ------- | ------ | ------------------------------ |
| **Unit Tests**      | 252     | 15     | Utils, Stores, Services, Types |
| **Component Tests** | 16      | 3      | UI Components                  |
| **E2E Tests**       | 2       | 2      | Visual & Layout                |
| **Total**           | **270** | **18** | **100% Pass Rate**             |

### NIST 800-53 Control Mapping

#### **SI (System and Information Integrity)**

**SI-10: Information Input Validation**

- `dice.test.ts` (15 tests)
  - Validates dice expression parsing (e.g., `2d6+3`, `1d20`)
  - Rejects invalid expressions (trailing operators, malformed syntax)
  - Enforces range limits (1-100 dice, 2-1000 sides)
  - Tests whitespace handling and edge cases

**SI-11: Error Handling**

- `assetManager.test.ts` (7 tests)
  - Handles network failures gracefully
  - Returns empty manifests on fetch errors
  - Tests asset loading and caching error paths
- `websocket.test.ts` (6 tests)
  - Handles malformed JSON messages
  - Tests connection timeout scenarios
  - Validates disconnect handling
- `sessionPersistence.test.ts` (24 tests)
  - Handles invalid JSON gracefully
  - Tests localStorage quota errors
  - Validates error recovery mechanisms

**SI-7: Software, Firmware, and Information Integrity**

- `mathUtils.test.ts` (32 tests)
  - Validates geometric calculations (distance, collision detection)
  - Tests grid snapping and coordinate transformations
  - Ensures mathematical precision for game mechanics

#### **AC (Access Control)**

**AC-2: Account Management**

- `gameStore.test.ts` (19 tests)
  - Tests host/player role assignment
  - Validates session creation and joining
  - Tests phase transition controls (lobby → live → paused)
  - Prevents invalid state transitions

**AC-3: Access Enforcement**

- `gameStore.test.ts` (19 tests)
  - Tests role-based permissions (host vs player)
  - Validates user action authorization
  - Tests scene access controls

#### **AU (Audit and Accountability)**

**AU-2: Event Logging**

- `websocket.test.ts` (6 tests)
  - Tests WebSocket connection event tracking
  - Validates message send/receive logging
  - Tests connection state transitions

**AU-9: Protection of Audit Information**

- `sessionPersistence.test.ts` (24 tests)
  - Tests activity timestamp tracking
  - Validates session statistics collection
  - Tests audit log integrity

#### **SC (System and Communications Protection)**

**SC-8: Transmission Confidentiality and Integrity**

- `websocket.test.ts` (6 tests)
  - Tests WebSocket connection establishment
  - Validates message queuing when disconnected
  - Tests reconnection logic
  - Ensures message integrity during transmission

**SC-23: Session Authenticity**

- `sessionPersistence.test.ts` (24 tests)
  - Validates session structure and format
  - Tests session expiration (5-minute timeout)
  - Tests version compatibility checking
  - Validates reconnection URL generation

#### **CM (Configuration Management)**

**CM-2: Baseline Configuration**

- `characterStore.test.ts` (25 tests)
  - Tests character data structure validation
  - Validates default character attributes
  - Tests character creation wizard flow

**CM-3: Configuration Change Control**

- `gameStore.test.ts` (19 tests)
  - Tests controlled state transitions
  - Validates phase change authorization
  - Tests rollback on invalid transitions

**CM-6: Configuration Settings**

- `colorSchemes.test.ts` (7 tests)
  - Tests theme configuration
  - Validates color scheme settings
  - Tests UI customization persistence

#### **CP (Contingency Planning)**

**CP-9: Information System Backup**

- `sessionPersistence.test.ts` (24 tests)
  - Tests session save/load operations
  - Validates game state persistence
  - Tests recovery data generation
  - Validates backup version compatibility

**CP-10: Information System Recovery**

- `sessionPersistence.test.ts` (24 tests)
  - Tests session recovery from localStorage
  - Validates reconnection capability
  - Tests recovery from invalid data states
  - Validates graceful degradation

#### **IA (Identification and Authentication)**

**IA-2: Identification and Authentication**

- `gameStore.test.ts` (19 tests)
  - Tests user identification via room codes
  - Validates player name requirements
  - Tests session authentication

**IA-11: Re-authentication**

- `sessionPersistence.test.ts` (24 tests)
  - Tests reconnection authentication
  - Validates session timeout handling
  - Tests URL parameter-based reconnection

#### **SI (System and Information Integrity) - UI/UX**

**SI-12: Information Handling and Retention**

- `character.test.ts` (17 tests)
  - Validates character data type definitions
  - Tests data structure integrity
  - Ensures type safety across application

**Component Integrity Tests**

- `CharacterSheet.test.tsx` (24 tests) - UI rendering integrity
- `PlayerPanel.test.tsx` (25 tests) - Player list consistency
- `InitiativeTracker.test.tsx` (12 tests) - Turn order integrity
- `GameToolbar.test.tsx` (3 tests) - Toolbar state consistency
- `DiceRoller.test.tsx` (1 test) - Dice UI rendering
- `ContextPanel.test.tsx` (1 test) - Layout constraints

**Visual Regression & Layout Validation**

- `visual-regression.test.ts` - Prevents UI regressions
- `layout.test.ts` - Validates CSS layout rules and constraints

### Test Execution

```bash
# Run all tests
npm run test

# Run specific test categories
npm run test:unit          # Unit tests only
npm run test:e2e          # End-to-end tests
npm run test:coverage     # Generate coverage report

# Run specific test files
npm test -- dice.test.ts
npm test -- sessionPersistence.test.ts
```

### Continuous Integration

All tests run automatically on:

- ✅ Pre-commit hooks (via Husky)
- ✅ Pull request validation
- ✅ CI/CD pipeline
- ✅ Pre-deployment checks

### Security Testing Summary

| Control Family                     | Tests   | Risk Coverage                                    |
| ---------------------------------- | ------- | ------------------------------------------------ |
| **SI** - System Integrity          | 90      | Input validation, error handling, data integrity |
| **AC** - Access Control            | 43      | Role management, authorization                   |
| **AU** - Audit & Accountability    | 30      | Logging, tracking, session monitoring            |
| **SC** - Communications Protection | 30      | WebSocket security, message integrity            |
| **CM** - Configuration Management  | 56      | State management, version control                |
| **CP** - Contingency Planning      | 48      | Data persistence, recovery, backup               |
| **IA** - Authentication            | 43      | User identification, session auth                |
| **Total**                          | **270** | **Comprehensive coverage**                       |

### Quality Metrics

- **Test Pass Rate**: 100% (270/270)
- **Code Coverage**: Comprehensive unit and integration coverage
- **Security Controls**: 7 NIST control families mapped
- **Automated Testing**: Pre-commit, CI/CD integrated
- **Type Safety**: Full TypeScript strict mode validation

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

_Ready to revolutionize your virtual game nights? Start rolling! 🎲_
