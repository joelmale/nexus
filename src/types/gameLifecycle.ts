/**
 * Game Lifecycle Types
 *
 * Defines the different phases of a game session and their state management.
 * This enables proper separation between offline preparation and live multiplayer gaming.
 */

export type GameMode = 'offline' | 'hosting' | 'joining' | 'live';

export type GamePhase =
  | 'preparation'    // Host working offline, building content
  | 'ready'         // Host ready to go live, content prepared
  | 'starting'      // Transition phase, connecting to server
  | 'live'          // Active multiplayer session
  | 'paused'        // Live session paused (host only)
  | 'ended';        // Session ended

export interface GameLifecycleState {
  mode: GameMode;
  phase: GamePhase;
  isHost: boolean;
  canGoLive: boolean;
  hasLocalChanges: boolean;
  lastSyncedAt: number | null;
  serverRoomCode: string | null;
  localSessionId: string;
}

export interface GameStateSnapshot {
  id: string;
  timestamp: number;
  phase: GamePhase;
  scenes: any[];
  activeSceneId: string | null;
  characters: any[];
  initiative: any;
  settings: any;
  metadata: {
    version: number;
    createdBy: string;
    sessionId: string;
  };
}

export interface LiveGameConfig {
  allowPlayerJoining: boolean;
  syncFrequency: number;
  maxPlayers: number;
  gameTitle?: string;
  gameDescription?: string;
}

export interface GameLifecycleEvents {
  'lifecycle/enterPreparation': { sessionId: string };
  'lifecycle/readyToStart': { sessionId: string; snapshot: GameStateSnapshot };
  'lifecycle/startLive': { config: LiveGameConfig; snapshot: GameStateSnapshot };
  'lifecycle/goLive': { roomCode: string; gameState: GameStateSnapshot };
  'lifecycle/pauseGame': { reason?: string };
  'lifecycle/resumeGame': {};
  'lifecycle/endGame': { reason?: string; saveSnapshot?: boolean };
  'lifecycle/playerJoin': { roomCode: string };
  'lifecycle/syncRequired': { lastSync: number };
}

export type GameLifecycleEvent = keyof GameLifecycleEvents;

export interface GameLifecycleAction {
  type: GameLifecycleEvent;
  payload: GameLifecycleEvents[GameLifecycleEvent];
  timestamp: number;
  userId: string;
}

// State transition rules
export const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  preparation: ['ready', 'starting'],
  ready: ['preparation', 'starting'],
  starting: ['live', 'preparation'], // Can fall back if connection fails
  live: ['paused', 'ended'],
  paused: ['live', 'ended'],
  ended: ['preparation'] // Can start new session
};

// Permissions by phase
export const PHASE_PERMISSIONS = {
  preparation: {
    canEditScenes: true,
    canEditCharacters: true,
    canEditSettings: true,
    canInvitePlayers: false,
    canSyncToServer: false,
    isLocalOnly: true
  },
  ready: {
    canEditScenes: true,
    canEditCharacters: true,
    canEditSettings: true,
    canInvitePlayers: false,
    canSyncToServer: false,
    isLocalOnly: true
  },
  starting: {
    canEditScenes: false,
    canEditCharacters: false,
    canEditSettings: false,
    canInvitePlayers: false,
    canSyncToServer: true,
    isLocalOnly: false
  },
  live: {
    canEditScenes: true, // Host only
    canEditCharacters: true,
    canEditSettings: true,
    canInvitePlayers: true,
    canSyncToServer: true,
    isLocalOnly: false
  },
  paused: {
    canEditScenes: true,
    canEditCharacters: true,
    canEditSettings: true,
    canInvitePlayers: false,
    canSyncToServer: false,
    isLocalOnly: false
  },
  ended: {
    canEditScenes: false,
    canEditCharacters: false,
    canEditSettings: false,
    canInvitePlayers: false,
    canSyncToServer: false,
    isLocalOnly: true
  }
} as const;