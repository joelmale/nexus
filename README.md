# Nexus VTT

A lightweight, modern virtual tabletop for browser-based RPG sessions.

## Architecture

Nexus uses a hybrid client-server architecture:
- **Frontend**: React SPA with client-side game state
- **Backend**: Minimal WebSocket relay server
- **Authority**: Host browser contains all game logic and state
- **Persistence**: Local IndexedDB storage in host browser

## Features (MVCR)

- [ ] Session management (host/join with room codes)
- [ ] Multi-tab interface for DM and players
- [ ] Built-in dice roller
- [ ] Real-time synchronization
- [ ] Local state persistence

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
npm install
```

### Development
```bash
# Start frontend dev server
npm run dev

# Start backend dev server (separate terminal)
npm run server:dev
```

### Production Build
```bash
# Build frontend
npm run build

# Build backend
npm run server:build

# Start production server
npm run server:start
```

## Project Structure

```
nexus/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── main.tsx           # App entry point
├── server/                 # Backend WebSocket server
│   ├── index.ts           # Server entry point
│   └── types.ts           # Server type definitions
├── public/                 # Static assets
└── dist/                  # Built output
```

## Contributing

This project is in early development. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
