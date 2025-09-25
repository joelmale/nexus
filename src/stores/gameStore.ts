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

          // Token Events
          case 'token/place':
            if (event.data.sceneId && event.data.token) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0) {
                if (!state.sceneState.scenes[sceneIndex].placedTokens) {
                  state.sceneState.scenes[sceneIndex].placedTokens = [];
                }
                state.sceneState.scenes[sceneIndex].placedTokens.push(event.data.token);
                state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
              }
            }
            break;

          case 'user/join':
            if (event.data.sceneId && event.data.tokenId) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
                const tokenIndex = state.sceneState.scenes[sceneIndex].placedTokens.findIndex(
                  t => t.id === event.data.tokenId
                );
                if (tokenIndex >= 0) {
                  state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].x = event.data.position.x;
                  state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].y = event.data.position.y;
                  if (event.data.rotation !== undefined) {
                    state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].rotation = event.data.rotation;
                  }
                  state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].updatedAt = Date.now();
                  state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
                }
              }
            }
            break;

          case 'token/update':
            if (event.data.sceneId && event.data.tokenId && event.data.updates) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
                const tokenIndex = state.sceneState.scenes[sceneIndex].placedTokens.findIndex(
                  t => t.id === event.data.tokenId
                );
                if (tokenIndex >= 0) {
                  state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex] = {
                    ...state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex],
                    ...event.data.updates,
                    updatedAt: Date.now(),
                  };
                  state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
                }
              }
            }
            break;

          case 'token/delete':
            if (event.data.sceneId && event.data.tokenId) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
                state.sceneState.scenes[sceneIndex].placedTokens = state.sceneState.scenes[sceneIndex].placedTokens.filter(
                  t => t.id !== event.data.tokenId
                );
                state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
              }
            }
          
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
            // Set default tab to scenes for hosts
            state.activeTab = 'scenes';
            // Create default blank scene if no scenes exist
            if (state.sceneState.scenes.length === 0) {
              const defaultScene: Scene = {
                id: uuidv4(),
                name: 'Scene 1',
                description: 'Enter description here',
                backgroundImage: undefined,
                gridSettings: {
                  enabled: true,
                  size: 50,
                  color: '#ffffff',
                  opacity: 0.3,
                  snapToGrid: true,
                },
                drawings: [], // Initialize empty drawings array
                placedTokens: [], // Initialize empty placed tokens array
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              state.sceneState.scenes.push(defaultScene);
              state.sceneState.activeSceneId = defaultScene.id;
            }
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

          // Drawing Events
          case 'drawing/create':
            if (event.data.sceneId && event.data.drawing) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0) {
                state.sceneState.scenes[sceneIndex].drawings.push(event.data.drawing);
                state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
              }
            }
            break;

          case 'drawing/update':
            if (event.data.sceneId && event.data.drawingId && event.data.updates) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0) {
                const drawingIndex = state.sceneState.scenes[sceneIndex].drawings.findIndex(
                  d => d.id === event.data.drawingId
                );
                if (drawingIndex >= 0) {
                  state.sceneState.scenes[sceneIndex].drawings[drawingIndex] = {
                    ...state.sceneState.scenes[sceneIndex].drawings[drawingIndex],
                    ...event.data.updates,
                    updatedAt: Date.now(),
                  };
                  state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
                }
              }
            }
            break;

          case 'drawing/delete':
            if (event.data.sceneId && event.data.drawingId) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0) {
                state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[sceneIndex].drawings.filter(
                  d => d.id !== event.data.drawingId
                );
                state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
              }
            }
            break;

          case 'drawing/clear':
            if (event.data.sceneId) {
              const sceneIndex = state.sceneState.scenes.findIndex(s => s.id === event.data.sceneId);
              if (sceneIndex >= 0) {
                if (event.data.layer) {
                  // Clear specific layer
                  state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[sceneIndex].drawings.filter(
                    d => d.layer !== event.data.layer
                  );
                } else {
                  // Clear all drawings
                  state.sceneState.scenes[sceneIndex].drawings = [];
                }
                state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
              }
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
        drawings: [], // Initialize with empty drawings array
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
            state.sceneState.scenes[sceneIndex].drawings[drawingIndex] = {
              ...state.sceneState.scenes[sceneIndex].drawings[drawingIndex],
              ...updates,
              updatedAt: Date.now(),
            };
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
