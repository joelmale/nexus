/**
 * Simple Linear App Flow Types
 *
 * Replaces the complex lifecycle system with a simple view-based flow
 */

export type AppView = 'welcome' | 'player_setup' | 'dm_setup' | 'game';

export interface AppState {
  view: AppView;
  user: {
    name: string;
    type: 'player' | 'dm' | null;
    id: string; // Generated browser ID for character linking
  };
  roomCode?: string;
  isConnectedToRoom: boolean;
  gameConfig?: GameConfig;
  selectedCharacter?: PlayerCharacter;
}

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
}

// Actions for the new linear flow
export interface AppFlowActions {
  // Navigation
  setView: (view: AppView) => void;
  setUser: (name: string, type: 'player' | 'dm') => void;

  // Player flow
  joinRoomWithCode: (roomCode: string, character?: PlayerCharacter) => Promise<void>;
  createCharacter: (character: Omit<PlayerCharacter, 'id' | 'createdAt' | 'playerId'>) => PlayerCharacter;
  selectCharacter: (characterId: string) => void;

  // DM flow
  createGameRoom: (config: GameConfig) => Promise<string>; // Returns room code

  // Character persistence
  saveCharacter: (character: PlayerCharacter) => void;
  getSavedCharacters: () => PlayerCharacter[];
  deleteCharacter: (characterId: string) => void;
  exportCharacters: () => string; // JSON export
  importCharacters: (jsonData: string) => void;

  // Room management
  leaveRoom: () => void;
  resetToWelcome: () => void;

  // Development helpers
  dev_quickDM: (name?: string) => void;
  dev_quickPlayer: (name?: string, roomCode?: string) => void;
  dev_skipToGame: (userType?: 'dm' | 'player') => void;
}
