import type {
  WebSocketMessage,
  GameEvent,
  DiceRoll,
  DrawingCreateEvent,
  DrawingUpdateEvent,
  DrawingDeleteEvent,
  SessionCreatedEvent,
  SessionJoinedEvent,
  HeartbeatMessage,
} from '@/types/game';
import type { WebSocketCustomEvent } from '@/types/events';
import type { ChatMessage } from '@/types/game';
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

  // Heartbeat and connection quality monitoring
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 10 * 1000; // 10 seconds timeout
  private connectionQuality = {
    latency: 0,
    packetLoss: 0,
    lastPingTime: 0,
    consecutiveMisses: 0,
    quality: 'excellent' as 'excellent' | 'good' | 'poor' | 'critical',
    lastUpdate: 0,
  };

  // Get WebSocket URL dynamically from environment
  private getWebSocketUrl(
    roomCode?: string,
    userType?: 'host' | 'player',
    campaignId?: string,
  ): string {
    // In Docker/K8s, use environment variable or default to 5001
    // In dev, we'll try multiple ports via fallback logic in connect()
    const wsPort = import.meta.env.VITE_WS_PORT || '5001';
    const wsHost = import.meta.env.VITE_WS_HOST || 'localhost';
    const wsUrl = `ws://${wsHost}:${wsPort}`;

    const params = new URLSearchParams();
    if (roomCode) {
      if (userType === 'host') {
        params.set('reconnect', roomCode);
      } else {
        params.set('join', roomCode);
      }
    }
    if (campaignId) {
      params.set('campaignId', campaignId);
    }

    // Add user ID to the query parameters
    const userId = useGameStore.getState().user.id;
    if (userId) {
      params.set('userId', userId);
    }

    const queryString = params.toString();
    return queryString ? `${wsUrl}?${queryString}` : wsUrl;
  }

  // 🔍 Discover which port the server is running on via HTTP health check
  private async discoverServerPort(): Promise<string | null> {
    const isDev = import.meta.env.DEV;
    if (!isDev) return null; // Only do discovery in development

    const basePorts = ['5001', '5002', '5003', '5004'];
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
    userType?: 'host' | 'player',
    campaignId?: string,
  ): Promise<WebSocket> {
    const isDev = import.meta.env.DEV;
    const basePorts = [
      import.meta.env.VITE_WS_PORT || '5001',
      '5002',
      '5003',
      '5004',
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
          ...basePorts.filter((p) => p !== discoveredPort),
        ];
      } else {
        // Fallback to checking cached port
        try {
          const lastWorkingPort = localStorage.getItem('nexus_ws_port');
          if (lastWorkingPort && basePorts.includes(lastWorkingPort)) {
            // Move last working port to the front
            portsToTry = [
              lastWorkingPort,
              ...basePorts.filter((p) => p !== lastWorkingPort),
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

        // Build URL with query parameters
        const params = new URLSearchParams();
        if (roomCode) {
          if (userType === 'host') {
            params.set('reconnect', roomCode);
          } else {
            params.set('join', roomCode);
          }
        }
        if (campaignId) {
          params.set('campaignId', campaignId);
        }

        const queryString = params.toString();
        const url = queryString ? `${wsUrl}?${queryString}` : wsUrl;

        console.log(`🔌 Attempting WebSocket connection to ${url}...`);

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

  connect(
    roomCode?: string,
    userType?: 'host' | 'player',
    campaignId?: string,
  ): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        // Try connecting with fallback to multiple ports in dev
        this.ws = await this.tryConnectWithFallback(
          roomCode,
          userType,
          campaignId,
        );

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
            console.log(
              '🔌 [CLIENT] Raw WebSocket message received:',
              event.data,
            );
            this.handleMessage(message);
          } catch (error) {
            console.error(
              '🔌 [CLIENT] Failed to parse WebSocket message:',
              error,
              event.data,
            );
          }
        };

        // Start heartbeat mechanism
        this.startHeartbeat();

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.connectionPromise = null;

          if (event.code !== 1000) {
            // Not a normal closure
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

        if (
          message.data.name === 'session/created' &&
          'roomCode' in message.data
        ) {
          this.lastSessionCreatedEvent = {
            roomCode: message.data.roomCode as string,
          };
        } else if (message.data.name === 'session/joined') {
          this.lastSessionJoinedEvent =
            message.data as unknown as SessionJoinedEvent['data'];
        }

        const gameEvent: GameEvent = {
          type: message.data.name,
          data: message.data,
        };
        gameStore.applyEvent(gameEvent);

        // Also emit a specific event for the drawing synchronization
        if (message.data.name === 'drawing/create') {
          this.dispatchEvent(
            new CustomEvent('drawingSync', {
              detail: {
                type: 'drawing/create',
                data: message.data,
              },
            }),
          );
        }
        break;
      }

      case 'dice-roll':
        gameStore.addDiceRoll(message.data);
        break;

      case 'chat-message':
        gameStore.addChatMessage(message.data);
        break;

      case 'update-confirmed':
        gameStore.confirmUpdate(message.data.updateId);
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
          import('@/services/sessionPersistence')
            .then(({ sessionPersistenceService }) => {
              sessionPersistenceService.clearAll();
              // Reset the game store to initial state
              gameStore.reset();
              toast.error('Session Expired', {
                description:
                  'Your previous session has expired. Creating a new room.',
              });
            })
            .catch((error) => {
              console.error('Failed to clear session data:', error);
              // Still reset the game store even if clearing fails
              gameStore.reset();
              toast.error('Session Expired', {
                description:
                  'Your previous session has expired. Creating a new room.',
              });
            });
        } else if (
          message.data.code === 409 &&
          message.data.message.includes('version conflict')
        ) {
          // Handle version conflict - rollback optimistic update
          console.warn(
            '⚠️ Version conflict detected, rolling back optimistic update',
          );
          // The updateId should be extracted from the error context if available
          // For now, we'll show a warning to the user
          toast.warning('Update Conflict', {
            description:
              'Your change was rejected due to a conflict. Please try again.',
          });
        } else {
          toast.error('Server Error', { description: message.data.message });
        }
        break;

      case 'heartbeat':
        this.handleHeartbeatMessage(message);
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
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
      );

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

  sendChatMessage(message: ChatMessage['data']) {
    console.log('💬 Sending chat message:', message.content);
    this.sendMessage({
      type: 'chat-message',
      data: message,
      timestamp: Date.now(),
      src: useGameStore.getState().user.id,
    } as any);
  }

  // Send game state update to server for persistence
  sendGameStateUpdate(partialState: {
    sceneState?: unknown;
    characters?: unknown[];
    initiative?: unknown;
  }) {
    console.log('📤 Sending game state update to server:', partialState);
    this.sendMessage({
      type: 'state',
      data: partialState as never,
      timestamp: Date.now(),
      src: useGameStore.getState().user.id,
    });
  }

  // Specialized method for drawing synchronization
  sendDrawingEvent(
    type: 'create' | 'update' | 'delete',
    data:
      | DrawingCreateEvent['data']
      | DrawingUpdateEvent['data']
      | DrawingDeleteEvent['data'],
  ) {
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

      const timeout = setTimeout(
        () => reject(new Error('Room creation timeout')),
        10000,
      );

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

      const timeout = setTimeout(
        () => reject(new Error('Room join timeout')),
        10000,
      );

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

  private sendMessage(
    message: Omit<WebSocketMessage, 'src'> & { src: string },
  ) {
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

  // Heartbeat methods
  private startHeartbeat() {
    // DISABLE CLIENT HEARTBEAT - let server handle heartbeat monitoring
    // Client only responds to server pings, doesn't initiate its own
    console.log('💓 Client heartbeat disabled - using server heartbeat only');
    return;

    // Original client heartbeat code (disabled):
    // if (this.heartbeatTimer) return; // Already running
    // console.log('💓 Starting client heartbeat');
    // this.heartbeatTimer = setInterval(() => {
    //   if (this.ws?.readyState === WebSocket.OPEN) {
    //     this.sendPing();
    //   }
    // }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('💓 Stopped client heartbeat');
    }
  }

  private sendPing() {
    // DISABLED: Client doesn't send pings anymore - only responds to server pings
    console.warn('⚠️ sendPing called but client heartbeat is disabled');
    return;

    // Original ping sending code (disabled):
    // const pingId = uuidv4();
    // this.connectionQuality.lastPingTime = Date.now();
    // this.sendMessage({
    //   type: 'heartbeat',
    //   data: { type: 'ping', id: pingId },
    //   timestamp: Date.now(),
    //   src: useGameStore.getState().user.id,
    // });
    // // Set timeout for pong response
    // setTimeout(() => {
    //   // Check if we still haven't received a pong for this ping
    //   if (
    //     this.connectionQuality.lastPingTime ===
    //     this.connectionQuality.lastPingTime
    //   ) {
    //     this.handleMissedPong();
    //   }
    // }, this.HEARTBEAT_TIMEOUT);
  }

  private handleHeartbeatMessage(message: HeartbeatMessage) {
    if (message.data.type === 'ping') {
      // Respond to server ping with pong
      this.sendMessage({
        type: 'heartbeat',
        data: {
          type: 'pong',
          id: message.data.id,
          serverTime: message.timestamp,
        },
        timestamp: Date.now(),
        src: useGameStore.getState().user.id,
      });

      // Update connection quality based on server ping timing
      const latency = Date.now() - message.timestamp;
      this.updateConnectionQuality(latency);
    }
    // Removed pong handling since client doesn't send pings anymore
  }

  private handleMissedPong() {
    // DISABLED: Client doesn't send pings anymore, so no missed pongs to handle
    console.warn('⚠️ handleMissedPong called but client heartbeat is disabled');
    return;

    // Original missed pong handling (disabled):
    // this.connectionQuality.consecutiveMisses += 1;
    // this.connectionQuality.packetLoss += 1;
    // // Update quality based on consecutive misses
    // if (this.connectionQuality.consecutiveMisses >= 3) {
    //   this.connectionQuality.quality = 'critical';
    // } else if (this.connectionQuality.consecutiveMisses >= 2) {
    //   this.connectionQuality.quality = 'poor';
    // } else if (this.connectionQuality.consecutiveMisses >= 1) {
    //   this.connectionQuality.quality = 'good';
    // }
    // this.connectionQuality.lastUpdate = Date.now();
    // console.warn(
    //   `⚠️ Missed pong response (${this.connectionQuality.consecutiveMisses} consecutive)`,
    // );
  }

  private updateConnectionQuality(latency: number) {
    this.connectionQuality.latency = latency;
    this.connectionQuality.consecutiveMisses = 0; // Reset on successful pong
    this.connectionQuality.lastUpdate = Date.now();

    // Update quality based on latency
    if (latency < 100) {
      this.connectionQuality.quality = 'excellent';
    } else if (latency < 500) {
      this.connectionQuality.quality = 'good';
    } else if (latency < 2000) {
      this.connectionQuality.quality = 'poor';
    } else {
      this.connectionQuality.quality = 'critical';
    }

    console.log(
      `📊 Connection quality: ${this.connectionQuality.quality} (${latency}ms latency)`,
    );
  }

  disconnect() {
    console.log('Manually disconnecting WebSocket');
    this.stopHeartbeat();
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
      console.log(
        '✅ Cleared cached WebSocket port - next connection will discover server',
      );
    } catch (error) {
      console.warn('Failed to clear cached port:', error);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionQuality(): {
    latency: number;
    packetLoss: number;
    quality: 'excellent' | 'good' | 'poor' | 'critical';
    lastUpdate: number;
    consecutiveMisses: number;
  } {
    return { ...this.connectionQuality };
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'unknown';
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
declare global {
  interface Window {
    webSocketService?: WebSocketService;
  }
}

if (import.meta.env.DEV) {
  window.webSocketService = webSocketService;
  console.log(
    '🔧 Debug: webSocketService available at window.webSocketService',
  );
  console.log(
    '   - window.webSocketService.clearCachedPort() to clear port cache',
  );
}
