import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { immer } from 'zustand/middleware/immer';
import type {
  AppView,
  PlayerCharacter,
  GameConfig,
  GameState,
  User,
  Session,
  DiceRoll,
  TabType,
  GameEvent,
  Scene,
  Camera,
  UserSettings,
  ColorScheme,
  Player,
  Drawing,
  PlacedToken,
  ChatMessage,
  ChatUserTypingEvent,
  VoiceChannel,
  TokenPlaceEvent,
  TokenMoveEvent,
  TokenUpdateEvent,
  TokenDeleteEvent,
  UserJoinEvent,
  UserLeaveEvent,
  SessionCreatedEvent,
  SessionJoinedEvent,
  SceneCreateEvent,
  SceneUpdateEvent,
  SceneDeleteEvent,
  SceneChangeEvent,
  CameraMoveEvent,
  DrawingCreateEvent,
  DrawingUpdateEvent,
  DrawingDeleteEvent,
  DrawingClearEvent,
  DiceRollEvent,
  DiceRollResultEvent,
  ConnectionState,
  HostChangedEvent,
  CoHostAddedEvent,
  CoHostRemovedEvent,
} from '@/types/game';
import type { GamePhase, LiveGameConfig } from '@/types/gameLifecycle';
import { PHASE_PERMISSIONS } from '@/types/gameLifecycle';
import { v4 as uuidv4 } from 'uuid';
import { defaultColorSchemes, applyColorScheme } from '@/utils/colorSchemes';
import { drawingPersistenceService } from '@/services/drawingPersistence';
import { sessionPersistenceService } from '@/services/sessionPersistence';
import { getLinearFlowStorage } from '@/services/linearFlowStorage';

interface PendingUpdate {
  id: string;
  type: string;
  localState: any;
  timestamp: number;
}

interface GameStore extends GameState {
  isAuthenticated: boolean;
  // Core Actions
  setUser: (user: Partial<User>) => void;
  setSession: (session: Session | null) => void;
  addDiceRoll: (roll: DiceRoll) => void;
  setActiveTab: (tab: TabType) => void;
  applyEvent: (event: GameEvent) => void;
  reset: () => void;

  // Auth Actions
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;

  // App Flow Actions (from appFlowStore)
  view: AppView;
  gameConfig?: GameConfig;
  selectedCharacter?: PlayerCharacter;
  setView: (view: AppView) => void;
  joinRoomWithCode: (
    roomCode: string,
    character?: PlayerCharacter,
  ) => Promise<void>;
  createGameRoom: (
    config: GameConfig,
    clearExistingData?: boolean,
  ) => Promise<string>;
  leaveRoom: () => Promise<void>;
  resetToWelcome: () => void;

  // Character Management Actions (from appFlowStore)
  createCharacter: (
    characterData: Omit<PlayerCharacter, 'id' | 'createdAt' | 'playerId'>,
  ) => PlayerCharacter;
  selectCharacter: (characterId: string) => void;
  saveCharacter: (character: PlayerCharacter) => void;
  getSavedCharacters: () => PlayerCharacter[];
  deleteCharacter: (characterId: string) => void;
  exportCharacters: () => string;
  importCharacters: (jsonData: string) => void;

  // Lifecycle Actions (from gameLifecycleStore)
  startPreparation: () => void;
  markReadyToStart: () => void;
  startGoingLive: (config: LiveGameConfig) => Promise<string>;
  goLive: (roomCode: string) => void;
  pauseGame: (reason?: string) => void;
  resumeGame: () => void;
  endGame: (reason?: string, saveSnapshot?: boolean) => void;
  joinLiveGame: (roomCode: string) => Promise<void>;
  leaveGame: () => void;

  // Scene Actions
  createScene: (
    scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt' | 'roomCode'>,
  ) => Scene;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  setActiveScene: (sceneId: string) => void;
  updateCamera: (camera: Partial<Camera>) => void;
  setFollowDM: (follow: boolean) => void;
  setActiveTool: (tool: string) => void;

  // Bulk Scene Operations
  deleteScenesById: (sceneIds: string[]) => void;
  updateScenesVisibility: (
    sceneIds: string[],
    visibility: Scene['visibility'],
  ) => void;
  duplicateScene: (sceneId: string) => Scene | null;

  // Selection Actions
  setSelection: (objectIds: string[]) => void;
  addToSelection: (objectIds: string[]) => void;
  removeFromSelection: (objectIds: string[]) => void;
  clearSelection: () => void;

  // Drawing Actions
  createDrawing: (sceneId: string, drawing: Drawing) => void;
  updateDrawing: (
    sceneId: string,
    drawingId: string,
    updates: Partial<Drawing>,
  ) => void;
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
  moveToken: (
    sceneId: string,
    tokenId: string,
    position: { x: number; y: number },
    rotation?: number,
  ) => void;
  updateToken: (
    sceneId: string,
    tokenId: string,
    updates: Partial<PlacedToken>,
  ) => void;
  deleteToken: (sceneId: string, tokenId: string) => void;
  getSceneTokens: (sceneId: string) => PlacedToken[];
  getVisibleTokens: (sceneId: string, isHost: boolean) => PlacedToken[];

  // Optimistic Update Actions
  moveTokenOptimistic: (
    sceneId: string,
    tokenId: string,
    position: { x: number; y: number },
    rotation?: number,
  ) => void;
  confirmUpdate: (updateId: string) => void;
  rollbackUpdate: (updateId: string) => void;

  // Persistence Actions
  initializeFromStorage: (roomCode?: string) => Promise<void>;
  loadSceneDrawings: (sceneId: string) => Promise<void>;

  // Session Persistence Actions
  saveSessionState: () => void;
  loadSessionState: () => void;
  attemptSessionRecovery: () => Promise<boolean>;
  clearSessionData: () => void;

  // Chat Actions
  sendChatMessage: (
    content: string,
    messageType?: 'text' | 'dm-announcement' | 'whisper' | 'system',
    recipientId?: string,
  ) => void;
  addChatMessage: (message: ChatMessage['data']) => void;
  setTyping: (isTyping: boolean) => void;
  clearChat: () => void;
  markChatAsRead: () => void;

  // Voice Actions
  createVoiceChannel: (name: string) => VoiceChannel;
  joinVoiceChannel: (channelId: string) => Promise<void>;
  leaveVoiceChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  setAudioDevices: (devices: MediaDeviceInfo[]) => void;
  selectAudioInput: (deviceId: string) => void;
  selectAudioOutput: (deviceId: string) => void;

  // Connection Actions
  updateConnectionState: (updates: Partial<ConnectionState>) => void;
  setConnectionQuality: (
    quality: ConnectionState['quality'],
    latency?: number,
  ) => void;

  // Version Management Actions
  getEntityVersion: (entityId: string) => number;
  incrementEntityVersion: (entityId: string) => number;

  // Host Management Actions
  transferHost: (targetUserId: string) => void;
  addCoHost: (targetUserId: string) => void;
  removeCoHost: (targetUserId: string) => void;

  // Developer Actions (from appFlowStore + existing)
  toggleMockData: (enable: boolean) => void;
  dev_quickDM: (name?: string) => Promise<void>;
  dev_quickPlayer: (name?: string, autoJoinRoom?: string) => void;
}

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
  userType: 'player' | 'host';
  roomCode: string;
  gameConfig?: GameConfig;
  timestamp: number;
}

const saveSessionToStorage = (state: GameStore): void => {
  if (state.user.name && state.user.type && state.session?.roomCode) {
    const session: PersistedSession = {
      userName: state.user.name,
      userType: state.user.type,
      roomCode: state.session.roomCode,
      gameConfig: state.gameConfig,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log('💾 Saved session to localStorage:', session);
  }
};

const loadSessionFromStorage = (): Partial<GameStore> | null => {
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
        connected: false,
      },
      gameConfig: session.gameConfig,
      // Session will be restored with roomCode via attemptSessionRecovery
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

// Read pre-game view from localStorage for persistence on refresh
const preGameView = localStorage.getItem(
  'nexus-pre-game-view',
) as AppView | null;
console.log(
  `[Persistence] Found pre-game view in localStorage: '${preGameView}'`,
);

const initialState: GameState & {
  view: AppView;
  gameConfig?: GameConfig;
  selectedCharacter?: PlayerCharacter;
} = {
  // App Flow State (from appFlowStore)
  view: preGameView || 'welcome',
  gameConfig: undefined,
  selectedCharacter: undefined,

  // Game State
  isAuthenticated: false,
  user: {
    id: getBrowserId(),
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
    activeTool: 'select' as const,
    selectedObjectIds: [],
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
    diceDisappearTime: 3000, // 3 seconds default

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

    // Experimental Settings
    floatingToolbar: false, // Default to docked toolbar
  },

  // Chat State
  chat: {
    messages: [],
    typingUsers: [],
    unreadCount: 0,
  },

  // Voice State
  voice: {
    channels: [],
    activeChannelId: null,
    isMuted: false,
    isDeafened: false,
    audioDevices: [],
    selectedInputDevice: null,
    selectedOutputDevice: null,
  },

  // Connection State
  connection: {
    isConnected: false,
    quality: 'disconnected',
    latency: 0,
    packetLoss: 0,
    lastUpdate: 0,
    reconnectAttempts: 0,
  },

  // Version tracking for conflict resolution
  entityVersions: new Map(),
};
console.log(`[Persistence] Initial view set to: '${initialState.view}'`);

// --- Mock Data for Development (can be toggled via settings) ---
const MOCK_PLAYERS: Player[] = [
  {
    id: 'user-joel',
    name: 'Joel',
    type: 'host',
    color: '#6366f1',
    connected: true,
    canEditScenes: true,
  },
  {
    id: 'user-alice',
    name: 'Alice',
    type: 'player',
    color: '#ec4899',
    connected: true,
    canEditScenes: false,
  },
  {
    id: 'user-bob',
    name: 'Bob',
    type: 'player',
    color: '#22c55e',
    connected: false,
    canEditScenes: false,
  },
  {
    id: 'user-charlie',
    name: 'Charlie',
    type: 'player',
    color: '#f59e0b',
    connected: true,
    canEditScenes: false,
  },
];

const MOCK_SESSION: Session = {
  roomCode: 'TEST',
  hostId: 'user-joel',
  players: MOCK_PLAYERS,
  status: 'connected',
};

// Try to restore session from localStorage
const restoredSession = loadSessionFromStorage();
if (restoredSession) {
  Object.assign(initialState, restoredSession);
  console.log('✅ Restored session on app load');
}

type EventHandler = (state: GameState, data: unknown) => void;

const eventHandlers: Record<string, EventHandler> = {
  'dice/roll': (state, data) => {
    const eventData = data as DiceRollEvent['data'];
    if (eventData.roll) {
      state.diceRolls.unshift(eventData.roll);
    }
  },
  'dice/roll-result': (state, data) => {
    // Handle server-authoritative dice roll results
    const eventData = data as DiceRollResultEvent['data'];
    if (eventData.roll) {
      state.diceRolls.unshift(eventData.roll);
      console.log('🎲 Added dice roll to history:', eventData.roll);
    }
  },
  'token/place': (state, data) => {
    const eventData = data as TokenPlaceEvent['data'];
    if (eventData.sceneId && eventData.token) {
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
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
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        const tokenIndex = state.sceneState.scenes[
          sceneIndex
        ].placedTokens.findIndex((t) => t.id === eventData.tokenId);
        if (tokenIndex >= 0) {
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].x =
            eventData.position.x;
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].y =
            eventData.position.y;
          if (eventData.rotation !== undefined) {
            state.sceneState.scenes[sceneIndex].placedTokens[
              tokenIndex
            ].rotation = eventData.rotation;
          }
          state.sceneState.scenes[sceneIndex].placedTokens[
            tokenIndex
          ].updatedAt = Date.now();
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

          // Increment version for conflict resolution
          const currentVersion =
            state.entityVersions.get(eventData.tokenId) || 0;
          state.entityVersions.set(eventData.tokenId, currentVersion + 1);
        }
      }
    }
  },
  'token/update': (state, data) => {
    const eventData = data as TokenUpdateEvent['data'];
    if (eventData.sceneId && eventData.tokenId && eventData.updates) {
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        const tokenIndex = state.sceneState.scenes[
          sceneIndex
        ].placedTokens.findIndex((t) => t.id === eventData.tokenId);
        if (tokenIndex >= 0) {
          state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex] = {
            ...state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex],
            ...eventData.updates,
            updatedAt: Date.now(),
          };
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

          // Increment version for conflict resolution
          const currentVersion =
            state.entityVersions.get(eventData.tokenId) || 0;
          state.entityVersions.set(eventData.tokenId, currentVersion + 1);
        }
      }
    }
  },
  'token/delete': (state, data) => {
    const eventData = data as TokenDeleteEvent['data'];
    if (eventData.sceneId && eventData.tokenId) {
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
      if (sceneIndex >= 0 && state.sceneState.scenes[sceneIndex].placedTokens) {
        state.sceneState.scenes[sceneIndex].placedTokens =
          state.sceneState.scenes[sceneIndex].placedTokens.filter(
            (t) => t.id !== eventData.tokenId,
          );
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

        // Increment version for conflict resolution
        const currentVersion = state.entityVersions.get(eventData.tokenId) || 0;
        state.entityVersions.set(eventData.tokenId, currentVersion + 1);
      }
    }
  },
  'user/join': (state, data) => {
    const eventData = data as UserJoinEvent['data'];
    if (state.session && eventData.user) {
      const existingIndex = state.session.players.findIndex(
        (p) => p.id === eventData.user.id,
      ) as number;
      if (existingIndex >= 0) {
        state.session.players[existingIndex] = {
          ...state.session.players[existingIndex],
          ...eventData.user,
        };
      } else {
        // Convert User to Player by adding canEditScenes property
        const player: Player = {
          ...eventData.user,
          canEditScenes: eventData.user.type === 'host',
        };
        state.session.players.push(player);
      }
    }
  },
  'user/leave': (state, data) => {
    const eventData = data as UserLeaveEvent['data'];
    if (state.session && eventData.userId) {
      state.session.players = state.session.players.filter(
        (p) => p.id !== eventData.userId,
      );
    }
  },
  'session/created': (state, data) => {
    console.log('Creating session with data:', data);
    const eventData = data as SessionCreatedEvent['data'] & { campaignScenes?: unknown[] };
    state.session = {
      roomCode: eventData.roomCode,
      hostId: state.user.id,
      coHostIds: [],
      players: [
        {
          ...state.user,
          connected: true,
          canEditScenes: state.user.type === 'host',
        },
      ],
      status: 'connected',
    };
    state.user.type = 'host';
    state.user.connected = true;
    state.activeTab = 'scenes';

    // Load campaign scenes if provided, otherwise create default scene
    if (eventData.campaignScenes && Array.isArray(eventData.campaignScenes) && eventData.campaignScenes.length > 0) {
      console.log(`📚 Loading ${eventData.campaignScenes.length} campaign scenes into game state`);
      state.sceneState.scenes = eventData.campaignScenes as Scene[];
      // Set first scene as active
      if (state.sceneState.scenes.length > 0) {
        state.sceneState.activeSceneId = state.sceneState.scenes[0].id;
      }
    } else if (state.sceneState.scenes.length === 0) {
      // Create default scene only if no campaign scenes and no existing scenes
      const defaultScene: Scene = {
        id: uuidv4(),
        name: 'Scene 1',
        description: 'Enter description here',
        roomCode: eventData.roomCode, // Use room code from session creation
        visibility: 'public',
        isEditable: true,
        createdBy: state.user.id,
        backgroundImage: undefined,
        gridSettings: {
          enabled: true,
          size: 50,
          color: '#ffffff',
          opacity: 0.3,
          snapToGrid: true,
          showToPlayers: true,
        },
        lightingSettings: {
          enabled: false,
          globalIllumination: true,
          ambientLight: 0.5,
          darkness: 0,
        },
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
      coHostIds: eventData.coHostIds || [],
      players: eventData.players || [{ ...state.user, connected: true }],
      status: 'connected',
    };
    // Determine user type based on host/co-host status
    if (eventData.hostId === state.user.id) {
      state.user.type = 'host';
    } else if (eventData.coHostIds?.includes(state.user.id)) {
      state.user.type = 'host'; // Co-hosts also have host privileges
    } else {
      state.user.type = 'player';
    }
    state.user.connected = true;
    console.log('Session joined:', state.session);
  },
  'session/reconnected': (state, data) => {
    console.log('Reconnecting to session with data:', data);
    const eventData = data as {
      roomCode?: string;
      hostId?: string;
      gameState?: {
        scenes?: Scene[];
        activeSceneId?: string | null;
      };
    };

    // Update session data if provided
    if (eventData.roomCode) {
      if (!state.session) {
        state.session = {
          roomCode: eventData.roomCode,
          hostId: eventData.hostId || state.user.id,
          players: [
            {
              ...state.user,
              connected: true,
              canEditScenes: state.user.type === 'host',
            },
          ],
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
  'session/host-changed': (state, data) => {
    const eventData = data as HostChangedEvent['data'];
    if (state.session) {
      state.session.hostId = eventData.newHostId;

      // Update local user type if we became host
      if (eventData.newHostId === state.user.id) {
        state.user.type = 'host';
      } else if (eventData.oldHostId === state.user.id) {
        // Check if we were demoted to co-host or player
        const isCoHost = state.session.coHostIds?.includes(state.user.id);
        state.user.type = isCoHost ? 'host' : 'player';
      }

      console.log(
        `👑 Host changed: ${eventData.oldHostId} -> ${eventData.newHostId} (${eventData.reason})`,
      );
    }
  },
  'session/cohost-added': (state, data) => {
    const eventData = data as CoHostAddedEvent['data'];
    if (state.session) {
      if (!state.session.coHostIds) {
        state.session.coHostIds = [];
      }
      if (!state.session.coHostIds.includes(eventData.coHostId)) {
        state.session.coHostIds.push(eventData.coHostId);
      }

      // Update local user type if we became co-host
      if (eventData.coHostId === state.user.id) {
        state.user.type = 'host';
      }
    }
    console.log(`👥 Co-host added: ${eventData.coHostId}`);
  },
  'session/cohost-removed': (state, data) => {
    const eventData = data as CoHostRemovedEvent['data'];
    if (state.session) {
      if (state.session.coHostIds) {
        state.session.coHostIds = state.session.coHostIds.filter(
          (id) => id !== eventData.coHostId,
        );
      }

      // Update local user type if we were demoted from co-host
      if (eventData.coHostId === state.user.id) {
        state.user.type = 'player';
      }
    }
    console.log(`👥 Co-host removed: ${eventData.coHostId}`);
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
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex] = {
          ...state.sceneState.scenes[sceneIndex],
          ...eventData.updates,
          updatedAt: Date.now(),
        };
      }
    }
  },
  'scene/delete': (state, data) => {
    const eventData = data as SceneDeleteEvent['data'];
    if (eventData.sceneId) {
      state.sceneState.scenes = state.sceneState.scenes.filter(
        (s) => s.id !== eventData.sceneId,
      );
      if (state.sceneState.activeSceneId === eventData.sceneId) {
        state.sceneState.activeSceneId =
          state.sceneState.scenes.length > 0
            ? state.sceneState.scenes[0].id
            : null;
      }
    }
  },
  'scene/change': (state, data) => {
    const eventData = data as SceneChangeEvent['data'];
    if (eventData.sceneId) {
      const sceneExists = state.sceneState.scenes.some(
        (s) => s.id === eventData.sceneId,
      );
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
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex].drawings.push(eventData.drawing);
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'drawing/update': (state, data) => {
    const eventData = data as DrawingUpdateEvent['data'];
    if (eventData.sceneId && eventData.drawingId && eventData.updates) {
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
      if (sceneIndex >= 0) {
        const drawingIndex = state.sceneState.scenes[
          sceneIndex
        ].drawings.findIndex((d) => d.id === eventData.drawingId);
        if (drawingIndex >= 0) {
          Object.assign(
            state.sceneState.scenes[sceneIndex].drawings[drawingIndex],
            eventData.updates,
          );
          state.sceneState.scenes[sceneIndex].drawings[drawingIndex].updatedAt =
            Date.now();
          state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
        }
      }
    }
  },
  'drawing/delete': (state, data) => {
    const eventData = data as DrawingDeleteEvent['data'];
    if (eventData.sceneId && eventData.drawingId) {
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
      if (sceneIndex >= 0) {
        state.sceneState.scenes[sceneIndex].drawings = state.sceneState.scenes[
          sceneIndex
        ].drawings.filter((d) => d.id !== eventData.drawingId);
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'drawing/clear': (state, data) => {
    const eventData = data as DrawingClearEvent['data'];
    if (eventData.sceneId) {
      const sceneIndex = state.sceneState.scenes.findIndex(
        (s) => s.id === eventData.sceneId,
      );
      if (sceneIndex >= 0) {
        if (eventData.layer) {
          state.sceneState.scenes[sceneIndex].drawings =
            state.sceneState.scenes[sceneIndex].drawings.filter(
              (d) => d.layer !== eventData.layer,
            );
        } else {
          state.sceneState.scenes[sceneIndex].drawings = [];
        }
        state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
      }
    }
  },
  'chat/typing': (state, data) => {
    const eventData = data as ChatUserTypingEvent['data'];
    const existingUserIndex = state.chat.typingUsers.findIndex(
      (u) => u.userId === eventData.userId,
    );

    if (eventData.isTyping) {
      // Add user to typing list if not already there
      if (existingUserIndex === -1) {
        state.chat.typingUsers.push({
          userId: eventData.userId,
          userName: eventData.userName,
        });
      }
    } else {
      // Remove user from typing list
      if (existingUserIndex >= 0) {
        state.chat.typingUsers.splice(existingUserIndex, 1);
      }
    }
  },
};

export const useGameStore = create<GameStore>()(
  immer((set, get) => {
    // Pending updates for optimistic UI
    const pendingUpdates = new Map<string, PendingUpdate>();

    return {
      ...initialState,

      // Auth Actions
      login: (user) => {
        set({ user, isAuthenticated: true, view: 'dashboard' });
      },
      logout: async () => {
        await fetch('/auth/logout');
        set({ user: initialState.user, isAuthenticated: false, view: 'welcome' });
      },
      checkAuth: async () => {
        try {
          const response = await fetch('/auth/me');
          if (response.ok) {
            const user = await response.json();
            get().login(user);
          } else {
            set({ isAuthenticated: false });
          }
        } catch (error) {
          console.error('Auth check failed', error);
          set({ isAuthenticated: false });
        }
      },

      setUser: (userData) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 setUser:', userData);
        }
        let nextView: AppView | null = null;
        set((state) => {
          Object.assign(state.user, userData);

          // Determine next view based on user data
          if (userData.name && userData.type) {
            nextView = userData.type === 'player' ? 'player_setup' : 'dm_setup';
          }
        });

        // Call setView to handle navigation and persistence centrally
        if (nextView) {
          get().setView(nextView);
        }

        // Save session if we have a room code
        const currentState = get();
        if (currentState.session?.roomCode) {
          saveSessionToStorage(currentState);
        }
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
          set((state) => {
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
            id: getBrowserId(), // Use stable browser ID
          },
        }));
      },

      // App Flow Actions (from appFlowStore)
      setView: (view: AppView) => {
        const from = get().view;
        if (from === view) return; // Avoid unnecessary sets
        console.log(`[State] Changing view from '${from}' to '${view}'`);
        set({ view });

        // Persist pre-game view to localStorage to survive refreshes
        if (view === 'player_setup' || view === 'dm_setup') {
          localStorage.setItem('nexus-pre-game-view', view);
          console.log(`[Persistence] Saved view '${view}' to localStorage.`);
        } else {
          // Clean up when moving to welcome or into the actual game
          localStorage.removeItem('nexus-pre-game-view');
          console.log(`[Persistence] Cleared pre-game-view from localStorage.`);
        }
      },

      joinRoomWithCode: async (
        roomCode: string,
        character?: PlayerCharacter,
      ) => {
        try {
          // Import webSocketService
          const { webSocketService } = await import('@/utils/websocket');

          console.log(
            '🎮 Joining room:',
            roomCode,
            'with character:',
            character?.name,
          );

          // Connect to WebSocket (player mode)
          await webSocketService.connect(roomCode, 'player');

          // Wait for session/joined event from server
          const session = await webSocketService.waitForSessionJoined();

          console.log('✅ Joined room:', roomCode);

          // Update state
          set((state) => {
            state.view = 'game';
            if (character) {
              state.selectedCharacter = character;
            }
            state.user.connected = true;
          });

          // Save session to localStorage for refresh recovery
          saveSessionToStorage(get());

          // Update session
          const { user } = get();
          get().setSession({
            roomCode,
            hostId: session.hostId,
            players: [
              {
                ...user,
                id: user.id || '',
                canEditScenes: false,
                connected: true,
                type: 'player',
                color: user.color || 'blue',
              },
            ],
            status: 'connected',
          });

          // Load room-specific scenes and drawings from storage
          try {
            const roomScenes =
              await drawingPersistenceService.loadAllScenes(roomCode);
            if (roomScenes.length > 0) {
              set((state) => {
                state.sceneState.scenes = roomScenes;
                // Set the first scene as active if no active scene is set
                if (!state.sceneState.activeSceneId && roomScenes.length > 0) {
                  state.sceneState.activeSceneId = roomScenes[0].id;
                }
              });
              console.log(
                `📂 Loaded ${roomScenes.length} scenes for room ${roomCode}`,
              );

              // Load drawings for each scene
              for (const scene of roomScenes) {
                try {
                  const drawings = await drawingPersistenceService.loadDrawings(
                    scene.id,
                    roomCode,
                  );
                  if (drawings.length > 0) {
                    set((state) => {
                      const sceneIndex = state.sceneState.scenes.findIndex(
                        (s) => s.id === scene.id,
                      );
                      if (sceneIndex >= 0) {
                        state.sceneState.scenes[sceneIndex].drawings = drawings;
                      }
                    });
                    console.log(
                      `📂 Loaded ${drawings.length} drawings for scene ${scene.id}`,
                    );
                  }
                } catch (drawingError) {
                  console.warn(
                    `Failed to load drawings for scene ${scene.id}:`,
                    drawingError,
                  );
                }
              }
            }
          } catch (storageError) {
            console.warn(
              'Failed to load room data from storage:',
              storageError,
            );
          }

          // If character provided, mark it as recently used
          if (character) {
            const characters = get().getSavedCharacters();
            const updated = characters.map((c) =>
              c.id === character.id ? { ...c, lastUsed: Date.now() } : c,
            );
            localStorage.setItem('nexus-characters', JSON.stringify(updated));
          }
        } catch (error) {
          console.error('Failed to join room:', error);
          throw error;
        }
      },

      createGameRoom: async (
        config: GameConfig,
        clearExistingData: boolean = true,
      ) => {
        try {
          // Clear previous game data to start fresh (unless preserving for dev/mock data)
          const storage = getLinearFlowStorage();

          if (clearExistingData) {
            await storage.clearGameData();
          } else if (process.env.NODE_ENV === 'development') {
            const existingScenes = storage.getScenes();
            console.log(
              `🎮 Preserving ${existingScenes.length} existing scenes`,
            );
          }

          // Import webSocketService
          const { webSocketService } = await import('@/utils/websocket');

          console.log('🎮 Creating game room with WebSocket connection');

          // Connect to WebSocket (host mode) - server will generate room code
          // Pass campaign ID if provided in config
          await webSocketService.connect(undefined, 'host', config.campaignId);

          // Wait for session/created event from server
          const session = await webSocketService.waitForSessionCreated();

          const roomCode = session.roomCode;
          console.log('✅ Room created:', roomCode);

          // Update state
          set((state) => {
            state.gameConfig = config;
            state.view = 'game';
            state.user.connected = true;
          });

          // Save session to localStorage for refresh recovery
          saveSessionToStorage(get());

          // Update session
          const { user } = get();
          get().setSession({
            roomCode,
            hostId: user.id || '',
            players: [
              {
                ...user,
                id: user.id || '',
                canEditScenes: true,
                connected: true,
                type: 'host',
                color: user.color || 'blue',
              },
            ],
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

      leaveRoom: async () => {
        try {
          const currentState = get();
          console.log('🚪 Leaving room:', {
            roomCode: currentState.session?.roomCode,
            userName: currentState.user.name,
            userType: currentState.user.type,
            isConnected: currentState.user.connected,
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
        console.log('🔄 Resetting to welcome screen. Called from:');
        console.trace(); // Log stack trace to find the caller

        set((state) => {
          state.view = 'welcome';
          state.user.name = '';
          state.user.type = 'player';
          state.user.connected = false;
          state.session = null;
          state.gameConfig = undefined;
          state.selectedCharacter = undefined;
        });

        // Clear persisted session
        clearSessionFromStorage();
        // Also clear the pre-game view
        localStorage.removeItem('nexus-pre-game-view');

        console.log(
          '✅ Reset complete - cleared user, room, and connection state',
        );
      },

      // Character Management Actions (from appFlowStore)
      createCharacter: (characterData) => {
        const character: PlayerCharacter = {
          ...characterData,
          id: uuidv4(),
          createdAt: Date.now(),
          playerId: get().user.id,
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
        const character = characters.find((c) => c.id === characterId);
        if (character) {
          console.log('Selected character:', character.name);
          // Character selection handled by UI components
        }
      },

      saveCharacter: (character: PlayerCharacter) => {
        try {
          const existing = get().getSavedCharacters();
          const existingIndex = existing.findIndex(
            (c) => c.id === character.id,
          );
          if (existingIndex >= 0) {
            // Update existing character
            existing[existingIndex] = character;
          } else {
            // Add new character
            existing.push(character);
          }
          localStorage.setItem('nexus-characters', JSON.stringify(existing));
          console.log('Saved character:', character.name);
        } catch (error) {
          console.error('Failed to save character to localStorage:', error);
        }
      },

      getSavedCharacters: (): PlayerCharacter[] => {
        try {
          const stored = localStorage.getItem('nexus-characters');
          return stored ? JSON.parse(stored) : [];
        } catch (error) {
          console.error('Failed to load characters from localStorage:', error);
          return [];
        }
      },

      deleteCharacter: (characterId: string) => {
        try {
          const existing = get().getSavedCharacters();
          const filtered = existing.filter((c) => c.id !== characterId);
          localStorage.setItem('nexus-characters', JSON.stringify(filtered));
          console.log('Deleted character:', characterId);
        } catch (error) {
          console.error('Failed to delete character from localStorage:', error);
        }
      },

      exportCharacters: (): string => {
        const characters = get().getSavedCharacters();
        return JSON.stringify(
          {
            version: 1,
            exportedAt: Date.now(),
            playerId: get().user.id,
            playerName: get().user.name,
            characters,
          },
          null,
          2,
        );
      },

      importCharacters: (jsonData: string) => {
        try {
          const data = JSON.parse(jsonData);

          if (!data.characters || !Array.isArray(data.characters)) {
            throw new Error('Invalid character data format');
          }

          // Update character player IDs to current browser
          const importedCharacters: PlayerCharacter[] = data.characters.map(
            (c: PlayerCharacter) => ({
              ...c,
              id: uuidv4(), // New ID to avoid conflicts
              playerId: get().user.id, // Link to current browser
              createdAt: c.createdAt || Date.now(),
            }),
          );

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

      // Lifecycle Actions (from gameLifecycleStore)
      startPreparation: () => {
        get().setView('dm_setup'); // Centralize view change
        set((state) => {
          state.user.type = 'host';
          state.user.connected = false;
          state.session = null;
          console.log('🎯 Started preparation phase');
        });
      },

      markReadyToStart: () => {
        set((state) => {
          state.view = 'game';
          // User stays disconnected until they actually go live
          console.log('✅ Marked ready to start live game');
        });
      },

      startGoingLive: async (config: LiveGameConfig) => {
        // Convert LiveGameConfig to GameConfig
        const gameConfig: GameConfig = {
          name: config.gameTitle || 'Untitled Campaign',
          description: config.gameDescription || '',
          estimatedTime: '2-4 hours', // Default
          campaignType: 'campaign', // Default
          maxPlayers: config.maxPlayers,
        };

        // Reuse existing createGameRoom logic
        return await get().createGameRoom(gameConfig);
      },

      goLive: (roomCode: string) => {
        // This is handled by createGameRoom, but we can add explicit logic if needed
        console.log(`🚀 Game is now live! Room code: ${roomCode}`);
      },

      pauseGame: (reason?: string) => {
        // For now, just log - full pause/resume can be implemented later
        console.log('⏸️ Game paused', reason);
      },

      resumeGame: () => {
        console.log('▶️ Game resumed');
      },

      endGame: (reason?: string, _saveSnapshot?: boolean) => {
        // Use existing leaveRoom logic
        get().leaveRoom();
        console.log('🏁 Game ended', reason);
      },

      joinLiveGame: async (roomCode: string) => {
        // Reuse existing joinRoomWithCode logic
        return await get().joinRoomWithCode(roomCode);
      },

      leaveGame: () => {
        // Use existing leaveRoom logic
        get().leaveRoom();
        console.log('👋 Left game');
      },

      // Scene Management Actions
      createScene: (sceneData) => {
        const state = get();
        if (!state.session) {
          throw new Error('Cannot create scene: No active session');
        }

        const scene: Scene = {
          ...sceneData,
          id: uuidv4(),
          roomCode: state.session.roomCode, // Auto-inject current room code
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

        // Auto-save the new scene to persistence (serialize to plain object)
        const plainScene = JSON.parse(JSON.stringify(scene));
        drawingPersistenceService.saveScene(plainScene).catch((error) => {
          console.error('Failed to persist new scene:', error);
        });

        return scene;
      },

      updateScene: (sceneId, updates) => {
        set((state) => {
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
          if (sceneIndex >= 0) {
            state.sceneState.scenes[sceneIndex] = {
              ...state.sceneState.scenes[sceneIndex],
              ...updates,
              updatedAt: Date.now(),
            };

            // Auto-save the updated scene to persistence (serialize to plain object)
            const scene = JSON.parse(
              JSON.stringify(state.sceneState.scenes[sceneIndex]),
            );
            drawingPersistenceService.saveScene(scene).catch((error) => {
              console.error('Failed to persist updated scene:', error);
            });
          }
        });
      },

      deleteScene: (sceneId) => {
        set((state) => {
          state.sceneState.scenes = state.sceneState.scenes.filter(
            (s) => s.id !== sceneId,
          );
          // If the deleted scene was active, switch to first available scene
          if (state.sceneState.activeSceneId === sceneId) {
            state.sceneState.activeSceneId =
              state.sceneState.scenes.length > 0
                ? state.sceneState.scenes[0].id
                : null;
          }
        });

        // Delete from persistence
        drawingPersistenceService.deleteScene(sceneId).catch((error) => {
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
          const sceneExists = state.sceneState.scenes.some(
            (s) => s.id === sceneId,
          );
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

      setActiveTool: (tool) => {
        set((state) => {
          state.sceneState.activeTool = tool;
        });
      },

      // Selection Actions
      setSelection: (objectIds) => {
        set((state) => {
          state.sceneState.selectedObjectIds = objectIds;
        });
      },

      addToSelection: (objectIds) => {
        set((state) => {
          const newIds = objectIds.filter(
            (id) => !state.sceneState.selectedObjectIds.includes(id),
          );
          if (newIds.length > 0) {
            state.sceneState.selectedObjectIds.push(...newIds);
          }
        });
      },

      removeFromSelection: (objectIds) => {
        set((state) => {
          state.sceneState.selectedObjectIds =
            state.sceneState.selectedObjectIds.filter(
              (id) => !objectIds.includes(id),
            );
        });
      },

      clearSelection: () => {
        set((state) => {
          state.sceneState.selectedObjectIds = [];
        });
      },

      // Bulk Scene Operations
      deleteScenesById: (sceneIds) => {
        set((state) => {
          // Filter out the scenes to delete
          state.sceneState.scenes = state.sceneState.scenes.filter(
            (s) => !sceneIds.includes(s.id),
          );

          // If the active scene was deleted, switch to first available scene
          if (
            state.sceneState.activeSceneId &&
            sceneIds.includes(state.sceneState.activeSceneId)
          ) {
            state.sceneState.activeSceneId =
              state.sceneState.scenes.length > 0
                ? state.sceneState.scenes[0].id
                : null;
          }
        });

        // Delete each scene from persistence
        sceneIds.forEach((sceneId) => {
          drawingPersistenceService.deleteScene(sceneId).catch((error) => {
            console.error('Failed to persist scene deletion:', error);
          });
        });
      },

      updateScenesVisibility: (sceneIds, visibility) => {
        set((state) => {
          sceneIds.forEach((sceneId) => {
            const sceneIndex = state.sceneState.scenes.findIndex(
              (s) => s.id === sceneId,
            );
            if (sceneIndex >= 0) {
              state.sceneState.scenes[sceneIndex].visibility = visibility;
              state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

              // Auto-save the updated scene to persistence (serialize to plain object)
              const scene = JSON.parse(
                JSON.stringify(state.sceneState.scenes[sceneIndex]),
              );
              drawingPersistenceService.saveScene(scene).catch((error) => {
                console.error(
                  'Failed to persist scene visibility update:',
                  error,
                );
              });
            }
          });
        });
      },

      duplicateScene: (sceneId) => {
        const state = get();
        const originalScene = state.sceneState.scenes.find(
          (s) => s.id === sceneId,
        );
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
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
          if (sceneIndex >= 0) {
            state.sceneState.scenes[sceneIndex].drawings.push(drawing);
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

            // Auto-save to persistence (serialize to plain object to avoid proxy issues)
            const scene = JSON.parse(
              JSON.stringify(state.sceneState.scenes[sceneIndex]),
            );
            drawingPersistenceService.saveScene(scene).catch((error) => {
              console.error(
                'Failed to persist scene after drawing creation:',
                error,
              );
            });
          }
        });
      },

      updateDrawing: (sceneId, drawingId, updates) => {
        set((state) => {
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
          if (sceneIndex >= 0) {
            const drawingIndex = state.sceneState.scenes[
              sceneIndex
            ].drawings.findIndex((d) => d.id === drawingId);
            if (drawingIndex >= 0) {
              const drawingToUpdate = state.sceneState.scenes[sceneIndex]
                .drawings[drawingIndex] as Drawing;
              Object.assign(drawingToUpdate, updates);
              drawingToUpdate.updatedAt = Date.now();
              state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

              // Auto-save to persistence (serialize to plain object)
              const scene = JSON.parse(
                JSON.stringify(state.sceneState.scenes[sceneIndex]),
              );
              drawingPersistenceService.saveScene(scene).catch((error) => {
                console.error(
                  'Failed to persist scene after drawing update:',
                  error,
                );
              });
            }
          }
        });
      },

      deleteDrawing: (sceneId, drawingId) => {
        set((state) => {
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
          if (sceneIndex >= 0) {
            state.sceneState.scenes[sceneIndex].drawings =
              state.sceneState.scenes[sceneIndex].drawings.filter(
                (d) => d.id !== drawingId,
              );
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

            // Auto-save to persistence (serialize to plain object)
            const scene = JSON.parse(
              JSON.stringify(state.sceneState.scenes[sceneIndex]),
            );
            drawingPersistenceService.saveScene(scene).catch((error) => {
              console.error(
                'Failed to persist scene after drawing deletion:',
                error,
              );
            });
          }
        });
      },

      clearDrawings: (sceneId, layer) => {
        set((state) => {
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
          if (sceneIndex >= 0) {
            if (layer) {
              state.sceneState.scenes[sceneIndex].drawings =
                state.sceneState.scenes[sceneIndex].drawings.filter(
                  (d) => d.layer !== layer,
                );
            } else {
              state.sceneState.scenes[sceneIndex].drawings = [];
            }
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();

            // Auto-save to persistence (serialize to plain object)
            const scene = JSON.parse(
              JSON.stringify(state.sceneState.scenes[sceneIndex]),
            );
            drawingPersistenceService.saveScene(scene).catch((error) => {
              console.error(
                'Failed to persist scene after clearing drawings:',
                error,
              );
            });
          }
        });
      },

      getSceneDrawings: (sceneId) => {
        const state = get();
        const scene = state.sceneState.scenes.find((s) => s.id === sceneId);
        return scene?.drawings || [];
      },

      getVisibleDrawings: (sceneId, isHost) => {
        const state = get();
        const scene = state.sceneState.scenes.find((s) => s.id === sceneId);
        if (!scene) return [];

        return scene.drawings.filter((drawing) => {
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
          if (
            'useMockData' in settingsUpdate &&
            settingsUpdate.useMockData !== previousUseMockData
          ) {
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
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
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
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
          if (
            sceneIndex >= 0 &&
            state.sceneState.scenes[sceneIndex].placedTokens
          ) {
            const tokenIndex = state.sceneState.scenes[
              sceneIndex
            ].placedTokens.findIndex((t) => t.id === tokenId);
            if (tokenIndex >= 0) {
              state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].x =
                position.x;
              state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex].y =
                position.y;
              if (rotation !== undefined) {
                state.sceneState.scenes[sceneIndex].placedTokens[
                  tokenIndex
                ].rotation = rotation;
              }
              state.sceneState.scenes[sceneIndex].placedTokens[
                tokenIndex
              ].updatedAt = Date.now();
              state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
            }
          }
        });
      },

      updateToken: (sceneId, tokenId, updates) => {
        set((state) => {
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
          if (
            sceneIndex >= 0 &&
            state.sceneState.scenes[sceneIndex].placedTokens
          ) {
            const tokenIndex = state.sceneState.scenes[
              sceneIndex
            ].placedTokens.findIndex((t) => t.id === tokenId);
            if (tokenIndex >= 0) {
              const tokenToUpdate =
                state.sceneState.scenes[sceneIndex].placedTokens[tokenIndex];
              Object.assign(tokenToUpdate, updates);
              tokenToUpdate.updatedAt = Date.now();
              state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
            }
          }
        });
      },

      deleteToken: (sceneId, tokenId) => {
        set((state) => {
          const sceneIndex = state.sceneState.scenes.findIndex(
            (s) => s.id === sceneId,
          );
          if (
            sceneIndex >= 0 &&
            state.sceneState.scenes[sceneIndex].placedTokens
          ) {
            state.sceneState.scenes[sceneIndex].placedTokens =
              state.sceneState.scenes[sceneIndex].placedTokens.filter(
                (t) => t.id !== tokenId,
              );
            state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
          }
        });
      },

      getSceneTokens: (sceneId) => {
        const state = get();
        const scene = state.sceneState.scenes.find((s) => s.id === sceneId);
        return scene?.placedTokens || [];
      },

      getVisibleTokens: (sceneId, isHost) => {
        const state = get();
        const scene = state.sceneState.scenes.find((s) => s.id === sceneId);
        if (!scene) return [];

        return scene.placedTokens.filter((token) => {
          // DM can see all tokens
          if (isHost) return true;

          // Players can only see visible tokens
          if (!token.visibleToPlayers) return false;

          return true;
        });
      },

      // Optimistic Update Actions
      moveTokenOptimistic: (sceneId, tokenId, position, rotation) => {
        const updateId = `token-move-${tokenId}-${Date.now()}`;

        // Store current state for potential rollback
        const token = get()
          .getSceneTokens(sceneId)
          .find((t) => t.id === tokenId);
        if (!token) return;

        // Store the pending update for rollback capability
        pendingUpdates.set(updateId, {
          id: updateId,
          type: 'token-move',
          localState: { ...token, sceneId },
          timestamp: Date.now(),
        });

        // Update optimistically
        get().moveToken(sceneId, tokenId, position, rotation);

        // Send to server with updateId and version for tracking
        const expectedVersion = get().getEntityVersion(tokenId);
        import('@/utils/websocket').then(({ webSocketService }) => {
          webSocketService.sendEvent({
            type: 'token/move',
            data: {
              sceneId,
              tokenId,
              position,
              rotation,
              updateId,
              expectedVersion,
            },
          });
        });

        // Set timeout for automatic rollback if no confirmation (5 seconds)
        setTimeout(() => {
          if (pendingUpdates.has(updateId)) {
            console.warn('Server confirmation timeout, rolling back', updateId);
            get().rollbackUpdate(updateId);
          }
        }, 5000);
      },

      confirmUpdate: (updateId) => {
        // Remove from pending updates
        pendingUpdates.delete(updateId);
        console.log('✅ Update confirmed:', updateId);
      },

      rollbackUpdate: (updateId) => {
        const update = pendingUpdates.get(updateId);
        if (!update) return;

        console.warn('❌ Rolling back update:', updateId);

        // Restore previous state based on update type
        switch (update.type) {
          case 'token-move':
            // Restore the token to its previous position
            get().moveToken(
              update.localState.sceneId || '', // Need to store sceneId in localState
              update.localState.id,
              { x: update.localState.x, y: update.localState.y },
              update.localState.rotation,
            );
            break;
        }

        pendingUpdates.delete(updateId);
      },

      resetSettings: () => {
        set((state) => {
          state.settings = initialState.settings;
        });
      },

      // Persistence Management Actions
      initializeFromStorage: async (roomCode?: string) => {
        try {
          const savedScenes =
            await drawingPersistenceService.loadAllScenes(roomCode);

          if (savedScenes.length > 0) {
            set((state) => {
              state.sceneState.scenes = savedScenes;
              // Set the first scene as active if no active scene is set
              if (!state.sceneState.activeSceneId && savedScenes.length > 0) {
                state.sceneState.activeSceneId = savedScenes[0].id;
              }
            });
            console.log(
              `Initialized ${savedScenes.length} scenes from storage`,
            );
          }
        } catch (error) {
          console.error('Failed to initialize from storage:', error);
        }
      },

      loadSceneDrawings: async (sceneId) => {
        try {
          const roomCode = get().session?.roomCode;
          const drawings = await drawingPersistenceService.loadDrawings(
            sceneId,
            roomCode,
          );

          set((state) => {
            const sceneIndex = state.sceneState.scenes.findIndex(
              (s) => s.id === sceneId,
            );
            if (sceneIndex >= 0) {
              state.sceneState.scenes[sceneIndex].drawings = drawings;
              state.sceneState.scenes[sceneIndex].updatedAt = Date.now();
            }
          });

          console.log(
            `Loaded ${drawings.length} drawings for scene ${sceneId}`,
          );
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
        if (
          state.user.type === 'host' &&
          state.user.connected &&
          state.session
        ) {
          try {
            import('@/utils/websocket').then(({ webSocketService }) => {
              if (webSocketService.isConnected()) {
                webSocketService.sendGameStateUpdate({
                  sceneState: state.sceneState,
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
              state.sceneState.scenes = (recoveryData.gameState.scenes ||
                []) as Scene[];
              state.sceneState.activeSceneId =
                recoveryData.gameState.activeSceneId;
              console.log(
                `🔄 Restored ${state.sceneState.scenes.length} scenes, activeSceneId: ${state.sceneState.activeSceneId}`,
              );
            }

            // Restore settings
            if (recoveryData.gameState && recoveryData.gameState.settings) {
              state.settings = {
                ...state.settings,
                ...recoveryData.gameState.settings,
              };
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
          console.log(
            '  Session:',
            sessionData ? JSON.parse(sessionData) : 'null',
          );
          console.log('  Game State:', gameStateData ? 'exists' : 'null');

          const recoveryData = sessionPersistenceService.getRecoveryData();
          console.log('🔍 Processed recovery data:', recoveryData);
          if (recoveryData.gameState) {
            console.log('🎮 Game state details:', {
              scenes: recoveryData.gameState.scenes,
              activeSceneId: recoveryData.gameState.activeSceneId,
              scenesLength: recoveryData.gameState.scenes?.length || 0,
            });
          }

          if (!recoveryData.isValid || !recoveryData.session) {
            console.log('❌ No valid session found for recovery');
            return false;
          }

          if (!recoveryData.canReconnect) {
            console.log('❌ Session too old or invalid for reconnection');
            const sessionAge = Date.now() - recoveryData.session.lastActivity;
            console.log(
              `   Session age: ${Math.round(sessionAge / 1000)}s (max: ${60 * 60}s)`,
            );
            sessionPersistenceService.clearAll();
            return false;
          }

          console.log(
            `🏠 Attempting to reconnect to room ${recoveryData.session.roomCode} as ${recoveryData.session.userType}`,
          );

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
          console.log(
            `🔌 Connecting WebSocket: roomCode=${recoveryData.session.roomCode}, userType=${recoveryData.session.userType}`,
          );

          // Pass the userType to determine if this is a host reconnection or player join
          await webSocketService.connect(
            recoveryData.session.roomCode,
            recoveryData.session.userType,
          );

          // If we're the host and have game state, send it to the server
          if (
            recoveryData.session.userType === 'host' &&
            recoveryData.gameState &&
            recoveryData.gameState.scenes.length > 0
          ) {
            console.log('📤 Sending restored game state to server');
            webSocketService.sendGameStateUpdate({
              sceneState: {
                scenes: recoveryData.gameState.scenes as Scene[],
                activeSceneId: recoveryData.gameState.activeSceneId,
                camera: get().sceneState.camera,
                followDM: get().sceneState.followDM,
                activeTool: get().sceneState.activeTool,
                selectedObjectIds: get().sceneState.selectedObjectIds,
              },
              characters: (recoveryData.gameState.characters ||
                []) as unknown[],
              initiative: (recoveryData.gameState.initiative || {}) as Record<
                string,
                unknown
              >,
            });
          }

          console.log(
            `✅ Session recovery successful for room ${recoveryData.session.roomCode}`,
          );
          console.log(
            `🎮 Current game state after recovery:`,
            get().sceneState,
          );
          return true;
        } catch (error) {
          console.error('❌ Session recovery failed:', error);

          // Only clear session data if WebSocket connection failed
          // Keep local state in case user wants to try manual reconnection
          if (error instanceof Error && error.message.includes('WebSocket')) {
            console.log(
              '🔄 WebSocket reconnection failed, but keeping local session data',
            );
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
            state.user = { ...initialState.user, id: getBrowserId() };
          }
        });
      },

      dev_quickDM: async (name: string = 'Test DM') => {
        console.log(
          '🎮 DEV: Quick DM - OFFLINE MODE (prepare game, then start online)',
        );

        // Check if mock data exists (scenes from mock data toggle)
        const storage = getLinearFlowStorage();
        const existingScenes = storage.getScenes();
        const hasMockData = existingScenes.length > 0;

        // Only clear if no mock data exists
        if (!hasMockData) {
          await storage.clearGameData();
        } else {
          console.log(
            `🎮 Found ${existingScenes.length} existing scenes - preserving for game`,
          );
        }

        // Set user first
        set((state) => {
          state.user.name = name;
          state.user.type = 'host';
          state.user.id = getBrowserId();
        });

        // Generate offline room code (DM will create real room via "Start Online Game" button)
        const offlineRoomCode = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase();

        const config = {
          name: 'Test Campaign',
          description: 'Development test session',
          estimatedTime: '2',
          campaignType: 'oneshot' as const,
          maxPlayers: 4,
        };

        // Start in OFFLINE mode - DM can prepare game, then click "Start Online Game"
        set((state) => {
          state.gameConfig = config;
          state.user.connected = false; // ❌ Not connected - offline mode
          state.view = 'game';
        });

        console.log(
          `✅ DEV: Quick DM in offline mode - Room: ${offlineRoomCode}`,
        );
        console.log('💡 Use "Start Online Game" in Lobby panel to go online');
      },

      dev_quickPlayer: (
        name: string = 'Test Player',
        autoJoinRoom?: string,
      ) => {
        console.log(
          '👤 DEV: Quick Player - OFFLINE MODE (no WebSocket connection)',
        );

        set((state) => {
          state.user.name = name;
          state.user.type = 'player';
          state.user.id = `player-${Date.now()}`;
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
            charisma: 12,
          },
          createdAt: Date.now(),
          lastUsed: Date.now(),
          playerId: getBrowserId(),
        };

        // Save character and set as selected
        set((state) => {
          state.selectedCharacter = testCharacter;
        });

        get().saveCharacter(testCharacter);

        // Go directly to game in OFFLINE mode (no WebSocket)
        const offlineRoomCode = autoJoinRoom || 'OFFLINE';
        set((state) => {
          state.user.connected = false; // ❌ NOT connected - offline mode
          state.view = 'game';
        });
        console.log(
          `✅ DEV: Quick player in offline game - Room: ${offlineRoomCode}`,
        );
      },

      // Chat Actions
      sendChatMessage: (content, messageType = 'text', recipientId) => {
        const state = get();
        if (!state.user.name || !state.session) return;

        const message: ChatMessage['data'] = {
          id: uuidv4(),
          userId: state.user.id,
          userName: state.user.name,
          content: content.trim(),
          messageType,
          recipientId,
          timestamp: Date.now(),
        };

        // Add to local state immediately for optimistic UI
        set((draft) => {
          draft.chat.messages.push(message);

          // Keep only last 100 messages
          if (draft.chat.messages.length > 100) {
            draft.chat.messages = draft.chat.messages.slice(-100);
          }
        });

        // Send via WebSocket if connected
        if (state.user.connected) {
          try {
            import('@/utils/websocket').then(({ webSocketService }) => {
              webSocketService.sendChatMessage(message);
            });
          } catch (error) {
            console.error('Failed to send chat message:', error);
          }
        }
      },

      addChatMessage: (message) => {
        set((state) => {
          // Avoid duplicates
          if (!state.chat.messages.some((m) => m.id === message.id)) {
            state.chat.messages.push(message);

            // Keep only last 100 messages
            if (state.chat.messages.length > 100) {
              state.chat.messages = state.chat.messages.slice(-100);
            }

            // Increment unread count if message is not from current user
            if (message.userId !== state.user.id) {
              state.chat.unreadCount++;

              // Show toast for DM announcements
              if (message.messageType === 'dm-announcement') {
                import('sonner').then(({ toast }) => {
                  toast.success(`👑 ${message.userName}: ${message.content}`, {
                    duration: 5000,
                    description: 'DM Announcement',
                  });
                });
              }
            }
          }
        });
      },

      setTyping: (isTyping) => {
        const state = get();
        if (!state.user.name || !state.session || !state.user.connected) return;

        try {
          import('@/utils/websocket').then(({ webSocketService }) => {
            webSocketService.sendEvent({
              type: 'chat/typing',
              data: {
                userId: state.user.id,
                userName: state.user.name,
                isTyping,
              },
            });
          });
        } catch (error) {
          console.error('Failed to send typing status:', error);
        }
      },

      clearChat: () => {
        set((state) => {
          state.chat.messages = [];
          state.chat.unreadCount = 0;
        });
      },

      markChatAsRead: () => {
        set((state) => {
          state.chat.unreadCount = 0;
        });
      },

      // Voice Actions
      createVoiceChannel: (name) => {
        const channel: VoiceChannel = {
          id: uuidv4(),
          name,
          participants: [],
          isActive: true,
        };

        set((state) => {
          state.voice.channels.push(channel);
        });

        return channel;
      },

      joinVoiceChannel: async (channelId) => {
        // TODO: Implement WebRTC connection logic
        console.log(`🎤 Joining voice channel: ${channelId}`);

        set((state) => {
          const channel = state.voice.channels.find((c) => c.id === channelId);
          if (channel && !channel.participants.includes(state.user.id)) {
            channel.participants.push(state.user.id);
            state.voice.activeChannelId = channelId;
          }
        });
      },

      leaveVoiceChannel: () => {
        // TODO: Close WebRTC connections
        console.log('🎤 Leaving voice channel');

        set((state) => {
          if (state.voice.activeChannelId) {
            const channel = state.voice.channels.find(
              (c) => c.id === state.voice.activeChannelId,
            );
            if (channel) {
              channel.participants = channel.participants.filter(
                (id) => id !== state.user.id,
              );
            }
            state.voice.activeChannelId = null;
          }
        });
      },

      toggleMute: () => {
        set((state) => {
          state.voice.isMuted = !state.voice.isMuted;
          // TODO: Apply mute to WebRTC stream
        });
      },

      toggleDeafen: () => {
        set((state) => {
          state.voice.isDeafened = !state.voice.isDeafened;
          // TODO: Apply deafen to WebRTC streams
        });
      },

      setAudioDevices: (devices) => {
        set((state) => {
          state.voice.audioDevices = devices;
        });
      },

      selectAudioInput: (deviceId) => {
        set((state) => {
          state.voice.selectedInputDevice = deviceId;
          // TODO: Switch audio input device
        });
      },

      selectAudioOutput: (deviceId) => {
        set((state) => {
          state.voice.selectedOutputDevice = deviceId;
          // TODO: Switch audio output device
        });
      },

      // Connection Actions
      updateConnectionState: (updates) => {
        set((state) => {
          Object.assign(state.connection, updates);
        });
      },

      setConnectionQuality: (quality, latency) => {
        set((state) => {
          state.connection.quality = quality;
          if (latency !== undefined) {
            state.connection.latency = latency;
          }
          state.connection.lastUpdate = Date.now();
        });
      },

      // Version Management Actions
      getEntityVersion: (entityId) => {
        const state = get();
        return state.entityVersions.get(entityId) || 0;
      },

      incrementEntityVersion: (entityId) => {
        const currentVersion = get().getEntityVersion(entityId);
        const newVersion = currentVersion + 1;
        set((state) => {
          state.entityVersions.set(entityId, newVersion);
        });
        return newVersion;
      },

      // Host Management Actions
      transferHost: (targetUserId) => {
        const state = get();
        if (state.user.type !== 'host' || !state.session) {
          console.warn('Only the current host can transfer host privileges');
          return;
        }

        import('@/utils/websocket').then(({ webSocketService }) => {
          webSocketService.sendEvent({
            type: 'host/transfer',
            data: { targetUserId },
          });
        });
      },

      addCoHost: (targetUserId) => {
        const state = get();
        if (state.user.type !== 'host' || !state.session) {
          console.warn('Only the current host can add co-hosts');
          return;
        }

        import('@/utils/websocket').then(({ webSocketService }) => {
          webSocketService.sendEvent({
            type: 'host/add-cohost',
            data: { targetUserId },
          });
        });
      },

      removeCoHost: (targetUserId) => {
        const state = get();
        if (state.user.type !== 'host' || !state.session) {
          console.warn('Only the current host can remove co-hosts');
          return;
        }

        import('@/utils/websocket').then(({ webSocketService }) => {
          webSocketService.sendEvent({
            type: 'host/remove-cohost',
            data: { targetUserId },
          });
        });
      },
    };
  }),
);

// Selectors for common queries
export const useUser = () => useGameStore((state) => state.user);
export const useSession = () => useGameStore((state) => state.session);
export const useDiceRolls = () => useGameStore((state) => state.diceRolls);
export const useActiveTab = () => useGameStore((state) => state.activeTab);
export const useIsHost = () =>
  useGameStore((state) => state.user.type === 'host');
export const useIsConnected = () =>
  useGameStore((state) => state.user.connected);

// Scene selectors
export const useSceneState = () => useGameStore((state) => state.sceneState);
export const useScenes = () => useGameStore((state) => state.sceneState.scenes);
export const useActiveScene = () =>
  useGameStore((state) => {
    const { scenes, activeSceneId } = state.sceneState;
    return scenes.find((s) => s.id === activeSceneId) || null;
  });
export const useCamera = () => useGameStore((state) => state.sceneState.camera);
export const useFollowDM = () =>
  useGameStore((state) => state.sceneState.followDM);
export const useActiveTool = () =>
  useGameStore((state) => state.sceneState.activeTool);

// Settings selectors
export const useSettings = () => useGameStore((state) => state.settings);
export const useColorScheme = () =>
  useGameStore((state) => state.settings.colorScheme);
export const useTheme = () => useGameStore((state) => state.settings.theme);

// Drawing selectors
export const useSceneDrawings = (sceneId: string) =>
  useGameStore((state) => {
    const scene = state.sceneState.scenes.find((s) => s.id === sceneId);
    return scene?.drawings || [];
  });

export const useVisibleDrawings = (sceneId: string) =>
  useGameStore((state) => {
    const isHost = state.user.type === 'host';
    return state.getVisibleDrawings(sceneId, isHost);
  });

export const useDrawingActions = () =>
  useGameStore(
    useShallow((state) => ({
      createDrawing: state.createDrawing,
      updateDrawing: state.updateDrawing,
      deleteDrawing: state.deleteDrawing,
      clearDrawings: state.clearDrawings,
    })),
  );

// App Flow selectors (from appFlowStore)
export const useView = () => useGameStore((state) => state.view);
export const useGameConfig = () => useGameStore((state) => state.gameConfig);
export const useSelectedCharacter = () =>
  useGameStore((state) => state.selectedCharacter);

// Lifecycle selectors (derived from gameStore state)
export const useGamePhase = (): GamePhase => {
  return useGameStore((state) => {
    if (state.view === 'welcome') return 'preparation';
    if (state.view === 'player_setup' || state.view === 'dm_setup')
      return 'preparation';
    if (state.view === 'game' && !state.user.connected) return 'ready';
    if (state.view === 'game' && state.user.connected && state.session)
      return 'live';
    return 'preparation';
  });
};

export const useGameMode = () => {
  return useGameStore((state) => {
    if (!state.user.connected) return 'offline';
    if (state.session?.hostId === state.user.id) return 'hosting';
    return 'live'; // joined as player
  });
};

export const useLifecyclePermissions = () => {
  const phase = useGamePhase();
  return PHASE_PERMISSIONS[phase];
};

export const useIsOnline = () => {
  const mode = useGameMode();
  return mode === 'hosting' || mode === 'live';
};

export const useCanGoLive = () => {
  return useGameStore(
    (state) =>
      state.view === 'game' && !state.user.connected && !!state.session,
  );
};

export const useServerRoomCode = () => {
  return useGameStore((state) => state.session?.roomCode || null);
};
