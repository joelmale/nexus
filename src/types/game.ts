// Core game state types
import type { Drawing } from './drawing';
import type { PlacedToken, Token } from './token';
export type { PlacedToken, Token, Drawing };

export interface User {
  id: string;
  name: string;
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
  // Use the more specific Player type which includes permissions
  players: Player[];
  status: 'connecting' | 'connected' | 'disconnected';
}

export interface DiceRoll {
  id: string;
  userId: string;
  userName: string;
  expression: string; // e.g., "2d6+3"
  results: number[];
  advResults?: number[]; // Second set of results for advantage/disadvantage
  total: number;
  timestamp: number;
  crit?: 'success' | 'failure'; // For d20 rolls
  isPrivate?: boolean; // If true, only visible to the roller and the DM
}

export interface GameState {
  user: User;
  session: Session | null;
  diceRolls: DiceRoll[];
  activeTab: TabType;
  sceneState: SceneState;
  settings: UserSettings;
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

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  data: {
    message: string;
    code?: number;
  };
}

export type WebSocketMessage =
  | EventMessage
  | StateMessage
  | DiceRollMessage
  | ErrorMessage;

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
  };
}

export interface TokenUpdateEvent extends GameEvent {
  type: 'token/update';
  data: {
    sceneId: string;
    tokenId: string;
    updates: Partial<PlacedToken>;
  };
}

export interface TokenDeleteEvent extends GameEvent {
  type: 'token/delete';
  data: {
    sceneId: string;
    tokenId: string;
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
  };
}

export interface TokenUpdateEvent extends GameEvent {
  type: 'token/update';
  data: {
    sceneId: string;
    tokenId: string;
    updates: Partial<PlacedToken>;
  };
}

export interface TokenDeleteEvent extends GameEvent {
  type: 'token/delete';
  data: {
    sceneId: string;
    tokenId: string;
  };
}
