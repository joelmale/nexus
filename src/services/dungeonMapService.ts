/**
 * Dungeon Map Service
 * Handles saving and managing dungeon maps generated from the One-Page Dungeon Generator
 */

import { type BaseMap } from './baseMapAssets';

export interface GeneratedDungeonMap {
  id: string;
  name: string;
  imageData: string; // base64 PNG data
  timestamp: number;
  source: 'one-page-dungeon-generator';
}

class DungeonMapService {
  private generatedMaps: GeneratedDungeonMap[] = [];
  private readonly STORAGE_KEY = 'nexus_generated_dungeon_maps';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Save a generated dungeon map
   */
  async saveGeneratedMap(
    imageData: string,
    customName?: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const mapId = `dungeon_${timestamp}`;

    const dungeonMap: GeneratedDungeonMap = {
      id: mapId,
      name:
        customName ||
        `Generated Dungeon ${new Date(timestamp).toLocaleDateString()}`,
      imageData,
      timestamp,
      source: 'one-page-dungeon-generator',
    };

    this.generatedMaps.push(dungeonMap);
    this.saveToStorage();

    console.log(`Saved generated dungeon map: ${mapId}`);
    return mapId;
  }

  /**
   * Get all generated dungeon maps
   */
  getAllGeneratedMaps(): GeneratedDungeonMap[] {
    return [...this.generatedMaps];
  }

  /**
   * Get generated map by ID
   */
  getMapById(id: string): GeneratedDungeonMap | null {
    return this.generatedMaps.find((map) => map.id === id) || null;
  }

  /**
   * Delete a generated map
   */
  deleteMap(id: string): boolean {
    const index = this.generatedMaps.findIndex((map) => map.id === id);
    if (index !== -1) {
      this.generatedMaps.splice(index, 1);
      this.saveToStorage();
      console.log(`Deleted generated dungeon map: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Convert generated maps to BaseMap format for compatibility
   */
  getAsBaseMaps(): BaseMap[] {
    return this.generatedMaps.map((map) => ({
      id: map.id,
      name: map.name,
      path: map.imageData, // Use base64 data as path
      tags: ['generated', 'dungeon'],
      format: 'png',
      isDefault: false,
    }));
  }

  /**
   * Load maps from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.generatedMaps = JSON.parse(stored);
        console.log(
          `Loaded ${this.generatedMaps.length} generated dungeon maps from storage`,
        );
      }
    } catch (error) {
      console.error('Failed to load generated maps from storage:', error);
      this.generatedMaps = [];
    }
  }

  /**
   * Save maps to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.generatedMaps),
      );
    } catch (error) {
      console.error('Failed to save generated maps to storage:', error);
      // If storage is full, remove oldest map and try again
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        if (this.generatedMaps.length > 0) {
          this.generatedMaps.shift(); // Remove oldest
          this.saveToStorage(); // Try again
        }
      }
    }
  }

  /**
   * Clear all generated maps
   */
  clearAll(): void {
    this.generatedMaps = [];
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('Cleared all generated dungeon maps');
  }

  /**
   * Clear all maps immediately (expose for debugging)
   */
  clearAllNow(): void {
    this.clearAll();
  }

  /**
   * Get storage statistics
   */
  getStats(): { count: number; storageSize: number } {
    const stored = localStorage.getItem(this.STORAGE_KEY) || '';
    return {
      count: this.generatedMaps.length,
      storageSize: new Blob([stored]).size,
    };
  }
}

// Export singleton instance
export const dungeonMapService = new DungeonMapService();
