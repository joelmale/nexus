#!/usr/bin/env node

/**
 * Development Setup Script
 * 
 * This script provides an interactive setup for Nexus VTT development,
 * including port management and the ability to run all services together.
 */

import { spawn, exec } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default ports
const DEFAULT_PORTS = {
  frontend: 5173,
  websocket: 5000,
  assets: 8080
};

// Alternative ports if defaults are busy
const ALT_PORTS = {
  frontend: [3000, 3001, 5174, 8000],
  websocket: [5001, 5002, 8001, 8002],
  assets: [8080, 8081, 9000, 9001]
};

class NexusSetup {
  constructor() {
    this.availablePorts = {};
    this.processes = [];
    this.isShuttingDown = false;
  }

  async run() {
    console.log('🎲 Nexus VTT Development Setup');
    console.log('==============================\n');

    // Check if asset server dependencies exist
    await this.checkAssetServerSetup();

    // Check available ports
    await this.checkPorts();

    // Show menu
    await this.showMenu();
  }

  async checkAssetServerSetup() {
    const assetServerPath = path.join(__dirname, '../asset-server');
    const packageJsonPath = path.join(assetServerPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.log('⚠️  Asset server not set up yet.');
      console.log('📋 Run these commands to set it up:');
      console.log('   cd asset-server && npm install');
      console.log('   npm install sharp  # For asset processing');
      console.log('');
    }
  }

  async checkPorts() {
    console.log('🔍 Checking available ports...\n');

    for (const [service, defaultPort] of Object.entries(DEFAULT_PORTS)) {
      const port = await this.findAvailablePort(defaultPort, ALT_PORTS[service] || []);
      this.availablePorts[service] = port;
      
      const status = port === defaultPort ? '✅' : '⚠️ ';
      const note = port === defaultPort ? '' : ` (default ${defaultPort} busy)`;
      console.log(`${status} ${service.padEnd(10)}: ${port}${note}`);
    }
    console.log('');
  }

  async findAvailablePort(preferred, alternatives = []) {
    const portsToTry = [preferred, ...alternatives];
    
    for (const port of portsToTry) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    
    // If no predefined ports work, find any available port
    return await this.findAnyAvailablePort(3000);
  }

  isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  async findAnyAvailablePort(startPort) {
    for (let port = startPort; port < startPort + 100; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error('No available ports found');
  }

  async showMenu() {
    console.log('🚀 Choose your development setup:');
    console.log('');
    console.log('1. 🎯 Run Everything (Frontend + WebSocket + Assets)');
    console.log('2. 🖥️  Frontend Only');
    console.log('3. 🔌 WebSocket Server Only'); 
    console.log('4. 📁 Asset Server Only');
    console.log('5. 🎨 Process Assets First');
    console.log('6. 📋 Show Manual Commands');
    console.log('7. ❌ Exit');
    console.log('');

    // Simple readline alternative for Node.js without extra dependencies
    process.stdout.write('Enter your choice (1-7): ');
    
    const choice = await this.getUserInput();
    await this.handleChoice(choice.trim());
  }

  getUserInput() {
    return new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString());
      });
    });
  }

  async handleChoice(choice) {
    switch (choice) {
      case '1':
        await this.runEverything();
        break;
      case '2':
        await this.runFrontend();
        break;
      case '3':
        await this.runWebSocket();
        break;
      case '4':
        await this.runAssetServer();
        break;
      case '5':
        await this.processAssets();
        break;
      case '6':
        this.showManualCommands();
        break;
      case '7':
        console.log('👋 Goodbye!');
        process.exit(0);
        break;
      default:
        console.log('❌ Invalid choice. Please try again.\n');
        await this.showMenu();
    }
  }

  async runEverything() {
    console.log('🎯 Starting all services...\n');

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    // Check if asset server is ready
    const assetServerReady = await this.checkAssetServerReady();
    
    if (!assetServerReady) {
      console.log('⚠️  Asset server dependencies not found.');
      console.log('🔧 Run: cd asset-server && npm install');
      console.log('');
    }

    // Create .env if it doesn't exist
    await this.ensureEnvFile();

    console.log('Starting services in order...\n');

    // Start Asset Server first (if ready)
    if (assetServerReady) {
      await this.startAssetServer();
      await this.delay(2000); // Wait for asset server to be ready
    }

    // Start WebSocket Server
    await this.startWebSocketServer();
    await this.delay(1000);

    // Start Frontend last
    await this.startFrontend();

    console.log('\n✅ All services started!');
    console.log('🌐 Frontend:     http://localhost:' + this.availablePorts.frontend);
    console.log('🔌 WebSocket:    ws://localhost:' + this.availablePorts.websocket + '/ws');
    if (assetServerReady) {
      console.log('📁 Asset Server: http://localhost:' + this.availablePorts.assets);
      console.log('   📊 Health:    http://localhost:' + this.availablePorts.assets + '/health');
    }
    console.log('\n📝 Press Ctrl+C to stop all services');

    // Keep the script running
    await this.waitForShutdown();
  }

  async checkAssetServerReady() {
    const assetServerPath = path.join(__dirname, '../asset-server');
    const packageJsonPath = path.join(assetServerPath, 'package.json');
    const nodeModulesPath = path.join(assetServerPath, 'node_modules');
    
    return fs.existsSync(packageJsonPath) && fs.existsSync(nodeModulesPath);
  }

  async ensureEnvFile() {
    const envPath = path.join(__dirname, '../.env');
    const assetServerUrl = `VITE_ASSET_SERVER_URL=http://localhost:${this.availablePorts.assets}`;
    
    if (!fs.existsSync(envPath)) {
      console.log('📝 Creating .env file...');
      fs.writeFileSync(envPath, assetServerUrl + '\n');
    } else {
      // Update existing .env if needed
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (!envContent.includes('VITE_ASSET_SERVER_URL')) {
        console.log('📝 Updating .env file with asset server URL...');
        envContent += '\n' + assetServerUrl + '\n';
        fs.writeFileSync(envPath, envContent);
      }
    }
  }

  async startAssetServer() {
    console.log('📁 Starting Asset Server...');
    
    const process = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '../asset-server'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        PORT: this.availablePorts.assets,
        FORCE_COLOR: '1'
      }
    });

    this.processes.push({ name: 'Asset Server', process });
    this.setupProcessLogging(process, '📁 [ASSETS]');
  }

  async startWebSocketServer() {
    console.log('🔌 Starting WebSocket Server...');
    
    const process = spawn('npm', ['run', 'server:dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        PORT: this.availablePorts.websocket,
        FORCE_COLOR: '1'
      }
    });

    this.processes.push({ name: 'WebSocket Server', process });
    this.setupProcessLogging(process, '🔌 [WS]');
  }

  async startFrontend() {
    console.log('🖥️  Starting Frontend...');
    
    const process = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        PORT: this.availablePorts.frontend,
        FORCE_COLOR: '1'
      }
    });

    this.processes.push({ name: 'Frontend', process });
    this.setupProcessLogging(process, '🖥️  [FRONTEND]');
  }

  setupProcessLogging(childProcess, prefix) {
    childProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => console.log(`${prefix} ${line}`));
    });

    childProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => console.log(`${prefix} ${line}`));
    });

    childProcess.on('close', (code) => {
      if (!this.isShuttingDown) {
        console.log(`${prefix} Process exited with code ${code}`);
      }
    });
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log('\n🛑 Shutting down all services...');
      
      this.processes.forEach(({ name, process }) => {
        console.log(`   Stopping ${name}...`);
        process.kill('SIGTERM');
      });

      // Force kill after 5 seconds
      setTimeout(() => {
        this.processes.forEach(({ name, process }) => {
          if (!process.killed) {
            console.log(`   Force stopping ${name}...`);
            process.kill('SIGKILL');
          }
        });
        process.exit(0);
      }, 5000);

      // Clean exit when all processes are done
      Promise.all(
        this.processes.map(({ process }) => new Promise(resolve => {
          process.on('close', resolve);
        }))
      ).then(() => {
        console.log('✅ All services stopped');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  async runFrontend() {
    console.log('🖥️  Starting Frontend only...\n');
    this.setupGracefulShutdown();
    await this.startFrontend();
    console.log(`✅ Frontend running on http://localhost:${this.availablePorts.frontend}`);
    await this.waitForShutdown();
  }

  async runWebSocket() {
    console.log('🔌 Starting WebSocket Server only...\n');
    this.setupGracefulShutdown();
    await this.startWebSocketServer();
    console.log(`✅ WebSocket Server running on ws://localhost:${this.availablePorts.websocket}/ws`);
    await this.waitForShutdown();
  }

  async runAssetServer() {
    const ready = await this.checkAssetServerReady();
    if (!ready) {
      console.log('❌ Asset server not ready. Run: cd asset-server && npm install');
      return;
    }

    console.log('📁 Starting Asset Server only...\n');
    this.setupGracefulShutdown();
    await this.startAssetServer();
    console.log(`✅ Asset Server running on http://localhost:${this.availablePorts.assets}`);
    await this.waitForShutdown();
  }

  async processAssets() {
    console.log('🎨 Asset Processing Setup\n');
    
    // Check if Sharp is installed
    try {
      require.resolve('sharp');
      console.log('✅ Sharp is installed');
    } catch (e) {
      console.log('❌ Sharp not found. Installing...');
      await this.runCommand('npm install sharp');
    }

    console.log('\n📋 To process your assets, run:');
    console.log('node scripts/process-assets.js /Volumes/PS2000w/DnD_Assets/maps ./asset-server/assets');
    console.log('\nThis will:');
    console.log('• Convert images to WebP format');
    console.log('• Generate 300x300 thumbnails'); 
    console.log('• Create searchable manifest.json');
    console.log('• Reduce ~77MB to ~50MB optimized');
    
    process.exit(0);
  }

  showManualCommands() {
    console.log('📋 Manual Development Commands\n');
    
    console.log('🖥️  Frontend:');
    console.log(`   npm run dev  # Port ${this.availablePorts.frontend}`);
    if (this.availablePorts.frontend !== DEFAULT_PORTS.frontend) {
      console.log(`   PORT=${this.availablePorts.frontend} npm run dev`);
    }
    
    console.log('\n🔌 WebSocket Server:');
    console.log(`   npm run server:dev  # Port ${this.availablePorts.websocket}`);
    if (this.availablePorts.websocket !== DEFAULT_PORTS.websocket) {
      console.log(`   PORT=${this.availablePorts.websocket} npm run server:dev`);
    }
    
    console.log('\n📁 Asset Server:');
    console.log('   cd asset-server && npm install  # First time setup');
    console.log(`   cd asset-server && npm run dev  # Port ${this.availablePorts.assets}`);
    if (this.availablePorts.assets !== DEFAULT_PORTS.assets) {
      console.log(`   cd asset-server && PORT=${this.availablePorts.assets} npm run dev`);
    }

    console.log('\n🎨 Asset Processing:');
    console.log('   npm install sharp  # Install image processing');
    console.log('   node scripts/process-assets.js /Volumes/PS2000w/DnD_Assets/maps ./asset-server/assets');

    console.log('\n🔧 Environment:');
    console.log(`   echo "VITE_ASSET_SERVER_URL=http://localhost:${this.availablePorts.assets}" >> .env`);
    
    process.exit(0);
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error}`);
          reject(error);
        } else {
          console.log(stdout);
          if (stderr) console.error(stderr);
          resolve(stdout);
        }
      });
    });
  }

  async waitForShutdown() {
    return new Promise(resolve => {
      // This will resolve when shutdown is initiated
      const checkShutdown = () => {
        if (this.isShuttingDown) {
          resolve();
        } else {
          setTimeout(checkShutdown, 1000);
        }
      };
      checkShutdown();
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const setup = new NexusSetup();
  setup.run().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

export { NexusSetup };
