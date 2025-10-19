/**
 * Dungeon Map Service
 * Handles saving and managing dungeon maps generated from the One-Page Dungeon Generator
 * Uses IndexedDB for unlimited local storage
 */

import { type BaseMap } from './baseMapAssets';
import { dungeonMapIndexedDB, type StorageStats } from '../utils/indexedDB';

export interface GeneratedDungeonMap {
  id: string;
  name: string;
  imageData: string; // base64 PNG data
  timestamp: number;
  source: 'one-page-dungeon-generator';
  fileSize: number; // bytes
}

class DungeonMapService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize IndexedDB
      await dungeonMapIndexedDB.init();

      // Migrate any existing localStorage data
      await this.migrateFromLocalStorage();

      this.initialized = true;
      console.log('✅ DungeonMapService initialized with IndexedDB');
    } catch (error) {
      console.error('Failed to initialize DungeonMapService:', error);
      // Fallback to in-memory only
    }
  }

  /**
   * Migrate existing localStorage data to IndexedDB
   */
  private async migrateFromLocalStorage(): Promise<void> {
    const LEGACY_STORAGE_KEY = 'nexus_generated_dungeon_maps';

    try {
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacyData) return;

      const legacyMaps: GeneratedDungeonMap[] = JSON.parse(legacyData);
      console.log(
        `Found ${legacyMaps.length} maps in localStorage, migrating to IndexedDB...`,
      );

      for (const map of legacyMaps) {
        // Calculate file size (rough estimate: base64 is ~33% larger than binary)
        const fileSize = Math.floor((map.imageData.length * 3) / 4);

        await dungeonMapIndexedDB.saveMap({
          name: map.name,
          imageData: map.imageData,
          timestamp: map.timestamp,
          source: map.source,
          fileSize,
        });
      }

      // Clear legacy data
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      console.log('✅ Migration complete, cleared legacy localStorage data');
    } catch (error) {
      console.warn('Migration from localStorage failed:', error);
      // Continue without migration - data will be preserved in localStorage
    }
  }

  /**
   * Save a generated dungeon map
   */
  async saveGeneratedMap(
    imageData: string,
    customName?: string,
  ): Promise<string> {
    await this.initialize();

    const timestamp = Date.now();
    // Calculate file size (rough estimate: base64 is ~33% larger than binary)
    const fileSize = Math.floor((imageData.length * 3) / 4);

    const mapData = {
      name:
        customName ||
        `Generated Dungeon ${new Date(timestamp).toLocaleDateString()}`,
      imageData,
      timestamp,
      source: 'one-page-dungeon-generator' as const,
      fileSize,
    };

    const mapId = await dungeonMapIndexedDB.saveMap(mapData);
    console.log(
      `✅ Saved generated dungeon map: ${mapId} (${(fileSize / 1024).toFixed(1)} KB)`,
    );
    return mapId;
  }

  /**
   * Get all generated dungeon maps
   */
  async getAllGeneratedMaps(): Promise<GeneratedDungeonMap[]> {
    await this.initialize();

    const dbMaps = await dungeonMapIndexedDB.getAllMaps();
    return dbMaps.map((dbMap) => ({
      id: dbMap.id,
      name: dbMap.name,
      imageData: dbMap.imageData,
      timestamp: dbMap.timestamp,
      source: dbMap.source,
      fileSize: dbMap.fileSize,
    }));
  }

  /**
   * Get generated map by ID
   */
  async getMapById(id: string): Promise<GeneratedDungeonMap | null> {
    await this.initialize();

    const dbMap = await dungeonMapIndexedDB.getMapById(id);
    if (!dbMap) return null;

    return {
      id: dbMap.id,
      name: dbMap.name,
      imageData: dbMap.imageData,
      timestamp: dbMap.timestamp,
      source: dbMap.source,
      fileSize: dbMap.fileSize,
    };
  }

  /**
   * Delete a generated map
   */
  async deleteMap(id: string): Promise<boolean> {
    await this.initialize();

    try {
      await dungeonMapIndexedDB.deleteMap(id);
      console.log(`🗑️ Deleted generated dungeon map: ${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete dungeon map:', error);
      return false;
    }
  }

  /**
   * Export a map as a downloadable PNG file
   */
  async exportMapAsFile(mapId: string): Promise<void> {
    const map = await this.getMapById(mapId);
    if (!map) {
      throw new Error('Map not found');
    }

    // Convert base64 to blob
    const blob = this.base64ToBlob(map.imageData, 'image/png');

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Sanitize filename
    const safeName = map.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeName}.png`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`📥 Exported dungeon map: ${map.name}`);
  }

  /**
   * Convert generated maps to BaseMap format for compatibility
   */
  async getAsBaseMaps(): Promise<BaseMap[]> {
    const maps = await this.getAllGeneratedMaps();
    return maps.map((map) => ({
      id: map.id,
      name: map.name,
      path: map.imageData, // Use base64 data as path
      tags: ['generated', 'dungeon'],
      format: 'png',
      isDefault: false,
      isGenerated: true,
    }));
  }

  /**
   * Clear all generated maps
   */
  async clearAll(): Promise<void> {
    await this.initialize();
    await dungeonMapIndexedDB.clearAll();
    console.log('🧹 Cleared all generated dungeon maps');
  }

  /**
   * Clear all maps immediately (expose for debugging)
   */
  async clearAllNow(): Promise<void> {
    return this.clearAll();
  }

  /**
   * Keep only the N most recent maps
   */
  async keepRecentMaps(count: number): Promise<number> {
    await this.initialize();
    const deletedCount = await dungeonMapIndexedDB.cleanupOldMaps(count);
    if (deletedCount > 0) {
      console.log(
        `🗑️ Cleaned up ${deletedCount} old dungeon maps, kept ${count} most recent`,
      );
    }
    return deletedCount;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    await this.initialize();
    return await dungeonMapIndexedDB.getStorageStats();
  }

  /**
   * Utility: Convert base64 to blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

// Export singleton instance
export const dungeonMapService = new DungeonMapService();
