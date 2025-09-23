# Contributing to Nexus VTT

Thank you for your interest in contributing to Nexus VTT! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Start the development environment:
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend
   npm run server:dev
   ```

## Project Structure

- `src/` - Frontend React application
- `server/` - Backend WebSocket server
- `src/components/` - React components
- `src/stores/` - Zustand state management
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions and services

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow the existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic

### Component Guidelines
- Use functional components with hooks
- Keep components focused and single-purpose
- Use TypeScript interfaces for props
- Follow the glassmorphism design system

### State Management
- Use Zustand for global state
- Keep state updates immutable (use Immer)
- Organize state by feature domains

### Git Workflow
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes with clear, descriptive commits
3. Test your changes thoroughly
4. Push to your fork and create a pull request

## Reporting Issues

When reporting bugs, please include:
- Steps to reproduce the issue
- Expected vs actual behavior
- Browser and OS information
- Console errors (if any)

## Feature Requests

For new features:
- Describe the problem you're trying to solve
- Explain your proposed solution
- Consider how it fits with the project's goals of being lightweight and focused

## MVCR (Minimally Viable Capability Requirement)

Current focus areas for contributions:
- [ ] Session management improvements
- [ ] Dice roller enhancements
- [ ] UI/UX improvements with glassmorphism
- [ ] Real-time synchronization robustness
- [ ] Mobile responsiveness

Future planned features:
- [ ] Scene management with battle maps
- [ ] Token system
- [ ] Initiative tracker
- [ ] Drawing tools

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment for all contributors

## Questions?

Feel free to open an issue for any questions about contributing!
