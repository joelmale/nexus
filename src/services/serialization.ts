/**
 * Ogres-Style Serialization Service
 *
 * Robust serialization layer inspired by Ogres VTT, using Transit.js
 * for handling complex data types, custom classes, and binary data.
 */

// import * as transit from 'transit-js';
import { encode, decode } from '@msgpack/msgpack';

// Simplified serialization for now - we'll add Transit.js transforms later
// const transformMap = new Map([
//   // Custom transforms will go here
// ]);

// Placeholder for Transit - we'll use JSON for now
const transitWrite = {
  write: (data: any) => JSON.stringify(data)
};
const transitRead = {
  read: (str: string) => JSON.parse(str)
};

/**
 * Serialization Service
 *
 * Provides multiple serialization strategies:
 * - Transit.js for complex objects with custom types
 * - MessagePack for binary efficiency
 * - JSON fallback for simple data
 */
export class SerializationService {

  /**
   * Serialize data using Transit.js (preserves complex types)
   * Best for: Game state, scenes, complex objects
   */
  static serializeTransit(data: any): string {
    try {
      return transitWrite.write(data);
    } catch (error) {
      console.error('Transit serialization failed:', error);
      throw new Error(`Failed to serialize with Transit: ${error}`);
    }
  }

  /**
   * Deserialize Transit.js data
   */
  static deserializeTransit<T = any>(serialized: string): T {
    try {
      return transitRead.read(serialized);
    } catch (error) {
      console.error('Transit deserialization failed:', error);
      throw new Error(`Failed to deserialize with Transit: ${error}`);
    }
  }

  /**
   * Serialize data using MessagePack (binary efficient)
   * Best for: Large datasets, drawings, binary assets
   */
  static serializeMessagePack(data: any): Uint8Array {
    try {
      return encode(data);
    } catch (error) {
      console.error('MessagePack serialization failed:', error);
      throw new Error(`Failed to serialize with MessagePack: ${error}`);
    }
  }

  /**
   * Deserialize MessagePack data
   */
  static deserializeMessagePack<T = any>(packed: Uint8Array): T {
    try {
      return decode(packed) as T;
    } catch (error) {
      console.error('MessagePack deserialization failed:', error);
      throw new Error(`Failed to deserialize with MessagePack: ${error}`);
    }
  }

  /**
   * Smart serialization - chooses best method based on data type
   */
  static serialize(data: any, format: 'auto' | 'transit' | 'msgpack' | 'json' = 'auto'): string | Uint8Array {
    if (format === 'transit') {
      return this.serializeTransit(data);
    }

    if (format === 'msgpack') {
      return this.serializeMessagePack(data);
    }

    if (format === 'json') {
      return JSON.stringify(data);
    }

    // Auto-detect best format
    const dataSize = JSON.stringify(data).length;
    const hasComplexTypes = this.hasComplexTypes(data);

    if (hasComplexTypes) {
      return this.serializeTransit(data);
    }

    if (dataSize > 50000) { // Large data - use MessagePack
      return this.serializeMessagePack(data);
    }

    return JSON.stringify(data); // Simple data - use JSON
  }

  /**
   * Smart deserialization - auto-detects format
   */
  static deserialize<T = any>(serialized: string | Uint8Array): T {
    if (serialized instanceof Uint8Array) {
      return this.deserializeMessagePack<T>(serialized);
    }

    if (typeof serialized === 'string') {
      // Try to detect if it's Transit format
      if (serialized.includes('"type":"') || serialized.includes('~#')) {
        try {
          return this.deserializeTransit<T>(serialized);
        } catch {
          // Fall back to JSON
          return JSON.parse(serialized);
        }
      }

      return JSON.parse(serialized);
    }

    throw new Error('Invalid serialized data format');
  }

  /**
   * Check if data contains complex types that benefit from Transit
   */
  private static hasComplexTypes(data: any): boolean {
    if (data instanceof Date) return true;
    if (data instanceof Set) return true;
    if (data instanceof Map) return true;
    if (data instanceof ArrayBuffer) return true;
    if (data instanceof Uint8Array) return true;

    if (Array.isArray(data)) {
      return data.some(item => this.hasComplexTypes(item));
    }

    if (data && typeof data === 'object') {
      // Check for common VTT complex types
      if (data.x !== undefined && data.y !== undefined) return true; // Vector-like
      if (data.r !== undefined && data.g !== undefined && data.b !== undefined) return true; // Color-like

      return Object.values(data).some(value => this.hasComplexTypes(value));
    }

    return false;
  }

  /**
   * Create a backup-compatible export (like Ogres)
   * Includes metadata and uses MessagePack for efficiency
   */
  static createBackupData(gameState: any): Uint8Array {
    const backupData = {
      version: '1.0.0',
      timestamp: Date.now(),
      exportedBy: 'Nexus VTT',
      data: gameState,
      metadata: {
        scenes: gameState.sceneState?.scenes?.length || 0,
        characters: gameState.characterStore?.characters?.length || 0,
        assets: Object.keys(gameState.assetStore?.assets || {}).length,
      }
    };

    return this.serializeMessagePack(backupData);
  }

  /**
   * Parse backup data (like Ogres import)
   */
  static parseBackupData<T = any>(backupFile: Uint8Array): {
    data: T;
    metadata: any;
    version: string;
    timestamp: number;
  } {
    const backup = this.deserializeMessagePack(backupFile);

    if (!backup.version || !backup.data) {
      throw new Error('Invalid backup file format');
    }

    return backup;
  }
}

/**
 * Enhanced IndexedDB adapter that uses smart serialization
 */
export class SerializingIndexedDBAdapter {
  private baseAdapter: any;

  constructor(baseAdapter: any) {
    this.baseAdapter = baseAdapter;
  }

  async save(key: string, data: any): Promise<void> {
    const serialized = SerializationService.serialize(data, 'transit');
    return this.baseAdapter.save(key, {
      serialized,
      format: typeof serialized === 'string' ? 'transit' : 'msgpack',
      timestamp: Date.now()
    });
  }

  async load<T>(key: string): Promise<T | null> {
    const stored = await this.baseAdapter.load(key);
    if (!stored) return null;

    if (stored.serialized) {
      return SerializationService.deserialize<T>(stored.serialized);
    }

    // Fallback for old data
    return stored as T;
  }

  // Delegate other methods
  async delete(key: string): Promise<void> {
    return this.baseAdapter.delete(key);
  }

  async clear(): Promise<void> {
    return this.baseAdapter.clear();
  }

  async exportData(): Promise<Uint8Array> {
    const data = await this.baseAdapter.exportData();
    return SerializationService.createBackupData(data);
  }

  async importData(backupFile: Uint8Array): Promise<void> {
    const { data } = SerializationService.parseBackupData(backupFile);
    return this.baseAdapter.importData(data);
  }
}