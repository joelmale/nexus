#!/usr/bin/env node

/**
 * Simple concurrent script runner for development
 * Runs all three services together with proper logging and shutdown
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const services = [
  {
    name: 'Frontend',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(__dirname, '..'),
    prefix: '🖥️  [FRONTEND]',
    color: '\x1b[36m', // Cyan
    env: { PORT: process.env.FRONTEND_PORT || '5173' }
  },
  {
    name: 'WebSocket',
    command: 'npm', 
    args: ['run', 'server:dev'],
    cwd: path.join(__dirname, '..'),
    prefix: '🔌 [WEBSOCKET]',
    color: '\x1b[35m', // Magenta
    env: { PORT: process.env.WS_PORT || '5000' }
  },
  {
    name: 'Assets',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(__dirname, '../asset-server'),
    prefix: '📁 [ASSETS]',
    color: '\x1b[33m', // Yellow
    env: { PORT: process.env.ASSET_PORT || '8080' }
  }
];

const processes = [];
let isShuttingDown = false;

// Colors
const reset = '\x1b[0m';
const bright = '\x1b[1m';

console.log(`${bright}🎲 Starting Nexus VTT Development Servers${reset}\n`);

// Start all services
services.forEach(service => {
  console.log(`${service.color}Starting ${service.name}...${reset}`);
  
  const childProcess = spawn(service.command, service.args, {
    cwd: service.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      ...service.env,
      FORCE_COLOR: '1'
    }
  });

  processes.push({ ...service, process: childProcess });

  // Handle stdout
  childProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${service.color}${service.prefix}${reset} ${line}`);
    });
  });

  // Handle stderr
  childProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${service.color}${service.prefix}${reset} ${line}`);
    });
  });

  // Handle process exit
  childProcess.on('close', (code) => {
    if (!isShuttingDown) {
      console.log(`${service.color}${service.prefix}${reset} Process exited with code ${code}`);
    }
  });

  childProcess.on('error', (error) => {
    console.log(`${service.color}${service.prefix}${reset} Error: ${error.message}`);
  });
});

// Graceful shutdown
const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${bright}🛑 Shutting down all services...${reset}`);
  
  processes.forEach(({ name, process, color }) => {
    console.log(`   ${color}Stopping ${name}...${reset}`);
    process.kill('SIGTERM');
  });

  // Force kill after 5 seconds
  setTimeout(() => {
    processes.forEach(({ name, process, color }) => {
      if (!process.killed) {
        console.log(`   ${color}Force stopping ${name}...${reset}`);
        process.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 5000);

  // Clean exit when all processes are done
  Promise.all(
    processes.map(({ process }) => new Promise(resolve => {
      process.on('close', resolve);
    }))
  ).then(() => {
    console.log(`${bright}✅ All services stopped${reset}`);
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Show initial success message after a delay
setTimeout(() => {
  console.log(`\n${bright}✅ All services started!${reset}`);
  console.log(`🌐 Frontend:     http://localhost:${services[0].env.PORT}`);
  console.log(`🔌 WebSocket:    ws://localhost:${services[1].env.PORT}/ws`);
  console.log(`📁 Asset Server: http://localhost:${services[2].env.PORT}`);
  console.log(`\n${bright}📝 Press Ctrl+C to stop all services${reset}\n`);
}, 3000);
