import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GameState, User, Session, DiceRoll, TabType, GameEvent } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

interface GameStore extends GameState {
  // Actions
  setUser: (user: Partial<User>) => void;
  setSession: (session: Session | null) => void;
  addDiceRoll: (roll: DiceRoll) => void;
  setActiveTab: (tab: TabType) => void;
  applyEvent: (event: GameEvent) => void;
  reset: () => void;
}

const initialState: GameState = {
  user: {
    id: uuidv4(),
    name: '',
    type: 'player',
    color: 'blue',
    connected: false,
  },
  session: null,
  diceRolls: [],
  activeTab: 'lobby',
};

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...initialState,

    setUser: (userData) => {
      set((state) => {
        Object.assign(state.user, userData);
      });
    },

    setSession: (session) => {
      set((state) => {
        state.session = session;
      });
    },

    addDiceRoll: (roll) => {
      set((state) => {
        state.diceRolls.unshift(roll);
        // Keep only last 50 rolls
        if (state.diceRolls.length > 50) {
          state.diceRolls = state.diceRolls.slice(0, 50);
        }
      });
    },

    setActiveTab: (tab) => {
      set((state) => {
        state.activeTab = tab;
      });
    },

    applyEvent: (event) => {
      console.log('Applying event:', event.type, event.data); // Debug log
      
      set((state) => {
        switch (event.type) {
          case 'dice/roll':
            // This will be handled by the dice service
            break;
          
          case 'user/join':
            if (state.session && event.data.user) {
              const existingIndex = state.session.players.findIndex(
                p => p.id === event.data.user.id
              );
              if (existingIndex >= 0) {
                state.session.players[existingIndex] = event.data.user;
              } else {
                state.session.players.push(event.data.user);
              }
            }
            break;

          case 'user/leave':
            if (state.session && event.data.userId) {
              state.session.players = state.session.players.filter(
                p => p.id !== event.data.userId
              );
            }
            break;

          case 'session/created':
            console.log('Creating session with data:', event.data); // Debug log
            state.session = {
              roomCode: event.data.roomCode || event.data.room, // Handle both formats
              hostId: state.user.id,
              players: [{ ...state.user, connected: true }], // Include current user
              status: 'connected',
            };
            state.user.type = 'host';
            state.user.connected = true;
            console.log('Session created:', state.session); // Debug log
            break;

          case 'session/joined':
            console.log('Joining session with data:', event.data); // Debug log
            state.session = {
              roomCode: event.data.roomCode || event.data.room, // Handle both formats
              hostId: event.data.hostId,
              players: event.data.players || [{ ...state.user, connected: true }],
              status: 'connected',
            };
            state.user.type = 'player';
            state.user.connected = true;
            console.log('Session joined:', state.session); // Debug log
            break;

          default:
            console.warn('Unknown event type:', event.type, event.data);
        }
      });
    },

    reset: () => {
      set(() => ({
        ...initialState,
        user: {
          ...initialState.user,
          id: uuidv4(), // Generate new ID on reset
        }
      }));
    },
  }))
);

// Selectors for common queries
export const useUser = () => useGameStore(state => state.user);
export const useSession = () => useGameStore(state => state.session);
export const useDiceRolls = () => useGameStore(state => state.diceRolls);
export const useActiveTab = () => useGameStore(state => state.activeTab);
export const useIsHost = () => useGameStore(state => state.user.type === 'host');
export const useIsConnected = () => useGameStore(state => state.user.connected);
