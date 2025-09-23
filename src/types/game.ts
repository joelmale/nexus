// Core game state types
export interface User {
  id: string;
  name: string;
  type: 'host' | 'player';
  color: string;
  connected: boolean;
}

export interface Session {
  roomCode: string;
  hostId: string;
  players: User[];
  status: 'connecting' | 'connected' | 'disconnected';
}

export interface DiceRoll {
  id: string;
  userId: string;
  userName: string;
  expression: string; // e.g., "2d6+3"
  results: number[];
  total: number;
  timestamp: number;
}

export interface GameState {
  user: User;
  session: Session | null;
  diceRolls: DiceRoll[];
  activeTab: TabType;
}

export type TabType = 'lobby' | 'dice' | 'scenes' | 'tokens';

// WebSocket message types
export interface BaseMessage {
  type: string;
  timestamp: number;
  src: string;
  dst?: string;
}

export interface EventMessage extends BaseMessage {
  type: 'event';
  data: {
    name: string;
    [key: string]: any;
  };
}

export interface StateMessage extends BaseMessage {
  type: 'state';
  data: Partial<GameState>;
}

export interface DiceRollMessage extends BaseMessage {
  type: 'dice-roll';
  data: DiceRoll;
}

export type WebSocketMessage = EventMessage | StateMessage | DiceRollMessage;

// Game events
export interface GameEvent {
  type: string;
  data: any;
}

export interface DiceRollEvent extends GameEvent {
  type: 'dice/roll';
  data: {
    expression: string;
  };
}

export interface UserJoinEvent extends GameEvent {
  type: 'user/join';
  data: {
    name: string;
  };
}
