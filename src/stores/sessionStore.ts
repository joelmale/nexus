import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Session, Player, ConnectionState } from '@/types/game';

interface SessionStore {
  session: Session | null;
  players: Player[];
  connectionState: ConnectionState;
  serverRoomCode: string | null;
  currentUserId: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setConnectionState: (state: ConnectionState) => void;
  setServerRoomCode: (code: string | null) => void;
  setCurrentUserId: (userId: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
  immer((set) => ({
    session: null,
    players: [],
    connectionState: {
      isConnected: false,
      quality: 'disconnected',
      latency: 0,
      packetLoss: 0,
      lastUpdate: 0,
      reconnectAttempts: 0,
    },
    serverRoomCode: null,
    currentUserId: null,

    setSession: (session) =>
      set((state) => {
        state.session = session;
      }),

    setPlayers: (players) =>
      set((state) => {
        state.players = players;
      }),

    addPlayer: (player) =>
      set((state) => {
        const existing = state.players.find((p) => p.id === player.id);
        if (!existing) {
          state.players.push(player);
        }
      }),

    removePlayer: (playerId) =>
      set((state) => {
        state.players = state.players.filter((p) => p.id !== playerId);
      }),

    updatePlayer: (playerId, updates) =>
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (player) {
          Object.assign(player, updates);
        }
      }),

    setConnectionState: (connectionState) =>
      set((state) => {
        state.connectionState = connectionState;
      }),

    setServerRoomCode: (code) =>
      set((state) => {
        state.serverRoomCode = code;
      }),

    setCurrentUserId: (userId) =>
      set((state) => {
        state.currentUserId = userId;
      }),

    clearSession: () =>
      set((state) => {
        state.session = null;
        state.players = [];
        state.connectionState = {
          isConnected: false,
          quality: 'disconnected',
          latency: 0,
          packetLoss: 0,
          lastUpdate: 0,
          reconnectAttempts: 0,
        };
        state.serverRoomCode = null;
        state.currentUserId = null;
      }),
  })),
);

// Selector hooks
export const useSession = () => useSessionStore((state) => state.session);
export const usePlayers = () => useSessionStore((state) => state.players);
export const useConnectionState = () => useSessionStore((state) => state.connectionState);
export const useServerRoomCode = () => useSessionStore((state) => state.serverRoomCode);
export const useIsHost = () => {
  const session = useSessionStore((state) => state.session);
  const currentUserId = useSessionStore((state) => state.currentUserId);
  return session?.hostId === currentUserId;
};
