# Recent Changes Log

## Latest Updates (Update this when making changes)

### 2024-09-25 - Major Feature Expansion: D&D VTT Core Features
- ✅ Moved panel tabs from vertical sidebar to horizontal header tabs
- ✅ Added resizable sidebar with drag handle on left border
- ✅ Enhanced header layout: Scene tabs (left) + Panel tabs (right)
- ✅ Updated CSS for new layout structure with CSS custom properties
- ✅ Maintained glassmorphism design consistency
- ✅ Added collapsed state content for sidebar
- ✅ Responsive design for mobile with stacked header layout
- ✅ **New**: Renamed "Lobby" tab to "Dice" (contains DiceRoller)
- ✅ **New**: Created proper Lobby panel with player management
- ✅ **New**: Added player list with connection status, host/DM badges
- ✅ **New**: Added DM controls: kick players, grant/revoke DM permissions
- ✅ **New**: Added lobby controls: invite link, game lock features
- ✅ **New**: Enhanced 5e D&D Dice Roller with advanced features:
  - Advantage/Disadvantage toggle system
  - Modifier input for ability bonuses
  - Standard dice (d4, d6, d8, d10, d12, d20, d100)
  - Custom dice roll parser (2d6+3, etc.)
  - Quick action buttons (Initiative, Ability Check, Saving Throw)
  - Roll history with critical success/fail highlighting
  - Visual feedback and detailed roll breakdowns
- ✅ **New**: Chat System with D&D-specific features:
  - Public messages for general table talk
  - Private whispers to specific players
  - DM announcements with special styling
  - Roll result integration and history
  - Message typing indicators and timestamps
  - Auto-scroll to latest messages
- ✅ **New**: Sound Effects Panel (DM Only):
  - Master volume control
  - Categorized sounds: Ambient, Combat, Effects
  - Visual feedback for currently playing sounds
  - Stop all sounds functionality
  - Sound library with tavern, forest, dungeon, combat themes
- ✅ **New**: Mock Player System for Development:
  - Realistic player connection simulation
  - Add/remove mock players for testing
  - Toggle connection status for testing scenarios
  - Development controls panel with hide/show option
  - Integrated with lobby management system
- ✅ **New**: Comprehensive CSS styling for all new features
- ✅ **New**: Sounds tab visible only to DM/host users

### Previous Changes
- ✅ Fixed toolbar positioning and drag functionality
- ✅ Implemented floating toolbar with ⋮⋮ drag handle
- ✅ Added glassmorphism design system with CSS custom properties
- ✅ Created modular component structure
- ✅ Set up Zustand state management

## Current Working On
- Mock player system for development testing
- Chat system with D&D-specific features (whispers, announcements, roll integration)
- Sound effects panel for DM atmospheric control
- Enhanced dice rolling system optimized for 5e D&D
- Token drag-and-drop system
- Real-time multiplayer WebSocket integration

## Next Priorities
1. Complete enhanced dice system with advantage/disadvantage, modifiers
2. Implement chat system with whispers and roll integration
3. Add sound effects library and controls for DMs
4. Create development mock player system
5. Initiative tracker implementation with combat management
6. Player character sheets integration
7. Real-time multiplayer synchronization
8. Advanced scene management (backgrounds, lighting, fog of war)

## Known Issues
- None currently identified

## Technical Debt
- Need to implement proper TypeScript types for all components
- Consider extracting more reusable UI components
- Optimize CSS for better performance on mobile devices