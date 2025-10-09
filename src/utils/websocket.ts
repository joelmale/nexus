import type { WebSocketMessage, GameEvent, DiceRoll, DrawingCreateEvent, DrawingUpdateEvent, DrawingDeleteEvent, SessionCreatedEvent, SessionJoinedEvent } from '@/types/game';
import type { WebSocketCustomEvent } from '@/types/events';
import { useGameStore } from '@/stores/gameStore';
import { toast } from 'sonner';

class WebSocketService extends EventTarget {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: string[] = [];
  private connectionPromise: Promise<void> | null = null;
  private lastSessionCreatedEvent: SessionCreatedEvent['data'] | null = null;
  private lastSessionJoinedEvent: SessionJoinedEvent['data'] | null = null;

  // Get WebSocket URL dynamically from environment
  private getWebSocketUrl(roomCode?: string, userType?: 'host' | 'player'): string {
    // In Docker/K8s, use environment variable or default to 5000
    // In dev, we'll try multiple ports via fallback logic in connect()
    const wsPort = import.meta.env.VITE_WS_PORT || '5000';
    const wsHost = import.meta.env.VITE_WS_HOST || 'localhost';
    const wsUrl = `ws://${wsHost}:${wsPort}`;
    if (roomCode) {
      return userType === 'host' ? `${wsUrl}?reconnect=${roomCode}` : `${wsUrl}?join=${roomCode}`;
    }
    return wsUrl;
  }

  // 🔍 Discover which port the server is running on via HTTP health check
  private async discoverServerPort(): Promise<string | null> {
    const isDev = import.meta.env.DEV;
    if (!isDev) return null; // Only do discovery in development

    const basePorts = ['5000', '5001', '5002', '5003'];
    const wsHost = import.meta.env.VITE_WS_HOST || 'localhost';

    console.log('🔍 Discovering server via HTTP health checks...');

    for (const port of basePorts) {
      try {
        const response = await fetch(`http://${wsHost}:${port}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000), // 1 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Found server on port ${port}:`, data);
          return data.port?.toString() || port;
        }
      } catch {
        // Server not on this port, continue trying
      }
    }

    console.log('❌ No server found via HTTP discovery');
    return null;
  }

  // Try connecting to multiple ports (for dev environment)
  private async tryConnectWithFallback(
    roomCode?: string,
    userType?: 'host' | 'player'
  ): Promise<WebSocket> {
    const isDev = import.meta.env.DEV;
    const basePorts = [
      import.meta.env.VITE_WS_PORT || '5000',
      '5001',
      '5002',
      '5003'
    ];

    // In production/docker, only try the configured port
    let portsToTry = isDev ? basePorts : [basePorts[0]];

    // In dev, try server discovery first (HTTP health check)
    if (isDev) {
      const discoveredPort = await this.discoverServerPort();
      if (discoveredPort) {
        console.log(`🎯 Using discovered port: ${discoveredPort}`);
        // Move discovered port to front
        portsToTry = [
          discoveredPort,
          ...basePorts.filter(p => p !== discoveredPort)
        ];
      } else {
        // Fallback to checking cached port
        try {
          const lastWorkingPort = localStorage.getItem('nexus_ws_port');
          if (lastWorkingPort && basePorts.includes(lastWorkingPort)) {
            // Move last working port to the front
            portsToTry = [
              lastWorkingPort,
              ...basePorts.filter(p => p !== lastWorkingPort)
            ];
          }
        } catch {
          // localStorage might not be available
        }
      }
    }

    const wsHost = import.meta.env.VITE_WS_HOST || 'localhost';

    for (const port of portsToTry) {
      try {
        const wsUrl = `ws://${wsHost}:${port}`;
        const url = roomCode
          ? (userType === 'host' ? `${wsUrl}?reconnect=${roomCode}` : `${wsUrl}?join=${roomCode}`)
          : wsUrl;

        console.log(`🔌 Attempting WebSocket connection to ${wsUrl}...`);

        const ws = await this.attemptConnection(url, port);
        console.log(`✅ Connected to WebSocket on port ${port}`);

        // Save the working port to localStorage for faster next connection
        if (isDev) {
          localStorage.setItem('nexus_ws_port', port);
        }

        return ws;
      } catch (error) {
        console.log(`❌ Failed to connect on port ${port}`);
        if (!isDev || port === portsToTry[portsToTry.length - 1]) {
          throw error;
        }
        // Continue to next port
      }
    }

    throw new Error('Failed to connect to WebSocket on any available port');
  }

  private attemptConnection(url: string, port: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout on port ${port}`));
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  connect(roomCode?: string, userType?: 'host' | 'player'): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        // Try connecting with fallback to multiple ports in dev
        this.ws = await this.tryConnectWithFallback(roomCode, userType);

        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;

        // Send queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (message && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(message);
          }
        }

        // Set up message handlers
        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('🔌 [CLIENT] Raw WebSocket message received:', event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('🔌 [CLIENT] Failed to parse WebSocket message:', error, event.data);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.connectionPromise = null;

          if (event.code !== 1000) { // Not a normal closure
            this.handleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connectionPromise = null;
        };

        this.connectionPromise = null;
      } catch (error) {
        this.connectionPromise = null;
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('📨 Received WebSocket message:', message.type, message.data);
    const gameStore = useGameStore.getState();

    // Emit custom event for components to listen to
    this.dispatchEvent(new CustomEvent('message', { detail: message }));

    switch (message.type) {
      case 'event': {
        console.log('🎯 Processing event:', message.data.name, message.data);

        // Session events will be handled by the gameStore's applyEvent method

        if (message.data.name === 'session/created' && 'roomCode' in message.data) {
          this.lastSessionCreatedEvent = { roomCode: message.data.roomCode as string };
        } else if (message.data.name === 'session/joined') {
          this.lastSessionJoinedEvent = message.data as unknown as SessionJoinedEvent['data'];
        }

        const gameEvent: GameEvent = {
          type: message.data.name,
          data: message.data,
        };
        gameStore.applyEvent(gameEvent);

        // Also emit a specific event for the drawing synchronization
        if (message.data.name === 'drawing/create') {
          this.dispatchEvent(new CustomEvent('drawingSync', {
            detail: {
              type: 'drawing/create',
              data: message.data
            }
          }));
        }
        break;
      }

      case 'dice-roll':
        gameStore.addDiceRoll(message.data);
        break;

      case 'state':
        // Apply partial state updates
        if (message.data.session) {
          gameStore.setSession(message.data.session);
        }
        break;

      case 'error':
        console.error('Server error:', message.data.message);

        // Handle specific error cases
        if (message.data.message === 'Room not found') {
          console.log('🗑️ Room not found - clearing stored session data');
          // Import synchronously since sessionPersistenceService is already available
          import('@/services/sessionPersistence').then(({ sessionPersistenceService }) => {
            sessionPersistenceService.clearAll();
            // Reset the game store to initial state
            gameStore.reset();
            toast.error('Session Expired', { description: 'Your previous session has expired. Creating a new room.' });
          }).catch(error => {
            console.error('Failed to clear session data:', error);
            // Still reset the game store even if clearing fails
            gameStore.reset();
            toast.error('Session Expired', { description: 'Your previous session has expired. Creating a new room.' });
          });
        } else {
          toast.error('Server Error', { description: message.data.message });
        }
        break;

      default: {
        // This is an exhaustive check. If a new message type is added, this will cause a TypeScript error.
        const _exhaustiveCheck: never = message;
        console.warn('Unknown message type:', _exhaustiveCheck);
        break;
      }
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        const session = useGameStore.getState().session;
        if (session) {
          this.connect(session.roomCode).catch((error) => {
            console.error('Reconnection failed:', error);
          });
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      useGameStore.getState().setSession(null);
      
      // Reset for potential future connections
      this.reconnectAttempts = 0;
    }
  }

  sendEvent(event: GameEvent) {
    console.log('📤 Sending event:', event.type, event.data);
    this.sendMessage({
      type: 'event',
      data: { name: event.type, ...(event.data as object) },
      timestamp: Date.now(),
      src: useGameStore.getState().user.id,
    });
  }

  sendDiceRoll(roll: DiceRoll) {
    this.sendMessage({
      type: 'dice-roll',
      data: roll,
      timestamp: Date.now(),
      src: useGameStore.getState().user.id,
    });
  }

  // Send game state update to server for persistence
  sendGameStateUpdate(partialState: { sceneState?: unknown; characters?: unknown[]; initiative?: unknown }) {
    console.log('📤 Sending game state update to server:', partialState);
    this.sendMessage({
      type: 'state',
      data: partialState as never,
      timestamp: Date.now(),
      src: useGameStore.getState().user.id,
    });
  }

  // Specialized method for drawing synchronization
  sendDrawingEvent(type: 'create' | 'update' | 'delete', data: DrawingCreateEvent['data'] | DrawingUpdateEvent['data'] | DrawingDeleteEvent['data']) {
    const drawingEvent: GameEvent = {
      type: `drawing/${type}`,
      data: data,
    };
    this.sendEvent(drawingEvent);
  }

  waitForSessionCreated(): Promise<SessionCreatedEvent['data']> {
    return new Promise((resolve, reject) => {
      if (this.lastSessionCreatedEvent) {
        resolve(this.lastSessionCreatedEvent);
        return;
      }

      const timeout = setTimeout(() => reject(new Error('Room creation timeout')), 10000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.data?.name === 'session/created') {
          clearTimeout(timeout);
          this.removeEventListener('message', handler);
          resolve(customEvent.detail.data);
        }
      };

      this.addEventListener('message', handler);
    });
  }

  waitForSessionJoined(): Promise<SessionJoinedEvent['data']> {
    return new Promise((resolve, reject) => {
      if (this.lastSessionJoinedEvent) {
        resolve(this.lastSessionJoinedEvent);
        return;
      }

      const timeout = setTimeout(() => reject(new Error('Room join timeout')), 10000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.data?.name === 'session/joined') {
          clearTimeout(timeout);
          this.removeEventListener('message', handler);
          resolve(customEvent.detail.data);
        }
      };

      this.addEventListener('message', handler);
    });
  }

  private sendMessage(message: Omit<WebSocketMessage, 'src'> & { src: string }) {
    const messageStr = JSON.stringify(message);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(messageStr);
      console.log('✅ Message sent successfully');
    } else {
      // Queue message for when connection is restored
      console.log('⏳ WebSocket not ready, queueing message');
      this.messageQueue.push(messageStr);
      
      // Limit queue size to prevent memory issues
      if (this.messageQueue.length > 50) {
        this.messageQueue.shift();
      }
    }
  }

  disconnect() {
    console.log('Manually disconnecting WebSocket');
    if (this.ws) {
      // Use code 1000 for normal closure
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.connectionPromise = null;
  }

  /**
   * Clear cached server port - useful if server restarts on different port
   * Run in browser console: window.webSocketService.clearCachedPort()
   */
  clearCachedPort(): void {
    try {
      localStorage.removeItem('nexus_ws_port');
      console.log('✅ Cleared cached WebSocket port - next connection will discover server');
    } catch (error) {
      console.warn('Failed to clear cached port:', error);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  /**
   * Subscribe to WebSocket messages
   * Returns an unsubscribe function
   */
  subscribe(callback: (event: WebSocketMessage['data']) => void): () => void {
    const handler = (event: WebSocketCustomEvent) => {
      if (event.detail?.type === 'event') {
        callback(event.detail.data);
      }
    };

    this.addEventListener('message', handler as EventListener);

    return () => {
      this.removeEventListener('message', handler as EventListener);
    };
  }
}

export const webSocketService = new WebSocketService();

// Expose to window for debugging
if (import.meta.env.DEV) {
  (window as any).webSocketService = webSocketService;
  console.log('🔧 Debug: webSocketService available at window.webSocketService');
  console.log('   - window.webSocketService.clearCachedPort() to clear port cache');
}
