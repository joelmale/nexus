import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GameState, User, Session, DiceRoll, TabType, GameEvent, Scene, Camera, SceneState, UserSettings, ColorScheme } from '@/types/game';
import type { Drawing } from '@/types/drawing';
import type { PlacedToken } from '@/types/token';
import { v4 as uuidv4 } from 'uuid';
import { defaultColorSchemes, applyColorScheme } from '@/utils/colorSchemes';
import { drawingPersistenceService } from '@/services/drawingPersistence';

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

type EventHandler = (state: GameState, data: any) => void;

const eventHandlers: Record<string, EventHandler> = {
  'dice/roll': (state, data) => {
    if (data.roll) {
      state.diceRolls.unshift(data.roll);
    }
  },
  'token/place': (state, data) => {
    if (data.sceneId && data.token) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0) {
        if (!state.sceneState.scenes[sceneIndex].placedTokens) {
          state.sceneState.scenes[sceneIndex].placedTokens = [];
        }
        state.sceneState.scenes[sceneIndex].placedTokens.push(data.token);
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'token/move': (state, data) => {
    if (data.sceneId && data.tokenId) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        const tokenIndex = state.sceneState.scenes[sceneIndex].placedTokens.findIndex(
          t => t.id === data.tokenId
        );
        if (tokenIndex >= 0) {
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].x = data.position.x;
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].y = data.position.y;
          if (data.rotation !== undefined) {
            state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].rotation = data.rotation;
          }
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].updatedAt = Date.now();
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      }
    }
  },
  'token/update': (state, data) => {
    if (data.sceneId && data.tokenId && data.updates) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        const tokenIndex = state.sceneState.scenes[sceneIndex].placedTokens.findIndex(
          t => t.id === data.tokenId
        );
        if (tokenIndex >= 0) {
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex] = {
            ...state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex],
            ...data.updates,
            updatedAt: Date.now(),
          };
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      }
    }
  },
  'token/delete': (state, data) => {
    if (data.sceneId && data.tokenId) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        state.sceneState.scenes[sceneIndex].placedTokens = state.sceneState.scenes[sceneIndex].placedTokens.filter(
          t => t.id !== data.tokenId
        );
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'user/join': (state, data) => {
    if (state.session && data.user) {
      const existingIndex = state.session.players.findIndex(p => p.id === data.user.id);
      if (existingIndex >= 0) {
        state.session.players[existingIndex] = data.user;
      } else {
        state.session.players.push(data.user);
      }
    }
  },
  'user/leave': (state, data) => {
    if (state.session && data.userId) {
      state.session.players = state.session.players.filter(p => p.id !== data.userId);
    }
  },
  'session/created': (state, data) => {
    console.log('Creating session with data:', data);
    state.session = {
      roomCode: data.roomCode || data.room,
      hostId: state.user.id,
      players: [{ ...state.user, connected: true }],
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
        backgroundImage: undefined,
        gridSettings: { enabled: true, size: 50, color: '#ffffff', opacity: 0.3, snapToGrid: true },
        drawings: [],
        placedTokens: [],
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
    state.session = {
      roomCode: data.roomCode || data.room,
      hostId: data.hostId,
      players: data.players || [{ ...state.user, connected: true }],
      status: 'connected',
    };
    state.user.type = 'player';
    state.user.connected = true;
    console.log('Session joined:', state.session);
  },
  'scene/create': (state, data) => {
    if (data.scene) {
      state.sceneState.scenes.push(data.scene);
      if (state.sceneState.activeSceneId === null) {
        state.sceneState.activeSceneId = data.scene.id;
      }
    }
  },
  'scene/update': (state, data) => {
    if (data.sceneId && data.updates) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex] = { ...state.sceneState.scenes[sceneIndex], ...data.updates, updatedAt: Date.now() };
      }
    }
  },
  'scene/delete': (state, data) => {
    if (data.sceneId) {
      state.sceneState.scenes = state.sceneState.scenes.filter(s => s.id !== data.sceneId);
      if (state.sceneState.activeSceneId === data.sceneId) {
        state.sceneState.activeSceneId = state.sceneState.scenes.length > 0 ? state.sceneState.scenes[0].id : null;
      }
    }
  },
  'scene/change': (state, data) => {
    if (data.sceneId) {
      const sceneExists = state.sceneState.scenes.some(s => s.id === data.sceneId);
      if (sceneExists) {
        state.sceneState.activeSceneId = data.sceneId;
        state.sceneState.camera = { x: 0, y: 0, zoom: 1.0 };
      }
    }
  },
  'camera/move': (state, data) => {
    if (data.camera) {
      Object.assign(state.sceneState.camera, data.camera);
    }
  },
  'drawing/create': (state, data) => {
    if (data.sceneId && data.drawing) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex].drawings.push(data.drawing);
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'drawing/update': (state, data) => {
    if (data.sceneId && data.drawingId && data.updates) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0) {
        const drawingIndex = state.sceneState.scenes[sceneIndex].drawings.findIndex(d => d.id === data.drawingId);
        if (drawingIndex >= 0) {
          state.sceneState.scenes[sceneIndex].drawings[drawingIndex] = { ...state.sceneState.scenes[sceneIndex].drawings[drawingIndex], ...data.updates, updatedAt: Date.now() };
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      }
    }
  },
  'drawing/delete': (state, data) => {
    if (data.sceneId && data.drawingId) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[sceneIndex].drawings.filter(d => d.id !== data.drawingId);
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'drawing/clear': (state, data) => {
    if (data.sceneId) {
      const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === data.sceneId);
      if (sceneIndex >= 0) {
        if (data.layer) {
          state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[sceneIndex].drawings.filter(d => d.layer !== data.layer);
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
            const drawingToUpdate = state.sceneState.scenes[sceneIndex].drawings[drawingIndex];
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
