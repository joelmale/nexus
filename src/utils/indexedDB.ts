/**
 * IndexedDB wrapper for dungeon maps
 * Provides unlimited local storage for DM-generated dungeon maps
 */

export interface DungeonMapDB {
  id: string;
  name: string;
  imageData: string; // base64 PNG data
  timestamp: number;
  source: 'one-page-dungeon-generator';
  fileSize: number; // bytes
}

export interface StorageStats {
  count: number;
  totalSize: number; // bytes
  averageSize: number; // bytes
}

class DungeonMapIndexedDB {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'NexusDungeonMaps';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'maps';
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ DungeonMapIndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });

        // Create indexes for efficient querying
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('name', 'name', { unique: false });

        console.log('✅ Created IndexedDB store for dungeon maps');
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Save a dungeon map to IndexedDB
   */
  async saveMap(mapData: Omit<DungeonMapDB, 'id'>): Promise<string> {
    await this.ensureInit();

    const mapId = `dungeon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const map: DungeonMapDB = {
      ...mapData,
      id: mapId,
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(map);

      request.onsuccess = () => {
        console.log(
          `✅ Saved dungeon map: ${mapId} (${(map.fileSize / 1024).toFixed(1)} KB)`,
        );
        resolve(mapId);
      };

      request.onerror = () => {
        console.error('Failed to save dungeon map:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all dungeon maps
   */
  async getAllMaps(): Promise<DungeonMapDB[]> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const maps = request.result as DungeonMapDB[];
        // Sort by timestamp (newest first)
        maps.sort((a, b) => b.timestamp - a.timestamp);
        resolve(maps);
      };

      request.onerror = () => {
        console.error('Failed to get dungeon maps:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a specific dungeon map by ID
   */
  async getMapById(id: string): Promise<DungeonMapDB | null> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get dungeon map:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a dungeon map
   */
  async deleteMap(id: string): Promise<boolean> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`🗑️ Deleted dungeon map: ${id}`);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Failed to delete dungeon map:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all dungeon maps
   */
  async clearAll(): Promise<void> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🧹 Cleared all dungeon maps from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear dungeon maps:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const maps = await this.getAllMaps();
    const totalSize = maps.reduce((sum, map) => sum + map.fileSize, 0);
    const averageSize = maps.length > 0 ? totalSize / maps.length : 0;

    return {
      count: maps.length,
      totalSize,
      averageSize,
    };
  }

  /**
   * Clean up old maps, keeping only the most recent ones
   */
  async cleanupOldMaps(keepCount: number = 10): Promise<number> {
    const maps = await this.getAllMaps();

    if (maps.length <= keepCount) {
      return 0; // No cleanup needed
    }

    // Keep the most recent maps
    const mapsToDelete = maps.slice(keepCount);
    const deletePromises = mapsToDelete.map((map) => this.deleteMap(map.id));

    await Promise.all(deletePromises);

    console.log(`🧹 Cleaned up ${mapsToDelete.length} old dungeon maps`);
    return mapsToDelete.length;
  }

  /**
   * Check if IndexedDB is available
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }
}

// Export singleton instance
export const dungeonMapIndexedDB = new DungeonMapIndexedDB();
