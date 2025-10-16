// Core game state types
import type { Drawing } from './drawing';
import type { PlacedToken, Token } from './token';
export type { PlacedToken, Token, Drawing };

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  provider?: string;
  type: 'host' | 'player';
  color: string;
  connected: boolean;
}

export interface Player extends User {
  canEditScenes: boolean;
}

export interface Session {
  roomCode: string;
  hostId: string;
  coHostIds?: string[]; // IDs of co-hosts
  // Use the more specific Player type which includes permissions
  players: Player[];
  status: 'connecting' | 'connected' | 'disconnected';
}

export interface DicePool {
  count: number;
  sides: number;
  results: number[];
  advResults?: number[]; // For advantage/disadvantage
}

export interface DiceRoll {
  id: string;
  userId: string;
  userName: string;
  expression: string; // e.g., "2d6+3" or "3d4, 6d20+2"
  pools: DicePool[]; // Array of dice pools (e.g., [{count:3, sides:4, results:[1,3,2]}, {count:6, sides:20, results:[...]}])
  modifier: number; // Static modifier (e.g., +3)
  results: number[]; // Flattened results from all pools (for backwards compatibility)
  advResults?: number[]; // Second set of results for advantage/disadvantage
  total: number;
  timestamp: number;
  crit?: 'success' | 'failure'; // For d20 rolls
  isPrivate?: boolean; // If true, only visible to the roller and the DM
}

// Navigation & Flow Types (from appFlowStore)
export type AppView =
  | 'welcome'
  | 'player_setup'
  | 'dm_setup'
  | 'game'
  | 'admin'
  | 'dashboard';

export interface PlayerCharacter {
  id: string;
  name: string;
  race: string;
  class: string;
  background: string;
  level: number;
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  createdAt: number;
  lastUsed?: number;
  playerId: string; // Links to user.id
}

export interface GameConfig {
  name: string;
  description: string;
  estimatedTime: string;
  campaignType: 'campaign' | 'oneshot';
  maxPlayers: number;
  campaignId?: string; // Optional campaign ID for linking session to existing campaign
}

export interface ChatState {
  messages: ChatMessage['data'][];
  typingUsers: { userId: string; userName: string }[];
  unreadCount: number;
}

export interface GameState {
  // Navigation (from appFlowStore)
  view: AppView;

  // User & Session (merged from both stores)
  user: User;
  session: Session | null;

  // Game Configuration (from appFlowStore)
  gameConfig?: GameConfig;
  selectedCharacter?: PlayerCharacter;

  // Game Content (existing)
  diceRolls: DiceRoll[];
  activeTab: TabType;
  sceneState: SceneState;
  settings: UserSettings;

  // Chat
  chat: ChatState;

  // Voice
  voice: VoiceState;

  // Connection Quality
  connection: ConnectionState;

  // Version tracking for conflict resolution
  entityVersions: Map<string, number>;
}

export type TabType = 'lobby' | 'dice' | 'scenes' | 'tokens' | 'settings';

// Settings Types
export interface ColorScheme {
  id: string;
  name: string;
  primary: string; // Main accent color
  secondary: string; // Secondary accent color
  accent: string; // Highlight color
  surface: string; // Surface/background color
  text: string; // Text color
}

export interface UserSettings {
  // Display Settings
  colorScheme: ColorScheme;
  theme: 'auto' | 'dark' | 'light';
  enableGlassmorphism: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';

  // Audio Settings
  enableSounds: boolean;
  diceRollSounds: boolean;
  notificationSounds: boolean;
  masterVolume: number; // 0-100

  // Gameplay Settings
  autoRollInitiative: boolean;
  showOtherPlayersRolls: boolean;
  highlightActivePlayer: boolean;
  snapToGridByDefault: boolean;
  defaultGridSize: number;
  diceDisappearTime: number; // Time in milliseconds before dice disappear (default: 3000)

  // Privacy Settings
  allowSpectators: boolean;
  shareCharacterSheets: boolean;
  logGameSessions: boolean;

  // Performance Settings
  maxTokensPerScene: number;
  imageQuality: 'low' | 'medium' | 'high';
  enableAnimations: boolean;

  // Accessibility Settings
  highContrast: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;

  // Developer Settings
  useMockData?: boolean;

  // Experimental Settings
  floatingToolbar?: boolean; // When false (default), toolbar is docked at bottom
}

// Scene Management Types
export interface Scene {
  id: string;
  name: string;
  description: string;
  roomCode: string; // Links scene to specific game room

  // Permissions and visibility
  visibility: 'private' | 'shared' | 'public'; // DM control over who can see
  isEditable: boolean; // Can be edited (false for locked scenes)
  createdBy: string; // User ID who created the scene
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp

  // Visual settings
  backgroundImage?: {
    url: string;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    scale: number;
  };

  // Grid configuration
  gridSettings: {
    enabled: boolean;
    size: number; // Grid cell size in pixels
    color: string;
    opacity: number;
    snapToGrid: boolean;
    showToPlayers: boolean; // Whether players can see the grid
    offsetX?: number; // Grid offset X for alignment with background images
    offsetY?: number; // Grid offset Y for alignment with background images
  };

  // Lighting and vision
  lightingSettings: {
    enabled: boolean;
    globalIllumination: boolean;
    ambientLight: number; // 0-1
    darkness: number; // 0-1
  };

  // Scene content
  drawings: Drawing[];
  placedTokens: PlacedToken[];

  // Scene state
  isActive: boolean; // Currently active scene for the room
  playerCount: number; // Number of players currently viewing
}

export interface Camera {
  x: number; // Current view center X coordinate
  y: number; // Current view center Y coordinate
  zoom: number; // Zoom level (1.0 = 100%)
}

export interface SceneState {
  scenes: Scene[];
  activeSceneId: string | null;
  camera: Camera;
  followDM: boolean; // Whether players follow DM's camera
  activeTool: string; // Currently selected tool
  selectedObjectIds: string[]; // IDs of selected objects (tokens, drawings, etc.)
}

// WebSocket message types
export interface BaseMessage {
  type: string;
  timestamp: number;
  src: string;
  dst?: string;
}

export interface EventMessage extends BaseMessage {
  type: 'event';
  data: {
    name: string;
    [key: string]: unknown;
  };
}

export interface StateMessage extends BaseMessage {
  type: 'state';
  data: Partial<GameState>;
}

export interface DiceRollMessage extends BaseMessage {
  type: 'dice-roll';
  data: DiceRoll;
}

export interface ChatMessage extends BaseMessage {
  type: 'chat-message';
  data: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    messageType: 'text' | 'system' | 'dm-announcement' | 'whisper';
    recipientId?: string; // For whispers
    timestamp: number;
  };
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  data: {
    message: string;
    code?: number;
  };
}

export interface HeartbeatMessage extends BaseMessage {
  type: 'heartbeat';
  data: {
    type: 'ping' | 'pong';
    id: string;
    serverTime?: number;
  };
}

export interface UpdateConfirmationMessage extends BaseMessage {
  type: 'update-confirmed';
  data: {
    updateId: string;
  };
}

export type WebSocketMessage =
  | EventMessage
  | StateMessage
  | DiceRollMessage
  | ChatMessage
  | ErrorMessage
  | HeartbeatMessage
  | UpdateConfirmationMessage;

// Game events
export interface GameEvent {
  type: string;
  data: unknown;
}

export interface DiceRollEvent extends GameEvent {
  type: 'dice/roll';
  data: {
    roll: DiceRoll;
  };
}

export interface DiceRollResultEvent extends GameEvent {
  type: 'dice/roll-result';
  data: {
    roll: DiceRoll;
  };
}

export interface UserJoinEvent extends GameEvent {
  type: 'user/join';
  data: {
    user: User;
  };
}

export interface UserLeaveEvent extends GameEvent {
  type: 'user/leave';
  data: {
    userId: string;
  };
}

export interface SessionCreatedEvent extends GameEvent {
  type: 'session/created';
  data: {
    roomCode: string;
  };
}

export interface SessionJoinedEvent extends GameEvent {
  type: 'session/joined';
  data: Session;
}

// Scene Events
export interface SceneCreateEvent extends GameEvent {
  type: 'scene/create';
  data: {
    scene: Scene;
  };
}

export interface SceneUpdateEvent extends GameEvent {
  type: 'scene/update';
  data: {
    sceneId: string;
    updates: Partial<Scene>;
  };
}

export interface SceneDeleteEvent extends GameEvent {
  type: 'scene/delete';
  data: {
    sceneId: string;
  };
}

export interface SceneChangeEvent extends GameEvent {
  type: 'scene/change';
  data: {
    sceneId: string;
  };
}

export interface CameraMoveEvent extends GameEvent {
  type: 'camera/move';
  data: {
    camera: Camera;
    sceneId: string;
  };
}

// Drawing Events
export interface DrawingCreateEvent extends GameEvent {
  type: 'drawing/create';
  data: {
    sceneId: string;
    drawing: Drawing;
  };
}

export interface DrawingUpdateEvent extends GameEvent {
  type: 'drawing/update';
  data: {
    sceneId: string;
    drawingId: string;
    updates: Partial<Drawing>;
  };
}

export interface DrawingDeleteEvent extends GameEvent {
  type: 'drawing/delete';
  data: {
    sceneId: string;
    drawingId: string;
  };
}

export interface DrawingClearEvent extends GameEvent {
  type: 'drawing/clear';
  data: {
    sceneId: string;
    layer?: string; // Optional: clear specific layer
  };
}

// Token Events
export interface TokenPlaceEvent extends GameEvent {
  type: 'token/place';
  data: {
    sceneId: string;
    token: PlacedToken;
  };
}

export interface TokenMoveEvent extends GameEvent {
  type: 'token/move';
  data: {
    sceneId: string;
    tokenId: string;
    position: { x: number; y: number };
    rotation?: number;
    expectedVersion?: number; // For conflict resolution
  };
}

export interface TokenUpdateEvent extends GameEvent {
  type: 'token/update';
  data: {
    sceneId: string;
    tokenId: string;
    updates: Partial<PlacedToken>;
    expectedVersion?: number; // For conflict resolution
  };
}

export interface TokenDeleteEvent extends GameEvent {
  type: 'token/delete';
  data: {
    sceneId: string;
    tokenId: string;
    expectedVersion?: number; // For conflict resolution
  };
}

// Chat Events
export interface ChatMessageEvent extends GameEvent {
  type: 'chat/message';
  data: {
    message: ChatMessage['data'];
  };
}

export interface ChatUserTypingEvent extends GameEvent {
  type: 'chat/typing';
  data: {
    userId: string;
    userName: string;
    isTyping: boolean;
  };
}

// Voice Chat Types
export interface VoiceChannel {
  id: string;
  name: string;
  participants: string[]; // User IDs
  isActive: boolean;
}

export interface VoiceState {
  channels: VoiceChannel[];
  activeChannelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  audioDevices: MediaDeviceInfo[];
  selectedInputDevice: string | null;
  selectedOutputDevice: string | null;
}

export interface ConnectionState {
  isConnected: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'critical' | 'disconnected';
  latency: number;
  packetLoss: number;
  lastUpdate: number;
  reconnectAttempts: number;
}

// Voice Chat Events
export interface VoiceChannelJoinEvent extends GameEvent {
  type: 'voice/join';
  data: {
    channelId: string;
    userId: string;
  };
}

export interface VoiceChannelLeaveEvent extends GameEvent {
  type: 'voice/leave';
  data: {
    channelId: string;
    userId: string;
  };
}

export interface VoiceStateUpdateEvent extends GameEvent {
  type: 'voice/state';
  data: {
    userId: string;
    isMuted: boolean;
    isDeafened: boolean;
  };
}

export interface UpdateConfirmedEvent extends GameEvent {
  type: 'update-confirmed';
  data: {
    updateId: string;
  };
}

export interface CursorUpdateEvent extends GameEvent {
  type: 'cursor/update';
  data: {
    userId: string;
    userName: string;
    position: { x: number; y: number };
    sceneId: string;
  };
}

export interface HostChangedEvent extends GameEvent {
  type: 'session/host-changed';
  data: {
    oldHostId?: string;
    newHostId: string;
    reason: 'host-disconnected' | 'manual-transfer';
    message: string;
  };
}

export interface CoHostAddedEvent extends GameEvent {
  type: 'session/cohost-added';
  data: {
    coHostId: string;
    message: string;
  };
}

export interface CoHostRemovedEvent extends GameEvent {
  type: 'session/cohost-removed';
  data: {
    coHostId: string;
    message: string;
  };
}

export interface HostTransferEvent extends GameEvent {
  type: 'host/transfer';
  data: {
    targetUserId: string;
  };
}

export interface AddCoHostEvent extends GameEvent {
  type: 'host/add-cohost';
  data: {
    targetUserId: string;
  };
}

export interface RemoveCoHostEvent extends GameEvent {
  type: 'host/remove-cohost';
  data: {
    targetUserId: string;
  };
}
