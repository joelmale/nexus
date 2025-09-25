# Nexus Technology Stack

## Frontend Stack
- **React 18** - UI framework with hooks and functional components
- **TypeScript** - Type safety and better developer experience
- **Vite** - Build tool and dev server (fast HMR)
- **Zustand** - State management (lightweight Redux alternative)
- **CSS Custom Properties** - Design system with CSS variables
- **HTML5 Canvas** - Game rendering and scene management

## Backend Stack  
- **Node.js** - Server runtime
- **Express** - Web server framework
- **Socket.IO** - Real-time WebSocket communication
- **TypeScript** - Shared language with frontend

## Development Tools
- **ESLint** - Code linting and formatting
- **Claude Desktop** - AI development assistant
- **Git** - Version control
- **VS Code** - Primary development environment

## Design Philosophy
- **Glassmorphism UI** - Modern translucent design with backdrop-filter
- **Component-driven** - Reusable React components with clear interfaces
- **Real-time first** - Built for multiplayer from ground up
- **Mobile responsive** - Works on tablets and phones
- **Accessibility focused** - Keyboard navigation, screen readers, ARIA labels

## Key Patterns Used
- **Custom hooks** for state management and game logic
- **CSS-in-CSS** with custom properties for consistent theming
- **Event-driven architecture** for real-time updates
- **Grid + Flexbox** for responsive layouts
- **Compound components** for complex UI patterns
- **TypeScript interfaces** for type-safe props and state

## File Organization Patterns
- **Feature-based folders** (Scene/, Tokens/, etc.)
- **Separation of concerns** (components, styles, stores, types)
- **Shared types** between client and server
- **CSS co-location** with components when appropriate

## Performance Considerations
- **CSS transforms** for smooth animations
- **RequestAnimationFrame** for canvas updates
- **Event delegation** for interactive elements
- **Lazy loading** for game assets
- **Debounced resize handlers** for responsive updates