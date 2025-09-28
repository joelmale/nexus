# Nexus - Virtual Tabletop Gaming Platform

## What It Is
Nexus is a modern virtual tabletop (VTT) for D&D and other tabletop RPGs, built with React/TypeScript. Think Roll20 meets modern web technology.

## Key Features
- Real-time multiplayer sessions with WebSocket connections
- Interactive game canvas with tokens, maps, and props
- DM tools: scene management, initiative tracking, dice rolling with advantage/disadvantage
- Player tools: character sheets, inventory, chat with whispers and announcements
- Drag-and-drop asset management with a powerful asset browser
- Sound effects system for atmospheric immersion
- Glassmorphism UI design with floating, draggable, and resizable panels
- Dynamically-sized side panel that adjusts to its content
- Comprehensive settings panel for user customization

## User Personas

- **The DM, 'Alex'**: Needs tools that are fast, intuitive, and automate as much of the tedious bookkeeping as possible so they can focus on storytelling.
- **The Player, 'Sam'**: Needs a character sheet that is easy to read, update, and use during a session. They want to feel immersed in the game, not bogged down by the interface.

## Architecture Overview
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Socket.IO for real-time features
- **State Management**: Zustand stores
- **Styling**: CSS Custom Properties + Glassmorphism design system
- **Canvas**: HTML5 Canvas for game scenes
- **Assets**: Local asset server for game resources

## Current Development Status
- ✅ Core layout and UI framework with draggable and resizable panels
- ✅ Scene management and canvas rendering
- ✅ Draggable floating toolbar and player bar
- ✅ **Lobby and Session Management**: Robust system for hosting and joining games.
- ✅ **Enhanced 5e D&D dice rolling system** with advantage/disadvantage, modifiers, history
- ✅ **Chat system** with whispers, DM announcements, and roll integration
- ✅ **Sound effects panel** for DMs with ambient, combat, and effect sounds
- ✅ **Asset Browser** for map assets with search, filtering, and caching.
- ✅ **Comprehensive Settings Panel** with theme, audio, and gameplay customization.
- ✅ **Mock player system** for development testing and debugging
- ✅ **Player lobby management** with kick/DM permission controls
- 🟡 **Token system** (in progress)
- 🚀 Real-time multiplayer (WebSocket framework ready)
- 📋 **Comprehensive Implementation Plan**: See IMPLEMENTATION_PLAN.md for detailed roadmap

## Next Implementation Phases
See **IMPLEMENTATION_PLAN.md** for complete details:
- **Phase 0**: DevOps & Infrastructure (Docker, CI/CD, Testing)
- **Phase 1**: Core Features (Initiative Tracker, Chat System, Enhanced Tokens)
- **Phase 2**: Enhanced Experience (Sounds, Scene Settings, Props)
- **Phase 3**: Testing & Quality Assurance
- **Phase 4**: Deployment & Monitoring
