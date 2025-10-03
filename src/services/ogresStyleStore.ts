/**
 * Ogres-Style Entity Store
 *
 * DataScript-inspired entity management with:
 * - Relational entity structure
 * - Throttled persistence
 * - Complex type support
 * - Backup/restore capabilities
 */

import { SerializationService, SerializingIndexedDBAdapter } from './serialization';
import { createIndexedDBAdapter } from './indexedDBAdapter';
import type { Scene, Token, Drawing } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

// Entity system inspired by DataScript
export interface Entity {
  id: string;
  type: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  metadata?: unknown;
}

export interface EntityQuery {
  type?: string;
  where?: Record<string, unknown>;
  include?: string[];
  limit?: number;
  offset?: number;
}

interface StoreState {
  entities: Map<string, Entity>;
  relationships: Map<string, Relationship>;
  indexes: Map<string, Set<string>>; // type -> entity IDs
  lastSaved: number;
  version: number;
}

export class OgresStyleStore {
  private storage: SerializingIndexedDBAdapter;
  private state: StoreState;
  private saveThrottle: number = 2000; // 2 seconds like Ogres
  private saveTimer: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  // Event system
  private listeners: Map<string, Set<(entity: Entity) => void>> = new Map();

  constructor(dbName: string = 'nexus-ogres-store') {
    console.log('📚 Ogres-style store: Creating with database name:', dbName);

    // Use default IndexedDB configuration for now
    const baseAdapter = createIndexedDBAdapter({
      dbName,
      version: 1
    });

    this.storage = new SerializingIndexedDBAdapter(baseAdapter);
    this.state = this.createInitialState();
    this.initialize();
  }

  // Debug helper to clear database and start fresh
  async clearDatabase(): Promise<void> {
    try {
      await this.storage.clear();
      console.log('🗑️ Ogres-style store: Database cleared');
    } catch (error) {
      console.error('🗑️ Ogres-style store: Failed to clear database:', error);
    }
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private createInitialState(): StoreState {
    return {
      entities: new Map(),
      relationships: new Map(),
      indexes: new Map(),
      lastSaved: 0,
      version: 1
    };
  }

  private async initialize(): Promise<void> {
    try {
      console.log('📚 Ogres-style store: Starting initialization...');
      await this.loadFromStorage();
      console.log('📚 Ogres-style store initialized with', this.state.entities.size, 'entities');
    } catch (error) {
      console.error('📚 Ogres-style store: Failed to initialize store:', error);
    }
  }

  // =============================================================================
  // ENTITY CRUD OPERATIONS
  // =============================================================================

  /**
   * Create a new entity
   */
  create<T extends Entity>(type: string, data: Omit<T, 'id' | 'type' | 'createdAt' | 'updatedAt'>): T {
    const now = Date.now();
    const entity: Entity = {
      id: uuidv4(),
      type,
      createdAt: now,
      updatedAt: now,
      ...data
    } as T;

    this.state.entities.set(entity.id, entity);
    this.addToIndex(type, entity.id);
    this.markDirty();
    this.emit('entity:created', entity);

    return entity as T;
  }

  /**
   * Update an existing entity
   */
  update<T extends Entity>(id: string, updates: Partial<T>): T | null {
    const entity = this.state.entities.get(id);
    if (!entity) return null;

    const updatedEntity = {
      ...entity,
      ...updates,
      updatedAt: Date.now()
    } as T;

    this.state.entities.set(id, updatedEntity);
    this.markDirty();
    this.emit('entity:updated', updatedEntity);

    return updatedEntity;
  }

  /**
   * Get entity by ID
   */
  get<T extends Entity>(id: string): T | null {
    const entity = this.state.entities.get(id);
    return entity ? (entity as T) : null;
  }

  /**
   * Delete entity
   */
  delete(id: string): boolean {
    const entity = this.state.entities.get(id);
    if (!entity) return false;

    this.state.entities.delete(id);
    this.removeFromIndex(entity.type, id);

    // Remove related relationships
    const relatedRelationships = Array.from(this.state.relationships.values())
      .filter(rel => rel.sourceId === id || rel.targetId === id);

    relatedRelationships.forEach(rel => {
      this.state.relationships.delete(rel.id);
    });

    this.markDirty();
    this.emit('entity:deleted', entity);
    return true;
  }

  // =============================================================================
  // QUERY SYSTEM (DataScript-inspired)
  // =============================================================================

  /**
   * Query entities with flexible criteria
   */
  query<T extends Entity>(query: EntityQuery): T[] {
    let candidateIds: Set<string>;

    // Start with type filter if provided
    if (query.type) {
      candidateIds = this.state.indexes.get(query.type) || new Set();
    } else {
      candidateIds = new Set(this.state.entities.keys());
    }

    // Apply where filters
    let results = Array.from(candidateIds)
      .map(id => this.state.entities.get(id)!)
      .filter(entity => {
        if (!query.where) return true;

        return Object.entries(query.where).every(([key, value]) => {
          const entityValue = entity[key];

          if (typeof value === 'object' && value !== null) {
            // Handle complex queries like { level: { $gte: 5 } }
            if (value.$eq !== undefined) return entityValue === value.$eq;
            if (value.$ne !== undefined) return entityValue !== value.$ne;
            if (value.$gt !== undefined) return entityValue > value.$gt;
            if (value.$gte !== undefined) return entityValue >= value.$gte;
            if (value.$lt !== undefined) return entityValue < value.$lt;
            if (value.$lte !== undefined) return entityValue <= value.$lte;
            if (value.$in !== undefined) return value.$in.includes(entityValue);
            if (value.$nin !== undefined) return !value.$nin.includes(entityValue);
          }

          return entityValue === value;
        });
      });

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results as T[];
  }

  /**
   * Get all entities of a specific type
   */
  getByType<T extends Entity>(type: string): T[] {
    return this.query<T>({ type });
  }

  /**
   * Get entities related to another entity
   */
  getRelated<T extends Entity>(entityId: string, relationType?: string): T[] {
    const relationships = Array.from(this.state.relationships.values())
      .filter(rel => {
        const isRelated = rel.sourceId === entityId || rel.targetId === entityId;
        const matchesType = !relationType || rel.type === relationType;
        return isRelated && matchesType;
      });

    const relatedIds = relationships.map(rel =>
      rel.sourceId === entityId ? rel.targetId : rel.sourceId
    );

    return relatedIds
      .map(id => this.state.entities.get(id))
      .filter(Boolean) as T[];
  }

  // =============================================================================
  // RELATIONSHIP MANAGEMENT
  // =============================================================================

  /**
   * Create a relationship between entities
   */
  relate(sourceId: string, targetId: string, type: string, metadata?: unknown): Relationship {
    const relationship: Relationship = {
      id: uuidv4(),
      sourceId,
      targetId,
      type,
      metadata
    };

    this.state.relationships.set(relationship.id, relationship);
    this.markDirty();

    return relationship;
  }

  /**
   * Remove a relationship
   */
  unrelate(sourceId: string, targetId: string, type?: string): boolean {
    const relationship = Array.from(this.state.relationships.values())
      .find(rel =>
        rel.sourceId === sourceId &&
        rel.targetId === targetId &&
        (!type || rel.type === type)
      );

    if (relationship) {
      this.state.relationships.delete(relationship.id);
      this.markDirty();
      return true;
    }

    return false;
  }

  // =============================================================================
  // SPECIALIZED VTT OPERATIONS
  // =============================================================================

  /**
   * Create a scene with proper relationships
   */
  createScene(sceneData: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Scene {
    const scene = this.create<Scene>('scene', sceneData);

    // Create relationships for tokens if provided
    if (sceneData.placedTokens) {
      sceneData.placedTokens.forEach(token => {
        const tokenEntity = this.create('token', token);
        this.relate(scene.id, tokenEntity.id, 'contains');
      });
    }

    // Create relationships for drawings if provided
    if (sceneData.drawings) {
      sceneData.drawings.forEach(drawing => {
        const drawingEntity = this.create('drawing', drawing);
        this.relate(scene.id, drawingEntity.id, 'contains');
      });
    }

    return scene;
  }

  /**
   * Get scene with all related entities
   */
  getSceneWithRelations(sceneId: string): {
    scene: Scene | null;
    tokens: Token[];
    drawings: Drawing[];
  } {
    const scene = this.get<Scene>(sceneId);
    if (!scene) {
      return { scene: null, tokens: [], drawings: [] };
    }

    const tokens = this.getRelated<Token>(sceneId, 'contains')
      .filter(entity => entity.type === 'token');

    const drawings = this.getRelated<Drawing>(sceneId, 'contains')
      .filter(entity => entity.type === 'drawing');

    return { scene, tokens, drawings };
  }

  // =============================================================================
  // PERSISTENCE (Throttled like Ogres)
  // =============================================================================

  private markDirty(): void {
    this.isDirty = true;
    this.scheduleThrottledSave();
  }

  private scheduleThrottledSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveToStorage();
    }, this.saveThrottle);
  }

  private async saveToStorage(): Promise<void> {
    if (!this.isDirty) return;

    try {
      const stateToSave = {
        entities: Array.from(this.state.entities.entries()),
        relationships: Array.from(this.state.relationships.entries()),
        indexes: Array.from(this.state.indexes.entries()).map(([type, ids]) => [type, Array.from(ids)]),
        lastSaved: Date.now(),
        version: this.state.version
      };

      await this.storage.save('store-state', stateToSave);
      this.state.lastSaved = stateToSave.lastSaved;
      this.isDirty = false;

      console.log('💾 Ogres-style store saved to IndexedDB');
    } catch (error) {
      console.error('Failed to save store:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      console.log('📂 Ogres-style store: Attempting to load from storage...');
      const saved = await this.storage.load<{
        entities?: Array<[string, Entity]>;
        relationships?: Array<[string, Relationship]>;
        indexes?: Array<[string, string[]]>;
        lastSaved?: number;
        version?: number;
      }>('store-state');
      if (!saved) {
        console.log('📂 Ogres-style store: No saved data found, starting with empty state');
        return;
      }

      this.state.entities = new Map(saved.entities || []);
      this.state.relationships = new Map(saved.relationships || []);
      this.state.indexes = new Map(
        (saved.indexes || []).map(([type, ids]: [string, string[]]) => [type, new Set(ids)])
      );
      this.state.lastSaved = saved.lastSaved || 0;
      this.state.version = saved.version || 1;

      console.log('📂 Ogres-style store: Loaded from IndexedDB:', {
        entities: this.state.entities.size,
        relationships: this.state.relationships.size,
        indexes: this.state.indexes.size
      });
    } catch (error) {
      console.error('📂 Ogres-style store: Failed to load store:', error);
    }
  }

  // =============================================================================
  // BACKUP/RESTORE (Ogres-style)
  // =============================================================================

  /**
   * Export entire store as a backup file
   */
  async exportBackup(): Promise<Uint8Array> {
    await this.saveToStorage(); // Ensure latest data

    const backupData = {
      entities: Array.from(this.state.entities.entries()),
      relationships: Array.from(this.state.relationships.entries()),
      metadata: {
        exportedAt: Date.now(),
        version: this.state.version,
        entityCount: this.state.entities.size
      }
    };

    return SerializationService.createBackupData(backupData);
  }

  /**
   * Import from backup file
   */
  async importBackup(backupFile: Uint8Array): Promise<void> {
    try {
      const { data } = SerializationService.parseBackupData(backupFile);

      // Clear current state
      this.state.entities.clear();
      this.state.relationships.clear();
      this.state.indexes.clear();

      // Load backup data
      this.state.entities = new Map(data.entities || []);
      this.state.relationships = new Map(data.relationships || []);

      // Rebuild indexes
      this.rebuildIndexes();

      // Save to storage
      await this.saveToStorage();

      console.log('📥 Imported backup successfully');
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private addToIndex(type: string, entityId: string): void {
    if (!this.state.indexes.has(type)) {
      this.state.indexes.set(type, new Set());
    }
    this.state.indexes.get(type)!.add(entityId);
  }

  private removeFromIndex(type: string, entityId: string): void {
    const index = this.state.indexes.get(type);
    if (index) {
      index.delete(entityId);
      if (index.size === 0) {
        this.state.indexes.delete(type);
      }
    }
  }

  private rebuildIndexes(): void {
    this.state.indexes.clear();
    for (const entity of this.state.entities.values()) {
      this.addToIndex(entity.type, entity.id);
    }
  }

  // Event system
  private emit(event: string, data: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  public on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (data: unknown) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // Immediate save (for critical operations)
  async forceSave(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.saveToStorage();
  }

  // Get store statistics
  getStats() {
    return {
      entities: this.state.entities.size,
      relationships: this.state.relationships.size,
      types: this.state.indexes.size,
      lastSaved: this.state.lastSaved,
      isDirty: this.isDirty
    };
  }
}

// Global store instance (singleton)
let globalStore: OgresStyleStore | null = null;

export function getOgresStore(): OgresStyleStore {
  if (!globalStore) {
    globalStore = new OgresStyleStore();
  }
  return globalStore;
}