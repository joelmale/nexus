// Server-side types
export interface Room {
  code: string;
  host: string;
  players: Set<string>;
  connections: Map<string, WebSocket>;
  created: number;
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
  data: any;
  src?: string;
  dst?: string;
  timestamp: number;
}
