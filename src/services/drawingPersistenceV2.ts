/**
 * Drawing Persistence Service V2 - Ogres Entity Store Edition
 *
 * Migrates from localStorage to IndexedDB using the Ogres-style entity store.
 * Provides automatic saves, better performance, and unified data management.
 */

import type { Drawing } from '@/types/drawing';
import type { Scene } from '@/types/game';
import { getLinearFlowStorage } from './linearFlowStorage';
import { useGameStore } from '@/stores/gameStore';

class DrawingPersistenceServiceV2 {
  private storage = getLinearFlowStorage();

  // =============================================================================
  // MIGRATION FROM OLD LOCALSTORAGE
  // =============================================================================

  /**
   * Migrate existing localStorage data to entity store
   */
  async migrateFromLocalStorage(): Promise<{
    migratedScenes: number;
    migratedDrawings: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedScenes = 0;
    let migratedDrawings = 0;

    try {
      console.log('🔄 Migrating drawing data from localStorage to IndexedDB...');

      // Migrate scenes
      const scenesData = localStorage.getItem('nexus-scenes');
      if (scenesData) {
        try {
          const scenes: Scene[] = JSON.parse(scenesData);
          console.log(`📂 Found ${scenes.length} scenes in localStorage`);

          for (const scene of scenes) {
            await this.storage.saveScene(scene);
            migratedScenes++;
            console.log(`✅ Migrated scene: ${scene.name} (${scene.id})`);
          }

          // Clean up old data
          localStorage.removeItem('nexus-scenes');
          console.log('🗑️ Removed old nexus-scenes from localStorage');
        } catch (error) {
          errors.push(`Failed to migrate scenes: ${error}`);
        }
      }

      // Migrate drawings for each scene
      const localStorageKeys = Object.keys(localStorage);
      const drawingKeys = localStorageKeys.filter(key => key.startsWith('nexus-drawings-'));

      console.log(`📂 Found ${drawingKeys.length} drawing sets in localStorage`);

      for (const key of drawingKeys) {
        try {
          const sceneId = key.replace('nexus-drawings-', '');
          const drawingsData = localStorage.getItem(key);

          if (drawingsData) {
            const data = JSON.parse(drawingsData);
            if (data.drawings && Array.isArray(data.drawings)) {
              await this.storage.saveDrawings(sceneId, data.drawings);
              migratedDrawings += data.drawings.length;
              console.log(`✅ Migrated ${data.drawings.length} drawings for scene ${sceneId}`);
            }
          }

          // Clean up old data
          localStorage.removeItem(key);
          console.log(`🗑️ Removed old ${key} from localStorage`);
        } catch (error) {
          errors.push(`Failed to migrate drawings for ${key}: ${error}`);
        }
      }

      console.log(`✅ Migration complete: ${migratedScenes} scenes, ${migratedDrawings} drawings`);

      return { migratedScenes, migratedDrawings, errors };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      errors.push(`Migration failed: ${error}`);
      return { migratedScenes, migratedDrawings, errors };
    }
  }

  // =============================================================================
  // SCENE MANAGEMENT
  // =============================================================================

  /**
   * Save scene using entity store (replaces localStorage)
   */
  async saveScene(scene: Scene): Promise<void> {
    try {
      await this.storage.saveScene(scene);
      console.log(`💾 Scene saved to IndexedDB: ${scene.name} (${scene.id})`);
    } catch (error) {
      console.error('❌ Failed to save scene:', error);
      throw error;
    }
  }

  /**
   * Load all scenes from entity store
   */
  async loadAllScenes(): Promise<Scene[]> {
    try {
      const scenes = this.storage.getScenes();
      console.log(`📂 Loaded ${scenes.length} scenes from IndexedDB`);
      return scenes;
    } catch (error) {
      console.error('❌ Failed to load scenes:', error);
      return [];
    }
  }

  /**
   * Load specific scene by ID
   */
  async loadScene(sceneId: string): Promise<Scene | null> {
    try {
      const scenes = this.storage.getScenes();
      const scene = scenes.find(s => s.id === sceneId);

      if (scene) {
        console.log(`📂 Loaded scene from IndexedDB: ${scene.name} (${sceneId})`);
        return scene;
      } else {
        console.log(`📂 Scene not found in IndexedDB: ${sceneId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to load scene:', error);
      return null;
    }
  }

  /**
   * Delete scene from entity store
   */
  async deleteScene(sceneId: string): Promise<void> {
    try {
      // Also delete associated drawings
      await this.deleteDrawings(sceneId);

      // Delete the scene entity
      this.storage.deleteScene(sceneId);
      console.log(`🗑️ Deleted scene from IndexedDB: ${sceneId}`);
    } catch (error) {
      console.error('❌ Failed to delete scene:', error);
      throw error;
    }
  }

  // =============================================================================
  // DRAWING MANAGEMENT
  // =============================================================================

  /**
   * Save drawings for a scene using entity store
   */
  async saveDrawings(sceneId: string, drawings: Drawing[]): Promise<void> {
    try {
      await this.storage.saveDrawings(sceneId, drawings);
      console.log(`💾 Saved ${drawings.length} drawings to IndexedDB for scene ${sceneId}`);
    } catch (error) {
      console.error('❌ Failed to save drawings:', error);
      throw error;
    }
  }

  /**
   * Load drawings for a scene from entity store
   */
  async loadDrawings(sceneId: string): Promise<Drawing[]> {
    try {
      const drawings = this.storage.getDrawings(sceneId);
      console.log(`📂 Loaded ${drawings.length} drawings from IndexedDB for scene ${sceneId}`);
      return drawings;
    } catch (error) {
      console.error('❌ Failed to load drawings:', error);
      return [];
    }
  }

  /**
   * Delete all drawings for a scene
   */
  async deleteDrawings(sceneId: string): Promise<void> {
    try {
      this.storage.deleteDrawings(sceneId);
      console.log(`🗑️ Deleted drawings from IndexedDB for scene ${sceneId}`);
    } catch (error) {
      console.error('❌ Failed to delete drawings:', error);
      throw error;
    }
  }

  /**
   * Add a single drawing to a scene
   */
  async addDrawing(sceneId: string, drawing: Drawing): Promise<void> {
    try {
      const existingDrawings = await this.loadDrawings(sceneId);
      const updatedDrawings = [...existingDrawings, drawing];
      await this.saveDrawings(sceneId, updatedDrawings);
    } catch (error) {
      console.error('❌ Failed to add drawing:', error);
      throw error;
    }
  }

  /**
   * Update a specific drawing in a scene
   */
  async updateDrawing(sceneId: string, drawingId: string, updates: Partial<Drawing>): Promise<void> {
    try {
      const existingDrawings = await this.loadDrawings(sceneId);
      const updatedDrawings = existingDrawings.map(drawing =>
        drawing.id === drawingId ? { ...drawing, ...updates } : drawing
      );
      await this.saveDrawings(sceneId, updatedDrawings);
    } catch (error) {
      console.error('❌ Failed to update drawing:', error);
      throw error;
    }
  }

  /**
   * Remove a specific drawing from a scene
   */
  async removeDrawing(sceneId: string, drawingId: string): Promise<void> {
    try {
      const existingDrawings = await this.loadDrawings(sceneId);
      const updatedDrawings = existingDrawings.filter(drawing => drawing.id !== drawingId);
      await this.saveDrawings(sceneId, updatedDrawings);
    } catch (error) {
      console.error('❌ Failed to remove drawing:', error);
      throw error;
    }
  }

  // =============================================================================
  // STATISTICS AND UTILITIES
  // =============================================================================

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalScenes: number;
    totalDrawings: number;
    storageSize: string;
  } {
    const scenes = this.storage.getScenes();
    let totalDrawings = 0;

    for (const scene of scenes) {
      totalDrawings += this.storage.getDrawings(scene.id).length;
    }

    const stats = this.storage.getStats();

    return {
      totalScenes: scenes.length,
      totalDrawings,
      storageSize: `${stats.entities} entities in IndexedDB`
    };
  }

  /**
   * Check if migration is needed
   */
  needsMigration(): boolean {
    // Check if there's old localStorage data
    const hasOldScenes = localStorage.getItem('nexus-scenes') !== null;
    const localStorageKeys = Object.keys(localStorage);
    const hasOldDrawings = localStorageKeys.some(key => key.startsWith('nexus-drawings-'));

    return hasOldScenes || hasOldDrawings;
  }
}

// Export singleton instance
export const drawingPersistenceServiceV2 = new DrawingPersistenceServiceV2();

// Hook for React components to use the new persistence service
export const useDrawingPersistenceV2 = () => {
  const sceneState = useGameStore(state => state.sceneState);
  const updateScene = useGameStore(state => state.updateScene);

  const saveCurrentScene = async () => {
    const activeScene = sceneState.scenes.find(
      s => s.id === sceneState.activeSceneId
    );

    if (activeScene) {
      await drawingPersistenceServiceV2.saveScene(activeScene);
    }
  };

  const loadScene = async (sceneId: string) => {
    const drawings = await drawingPersistenceServiceV2.loadDrawings(sceneId);
    updateScene(sceneId, { drawings });
    return drawings;
  };

  const saveDrawingsForScene = async (sceneId: string, drawings: Drawing[]) => {
    await drawingPersistenceServiceV2.saveDrawings(sceneId, drawings);
  };

  const migrateFromOldSystem = async () => {
    if (drawingPersistenceServiceV2.needsMigration()) {
      return await drawingPersistenceServiceV2.migrateFromLocalStorage();
    }
    return { migratedScenes: 0, migratedDrawings: 0, errors: [] };
  };

  return {
    saveCurrentScene,
    loadScene,
    saveDrawingsForScene,
    migrateFromOldSystem,
    getStorageStats: () => drawingPersistenceServiceV2.getStorageStats(),
    needsMigration: () => drawingPersistenceServiceV2.needsMigration(),
  };
};