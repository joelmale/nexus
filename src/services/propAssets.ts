import React from 'react';
import type { Prop, PropLibrary, PropCategory } from '@/types/prop';

/**
 * Prop Asset Manager handles loading, caching, and organizing prop assets
 */
class PropAssetManager {
  private imageCache = new Map<string, HTMLImageElement>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private propLibraries: PropLibrary[] = [];
  private isInitialized = false;

  /**
   * Initialize with default prop libraries
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load default prop libraries
      this.propLibraries = await this.loadDefaultLibraries();
      this.isInitialized = true;
      console.log(
        `Initialized PropAssetManager with ${this.propLibraries.length} libraries`,
      );
    } catch (error) {
      console.error('Failed to initialize PropAssetManager:', error);
    }
  }

  /**
   * Load default prop libraries
   */
  private async loadDefaultLibraries(): Promise<PropLibrary[]> {
    try {
      // TODO: Load from manifest when available
      return this.createFallbackLibraries();
    } catch (error) {
      console.error('Failed to load default manifest, using fallback:', error);
      return this.createFallbackLibraries();
    }
  }

  /**
   * Create fallback libraries
   */
  private createFallbackLibraries(): PropLibrary[] {
    return [
      {
        id: 'default-furniture',
        name: 'Furniture & Objects',
        description: 'Tables, chairs, doors, and common objects',
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        props: this.createDefaultFurnitureProps(),
      },
      {
        id: 'default-treasure',
        name: 'Treasure & Items',
        description: 'Chests, coins, gems, and magical items',
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        props: this.createDefaultTreasureProps(),
      },
    ];
  }

  /**
   * Create default furniture props
   */
  private createDefaultFurnitureProps(): Prop[] {
    const baseProps = [
      {
        name: 'Wooden Table',
        category: 'furniture' as PropCategory,
        size: 'medium' as const,
        tags: ['furniture', 'table', 'wood'],
      },
      {
        name: 'Chair',
        category: 'furniture' as PropCategory,
        size: 'small' as const,
        tags: ['furniture', 'chair', 'seating'],
      },
      {
        name: 'Wooden Door',
        category: 'door' as PropCategory,
        size: 'small' as const,
        tags: ['door', 'entrance', 'wood'],
      },
      {
        name: 'Iron Door',
        category: 'door' as PropCategory,
        size: 'small' as const,
        tags: ['door', 'metal', 'secure'],
      },
      {
        name: 'Bookshelf',
        category: 'furniture' as PropCategory,
        size: 'medium' as const,
        tags: ['furniture', 'books', 'storage'],
      },
      {
        name: 'Barrel',
        category: 'container' as PropCategory,
        size: 'small' as const,
        tags: ['container', 'barrel', 'storage'],
      },
      {
        name: 'Crate',
        category: 'container' as PropCategory,
        size: 'small' as const,
        tags: ['container', 'crate', 'storage'],
      },
      {
        name: 'Torch',
        category: 'light' as PropCategory,
        size: 'tiny' as const,
        tags: ['light', 'fire', 'torch'],
        stats: { lightRadius: 20 },
      },
      {
        name: 'Chandelier',
        category: 'light' as PropCategory,
        size: 'medium' as const,
        tags: ['light', 'chandelier', 'hanging'],
        stats: { lightRadius: 30 },
      },
      {
        name: 'Statue',
        category: 'decoration' as PropCategory,
        size: 'medium' as const,
        tags: ['decoration', 'statue', 'art'],
      },
    ];

    return baseProps.map((prop) => ({
      id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: prop.name,
      image: this.generatePlaceholderPropImage(prop.name),
      size: prop.size,
      category: prop.category,
      tags: prop.tags,
      stats: prop.stats,
      isCustom: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  }

  /**
   * Create default treasure props
   */
  private createDefaultTreasureProps(): Prop[] {
    const baseProps = [
      {
        name: 'Treasure Chest',
        category: 'treasure' as PropCategory,
        size: 'small' as const,
        tags: ['treasure', 'chest', 'container'],
        stats: { locked: true },
      },
      {
        name: 'Gold Pile',
        category: 'treasure' as PropCategory,
        size: 'tiny' as const,
        tags: ['treasure', 'gold', 'coins'],
      },
      {
        name: 'Gem',
        category: 'treasure' as PropCategory,
        size: 'tiny' as const,
        tags: ['treasure', 'gem', 'jewel'],
      },
      {
        name: 'Magic Sword',
        category: 'treasure' as PropCategory,
        size: 'small' as const,
        tags: ['treasure', 'weapon', 'magic'],
      },
      {
        name: 'Scroll',
        category: 'treasure' as PropCategory,
        size: 'tiny' as const,
        tags: ['treasure', 'scroll', 'magic'],
      },
      {
        name: 'Potion',
        category: 'treasure' as PropCategory,
        size: 'tiny' as const,
        tags: ['treasure', 'potion', 'consumable'],
      },
    ];

    return baseProps.map((prop) => ({
      id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: prop.name,
      image: this.generatePlaceholderPropImage(prop.name),
      size: prop.size,
      category: prop.category,
      tags: prop.tags,
      stats: prop.stats,
      isCustom: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  }

  /**
   * Generate a placeholder image for a prop
   */
  private generatePlaceholderPropImage(name: string): string {
    // Return SVG data URL with prop name initial
    const initial = name.charAt(0).toUpperCase();
    const colors = [
      '#8b7355', // brown
      '#a0522d', // sienna
      '#d2691e', // chocolate
      '#cd853f', // peru
      '#daa520', // goldenrod
      '#b8860b', // darkgoldenrod
    ];
    const color = colors[name.length % colors.length];

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <rect width="100" height="100" fill="${color}"/>
        <text x="50" y="50" font-size="48" font-weight="bold"
              text-anchor="middle" dominant-baseline="central" fill="white">
          ${initial}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Get all props from all libraries
   */
  getAllProps(): Prop[] {
    return this.propLibraries.flatMap((lib) => lib.props);
  }

  /**
   * Get prop by ID
   */
  getPropById(id: string): Prop | null {
    for (const library of this.propLibraries) {
      const prop = library.props.find((p) => p.id === id);
      if (prop) return prop;
    }
    return null;
  }

  /**
   * Search props by query
   */
  searchProps(query: string): Prop[] {
    if (!query.trim()) return this.getAllProps();

    const lowerQuery = query.toLowerCase();
    return this.getAllProps().filter(
      (prop) =>
        prop.name.toLowerCase().includes(lowerQuery) ||
        prop.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    );
  }

  /**
   * Get props by category
   */
  getPropsByCategory(category: PropCategory): Prop[] {
    return this.getAllProps().filter((prop) => prop.category === category);
  }

  /**
   * Add a custom prop
   */
  async addCustomProp(
    prop: Omit<Prop, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Prop> {
    const newProp: Prop = {
      ...prop,
      id: `custom-prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isCustom: true,
    };

    // Find or create custom library
    let customLibrary = this.propLibraries.find(
      (lib) => lib.id === 'custom-props',
    );
    if (!customLibrary) {
      customLibrary = {
        id: 'custom-props',
        name: 'Custom Props',
        description: 'User-created props',
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        props: [],
      };
      this.propLibraries.push(customLibrary);
    }

    customLibrary.props.push(newProp);
    await this.saveLibrariesToStorage();

    console.log('Added custom prop:', newProp.name);
    return newProp;
  }

  /**
   * Update a prop
   */
  async updateProp(id: string, updates: Partial<Prop>): Promise<void> {
    for (const library of this.propLibraries) {
      const propIndex = library.props.findIndex((p) => p.id === id);
      if (propIndex !== -1) {
        library.props[propIndex] = {
          ...library.props[propIndex],
          ...updates,
          updatedAt: Date.now(),
        };
        await this.saveLibrariesToStorage();
        console.log('Updated prop:', id);
        return;
      }
    }
    throw new Error(`Prop not found: ${id}`);
  }

  /**
   * Delete a prop
   */
  async deleteProp(id: string): Promise<void> {
    for (const library of this.propLibraries) {
      const propIndex = library.props.findIndex((p) => p.id === id);
      if (propIndex !== -1) {
        library.props.splice(propIndex, 1);
        await this.saveLibrariesToStorage();
        console.log('Deleted prop:', id);
        return;
      }
    }
    throw new Error(`Prop not found: ${id}`);
  }

  /**
   * Save libraries to localStorage
   */
  private async saveLibrariesToStorage(): Promise<void> {
    try {
      // Only save custom libraries
      const customLibraries = this.propLibraries.filter(
        (lib) => !lib.isDefault,
      );
      localStorage.setItem(
        'nexus_prop_libraries',
        JSON.stringify(customLibraries),
      );
    } catch (error) {
      console.error('Failed to save prop libraries:', error);
    }
  }

  /**
   * Load libraries from localStorage
   */
  private async loadLibrariesFromStorage(): Promise<PropLibrary[]> {
    try {
      const stored = localStorage.getItem('nexus_prop_libraries');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load prop libraries from storage:', error);
    }
    return [];
  }

  /**
   * Preload a prop image
   */
  async preloadImage(url: string): Promise<HTMLImageElement> {
    // Check cache
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(url, img);
        this.loadingPromises.delete(url);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }
}

// Export singleton instance
export const propAssetManager = new PropAssetManager();

// React hook for using prop assets
export function usePropAssets() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    propAssetManager.initialize();
  }, []);

  return {
    getAllProps: () => propAssetManager.getAllProps(),
    getPropById: (id: string) => propAssetManager.getPropById(id),
    searchProps: (query: string) => propAssetManager.searchProps(query),
    getPropsByCategory: (category: PropCategory) =>
      propAssetManager.getPropsByCategory(category),
    addCustomProp: async (
      prop: Omit<Prop, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      const result = await propAssetManager.addCustomProp(prop);
      forceUpdate();
      return result;
    },
    updateProp: async (id: string, updates: Partial<Prop>) => {
      await propAssetManager.updateProp(id, updates);
      forceUpdate();
    },
    deleteProp: async (id: string) => {
      await propAssetManager.deleteProp(id);
      forceUpdate();
    },
  };
}
