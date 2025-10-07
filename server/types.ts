import type { WebSocket } from 'ws';

export interface GameState {
  scenes: unknown[];
  activeSceneId: string | null;
  characters: unknown[];
  initiative: unknown;
}

// Server-side types
export interface Room {
  code: string;
  host: string;
  players: Set<string>;
  connections: Map<string, WebSocket>;
  created: number;
  lastActivity: number;
  status: 'active' | 'hibernating' | 'abandoned';
  hibernationTimer?: NodeJS.Timeout;
  gameState?: GameState;
}

export interface Connection {
  id: string;
  ws: WebSocket;
  room?: string;
  user?: {
    name: string;
    type: 'host' | 'player';
  };
}

export interface ServerMessage {
  type: string;
  data: unknown;
  src?: string;
  dst?: string;
  timestamp: number;
}
