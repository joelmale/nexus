// Core game state types
import type { Drawing } from './drawing';
import type { PlacedToken } from './token';

export interface User {
  id: string;
  name: string;
  type: 'host' | 'player';
  color: string;
  connected: boolean;
}

export interface Session {
  roomCode: string;
  hostId: string;
  players: User[];
  status: 'connecting' | 'connected' | 'disconnected';
}

export interface DiceRoll {
  id: string;
  userId: string;
  userName: string;
  expression: string; // e.g., "2d6+3"
  results: number[];
  total: number;
  timestamp: number;
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
  primary: string;       // Main accent color
  secondary: string;     // Secondary accent color  
  accent: string;        // Highlight color
  surface: string;       // Surface/background color
  text: string;         // Text color
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
}

// Scene Management Types
export interface Scene {
  id: string;
  name: string;
  description?: string;
  backgroundImage?: {
    url: string;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    scale: number;
  };
  gridSettings: {
    enabled: boolean;
    size: number; // Grid cell size in pixels
    color: string;
    opacity: number;
    snapToGrid: boolean;
  };
  drawings: Drawing[]; // Add drawings array to scene
  placedTokens: PlacedToken[]; // Add placed tokens array to scene
  createdAt: number;
  updatedAt: number;
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
    [key: string]: any;
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

export type WebSocketMessage = EventMessage | StateMessage | DiceRollMessage;

// Game events
export interface GameEvent {
  type: string;
  data: any;
}

export interface DiceRollEvent extends GameEvent {
  type: 'dice/roll';
  data: {
    expression: string;
  };
}

export interface UserJoinEvent extends GameEvent {
  type: 'user/join';
  data: {
    name: string;
  };
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
