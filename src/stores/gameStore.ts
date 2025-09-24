import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GameState, User, Session, DiceRoll, TabType, GameEvent, Scene, Camera, SceneState, UserSettings, ColorScheme } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import { defaultColorSchemes, applyColorScheme } from '@/utils/colorSchemes';

interface GameStore extends GameState {
  // Actions
  setUser: (user: Partial<User>) => void;
  setSession: (session: Session | null) => void;
  addDiceRoll: (roll: DiceRoll) => void;
  setActiveTab: (tab: TabType) => void;
  applyEvent: (event: GameEvent) => void;
  reset: () => void;
  
  // Scene Actions
  createScene: (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => Scene;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  setActiveScene: (sceneId: string) => void;
  updateCamera: (camera: Partial<Camera>) => void;
  setFollowDM: (follow: boolean) => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<UserSettings>) => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
  resetSettings: () => void;
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
  sceneState: {
    scenes: [],
    activeSceneId: null,
    camera: {
      x: 0,
      y: 0,
      zoom: 1.0,
    },
    followDM: true,
  },
  settings: {
    // Display Settings
    colorScheme: defaultColorSchemes[0], // Nexus Default
    theme: 'auto',
    reducedMotion: false,
    fontSize: 'medium',
    
    // Audio Settings
    enableSounds: true,
    diceRollSounds: true,
    notificationSounds: true,
    masterVolume: 75,
    
    // Gameplay Settings
    autoRollInitiative: false,
    showOtherPlayersRolls: true,
    highlightActivePlayer: true,
    snapToGridByDefault: true,
    defaultGridSize: 50,
    
    // Privacy Settings
    allowSpectators: true,
    shareCharacterSheets: false,
    logGameSessions: true,
    
    // Performance Settings
    maxTokensPerScene: 100,
    imageQuality: 'medium',
    enableAnimations: true,
    
    // Accessibility Settings
    highContrast: false,
    screenReaderMode: false,
    keyboardNavigation: true,
  },
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

          // Scene Events
          case 'scene/create':
            if (event.data.scene) {
              state.sceneState.scenes.push(event.data.scene);
              if (state.sceneState.activeSceneId === null) {
                state.sceneState.activeSceneId = event.data.scene.id;
              }
            }
            break;

          case 'scene/update':
            if (event.data.sceneId && event.data.updates) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0) {
                state.sceneState.scenes[sceneIndex] = {
                  ...state.sceneState.scenes[sceneIndex],
                  ...event.data.updates,
                  updatedAt: Date.now(),
                };
              }
            }
            break;

          case 'scene/delete':
            if (event.data.sceneId) {
              state.sceneState.scenes = state.sceneState.scenes.filter(s => s.id !== event.data.sceneId);
              if (state.sceneState.activeSceneId === event.data.sceneId) {
                state.sceneState.activeSceneId = state.sceneState.scenes.length > 0 
                  ? state.sceneState.scenes[0].id 
                  : null;
              }
            }
            break;

          case 'scene/change':
            if (event.data.sceneId) {
              const sceneExists = state.sceneState.scenes.some(s => s.id === event.data.sceneId);
              if (sceneExists) {
                state.sceneState.activeSceneId = event.data.sceneId;
                // Reset camera when switching scenes
                state.sceneState.camera = {
                  x: 0,
                  y: 0,
                  zoom: 1.0,
                };
              }
            }
            break;

          case 'camera/move':
            if (event.data.camera) {
              Object.assign(state.sceneState.camera, event.data.camera);
            }
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

    // Scene Management Actions
    createScene: (sceneData) => {
      const scene: Scene = {
        ...sceneData,
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      set((state) => {
        state.sceneState.scenes.push(scene);
        // If this is the first scene, make it active
        if (state.sceneState.activeSceneId === null) {
          state.sceneState.activeSceneId = scene.id;
        }
      });
      
      return scene;
    },

    updateScene: (sceneId, updates) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0) {
          state.sceneState.scenes[sceneIndex] = {
            ...state.sceneState.scenes[sceneIndex],
            ...updates,
            updatedAt: Date.now(),
          };
        }
      });
    },

    deleteScene: (sceneId) => {
      set((state) => {
        state.sceneState.scenes = state.sceneState.scenes.filter(s => s.id !== sceneId);
        // If the deleted scene was active, switch to first available scene
        if (state.sceneState.activeSceneId === sceneId) {
          state.sceneState.activeSceneId = state.sceneState.scenes.length > 0 
            ? state.sceneState.scenes[0].id 
            : null;
        }
      });
    },

    setActiveScene: (sceneId) => {
      set((state) => {
        const sceneExists = state.sceneState.scenes.some(s => s.id === sceneId);
        if (sceneExists) {
          state.sceneState.activeSceneId = sceneId;
          // Reset camera when switching scenes
          state.sceneState.camera = {
            x: 0,
            y: 0,
            zoom: 1.0,
          };
        }
      });
    },

    updateCamera: (cameraUpdates) => {
      set((state) => {
        Object.assign(state.sceneState.camera, cameraUpdates);
      });
    },

    setFollowDM: (follow) => {
      set((state) => {
        state.sceneState.followDM = follow;
      });
    },

    // Settings Management Actions
    updateSettings: (settingsUpdate) => {
      set((state) => {
        Object.assign(state.settings, settingsUpdate);
      });
    },

    setColorScheme: (colorScheme) => {
      set((state) => {
        state.settings.colorScheme = colorScheme;
      });
      // Apply the color scheme to CSS custom properties
      applyColorScheme(colorScheme);
    },

    resetSettings: () => {
      set((state) => {
        state.settings = initialState.settings;
      });
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

// Scene selectors
export const useSceneState = () => useGameStore(state => state.sceneState);
export const useScenes = () => useGameStore(state => state.sceneState.scenes);
export const useActiveScene = () => useGameStore(state => {
  const { scenes, activeSceneId } = state.sceneState;
  return scenes.find(s => s.id === activeSceneId) || null;
});
export const useCamera = () => useGameStore(state => state.sceneState.camera);
export const useFollowDM = () => useGameStore(state => state.sceneState.followDM);

// Settings selectors
export const useSettings = () => useGameStore(state => state.settings);
export const useColorScheme = () => useGameStore(state => state.settings.colorScheme);
export const useTheme = () => useGameStore(state => state.settings.theme);
