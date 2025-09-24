# Getting Started

This guide will walk you through setting up your development environment for Nexus VTT. By the end of this guide, you will have the application running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js:** Version 18 or higher.
- **npm:** Usually comes with Node.js.
- **Git:** For cloning the repository.

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/nexus-vtt.git
   cd nexus-vtt
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

## Running the Application

Nexus VTT consists of two main parts: a frontend React application and a backend WebSocket server. You need to run both for the application to work correctly.

### Automatic Setup

The easiest way to get started is to use the interactive setup script:

```bash
npm run setup
```

This script will check for available ports, provide you with the exact commands to run, and can even start both servers for you.

### Manual Setup

If you prefer to run the servers manually, you can use the following commands in two separate terminals:

**Terminal 1: Frontend (React App)**

```bash
npm run dev
```

This will start the frontend development server, typically on `http://localhost:5173`.

**Terminal 2: Backend (WebSocket Server)**

```bash
npm run server:dev
```

This will start the WebSocket server, typically on `ws://localhost:5000/ws`.

## Usage

Once both servers are running, you can open your browser to the frontend URL and start using the application.

### Creating a Game

1. Enter your name in the lobby.
2. Click "Host Game".
3. Share the generated room code with your players.

### Joining a Game

1. Enter your name in the lobby.
2. Enter the room code from your DM.
3. Click "Join Game".
