// Scene utilities for managing scene data and operations
import type { Scene } from '@/types/game';

/**
 * IndexedDB utility for storing scene images locally
 * This provides a simple way to store and retrieve uploaded images
 * without needing server storage or external services
 */
class SceneImageStore {
  private dbName = 'nexus-vtt-images';
  private dbVersion = 1;
  private storeName = 'scene-images';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Store an image blob in IndexedDB and return a reference URL
   */
  async storeImage(file: File, sceneId: string): Promise<string> {
    const db = await this.openDB();
    const imageId = `${sceneId}-${Date.now()}`;
    
    // Convert file to blob for storage
    const blob = new Blob([file], { type: file.type });
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const imageData = {
        id: imageId,
        blob: blob,
        type: file.type,
        name: file.name,
        size: file.size,
        createdAt: Date.now(),
      };
      
      const request = store.put(imageData);
      
      request.onsuccess = () => {
        resolve(`nexus-image://${imageId}`);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve an image by its reference URL and return a blob URL
   */
  async getImageUrl(referenceUrl: string): Promise<string> {
    if (!referenceUrl.startsWith('nexus-image://')) {
      return referenceUrl; // Return as-is if it's not our internal format
    }
    
    const imageId = referenceUrl.replace('nexus-image://', '');
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(imageId);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const blobUrl = URL.createObjectURL(result.blob);
          resolve(blobUrl);
        } else {
          reject(new Error('Image not found'));
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(referenceUrl: string): Promise<void> {
    if (!referenceUrl.startsWith('nexus-image://')) {
      return; // Nothing to delete if it's not our internal format
    }
    
    const imageId = referenceUrl.replace('nexus-image://', '');
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(imageId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all stored images (useful for cleanup)
   */
  async clearAllImages(): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const sceneImageStore = new SceneImageStore();

/**
 * Utility functions for scene operations
 */
export const sceneUtils = {
  /**
   * Create a default scene configuration
   */
  createDefaultScene(name?: string): Omit<Scene, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: name || 'New Scene',
      description: '',
      gridSettings: {
        enabled: true,
        size: 50,
        color: '#ffffff',
        opacity: 0.3,
        snapToGrid: true,
      },
    };
  },

  /**
   * Validate scene data
   */
  validateScene(scene: Partial<Scene>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!scene.name || scene.name.trim().length === 0) {
      errors.push('Scene name is required');
    }
    
    if (scene.name && scene.name.trim().length > 100) {
      errors.push('Scene name must be 100 characters or less');
    }
    
    if (scene.description && scene.description.length > 500) {
      errors.push('Scene description must be 500 characters or less');
    }
    
    if (scene.gridSettings) {
      const { size, opacity } = scene.gridSettings;
      
      if (size !== undefined && (size < 10 || size > 200)) {
        errors.push('Grid size must be between 10 and 200 pixels');
      }
      
      if (opacity !== undefined && (opacity < 0 || opacity > 1)) {
        errors.push('Grid opacity must be between 0 and 1');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Calculate the bounds of a scene based on its background image
   */
  getSceneBounds(scene: Scene): { width: number; height: number; centerX: number; centerY: number } | null {
    if (!scene.backgroundImage) {
      return null;
    }
    
    const { width, height, offsetX, offsetY, scale } = scene.backgroundImage;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    return {
      width: scaledWidth,
      height: scaledHeight,
      centerX: offsetX + scaledWidth / 2,
      centerY: offsetY + scaledHeight / 2,
    };
  },

  /**
   * Calculate optimal camera position to fit scene content
   */
  calculateFitToSceneCamera(scene: Scene, viewportWidth: number, viewportHeight: number) {
    const bounds = this.getSceneBounds(scene);
    
    if (!bounds) {
      return { x: 0, y: 0, zoom: 1 };
    }
    
    // Calculate zoom to fit the scene with some padding
    const padding = 100; // pixels of padding
    const zoomX = (viewportWidth - padding * 2) / bounds.width;
    const zoomY = (viewportHeight - padding * 2) / bounds.height;
    const zoom = Math.min(zoomX, zoomY, 2); // Cap at 2x zoom
    
    return {
      x: bounds.centerX,
      y: bounds.centerY,
      zoom: Math.max(zoom, 0.1), // Minimum zoom of 0.1x
    };
  },

  /**
   * Snap coordinates to grid
   */
  snapToGrid(x: number, y: number, gridSize: number, enabled: boolean = true): { x: number; y: number } {
    if (!enabled) {
      return { x, y };
    }
    
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  },

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(
    screenX: number,
    screenY: number,
    camera: { x: number; y: number; zoom: number },
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number } {
    const worldX = (screenX - viewportWidth / 2) / camera.zoom + camera.x;
    const worldY = (screenY - viewportHeight / 2) / camera.zoom + camera.y;
    
    return { x: worldX, y: worldY };
  },

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(
    worldX: number,
    worldY: number,
    camera: { x: number; y: number; zoom: number },
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number } {
    const screenX = (worldX - camera.x) * camera.zoom + viewportWidth / 2;
    const screenY = (worldY - camera.y) * camera.zoom + viewportHeight / 2;
    
    return { x: screenX, y: screenY };
  },

  /**
   * Generate a unique color for scene elements
   */
  generateRandomColor(): string {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 20); // 70-90%
    const lightness = 45 + Math.floor(Math.random() * 10);  // 45-55%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Validate image file for upload
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum allowed size is ${this.formatFileSize(maxSize)}.`,
      };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please choose a JPEG, PNG, WebP, or GIF image.',
      };
    }
    
    return { valid: true };
  },
};

/**
 * Custom hook for managing scene images
 * This provides React components with easy access to image storage
 */
export const useSceneImages = () => {
  const storeImage = async (file: File, sceneId: string): Promise<string> => {
    const validation = sceneUtils.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    return await sceneImageStore.storeImage(file, sceneId);
  };
  
  const getImageUrl = async (referenceUrl: string): Promise<string> => {
    return await sceneImageStore.getImageUrl(referenceUrl);
  };
  
  const deleteImage = async (referenceUrl: string): Promise<void> => {
    return await sceneImageStore.deleteImage(referenceUrl);
  };
  
  return {
    storeImage,
    getImageUrl,
    deleteImage,
  };
};
