/**
 * Character Import Service
 * Handles importing characters from various sources with support for batch imports
 */

import type { Character } from '@/types/character';
import type { ForgeCharacter, ImportResult, BatchImportResult } from './forgeTypes';
import { ForgeCharacterAdapter } from './forgeAdapter';

export class CharacterImportService {
  private forgeAdapter = new ForgeCharacterAdapter();
  private maxFileSize = 10 * 1024 * 1024; // 10MB limit

  /**
   * Import a single character from a file
   */
  async importFromFile(
    file: File,
    playerId: string = ''
  ): Promise<ImportResult> {
    try {
      // Validate file size
      if (file.size > this.maxFileSize) {
        return {
          success: false,
          error: `File ${file.name} is too large (max 10MB)`,
          fileName: file.name,
        };
      }

      // Validate file type
      if (!file.name.endsWith('.json')) {
        return {
          success: false,
          error: `File ${file.name} is not a JSON file`,
          fileName: file.name,
        };
      }

      // Read file content
      const text = await this.readFileAsText(file);

      // Parse JSON
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        // Parse error
        return {
          success: false,
          error: `Failed to parse ${file.name}: Invalid JSON format`,
          fileName: file.name,
        };
      }

      // Detect and transform character
      return await this.importFromData(data, file.name, playerId);
    } catch (error) {
      return {
        success: false,
        error: `Failed to import ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fileName: file.name,
      };
    }
  }

  /**
   * Import multiple characters from multiple files
   */
  async importFromFiles(
    files: File[] | FileList,
    playerId: string = ''
  ): Promise<BatchImportResult> {
    const fileArray = Array.from(files);
    const results: ImportResult[] = [];

    // Import each file
    for (const file of fileArray) {
      const result = await this.importFromFile(file, playerId);
      results.push(result);
    }

    // Calculate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      total: results.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Import from raw data object
   */
  async importFromData(
    data: unknown,
    sourceName: string = 'unknown',
    playerId: string = ''
  ): Promise<ImportResult> {
    const warnings: string[] = [];

    try {
      // Try Forge adapter first
      if (this.forgeAdapter.validate(data)) {
        const forgeChar = data as ForgeCharacter;
        const character = this.forgeAdapter.transform(forgeChar, playerId);
        const metadata = this.forgeAdapter.generateMetadata(forgeChar, sourceName);

        // Check for potential compatibility issues
        if (forgeChar.edition === '2024') {
          warnings.push('This character uses 2024 D&D rules. Some features may require manual adjustment.');
        }

        if (forgeChar.selectedFeats && forgeChar.selectedFeats.length > 0) {
          warnings.push('Feat details may need to be manually configured.');
        }

        return {
          success: true,
          character,
          metadata,
          warnings,
          fileName: sourceName,
        };
      }

      // Future: Try other adapters (Roll20, D&D Beyond, etc.)
      // if (this.roll20Adapter.validate(data)) { ... }

      // Fallback: Check if it's already in NexusVTT format
      if (this.isNexusVTTFormat(data)) {
        return {
          success: true,
          character: data as Character,
          metadata: {
            sourceType: 'generic',
            sourceVersion: 'unknown',
            importedAt: Date.now(),
          },
          warnings: ['Character imported as generic format'],
          fileName: sourceName,
        };
      }

      // Unsupported format
      return {
        success: false,
        error: `Unsupported character format in ${sourceName}. Supported formats: 5e Character Forge, Generic JSON`,
        fileName: sourceName,
      };
    } catch (error) {
      return {
        success: false,
        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fileName: sourceName,
      };
    }
  }

  /**
   * Check if data is already in NexusVTT format
   */
  private isNexusVTTFormat(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const char = data as Record<string, unknown>;

    // Check for NexusVTT-specific structure
    return (
      'playerId' in char &&
      'abilities' in char &&
      typeof char.abilities === 'object' &&
      char.abilities !== null &&
      'strength' in char.abilities &&  // NexusVTT uses full names
      'race' in char &&
      typeof char.race === 'object'
    );
  }

  /**
   * Read file as text with proper encoding
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('File read error'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Get supported import sources for UI display
   */
  getSupportedSources() {
    return [
      {
        type: 'forge' as const,
        name: '5e Character Forge',
        description: 'Import characters created in 5e Character Forge',
        icon: '⚒️',
        supported: true,
      },
      {
        type: 'json' as const,
        name: 'Generic JSON',
        description: 'Import from NexusVTT-compatible JSON format',
        icon: '📄',
        supported: true,
      },
      {
        type: 'roll20' as const,
        name: 'Roll20',
        description: 'Import from Roll20 character sheet (Coming Soon)',
        icon: '🎲',
        supported: false,
      },
      {
        type: 'ddb' as const,
        name: 'D&D Beyond',
        description: 'Import from D&D Beyond (Coming Soon)',
        icon: '🐉',
        supported: false,
      },
    ];
  }
}

// Singleton instance
export const characterImportService = new CharacterImportService();
