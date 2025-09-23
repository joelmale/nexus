import type { WebSocketMessage, GameEvent } from '@/types/game';
import { useGameStore } from '@/stores/gameStore';

declare const __WEBSOCKET_URL__: string;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: string[] = [];
  private connectionPromise: Promise<void> | null = null;

  connect(roomCode?: string): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const url = roomCode 
          ? `${__WEBSOCKET_URL__}?join=${roomCode}`
          : __WEBSOCKET_URL__;
        
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
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
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

    switch (message.type) {
      case 'event':
        console.log('🎯 Processing event:', message.data.name, message.data);
        gameStore.applyEvent({
          type: message.data.name,
          data: message.data,
        });
        break;

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
        // You could show a toast notification here
        break;

      default:
        console.warn('Unknown message type:', message.type);
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
    this.sendMessage({
      type: 'event',
      data: { name: event.type, ...event.data },
      timestamp: Date.now(),
      src: useGameStore.getState().user.id,
    });
  }

  sendDiceRoll(roll: any) {
    this.sendMessage({
      type: 'dice-roll',
      data: roll,
      timestamp: Date.now(),
      src: useGameStore.getState().user.id,
    });
  }

  private sendMessage(message: Omit<WebSocketMessage, 'src'> & { src: string }) {
    const messageStr = JSON.stringify(message);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(messageStr);
    } else {
      // Queue message for when connection is restored
      console.log('WebSocket not ready, queueing message');
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
}

export const webSocketService = new WebSocketService();
