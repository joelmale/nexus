import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GameState, User, Session, DiceRoll, TabType, GameEvent, Scene, Camera, UserSettings, ColorScheme, Player, TokenPlaceEvent, TokenMoveEvent, TokenUpdateEvent, TokenDeleteEvent, UserJoinEvent, UserLeaveEvent, SessionCreatedEvent, SessionJoinedEvent, SceneCreateEvent, SceneUpdateEvent, SceneDeleteEvent, SceneChangeEvent, CameraMoveEvent, DrawingCreateEvent, DrawingUpdateEvent, DrawingDeleteEvent, DrawingClearEvent, DiceRollEvent } from '@/types/game';
import type { Drawing } from '@/types/drawing';
import type { PlacedToken } from '@/types/token';
import { v4 as uuidv4 } from 'uuid';
import { defaultColorSchemes, applyColorScheme } from '@/utils/colorSchemes';
import { drawingPersistenceService } from '@/services/drawingPersistence';
import { sessionPersistenceService } from '@/services/sessionPersistence';

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
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  setActiveScene: (sceneId: string) => void;
  updateCamera: (camera: Partial<Camera>) => void;
  setFollowDM: (follow: boolean) => void;

  // Bulk Scene Operations
  deleteScenesById: (sceneIds: string[]) => void;
  updateScenesVisibility: (sceneIds: string[], visibility: Scene['visibility']) => void;
  duplicateScene: (sceneId: string) => Scene | null;
  
  // Drawing Actions
  createDrawing: (sceneId: string, drawing: Drawing) => void;
  updateDrawing: (sceneId: string, drawingId: string, updates: Partial<Drawing>) => void;
  deleteDrawing: (sceneId: string, drawingId: string) => void;
  clearDrawings: (sceneId: string, layer?: string) => void;
  getSceneDrawings: (sceneId: string) => Drawing[];
  getVisibleDrawings: (sceneId: string, isHost: boolean) => Drawing[];
  
  // Settings Actions
  updateSettings: (settings: Partial<UserSettings>) => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
  setEnableGlassmorphism: (enabled: boolean) => void;
  resetSettings: () => void;
  
  // Token Actions
  placeToken: (sceneId: string, token: PlacedToken) => void;
  moveToken: (sceneId: string, tokenId: string, position: { x: number; y: number }, rotation?: number) => void;
  updateToken: (sceneId: string, tokenId: string, updates: Partial<PlacedToken>) => void;
  deleteToken: (sceneId: string, tokenId: string) => void;
  getSceneTokens: (sceneId: string) => PlacedToken[];
  getVisibleTokens: (sceneId: string, isHost: boolean) => PlacedToken[];
  
  // Persistence Actions
  initializeFromStorage: () => Promise<void>;
  loadSceneDrawings: (sceneId: string) => Promise<void>;

  // Session Persistence Actions
  saveSessionState: () => void;
  loadSessionState: () => void;
  attemptSessionRecovery: () => Promise<boolean>;
  clearSessionData: () => void;

  // Developer Actions
  toggleMockData: (enable: boolean) => void;
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
    colorScheme: defaultColorSchemes[1], // Emerald Depths
    theme: 'dark',
    enableGlassmorphism: false,
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

    // Developer Settings
    useMockData: process.env.NODE_ENV === 'development',
  },
};

// --- Mock Data for Development (can be toggled via settings) ---
const MOCK_PLAYERS: Player[] = [
  { id: 'user-joel', name: 'Joel', type: 'host', color: '#6366f1', connected: true, canEditScenes: true },
  { id: 'user-alice', name: 'Alice', type: 'player', color: '#ec4899', connected: true, canEditScenes: false },
  { id: 'user-bob', name: 'Bob', type: 'player', color: '#22c55e', connected: false, canEditScenes: false },
  { id: 'user-charlie', name: 'Charlie', type: 'player', color: '#f59e0b', connected: true, canEditScenes: false },
];

const MOCK_SESSION: Session = {
  roomCode: 'TEST',
  hostId: 'user-joel',
  players: MOCK_PLAYERS,
  status: 'connected',
};

type EventHandler = (state: GameState, data: unknown) => void;

const eventHandlers: Record<string, EventHandler> = {
  'dice/roll': (state, data) => {
    const eventData = data as DiceRollEvent['data'];
    if (eventData.roll) {
      state.diceRolls.unshift(eventData.roll);
    }
  },
  'token/place': (state, data) => {
    const eventData = data as TokenPlaceEvent['data'];
    if (eventData.sceneId && eventData.token) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0) {
        if (!state.sceneState.scenes[sceneIndex].placedTokens) {
          state.sceneState.scenes[sceneIndex].placedTokens = [];
        }
        state.sceneState.scenes[sceneIndex].placedTokens.push(eventData.token);
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'token/move': (state, data) => {
    const eventData = data as TokenMoveEvent['data'];
    if (eventData.sceneId && eventData.tokenId) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        const tokenIndex = state.sceneState.scenes[sceneIndex].placedTokens.findIndex(
          t => t.id === eventData.tokenId
        );
        if (tokenIndex >= 0) {
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].x = eventData.position.x;
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].y = eventData.position.y;
          if (eventData.rotation !== undefined) {
            state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].rotation = eventData.rotation;
          }
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].updatedAt = Date.now();
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      }
    }
  },
  'token/update': (state, data) => {
    const eventData = data as TokenUpdateEvent['data'];
    if (eventData.sceneId && eventData.tokenId && eventData.updates) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        const tokenIndex = state.sceneState.scenes[sceneIndex].placedTokens.findIndex(
          t => t.id === eventData.tokenId
        );
        if (tokenIndex >= 0) {
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex] = {
            ...state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex],
            ...eventData.updates,
            updatedAt: Date.now(),
          };
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      }
    }
  },
  'token/delete': (state, data) => {
    const eventData = data as TokenDeleteEvent['data'];
    if (eventData.sceneId && eventData.tokenId) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        state.sceneState.scenes[sceneIndex].placedTokens = state.sceneState.scenes[sceneIndex].placedTokens.filter(
          t => t.id !== eventData.tokenId
        );
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'user/join': (state, data) => {
    const eventData = data as UserJoinEvent['data'];
    if (state.session && eventData.user) {
      const existingIndex = state.session.players.findIndex(p => p.id === eventData.user.id) as number;
      if (existingIndex >= 0) {
        state.session.players[existingIndex] = { ...state.session.players[existingIndex], ...eventData.user };
      } else {
        state.session.players.push(eventData.user);
      }
    }
  },
  'user/leave': (state, data) => {
    const eventData = data as UserLeaveEvent['data'];
    if (state.session && eventData.userId) {
      state.session.players = state.session.players.filter(p => p.id !== eventData.userId);
    }
  },
  'session/created': (state, data) => {
    console.log('Creating session with data:', data);
    const eventData = data as SessionCreatedEvent['data'];
    state.session = {
      roomCode: eventData.roomCode,
      hostId: state.user.id,
      players: [{ ...state.user, connected: true, canEditScenes: state.user.type === 'host' }],
      status: 'connected',
    };
    state.user.type = 'host';
    state.user.connected = true;
    state.activeTab = 'scenes';
    if (state.sceneState.scenes.length === 0) {
      const defaultScene: Scene = {
        id: uuidv4(),
        name: 'Scene 1',
        description: 'Enter description here',
        visibility: 'public',
        isEditable: true,
        createdBy: state.user.id,
        backgroundImage: undefined,
        gridSettings: { enabled: true, size: 50, color: '#ffffff', opacity: 0.3, snapToGrid: true, showToPlayers: true },
        lightingSettings: { enabled: false, globalIllumination: true, ambientLight: 0.5, darkness: 0 },
        drawings: [],
        placedTokens: [],
        isActive: false,
        playerCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.sceneState.scenes.push(defaultScene);
      state.sceneState.activeSceneId = defaultScene.id;
    }
    console.log('Session created:', state.session);
  },
  'session/joined': (state, data) => {
    console.log('Joining session with data:', data);
    const eventData = data as SessionJoinedEvent['data'];
    state.session = {
      roomCode: eventData.roomCode,
      hostId: eventData.hostId,
      players: eventData.players || [{ ...state.user, connected: true }],
      status: 'connected',
    };
    state.user.type = 'player';
    state.user.connected = true;
    console.log('Session joined:', state.session);
  },
  'session/reconnected': (state, data) => {
    console.log('Reconnecting to session with data:', data);
    const eventData = data as any; // We'll type this properly later

    // Update session data if provided
    if (eventData.roomCode) {
      if (!state.session) {
        state.session = {
          roomCode: eventData.roomCode,
          hostId: eventData.hostId || state.user.id,
          players: [{ ...state.user, connected: true, canEditScenes: state.user.type === 'host' }],
          status: 'connected',
        };
      } else {
        state.session.roomCode = eventData.roomCode;
        state.session.hostId = eventData.hostId || state.session.hostId;
        state.session.status = 'connected';
      }
    }

    // Set user type based on whether they are the host
    if (eventData.hostId === state.user.id || state.user.type === 'host') {
      state.user.type = 'host';
    } else {
      state.user.type = 'player';
    }

    state.user.connected = true;

    // If gameState is provided in the reconnection, apply it
    if (eventData.gameState) {
      console.log('Restoring game state from server on reconnection');
      // Apply the game state updates
      if (eventData.gameState.scenes) {
        state.sceneState.scenes = eventData.gameState.scenes;
      }
      if (eventData.gameState.activeSceneId !== undefined) {
        state.sceneState.activeSceneId = eventData.gameState.activeSceneId;
      }
    }

    console.log('Session reconnected:', state.session);
  },
  'scene/create': (state, data) => {
    const eventData = data as SceneCreateEvent['data'];
    if (eventData.scene) {
      state.sceneState.scenes.push(eventData.scene);
      if (state.sceneState.activeSceneId === null) {
        state.sceneState.activeSceneId = eventData.scene.id;
      }
    }
  },
  'scene/update': (state, data) => {
    const eventData = data as SceneUpdateEvent['data'];
    if (eventData.sceneId && eventData.updates) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex] = { ...state.sceneState.scenes[sceneIndex], ...eventData.updates, updatedAt: Date.now() };
      }
    }
  },
  'scene/delete': (state, data) => {
    const eventData = data as SceneDeleteEvent['data'];
    if (eventData.sceneId) {
      state.sceneState.scenes = state.sceneState.scenes.filter(s => s.id !== eventData.sceneId);
      if (state.sceneState.activeSceneId === eventData.sceneId) {
        state.sceneState.activeSceneId = state.sceneState.scenes.length > 0 ? state.sceneState.scenes[0].id : null;
      }
    }
  },
  'scene/change': (state, data) => {
    const eventData = data as SceneChangeEvent['data'];
    if (eventData.sceneId) {
      const sceneExists = state.sceneState.scenes.some(s => s.id === eventData.sceneId);
      if (sceneExists) {
        state.sceneState.activeSceneId = eventData.sceneId;
        state.sceneState.camera = { x: 0, y: 0, zoom: 1.0 };
      }
    }
  },
  'camera/move': (state, data) => {
    const eventData = data as CameraMoveEvent['data'];
    if (eventData.camera) {
      Object.assign(state.sceneState.camera, eventData.camera);
    }
  },
  'drawing/create': (state, data) => {
    const eventData = data as DrawingCreateEvent['data'];
    if (eventData.sceneId && eventData.drawing) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex].drawings.push(eventData.drawing);
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'drawing/update': (state, data) => {
    const eventData = data as DrawingUpdateEvent['data'];
    if (eventData.sceneId && eventData.drawingId && eventData.updates) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0) {
        const drawingIndex = state.sceneState.scenes[sceneIndex].drawings.findIndex(d => d.id === eventData.drawingId);
        if (drawingIndex >= 0) {
           Object.assign(state.sceneState.scenes[sceneIndex].drawings[drawingIndex], eventData.updates);
            state.sceneState.scenes[sceneIndex].drawings[drawingIndex].updatedAt = Date.now();
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      }
    }
  },
  'drawing/delete': (state, data) => {
    const eventData = data as DrawingDeleteEvent['data'];
    if (eventData.sceneId && eventData.drawingId) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[sceneIndex].drawings.filter(d => d.id !== eventData.drawingId);
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'drawing/clear': (state, data) => {
    const eventData = data as DrawingClearEvent['data'];
    if (eventData.sceneId) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === eventData.sceneId);
      if (sceneIndex >= 0) {
        if (eventData.layer) {
          state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[sceneIndex].drawings.filter(d => d.layer !== eventData.layer);
        } else {
          state.sceneState.scenes[sceneIndex].drawings = [];
        }
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
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
      
      const handler = eventHandlers[event.type];
      if (handler) {
        set(state => {
          handler(state, event.data);
        });
      } else {
        console.warn('Unknown event type:', event.type, event.data);
      }
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
        drawings: [], // Initialize with empty drawings array
        placedTokens: [], // Initialize with empty placed tokens array
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
      
      // Auto-save the new scene to persistence
      drawingPersistenceService.saveScene(scene).catch(error => {
        console.error('Failed to persist new scene:', error);
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
          
          // Auto-save the updated scene to persistence
          const scene = state.sceneState.scenes[sceneIndex];
          drawingPersistenceService.saveScene(scene).catch(error => {
            console.error('Failed to persist updated scene:', error);
          });
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

      // Delete from persistence
      drawingPersistenceService.deleteScene(sceneId).catch(error => {
        console.error('Failed to persist scene deletion:', error);
      });
    },

    reorderScenes: (fromIndex, toIndex) => {
      set((state) => {
        const scenes = [...state.sceneState.scenes];
        const [movedScene] = scenes.splice(fromIndex, 1);
        scenes.splice(toIndex, 0, movedScene);
        state.sceneState.scenes = scenes;
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

    // Bulk Scene Operations
    deleteScenesById: (sceneIds) => {
      set((state) => {
        // Filter out the scenes to delete
        state.sceneState.scenes = state.sceneState.scenes.filter(s => !sceneIds.includes(s.id));

        // If the active scene was deleted, switch to first available scene
        if (state.sceneState.activeSceneId && sceneIds.includes(state.sceneState.activeSceneId)) {
          state.sceneState.activeSceneId = state.sceneState.scenes.length > 0
            ? state.sceneState.scenes[0].id
            : null;
        }
      });

      // Delete each scene from persistence
      sceneIds.forEach(sceneId => {
        drawingPersistenceService.deleteScene(sceneId).catch(error => {
          console.error('Failed to persist scene deletion:', error);
        });
      });
    },

    updateScenesVisibility: (sceneIds, visibility) => {
      set((state) => {
        sceneIds.forEach(sceneId => {
          const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
          if (sceneIndex >= 0) {
            state.sceneState.scenes[sceneIndex].visibility = visibility;
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

            // Auto-save the updated scene to persistence
            const scene = state.sceneState.scenes[sceneIndex];
            drawingPersistenceService.saveScene(scene).catch(error => {
              console.error('Failed to persist scene visibility update:', error);
            });
          }
        });
      });
    },

    duplicateScene: (sceneId) => {
      const state = get();
      const originalScene = state.sceneState.scenes.find(s => s.id === sceneId);
      if (!originalScene) return null;

      const duplicatedScene: Scene = {
        ...originalScene,
        id: uuidv4(),
        name: `${originalScene.name} (Copy)`,
        drawings: [...originalScene.drawings], // Deep copy drawings
        placedTokens: [...originalScene.placedTokens], // Deep copy tokens
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set((state) => {
        state.sceneState.scenes.push(duplicatedScene);
      });

      return duplicatedScene;
    },

    // Drawing Management Actions
    createDrawing: (sceneId, drawing) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0) {
          state.sceneState.scenes[sceneIndex].drawings.push(drawing);
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
          
          // Auto-save to persistence
          const scene = state.sceneState.scenes[sceneIndex];
          drawingPersistenceService.saveScene(scene).catch(error => {
            console.error('Failed to persist scene after drawing creation:', error);
          });
        }
      });
    },

    updateDrawing: (sceneId, drawingId, updates) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0) {
          const drawingIndex = state.sceneState.scenes[sceneIndex].drawings.findIndex(
            d => d.id === drawingId
          );
          if (drawingIndex >= 0) {
            const drawingToUpdate = state.sceneState.scenes[sceneIndex].drawings[drawingIndex] as Drawing;
            Object.assign(drawingToUpdate, updates);
            drawingToUpdate.updatedAt = Date.now();
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
            
            // Auto-save to persistence
            const scene = state.sceneState.scenes[sceneIndex];
            drawingPersistenceService.saveScene(scene).catch(error => {
              console.error('Failed to persist scene after drawing update:', error);
            });
          }
        }
      });
    },

    deleteDrawing: (sceneId, drawingId) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0) {
          state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[sceneIndex].drawings.filter(
            d => d.id !== drawingId
          );
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
          
          // Auto-save to persistence
          const scene = state.sceneState.scenes[sceneIndex];
          drawingPersistenceService.saveScene(scene).catch(error => {
            console.error('Failed to persist scene after drawing deletion:', error);
          });
        }
      });
    },

    clearDrawings: (sceneId, layer) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0) {
          if (layer) {
            state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[sceneIndex].drawings.filter(
              d => d.layer !== layer
            );
          } else {
            state.sceneState.scenes[sceneIndex].drawings = [];
          }
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
          
          // Auto-save to persistence
          const scene = state.sceneState.scenes[sceneIndex];
          drawingPersistenceService.saveScene(scene).catch(error => {
            console.error('Failed to persist scene after clearing drawings:', error);
          });
        }
      });
    },

    getSceneDrawings: (sceneId) => {
      const state = get();
      const scene = state.sceneState.scenes.find(s => s.id === sceneId);
      return scene?.drawings || [];
    },

    getVisibleDrawings: (sceneId, isHost) => {
      const state = get();
      const scene = state.sceneState.scenes.find(s => s.id === sceneId);
      if (!scene) return [];
      
      return scene.drawings.filter(drawing => {
        // DM can see all drawings
        if (isHost) return true;
        
        // Players can only see drawings visible to them
        if (drawing.layer === 'dm-only') return false;
        if (drawing.style.dmNotesOnly) return false;
        if (drawing.style.visibleToPlayers === false) return false;
        
        return true;
      });
    },

    // Settings Management Actions
    updateSettings: (settingsUpdate) => {
      set((state) => {
        const previousUseMockData = state.settings.useMockData;
        if ('useMockData' in settingsUpdate && settingsUpdate.useMockData !== previousUseMockData) {
          // Directly call the action within the same update to ensure atomicity
          get().toggleMockData(!!settingsUpdate.useMockData);
        }
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

    setEnableGlassmorphism: (enabled) => {
      set((state) => {
        state.settings.enableGlassmorphism = enabled;
      });
    },

    // Token Management Actions
    placeToken: (sceneId, token) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0) {
          if (!state.sceneState.scenes[sceneIndex].placedTokens) {
            state.sceneState.scenes[sceneIndex].placedTokens = [];
          }
          state.sceneState.scenes[sceneIndex].placedTokens.push(token);
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      });
    },

    moveToken: (sceneId, tokenId, position, rotation) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
          const tokenIndex = state.sceneState.scenes[sceneIndex].placedTokens.findIndex(
            t => t.id === tokenId
          );
          if (tokenIndex >= 0) {
            state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].x = position.x;
            state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].y = position.y;
            if (rotation !== undefined) {
              state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].rotation = rotation;
            }
            state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].updatedAt = Date.now();
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
          }
        }
      });
    },

    updateToken: (sceneId, tokenId, updates) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
          const tokenIndex = state.sceneState.scenes[sceneIndex].placedTokens.findIndex(
            t => t.id === tokenId
          );
          if (tokenIndex >= 0) {
            const tokenToUpdate = state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex];
            Object.assign(tokenToUpdate, updates);
            tokenToUpdate.updatedAt = Date.now();
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
          }
        }
      });
    },

    deleteToken: (sceneId, tokenId) => {
      set((state) => {
        const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
          state.sceneState.scenes[sceneIndex].placedTokens = state.sceneState.scenes[sceneIndex].placedTokens.filter(
            t => t.id !== tokenId
          );
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      });
    },

    getSceneTokens: (sceneId) => {
      const state = get();
      const scene = state.sceneState.scenes.find(s => s.id === sceneId);
      return scene?.placedTokens || [];
    },

    getVisibleTokens: (sceneId, isHost) => {
      const state = get();
      const scene = state.sceneState.scenes.find(s => s.id === sceneId);
      if (!scene) return [];
      
      return scene.placedTokens.filter(token => {
        // DM can see all tokens
        if (isHost) return true;
        
        // Players can only see visible tokens
        if (!token.visibleToPlayers) return false;
        
        return true;
      });
    },

    resetSettings: () => {
      set((state) => {
        state.settings = initialState.settings;
      });
    },
    
    // Persistence Management Actions
    initializeFromStorage: async () => {
      try {
        const savedScenes = await drawingPersistenceService.loadAllScenes();
        
        if (savedScenes.length > 0) {
          set((state) => {
            state.sceneState.scenes = savedScenes;
            // Set the first scene as active if no active scene is set
            if (!state.sceneState.activeSceneId && savedScenes.length > 0) {
              state.sceneState.activeSceneId = savedScenes[0].id;
            }
          });
          console.log(`Initialized ${savedScenes.length} scenes from storage`);
        }
      } catch (error) {
        console.error('Failed to initialize from storage:', error);
      }
    },
    
    loadSceneDrawings: async (sceneId) => {
      try {
        const drawings = await drawingPersistenceService.loadDrawings(sceneId);
        
        set((state) => {
          const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === sceneId);
          if (sceneIndex >= 0) {
            state.sceneState.scenes[sceneIndex].drawings = drawings;
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
          }
        });
        
        console.log(`Loaded ${drawings.length} drawings for scene ${sceneId}`);
      } catch (error) {
        console.error('Failed to load scene drawings:', error);
      }
    },

    // Session Persistence Actions
    saveSessionState: () => {
      const state = get();

      // Save session data if connected
      if (state.session) {
        sessionPersistenceService.saveSession({
          roomCode: state.session.roomCode,
          userId: state.user.id,
          userType: state.user.type,
          userName: state.user.name,
          hostId: state.session.hostId,
          lastActivity: Date.now(),
          sessionVersion: 1,
        });
      }

      // Save game state (characters, scenes, settings, etc.)
      const gameStateData = {
        characters: [], // TODO: Get from character store when integrated
        initiative: {}, // TODO: Get from initiative store when integrated
        scenes: state.sceneState.scenes,
        activeSceneId: state.sceneState.activeSceneId,
        settings: state.settings,
      };

      sessionPersistenceService.saveGameState(gameStateData);

      // Also send game state to server if connected and user is host
      if (state.user.type === 'host' && state.user.connected && state.session) {
        try {
          import('@/utils/websocket').then(({ webSocketService }) => {
            if (webSocketService.isConnected()) {
              webSocketService.sendGameStateUpdate({
                sceneState: {
                  scenes: state.sceneState.scenes,
                  activeSceneId: state.sceneState.activeSceneId
                },
                characters: [], // TODO: Get from character store when integrated
                initiative: {}, // TODO: Get from initiative store when integrated
              });
            }
          });
        } catch (error) {
          console.error('Failed to send game state update:', error);
        }
      }
    },

    loadSessionState: () => {
      const recoveryData = sessionPersistenceService.getRecoveryData();

      if (recoveryData.gameState) {
        set((state) => {
          // Restore scenes and active scene (always restore, even if empty)
          if (recoveryData.gameState) {
            state.sceneState.scenes = recoveryData.gameState.scenes || [];
            state.sceneState.activeSceneId = recoveryData.gameState.activeSceneId;
            console.log(`🔄 Restored ${state.sceneState.scenes.length} scenes, activeSceneId: ${state.sceneState.activeSceneId}`);
          }

          // Restore settings
          if (recoveryData.gameState && recoveryData.gameState.settings) {
            state.settings = { ...state.settings, ...recoveryData.gameState.settings };
          }
        });

        console.log('📂 Game state restored from localStorage');
      }
    },

    attemptSessionRecovery: async () => {
      console.log('🔄 Attempting session recovery...');

      try {
        // First check what's in localStorage for debugging
        const sessionData = localStorage.getItem('nexus-session');
        const gameStateData = localStorage.getItem('nexus-game-state');
        console.log('🔍 Raw localStorage data:');
        console.log('  Session:', sessionData ? JSON.parse(sessionData) : 'null');
        console.log('  Game State:', gameStateData ? 'exists' : 'null');

        const recoveryData = sessionPersistenceService.getRecoveryData();
        console.log('🔍 Processed recovery data:', recoveryData);
        if (recoveryData.gameState) {
          console.log('🎮 Game state details:', {
            scenes: recoveryData.gameState.scenes,
            activeSceneId: recoveryData.gameState.activeSceneId,
            scenesLength: recoveryData.gameState.scenes?.length || 0
          });
        }

        if (!recoveryData.isValid || !recoveryData.session) {
          console.log('❌ No valid session found for recovery');
          return false;
        }

        if (!recoveryData.canReconnect) {
          console.log('❌ Session too old or invalid for reconnection');
          const sessionAge = Date.now() - recoveryData.session.lastActivity;
          console.log(`   Session age: ${Math.round(sessionAge / 1000)}s (max: ${60 * 60}s)`);
          sessionPersistenceService.clearAll();
          return false;
        }

        console.log(`🏠 Attempting to reconnect to room ${recoveryData.session.roomCode} as ${recoveryData.session.userType}`);

        // Load game state first
        if (recoveryData.gameState) {
          console.log('🎮 Restoring game state from localStorage');
          get().loadSessionState();
        }

        // Restore user information from persisted session
        set((state) => {
          state.user = {
            ...state.user,
            id: recoveryData.session!.userId,
            name: recoveryData.session!.userName,
            type: recoveryData.session!.userType,
            connected: false, // Will be set to true when WebSocket connects
          };
        });

        // Import webSocketService here to avoid circular dependencies
        const { webSocketService } = await import('@/utils/websocket');

        // Attempt to reconnect to the WebSocket session
        console.log(`🔌 Connecting WebSocket: roomCode=${recoveryData.session.roomCode}, userType=${recoveryData.session.userType}`);

        // Pass the userType to determine if this is a host reconnection or player join
        await webSocketService.connect(recoveryData.session.roomCode, recoveryData.session.userType);

        // If we're the host and have game state, send it to the server
        if (recoveryData.session.userType === 'host' && recoveryData.gameState && recoveryData.gameState.scenes.length > 0) {
          console.log('📤 Sending restored game state to server');
          webSocketService.sendGameStateUpdate({
            sceneState: {
              scenes: recoveryData.gameState.scenes,
              activeSceneId: recoveryData.gameState.activeSceneId
            },
            characters: recoveryData.gameState.characters || [],
            initiative: recoveryData.gameState.initiative || {},
          });
        }

        console.log(`✅ Session recovery successful for room ${recoveryData.session.roomCode}`);
        console.log(`🎮 Current game state after recovery:`, get().sceneState);
        return true;
      } catch (error) {
        console.error('❌ Session recovery failed:', error);

        // Only clear session data if WebSocket connection failed
        // Keep local state in case user wants to try manual reconnection
        if (error instanceof Error && error.message.includes('WebSocket')) {
          console.log('🔄 WebSocket reconnection failed, but keeping local session data');
        } else {
          sessionPersistenceService.clearAll();
        }

        return false;
      }
    },

    clearSessionData: () => {
      sessionPersistenceService.clearAll();
      console.log('🗑️ All session data cleared');
    },

    // Developer Actions
    toggleMockData: (enable) => {
      if (process.env.NODE_ENV !== 'development') return;

      set((state) => {
        state.session = enable ? MOCK_SESSION : null;
        // When disabling mock data, also reset the user to avoid being stuck as the mock host.
        if (!enable) {
          state.user = { ...initialState.user, id: uuidv4() };
        }
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

// Drawing selectors
export const useSceneDrawings = (sceneId: string) => useGameStore(state => {
  const scene = state.sceneState.scenes.find(s => s.id === sceneId);
  return scene?.drawings || [];
});

export const useVisibleDrawings = (sceneId: string) => useGameStore(state => {
  const isHost = state.user.type === 'host';
  return state.getVisibleDrawings(sceneId, isHost);
});

export const useDrawingActions = () => useGameStore(state => ({
  createDrawing: state.createDrawing,
  updateDrawing: state.updateDrawing,
  deleteDrawing: state.deleteDrawing,
  clearDrawings: state.clearDrawings,
}));
