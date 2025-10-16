import type { WebSocket } from 'ws';
import type { ServerDiceRoll } from './diceRoller.js';

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
  coHosts: Set<string>; // Support for multiple co-hosts
  players: Set<string>;
  connections: Map<string, WebSocket>;
  created: number;
  lastActivity: number;
  status: 'active' | 'hibernating' | 'abandoned';
  hibernationTimer?: NodeJS.Timeout;
  gameState?: GameState;
  entityVersions: Map<string, number>;
}

export interface Connection {
  id: string;
  ws: WebSocket;
  room?: string;
  user?: {
    name: string;
    type: 'host' | 'player';
  };
  // Heartbeat and connection quality tracking
  lastPing?: number;
  lastPong?: number;
  pendingPing?: string;
  consecutiveMisses: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

export interface BaseServerMessage {
  src?: string;
  dst?: string;
  timestamp: number;
}

export interface ServerEventMessage extends BaseServerMessage {
  type: 'event';
  data: {
    name: string;
    [key: string]: unknown; // Allow other properties
  };
}

export interface ServerDiceRollResultMessage extends BaseServerMessage {
  type: 'event';
  data: {
    name: 'dice/roll-result';
    roll: ServerDiceRoll;
  };
}

export interface ServerErrorMessage extends BaseServerMessage {
  type: 'error';
  data: {
    message: string;
    code?: number;
  };
}

export interface ServerHeartbeatMessage extends BaseServerMessage {
  type: 'heartbeat';
  data: {
    type: 'ping' | 'pong';
    id: string;
    serverTime?: number;
  };
}

export interface ServerUpdateConfirmationMessage extends BaseServerMessage {
  type: 'update-confirmed';
  data: {
    updateId: string;
  };
}

// Union type for all possible server messages
export type ServerMessage =
  | ServerEventMessage
  | ServerDiceRollResultMessage
  | ServerErrorMessage
  | ServerHeartbeatMessage
  | ServerUpdateConfirmationMessage;
