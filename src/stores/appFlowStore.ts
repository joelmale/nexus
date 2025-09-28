/**
 * Simple Linear App Flow Store
 *
 * Replaces the complex lifecycle + game store split with a simple linear flow
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from './gameStore';
import { getLinearFlowStorage } from '@/services/linearFlowStorage';
import type {
  AppView,
  AppState,
  AppFlowActions,
  PlayerCharacter,
  GameConfig
} from '@/types/appFlow';

interface AppFlowStore extends AppState, AppFlowActions {}

// Generate a stable browser ID for linking characters to this "device/browser"
const getBrowserId = (): string => {
  const stored = localStorage.getItem('nexus-browser-id');
  if (stored) return stored;

  const newId = uuidv4();
  localStorage.setItem('nexus-browser-id', newId);
  return newId;
};

const initialState: AppState = {
  view: 'welcome',
  user: {
    name: '',
    type: null,
    id: getBrowserId()
  },
  isConnectedToRoom: false
};

export const useAppFlowStore = create<AppFlowStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Navigation
      setView: (view: AppView) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 AppFlow setView:', view);
        }
        set((state) => {
          state.view = view;
        });
      },

      setUser: (name: string, type: 'player' | 'dm') => {
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 AppFlow setUser:', { name, type });
        }
        set((state) => {
          state.user.name = name;
          state.user.type = type;
          // Auto-navigate to setup
          state.view = type === 'player' ? 'player_setup' : 'dm_setup';
        });

        // Sync with gameStore (convert 'dm' to 'host' for compatibility)
        const gameStore = useGameStore.getState();
        gameStore.setUser({
          name,
          type: type === 'dm' ? 'host' : 'player'
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Synced user to gameStore:', { name, type: type === 'dm' ? 'host' : 'player' });
        }
      },

      // Player flow
      joinRoomWithCode: async (roomCode: string, character?: PlayerCharacter) => {
        try {
          // TODO: Implement WebSocket connection to room
          console.log('Joining room:', roomCode, 'with character:', character?.name);

          set((state) => {
            state.roomCode = roomCode;
            state.isConnectedToRoom = true;
            state.view = 'game';
          });

          // If character provided, mark it as recently used
          if (character) {
            const characters = get().getSavedCharacters();
            const updated = characters.map(c =>
              c.id === character.id
                ? { ...c, lastUsed: Date.now() }
                : c
            );
            localStorage.setItem('nexus-characters', JSON.stringify(updated));
          }
        } catch (error) {
          console.error('Failed to join room:', error);
          throw error;
        }
      },

      createCharacter: (characterData) => {
        const character: PlayerCharacter = {
          ...characterData,
          id: uuidv4(),
          createdAt: Date.now(),
          playerId: get().user.id
        };

        // Save to localStorage
        const existing = get().getSavedCharacters();
        const updated = [...existing, character];
        localStorage.setItem('nexus-characters', JSON.stringify(updated));

        console.log('Created character:', character.name);
        return character;
      },

      selectCharacter: (characterId: string) => {
        const characters = get().getSavedCharacters();
        const character = characters.find(c => c.id === characterId);
        if (character) {
          console.log('Selected character:', character.name);
          // Character selection handled by UI components
        }
      },


      // DM flow
      createGameRoom: async (config: GameConfig) => {
        try {
          // TODO: Implement WebSocket room creation
          const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();

          if (process.env.NODE_ENV === 'development') {
            console.log('🎮 AppFlow createGameRoom:', { roomCode, config });
          }

          set((state) => {
            state.roomCode = roomCode;
            state.gameConfig = config;
            state.isConnectedToRoom = true;
            state.view = 'game';
          });

          if (process.env.NODE_ENV === 'development') {
            console.log('🏠 Room created, state updated:', {
              roomCode,
              view: 'game',
              isConnected: true
            });
          }

          return roomCode;
        } catch (error) {
          console.error('Failed to create room:', error);
          throw error;
        }
      },

      // Character persistence (using Ogres-style entity store)
      saveCharacter: (character: PlayerCharacter) => {
        const storage = getLinearFlowStorage();
        storage.saveCharacter(character);
      },

      getSavedCharacters: (): PlayerCharacter[] => {
        const storage = getLinearFlowStorage();
        return storage.getCharacters();
      },

      deleteCharacter: (characterId: string) => {
        const storage = getLinearFlowStorage();
        storage.deleteCharacter(characterId);
      },

      exportCharacters: (): string => {
        const characters = get().getSavedCharacters();
        return JSON.stringify({
          version: 1,
          exportedAt: Date.now(),
          playerId: get().user.id,
          playerName: get().user.name,
          characters
        }, null, 2);
      },

      importCharacters: (jsonData: string) => {
        try {
          const data = JSON.parse(jsonData);

          if (!data.characters || !Array.isArray(data.characters)) {
            throw new Error('Invalid character data format');
          }

          // Update character player IDs to current browser
          const importedCharacters: PlayerCharacter[] = data.characters.map((c: any) => ({
            ...c,
            id: uuidv4(), // New ID to avoid conflicts
            playerId: get().user.id, // Link to current browser
            createdAt: c.createdAt || Date.now()
          }));

          // Merge with existing characters
          const existing = get().getSavedCharacters();
          const merged = [...existing, ...importedCharacters];
          localStorage.setItem('nexus-characters', JSON.stringify(merged));

          console.log(`Imported ${importedCharacters.length} characters`);
        } catch (error) {
          console.error('Failed to import characters:', error);
          throw new Error('Invalid character file format');
        }
      },

      // Room management
      leaveRoom: () => {
        set((state) => {
          state.roomCode = undefined;
          state.isConnectedToRoom = false;
          state.view = state.user.type === 'player' ? 'player_setup' : 'dm_setup';
        });
        // TODO: Disconnect WebSocket
        console.log('Left room');
      },

      resetToWelcome: () => {
        set((state) => {
          state.view = 'welcome';
          state.user.name = '';
          state.user.type = null;
          state.roomCode = undefined;
          state.isConnectedToRoom = false;
        });
        // TODO: Disconnect WebSocket
        console.log('Reset to welcome');
      },

      // Development helpers
      dev_quickDM: (name: string = 'Test DM') => {
        set((state) => {
          state.user.name = name;
          state.user.type = 'dm';
          state.user.id = `dm-${Date.now()}`;
        });

        // Sync with gameStore
        const gameStore = useGameStore.getState();
        gameStore.setUser({
          name,
          type: 'host'
        });

        // Create a room with test config
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const config = {
          name: 'Test Campaign',
          description: 'Development test session',
          estimatedTime: '2',
          campaignType: 'oneshot' as const,
          maxPlayers: 4
        };

        set((state) => {
          state.roomCode = roomCode;
          state.gameConfig = config;
          state.isConnectedToRoom = true;
          state.view = 'game';
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('🎮 DEV: Quick DM setup complete:', {
            roomCode,
            config,
            finalState: {
              view: 'game',
              roomCode,
              isConnected: true
            }
          });
        }
      },

      dev_quickPlayer: (name: string = 'Test Player', roomCode?: string) => {
        set((state) => {
          state.user.name = name;
          state.user.type = 'player';
          state.user.id = `player-${Date.now()}`;
        });

        // Sync with gameStore
        const gameStore = useGameStore.getState();
        gameStore.setUser({
          name,
          type: 'player'
        });

        // Create a test character
        const testCharacter: PlayerCharacter = {
          id: `char-${Date.now()}`,
          name: 'Aragorn',
          race: 'Human',
          class: 'Ranger',
          level: 5,
          background: 'Folk Hero',
          stats: {
            str: 16, dex: 14, con: 13, int: 10, wis: 15, cha: 12
          },
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          browserId: getBrowserId()
        };

        // Save character and set as selected
        set((state) => {
          state.selectedCharacter = testCharacter;
        });

        get().saveCharacter(testCharacter);

        // Join room if provided, otherwise go to setup
        if (roomCode) {
          set((state) => {
            state.roomCode = roomCode;
            state.isConnectedToRoom = true;
            state.view = 'game';
          });
          console.log(`🎮 DEV: Quick player joined room: ${roomCode}`);
        } else {
          set((state) => {
            state.view = 'player_setup';
          });
          console.log('🎮 DEV: Quick player setup complete - ready to join room');
        }
      },

      dev_skipToGame: (userType: 'dm' | 'player' = 'dm') => {
        if (userType === 'dm') {
          get().dev_quickDM();
        } else {
          get().dev_quickPlayer();
          // Auto-join the room if DM already created one
          const existingRoom = 'TEST';
          get().dev_quickPlayer('Test Player', existingRoom);
        }
      }
    })),
    {
      name: 'nexus-app-flow',
      // Persist user data, room code, and view for session restoration
      partialize: (state) => {
        const persistedData = {
          user: {
            name: state.user.name,
            type: state.user.type,
            id: state.user.id
          },
          roomCode: state.roomCode,
          view: state.view,
          gameConfig: state.gameConfig,
          selectedCharacter: state.selectedCharacter
        };

        if (process.env.NODE_ENV === 'development') {
          console.log('📦 AppFlow persist partialize:', persistedData);
        }

        return persistedData;
      },

      // Add verbose logging for debugging
      onRehydrateStorage: () => (state) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 AppFlow rehydrated with state:', state);
          if (state) {
            console.log('  - User:', state.user);
            console.log('  - Room Code:', state.roomCode);
            console.log('  - View:', state.view);
            console.log('  - Game Config:', state.gameConfig);
            console.log('  - Selected Character:', state.selectedCharacter);
          }
        }

        // Immediately sync user data to gameStore when rehydrated
        if (state?.user?.name && state?.user?.type) {
          const gameStore = useGameStore.getState();
          gameStore.setUser({
            name: state.user.name,
            type: state.user.type === 'dm' ? 'host' : 'player'
          });

          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Auto-synced to gameStore on rehydration:', {
              name: state.user.name,
              type: state.user.type === 'dm' ? 'host' : 'player'
            });
          }
        }
      }
    }
  )
);