/**
 * Simple Linear App Flow Store
 *
 * Replaces the complex lifecycle + game store split with a simple linear flow
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
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

// Session persistence helpers
const SESSION_STORAGE_KEY = 'nexus-active-session';

interface PersistedSession {
  userName: string;
  userType: 'player' | 'dm';
  roomCode: string;
  gameConfig?: GameConfig;
  timestamp: number;
}

const saveSessionToStorage = (state: AppState): void => {
  if (state.user.name && state.user.type && state.roomCode) {
    const session: PersistedSession = {
      userName: state.user.name,
      userType: state.user.type,
      roomCode: state.roomCode,
      gameConfig: state.gameConfig,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log('💾 Saved session to localStorage:', session);
  }
};

const loadSessionFromStorage = (): Partial<AppState> | null => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    const session: PersistedSession = JSON.parse(stored);

    // Check if session is less than 24 hours old
    const age = Date.now() - session.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (age > maxAge) {
      console.log('⏰ Session expired (older than 24 hours)');
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    console.log('📂 Loaded session from localStorage:', session);

    return {
      user: {
        name: session.userName,
        type: session.userType,
        id: getBrowserId(),
        color: 'blue',
      },
      roomCode: session.roomCode,
      gameConfig: session.gameConfig,
      // Don't set isConnectedToRoom - let WebSocket reconnection handle that
    };
  } catch (error) {
    console.error('Failed to load session from storage:', error);
    return null;
  }
};

const clearSessionFromStorage = (): void => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  console.log('🗑️ Cleared session from localStorage');
};

const initialState: AppState = {
  view: 'welcome',
  user: {
    name: '',
    type: null,
    id: getBrowserId(),
    color: 'blue',
  },
  isConnectedToRoom: false,
  gameConfig: undefined,
  selectedCharacter: undefined
};

// Try to restore session from localStorage
const restoredSession = loadSessionFromStorage();
if (restoredSession) {
  Object.assign(initialState, restoredSession);
  console.log('✅ Restored session on app load');
}

export const useAppFlowStore = create<AppFlowStore>()(
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

      // Save session if we have a room code
      const currentState = get();
      if (currentState.roomCode) {
        saveSessionToStorage(currentState);
      }

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
        // Import webSocketService
        const { webSocketService } = await import('@/utils/websocket');

        console.log('🎮 Joining room:', roomCode, 'with character:', character?.name);

        // Connect to WebSocket (player mode)
        await webSocketService.connect(roomCode, 'player');

        // Wait for session/joined event from server
        const session = await webSocketService.waitForSessionJoined();

        console.log('✅ Joined room:', roomCode);

        // Update appFlow state
        set((state) => {
          state.roomCode = roomCode;
          state.isConnectedToRoom = true;
          state.view = 'game';
          if (character) {
            state.selectedCharacter = character;
          }
        });

        // Save session to localStorage for refresh recovery
        saveSessionToStorage(get());

        // Update gameStore session
        const { user } = get();
        useGameStore.getState().setSession({
          roomCode,
          hostId: session.hostId,
          players: [{ ...user, id: user.id || '', canEditScenes: false, connected: true, type: 'player', color: user.color || 'blue' }],
          status: 'connected',
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
    createGameRoom: async (config: GameConfig, clearExistingData: boolean = true) => {
      try {
        // Clear previous game data to start fresh (unless preserving for dev/mock data)
        const { getLinearFlowStorage } = await import('@/services/linearFlowStorage');
        const storage = getLinearFlowStorage();

        if (clearExistingData) {
          await storage.clearGameData();
        } else if (process.env.NODE_ENV === 'development') {
          const existingScenes = storage.getScenes();
          console.log(`🎮 Preserving ${existingScenes.length} existing scenes`);
        }

        // Import webSocketService
        const { webSocketService } = await import('@/utils/websocket');

        console.log('🎮 Creating game room with WebSocket connection');

        // Connect to WebSocket (host mode) - server will generate room code
        await webSocketService.connect(undefined, 'host');

        // Wait for session/created event from server
        const session = await webSocketService.waitForSessionCreated();

        const roomCode = session.roomCode;
        console.log('✅ Room created:', roomCode);

        // Update appFlow state
        set((state) => {
          state.roomCode = roomCode;
          state.gameConfig = config;
          state.isConnectedToRoom = true;
          state.view = 'game';
        });

        // Save session to localStorage for refresh recovery
        saveSessionToStorage(get());

        // Update gameStore session
        const { user } = get();
        useGameStore.getState().setSession({
          roomCode,
          hostId: user.id || '',
          players: [{ ...user, id: user.id || '', canEditScenes: true, connected: true, type: 'host', color: user.color || 'blue' }],
          status: 'connected',
        });

        // Sync scenes from entity store to gameStore (in case mock data exists)
        await storage.syncScenesWithGameStore();

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
        const importedCharacters: PlayerCharacter[] = data.characters.map((c: PlayerCharacter) => ({
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
    leaveRoom: async () => {
      try {
        const currentState = get();
        console.log('🚪 Leaving room:', {
          roomCode: currentState.roomCode,
          userName: currentState.user.name,
          userType: currentState.user.type,
          isConnected: currentState.isConnectedToRoom,
        });

        // Import webSocketService
        const { webSocketService } = await import('@/utils/websocket');

        // Disconnect WebSocket
        webSocketService.disconnect();

        // Reset the in-memory state
        get().resetToWelcome();

        console.log('✅ Successfully left room and reset to welcome');
      } catch (error) {
        console.error('Failed to leave room:', error);
      }
    },

    resetToWelcome: () => {
      console.log('🔄 Resetting app flow to welcome screen');

      set((state) => {
        state.view = 'welcome';
        state.user.name = '';
        state.user.type = null;
        state.roomCode = undefined;
        state.isConnectedToRoom = false;
      });

      // Clear persisted session
      clearSessionFromStorage();

      useGameStore.getState().reset();

      console.log('✅ Reset complete - cleared user, room, and connection state');
    },

    // Development helpers
    dev_quickDM: async (name: string = 'Test DM') => {
      // Check if mock data exists (scenes from mock data toggle)
      const { getLinearFlowStorage } = await import('@/services/linearFlowStorage');
      const storage = getLinearFlowStorage();
      const existingScenes = storage.getScenes();
      const hasMockData = existingScenes.length > 0;

      // Only clear if no mock data exists
      if (!hasMockData) {
        await storage.clearGameData();
      } else {
        console.log(`🎮 Found ${existingScenes.length} existing scenes - preserving for game`);
      }

      // Set user first
      set((state) => {
        state.user.name = name;
        state.user.type = 'dm';
        state.user.id = getBrowserId();
      });

      // Sync with gameStore
      const gameStore = useGameStore.getState();
      gameStore.setUser({
        name,
        type: 'host'
      });

      // Create a REAL room via WebSocket (same as production flow)
      const config = {
        name: 'Test Campaign',
        description: 'Development test session',
        estimatedTime: '2',
        campaignType: 'oneshot' as const,
        maxPlayers: 4
      };

      try {
        // Don't clear existing data (we already handled it above)
        const roomCode = await get().createGameRoom(config, false);

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
      } catch (error) {
        console.error('❌ DEV: Failed to create room:', error);
        // Fallback to offline mode if WebSocket not available
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        set((state) => {
          state.roomCode = roomCode;
          state.gameConfig = config;
          state.isConnectedToRoom = false; // ❌ Not connected since we failed
          state.view = 'game';
        });
        console.log('⚠️ DEV: Running in offline mode (no WebSocket)');
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
          strength: 16,
          dexterity: 14,
          constitution: 13,
          intelligence: 10,
          wisdom: 15,
          charisma: 12
        },
        createdAt: Date.now(),
        lastUsed: Date.now(),
        playerId: getBrowserId()
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
  }))
);
