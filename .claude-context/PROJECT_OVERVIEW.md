# Nexus - Virtual Tabletop Gaming Platform

## What It Is
Nexus is a modern virtual tabletop (VTT) for D&D and other tabletop RPGs, built with React/TypeScript. Think Roll20 meets modern web technology.

## Key Features
- Real-time multiplayer sessions with WebSocket connections
- Interactive game canvas with tokens, maps, and props
- DM tools: scene management, initiative tracking, dice rolling with advantage/disadvantage
- Player tools: character sheets, inventory, chat with whispers and announcements
- Drag-and-drop asset management
- Sound effects system for atmospheric immersion
- Glassmorphism UI design with floating panels

## Architecture Overview
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Socket.IO for real-time features
- **State Management**: Zustand stores
- **Styling**: CSS Custom Properties + Glassmorphism design system
- **Canvas**: HTML5 Canvas for game scenes
- **Assets**: Local asset server for game resources

## Current Development Status
- ✅ Core layout and UI framework
- ✅ Scene management and canvas rendering  
- ✅ Draggable floating toolbar
- ✅ Resizable panel system with horizontal tabs
- ✅ **Enhanced 5e D&D dice rolling system** with advantage/disadvantage, modifiers, history
- ✅ **Chat system** with whispers, DM announcements, and roll integration
- ✅ **Sound effects panel** for DMs with ambient, combat, and effect sounds
- ✅ **Mock player system** for development testing and debugging
- ✅ **Player lobby management** with kick/DM permission controls
- 🚀 Token system (ready for implementation)
- 🚀 Real-time multiplayer (WebSocket framework ready)
- 📋 Planned: Initiative tracker, character sheets, advanced scene features