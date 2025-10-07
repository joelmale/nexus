import type { WebSocketMessage, GameEvent, DiceRoll, DrawingCreateEvent, DrawingUpdateEvent, DrawingDeleteEvent } from '@/types/game';
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
    const wsPort = import.meta.env.VITE_WS_PORT || '5000';
    const wsUrl = `ws://localhost:${wsPort}`;
    if (roomCode) {
      return userType === 'host' ? `${wsUrl}?reconnect=${roomCode}` : `${wsUrl}?join=${roomCode}`;
    }
    return wsUrl;
  }

  connect(roomCode?: string, userType?: 'host' | 'player'): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const url = this.getWebSocketUrl(roomCode, userType);
        
        console.log('Attempting to connect to:', url);
        this.ws = new WebSocket(url);

        // Set a connection timeout
        const timeout = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          
          // Send queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message && this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(message);
            }
          }
          
          resolve();
        };

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
          clearTimeout(timeout);
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.connectionPromise = null;
          
          if (event.code !== 1000) { // Not a normal closure
            this.handleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', error);
          this.connectionPromise = null;
          
          // Only reject if we haven't connected yet
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            reject(new Error('WebSocket connection failed'));
          }
        };

      } catch (error) {
        this.connectionPromise = null;
        reject(error);
      }
    });

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

        if (message.data.name === 'session/created') {
          this.lastSessionCreatedEvent = message.data;
        } else if (message.data.name === 'session/joined') {
          this.lastSessionJoinedEvent = message.data;
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
  sendGameStateUpdate(partialState: Partial<import('@/types/game').GameState>) {
    console.log('📤 Sending game state update to server:', partialState);
    this.sendMessage({
      type: 'state',
      data: partialState as Partial<import('@/types/game').GameState>,
      timestamp: Date.now(),
      src: useGameStore.getState().user.id,
    });
  }

  // Specialized method for drawing synchronization
  sendDrawingEvent(type: 'create' | 'update' | 'delete', sceneId: string, data: DrawingCreateEvent['data'] | DrawingUpdateEvent['data'] | DrawingDeleteEvent['data']) {
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
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === 'event') {
        callback(customEvent.detail.data as WebSocketMessage['data']);
      }
    };

    this.addEventListener('message', handler);

    return () => {
      this.removeEventListener('message', handler);
    };
  }
}

export const webSocketService = new WebSocketService();
