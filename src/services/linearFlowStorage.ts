/**
 * Linear Flow Storage Bridge
 *
 * Connects the Linear Flow (appFlowStore) with the Ogres-style entity store
 * Provides migration from localStorage to IndexedDB + proper serialization
 */

import { getOgresStore } from './ogresStyleStore';
import { SerializationService } from './serialization';
import type { Scene, Token, Drawing } from '@/types/game';
import type { PlayerCharacter, GameConfig } from '@/types/appFlow';

export class LinearFlowStorage {
  private store = getOgresStore();

  // Debug helper: create test data
  createTestData(): void {
    console.log('🧪 Creating test data...');

    // Create test session
    const sessionId = this.store.create('session', {
      roomCode: 'TEST123',
      hostId: 'test-dm',
      config: {
        name: 'Test Campaign',
        description: 'Test session for debugging'
      }
    });

    // Create test scene
    const sceneId = this.store.create('scene', {
      name: 'Test Scene',
      description: 'A test scene for debugging',
      sessionId: sessionId.id,
      background: { type: 'color', value: '#ffffff' },
      gridSize: 50
    });

    // Create test character
    const characterId = this.store.create('character', {
      name: 'Test Character',
      type: 'player',
      sessionId: sessionId.id,
      sceneId: sceneId.id,
      position: { x: 100, y: 100 }
    });

    console.log('🧪 Created test entities:', {
      session: sessionId.id,
      scene: sceneId.id,
      character: characterId.id
    });

    console.log('🧪 Current stats:', this.getStats());
  }

  // Debug helper: reset database
  async resetDatabase(): Promise<void> {
    try {
      console.log('🔄 LinearFlowStorage: Resetting database...');

      // Clear localStorage first
      localStorage.removeItem('nexus-app-flow');
      localStorage.removeItem('nexus-characters');
      localStorage.removeItem('nexus-sessions');

      // Delete IndexedDB databases
      const dbNames = ['nexus-ogres-store', 'nexus-vtt'];
      for (const dbName of dbNames) {
        try {
          await new Promise<void>((resolve, reject) => {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = () => {
              console.log(`🗑️ Deleted database: ${dbName}`);
              resolve();
            };
            deleteReq.onerror = () => {
              console.warn(`Failed to delete database ${dbName}:`, deleteReq.error);
              resolve(); // Continue anyway
            };
            deleteReq.onblocked = () => {
              console.warn(`Database deletion blocked: ${dbName}`);
              resolve(); // Continue anyway
            };
          });
        } catch (error) {
          console.warn(`Error deleting database ${dbName}:`, error);
        }
      }

      console.log('✅ Database reset complete - please reload page');
    } catch (error) {
      console.error('Failed to reset database:', error);
    }
  }

  // =============================================================================
  // SCENE MANAGEMENT
  // =============================================================================

  /**
   * Create a scene using the entity store
   */
  async createScene(sceneData: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scene> {
    const scene = this.store.createScene(sceneData);

    // Auto-save to IndexedDB (throttled)
    console.log('🎬 Created scene in entity store:', scene.name);

    return scene;
  }

  /**
   * Get all scenes
   */
  getScenes(): Scene[] {
    return this.store.getByType<Scene>('scene');
  }

  /**
   * Get active scene with all related data
   */
  getSceneWithData(sceneId: string): {
    scene: Scene | null;
    tokens: Token[];
    drawings: Drawing[];
  } {
    return this.store.getSceneWithRelations(sceneId);
  }

  /**
   * Update scene
   */
  updateScene(sceneId: string, updates: Partial<Scene>): Scene | null {
    return this.store.update<Scene>(sceneId, updates);
  }

  /**
   * Delete scene
   */
  deleteScene(sceneId: string): boolean {
    return this.store.delete(sceneId);
  }

  // =============================================================================
  // CHARACTER MANAGEMENT (Enhanced)
  // =============================================================================

  /**
   * Save character with enhanced entity system
   */
  saveCharacter(character: PlayerCharacter): PlayerCharacter {
    // Convert to entity format
    const characterEntity = this.store.create<PlayerCharacter & { type: 'character' }>('character', {
      ...character,
      browserId: this.getBrowserId()
    });

    console.log('👤 Saved character to entity store:', character.name);
    return characterEntity;
  }

  /**
   * Get characters for current browser
   */
  getCharacters(): PlayerCharacter[] {
    const browserId = this.getBrowserId();
    return this.store.query<PlayerCharacter>({
      type: 'character',
      where: { browserId }
    });
  }

  /**
   * Delete character
   */
  deleteCharacter(characterId: string): boolean {
    return this.store.delete(characterId);
  }

  // =============================================================================
  // GAME CONFIGURATION
  // =============================================================================

  /**
   * Save game configuration
   */
  saveGameConfig(roomCode: string, config: GameConfig): void {
    this.store.create('game-config', {
      roomCode,
      ...config
    });
  }

  /**
   * Get game configuration
   */
  getGameConfig(roomCode: string): GameConfig | null {
    const configs = this.store.query({
      type: 'game-config',
      where: { roomCode }
    });

    return configs.length > 0 ? configs[0] as GameConfig : null;
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  /**
   * Save session state
   */
  saveSession(sessionData: {
    user: { name: string; type: string; id: string };
    roomCode: string;
    view: string;
    isConnected: boolean;
  }): void {
    // Remove any existing session for this browser
    const existingSessions = this.store.query({
      type: 'session',
      where: { browserId: this.getBrowserId() }
    });

    existingSessions.forEach(session => {
      this.store.delete(session.id);
    });

    // Create new session
    this.store.create('session', {
      ...sessionData,
      browserId: this.getBrowserId(),
      lastActivity: Date.now()
    });

    console.log('💾 Saved session to entity store');
  }

  /**
   * Load session state
   */
  loadSession(): any | null {
    const sessions = this.store.query({
      type: 'session',
      where: { browserId: this.getBrowserId() }
    });

    if (sessions.length === 0) return null;

    const session = sessions[0];
    console.log('📂 Loaded session from entity store');
    return session;
  }

  /**
   * Clear session
   */
  clearSession(): void {
    const sessions = this.store.query({
      type: 'session',
      where: { browserId: this.getBrowserId() }
    });

    sessions.forEach(session => {
      this.store.delete(session.id);
    });
  }

  // =============================================================================
  // MIGRATION FROM LOCALSTORAGE
  // =============================================================================

  /**
   * Migrate data from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(): Promise<{
    migrated: boolean;
    scenes: number;
    characters: number;
    sessions: number;
  }> {
    const stats = { migrated: false, scenes: 0, characters: 0, sessions: 0 };

    try {
      // Migrate appFlowStore data
      const appFlowData = localStorage.getItem('nexus-app-flow');
      if (appFlowData) {
        const parsed = JSON.parse(appFlowData);
        if (parsed.state) {
          const { user, roomCode, view, gameConfig, selectedCharacter } = parsed.state;

          // Migrate session
          if (user?.name && roomCode) {
            this.saveSession({
              user,
              roomCode,
              view: view || 'game',
              isConnected: false
            });
            stats.sessions++;
          }

          // Migrate game config
          if (gameConfig && roomCode) {
            this.saveGameConfig(roomCode, gameConfig);
          }

          // Migrate selected character
          if (selectedCharacter) {
            this.saveCharacter(selectedCharacter);
            stats.characters++;
          }
        }
      }

      // Migrate characters
      const charactersData = localStorage.getItem('nexus-characters');
      if (charactersData) {
        const characters = JSON.parse(charactersData);
        if (Array.isArray(characters)) {
          characters.forEach(character => {
            this.saveCharacter(character);
            stats.characters++;
          });
        }
      }

      // Migrate scenes from gameStore if available
      const gameStateData = localStorage.getItem('nexus-game-state');
      if (gameStateData) {
        const gameState = JSON.parse(gameStateData);
        if (gameState.scenes && Array.isArray(gameState.scenes)) {
          for (const scene of gameState.scenes) {
            await this.createScene(scene);
            stats.scenes++;
          }
        }
      }

      if (stats.characters > 0 || stats.scenes > 0 || stats.sessions > 0) {
        stats.migrated = true;
        console.log('🔄 Migration complete:', stats);

        // Mark migration as complete
        localStorage.setItem('nexus-migration-complete', 'true');
      }

    } catch (error) {
      console.error('Migration failed:', error);
    }

    return stats;
  }

  /**
   * Check if migration is needed
   */
  needsMigration(): boolean {
    return localStorage.getItem('nexus-migration-complete') !== 'true';
  }

  // =============================================================================
  // BACKUP/RESTORE (Ogres-style)
  // =============================================================================

  /**
   * Export entire campaign as backup file
   */
  async exportCampaign(): Promise<Uint8Array> {
    return await this.store.exportBackup();
  }

  /**
   * Import campaign from backup file
   */
  async importCampaign(backupFile: Uint8Array): Promise<void> {
    await this.store.importBackup(backupFile);
  }

  /**
   * Download backup file (for user)
   */
  downloadBackup(filename?: string): void {
    this.exportCampaign().then(backupData => {
      const blob = new Blob([backupData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `nexus-campaign-${new Date().toISOString().split('T')[0]}.nexus`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📥 Campaign backup downloaded');
    });
  }

  /**
   * Upload and restore from backup file
   */
  uploadBackup(): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.nexus';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        try {
          const arrayBuffer = await file.arrayBuffer();
          const backupData = new Uint8Array(arrayBuffer);
          await this.importCampaign(backupData);
          console.log('📤 Campaign backup restored');
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private getBrowserId(): string {
    let browserId = localStorage.getItem('nexus-browser-id');
    if (!browserId) {
      browserId = crypto.randomUUID();
      localStorage.setItem('nexus-browser-id', browserId);
    }
    return browserId;
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return this.store.getStats();
  }

  /**
   * Force immediate save (for critical operations)
   */
  async forceSave(): Promise<void> {
    await this.store.forceSave();
  }

  /**
   * Clear all data (careful!)
   */
  async clearAllData(): Promise<void> {
    const stats = this.getStats();
    const entityIds = Array.from({ length: stats.entities }, (_, i) => i);

    // This is destructive - maybe add confirmation
    console.warn('🗑️ Clearing all campaign data...');

    // For now, just clear the localStorage migration flag
    localStorage.removeItem('nexus-migration-complete');
  }
}

// Global instance
let globalLinearStorage: LinearFlowStorage | null = null;

export function getLinearFlowStorage(): LinearFlowStorage {
  if (!globalLinearStorage) {
    globalLinearStorage = new LinearFlowStorage();
  }
  return globalLinearStorage;
}

// Debug exports for console access
if (typeof window !== 'undefined') {
  (window as any).debugStorage = {
    resetDatabase: async () => {
      const storage = getLinearFlowStorage();
      await storage.resetDatabase();
    },
    getStats: () => {
      const storage = getLinearFlowStorage();
      return storage.getStats();
    },
    forceSave: async () => {
      const storage = getLinearFlowStorage();
      await storage.forceSave();
    },
    createTestData: () => {
      const storage = getLinearFlowStorage();
      storage.createTestData();
    }
  };
}