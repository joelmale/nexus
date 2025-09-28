import type { Drawing } from '@/types/drawing';
import type { Scene } from '@/types/game';
import { useGameStore } from '@/stores/gameStore';

/**
 * Drawing persistence service that handles saving and loading drawings
 * from localStorage with future server synchronization support.
 */
class DrawingPersistenceService {
  private readonly STORAGE_PREFIX = 'nexus-drawings';
  private readonly SCENES_KEY = 'nexus-scenes';
  
  /**
   * Save drawings for a scene to localStorage
   */
  saveDrawingsLocally(sceneId: string, drawings: Drawing[]): void {
    try {
      const key = `${this.STORAGE_PREFIX}-${sceneId}`;
      const data = {
        sceneId,
        drawings,
        lastUpdated: Date.now(),
        version: 1,
      };
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`Saved ${drawings.length} drawings locally for scene ${sceneId}`);
    } catch (error) {
      console.error('Failed to save drawings to localStorage:', error);
    }
  }
  
  /**
   * Load drawings for a scene from localStorage
   */
  loadDrawingsLocally(sceneId: string): Drawing[] {
    try {
      const key = `${this.STORAGE_PREFIX}-${sceneId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        return [];
      }
      
      const data = JSON.parse(stored);
      
      if (!data.drawings || !Array.isArray(data.drawings)) {
        console.warn('Invalid drawings data in localStorage');
        return [];
      }
      
      console.log(`Loaded ${data.drawings.length} drawings locally for scene ${sceneId}`);
      return data.drawings;
      
    } catch (error) {
      console.error('Failed to load drawings from localStorage:', error);
      return [];
    }
  }
  
  /**
   * Save entire scene data to localStorage
   */
  saveSceneLocally(scene: Scene): void {
    try {
      const scenesData = this.loadAllScenesLocally();
      const existingIndex = scenesData.findIndex(s => s.id === scene.id);
      
      if (existingIndex >= 0) {
        scenesData[existingIndex] = { ...scene, updatedAt: Date.now() };
      } else {
        scenesData.push({ ...scene, updatedAt: Date.now() });
      }
      
      localStorage.setItem(this.SCENES_KEY, JSON.stringify(scenesData));
      console.log(`Saved scene ${scene.id} locally`);
    } catch (error) {
      console.error('Failed to save scene to localStorage:', error);
    }
  }
  
  /**
   * Load all scenes from localStorage
   */
  loadAllScenesLocally(): Scene[] {
    try {
      const stored = localStorage.getItem(this.SCENES_KEY);
      if (!stored) {
        return [];
      }
      
      const scenes = JSON.parse(stored);
      if (!Array.isArray(scenes)) {
        return [];
      }
      
      console.log(`Loaded ${scenes.length} scenes from localStorage`);
      return scenes;
    } catch (error) {
      console.error('Failed to load scenes from localStorage:', error);
      return [];
    }
  }

  /**
   * Save drawings using current approach (localStorage)
   */
  async saveDrawings(sceneId: string, drawings: Drawing[]): Promise<void> {
    this.saveDrawingsLocally(sceneId, drawings);
  }
  
  /**
   * Load drawings using current approach (localStorage)
   */
  async loadDrawings(sceneId: string): Promise<Drawing[]> {
    return this.loadDrawingsLocally(sceneId);
  }
  
  /**
   * Save scene using current approach (localStorage)
   */
  async saveScene(scene: Scene): Promise<void> {
    this.saveSceneLocally(scene);
  }
  
  /**
   * Load all scenes using current approach (localStorage)
   */
  async loadAllScenes(): Promise<Scene[]> {
    return this.loadAllScenesLocally();
  }
}

// Export singleton instance
export const drawingPersistenceService = new DrawingPersistenceService();

// Hook for React components to use the persistence service
export const useDrawingPersistence = () => {
  const sceneState = useGameStore(state => state.sceneState);
  const updateScene = useGameStore(state => state.updateScene);

  const saveCurrentScene = async () => {
    const activeScene = sceneState.scenes.find(
      s => s.id === sceneState.activeSceneId
    );

    if (activeScene) {
      await drawingPersistenceService.saveScene(activeScene);
    }
  };

  const loadScene = async (sceneId: string) => {
    const drawings = await drawingPersistenceService.loadDrawings(sceneId);
    updateScene(sceneId, { drawings });
    return drawings;
  };
  
  const saveDrawingsForScene = async (sceneId: string, drawings: Drawing[]) => {
    await drawingPersistenceService.saveDrawings(sceneId, drawings);
  };
  
  return {
    saveCurrentScene,
    loadScene,
    saveDrawingsForScene,
  };
};
