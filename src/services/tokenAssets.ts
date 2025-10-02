import React from 'react';
import type { Token, TokenLibrary, TokenCategory } from '@/types/token';

/**
 * Token Asset Manager handles loading, caching, and organizing token assets
 */
class TokenAssetManager {
  private imageCache = new Map<string, HTMLImageElement>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private tokenLibraries: TokenLibrary[] = [];
  private isInitialized = false;

  /**
   * Initialize with default token libraries
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load default token libraries
      this.tokenLibraries = await this.loadDefaultLibraries();
      this.isInitialized = true;
      console.log(
        `Initialized TokenAssetManager with ${this.tokenLibraries.length} libraries`,
      );
    } catch (error) {
      console.error('Failed to initialize TokenAssetManager:', error);
    }
  }

  /**
   * Load default token libraries from bundled manifest
   */
  private async loadDefaultLibraries(): Promise<TokenLibrary[]> {
    try {
      // Load bundled default assets manifest
      const response = await fetch('/assets/defaults/manifest.json');
      if (!response.ok) {
        console.warn('Default manifest not found, using fallback tokens');
        return this.createFallbackLibraries();
      }

      const manifest = await response.json();

      // Convert manifest tokens to Token objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defaultTokens: Token[] = manifest.tokens.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        image: item.path,
        size: item.size,
        category: item.category,
        tags: item.tags,
        isCustom: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      return [
        {
          id: 'default-bundled',
          name: 'Default Tokens',
          description: 'Bundled character tokens',
          isDefault: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tokens: defaultTokens,
        },
      ];
    } catch (error) {
      console.error('Failed to load default manifest, using fallback:', error);
      return this.createFallbackLibraries();
    }
  }

  /**
   * Create fallback libraries if manifest fails to load
   */
  private createFallbackLibraries(): TokenLibrary[] {
    return [
      {
        id: 'default-fantasy',
        name: 'Fantasy Tokens',
        description: 'Basic fantasy character and monster tokens',
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tokens: this.createDefaultFantasyTokens(),
      },
      {
        id: 'default-modern',
        name: 'Modern Tokens',
        description: 'Contemporary character tokens',
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tokens: this.createDefaultModernTokens(),
      },
    ];
  }

  /**
   * Create default fantasy tokens (placeholder data)
   */
  private createDefaultFantasyTokens(): Token[] {
    const baseTokens = [
      {
        name: 'Human Fighter',
        category: 'pc' as TokenCategory,
        size: 'medium' as const,
        tags: ['human', 'fighter', 'warrior'],
      },
      {
        name: 'Elf Wizard',
        category: 'pc' as TokenCategory,
        size: 'medium' as const,
        tags: ['elf', 'wizard', 'magic'],
      },
      {
        name: 'Dwarf Cleric',
        category: 'pc' as TokenCategory,
        size: 'medium' as const,
        tags: ['dwarf', 'cleric', 'divine'],
      },
      {
        name: 'Halfling Rogue',
        category: 'pc' as TokenCategory,
        size: 'small' as const,
        tags: ['halfling', 'rogue', 'stealth'],
      },
      {
        name: 'Goblin',
        category: 'monster' as TokenCategory,
        size: 'small' as const,
        tags: ['goblin', 'humanoid'],
      },
      {
        name: 'Orc Warrior',
        category: 'monster' as TokenCategory,
        size: 'medium' as const,
        tags: ['orc', 'warrior'],
      },
      {
        name: 'Dragon',
        category: 'monster' as TokenCategory,
        size: 'huge' as const,
        tags: ['dragon', 'legendary'],
      },
      {
        name: 'Treasure Chest',
        category: 'object' as TokenCategory,
        size: 'medium' as const,
        tags: ['treasure', 'container'],
      },
    ];

    return baseTokens.map((token) => ({
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: token.name,
      image: this.generatePlaceholderTokenImage(token.name),
      size: token.size,
      category: token.category,
      tags: token.tags,
      isCustom: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  }

  /**
   * Create default modern tokens (placeholder data)
   */
  private createDefaultModernTokens(): Token[] {
    const baseTokens = [
      {
        name: 'Police Officer',
        category: 'npc' as TokenCategory,
        size: 'medium' as const,
        tags: ['police', 'authority'],
      },
      {
        name: 'Civilian',
        category: 'npc' as TokenCategory,
        size: 'medium' as const,
        tags: ['civilian', 'bystander'],
      },
      {
        name: 'Car',
        category: 'vehicle' as TokenCategory,
        size: 'large' as const,
        tags: ['vehicle', 'transport'],
      },
      {
        name: 'Building',
        category: 'object' as TokenCategory,
        size: 'gargantuan' as const,
        tags: ['building', 'structure'],
      },
    ];

    return baseTokens.map((token) => ({
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: token.name,
      image: this.generatePlaceholderTokenImage(token.name),
      size: token.size,
      category: token.category,
      tags: token.tags,
      isCustom: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  }

  /**
   * Generate placeholder token image (colored circle with initials)
   */
  private generatePlaceholderTokenImage(name: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

    // Generate consistent color based on name
    const hash = name.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const hue = Math.abs(hash) % 360;
    const color = `hsl(${hue}, 60%, 50%)`;

    // Draw circle background
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(50, 50, 45, 0, 2 * Math.PI);
    ctx.fill();

    // Add border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Add initials
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    ctx.fillText(initials, 50, 50);

    return canvas.toDataURL('image/png');
  }

  /**
   * Get all available token libraries
   */
  getLibraries(): TokenLibrary[] {
    return [...this.tokenLibraries];
  }

  /**
   * Get all tokens from all libraries
   */
  getAllTokens(): Token[] {
    return this.tokenLibraries.flatMap((library) => library.tokens);
  }

  /**
   * Get tokens by category
   */
  getTokensByCategory(category: TokenCategory): Token[] {
    return this.getAllTokens().filter((token) => token.category === category);
  }

  /**
   * Search tokens by query
   */
  searchTokens(query: string): Token[] {
    if (!query.trim()) return this.getAllTokens();

    const lowerQuery = query.toLowerCase();
    return this.getAllTokens().filter(
      (token) =>
        token.name.toLowerCase().includes(lowerQuery) ||
        token.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        token.category.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get token by ID
   */
  getTokenById(id: string): Token | null {
    for (const library of this.tokenLibraries) {
      const token = library.tokens.find((t) => t.id === id);
      if (token) return token;
    }
    return null;
  }

  /**
   * Load and cache token image
   */
  async loadTokenImage(imageUrl: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.imageCache.has(imageUrl)) {
      return this.imageCache.get(imageUrl)!;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(imageUrl)) {
      return this.loadingPromises.get(imageUrl)!;
    }

    // Create new loading promise
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.imageCache.set(imageUrl, img);
        this.loadingPromises.delete(imageUrl);
        resolve(img);
      };

      img.onerror = () => {
        this.loadingPromises.delete(imageUrl);
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      img.src = imageUrl;
    });

    this.loadingPromises.set(imageUrl, loadPromise);
    return loadPromise;
  }

  /**
   * Preload images for a set of tokens
   */
  async preloadTokenImages(tokens: Token[]): Promise<void> {
    const loadPromises = tokens.map((token) =>
      this.loadTokenImage(token.image).catch((error) => {
        console.warn(`Failed to preload token image for ${token.name}:`, error);
      }),
    );

    await Promise.allSettled(loadPromises);
  }

  /**
   * Add custom token to a library
   */
  addCustomToken(
    libraryId: string,
    token: Omit<Token, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'>,
  ): Token {
    const library = this.tokenLibraries.find((lib) => lib.id === libraryId);
    if (!library) {
      throw new Error(`Library not found: ${libraryId}`);
    }

    const newToken: Token = {
      ...token,
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    library.tokens.push(newToken);
    library.updatedAt = Date.now();

    console.log(
      `Added custom token "${newToken.name}" to library "${library.name}"`,
    );
    return newToken;
  }

  /**
   * Create a new custom library
   */
  createCustomLibrary(name: string, description?: string): TokenLibrary {
    const library: TokenLibrary = {
      id: `library-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      tokens: [],
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tokenLibraries.push(library);
    console.log(`Created custom library: ${library.name}`);
    return library;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedImages: number;
    totalTokens: number;
    libraries: number;
  } {
    return {
      cachedImages: this.imageCache.size,
      totalTokens: this.getAllTokens().length,
      libraries: this.tokenLibraries.length,
    };
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.loadingPromises.clear();
    console.log('Token image cache cleared');
  }
}

// Export singleton instance
export const tokenAssetManager = new TokenAssetManager();

// React hook for using token asset manager
export const useTokenAssets = () => {
  const [isLoading, setIsLoading] = React.useState(
    !tokenAssetManager['isInitialized'],
  );

  React.useEffect(() => {
    const initializeAssets = async () => {
      if (!tokenAssetManager['isInitialized']) {
        await tokenAssetManager.initialize();
        setIsLoading(false);
      }
    };

    initializeAssets();
  }, []);

  return {
    isLoading,
    manager: tokenAssetManager,
    getAllTokens: () => tokenAssetManager.getAllTokens(),
    getTokensByCategory: (category: TokenCategory) =>
      tokenAssetManager.getTokensByCategory(category),
    searchTokens: (query: string) => tokenAssetManager.searchTokens(query),
    getLibraries: () => tokenAssetManager.getLibraries(),
  };
};
