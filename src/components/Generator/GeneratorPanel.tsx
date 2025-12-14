import React, { useState, useEffect } from 'react';
import { DungeonGenerator } from './DungeonGenerator';
import { WorldGenerator } from './WorldGenerator';
import { dungeonMapService } from '../../services/dungeonMapService';
import { DungeonRenderer, type DungeonData } from './DungeonRenderer';
import { GeneratorFloatingControls } from './GeneratorFloatingControls';
import { useGameStore, useActiveScene } from '@/stores/gameStore';
import '@/styles/generator-panel.css';

const GENERATOR_MAP_STORAGE_KEY = 'nexus-generator-current-map';

// IndexedDB helper for temporary generator map storage
interface GeneratorMapData {
  imageData: string;
  format: 'webp' | 'png';
  originalSize?: number;
  timestamp: number;
  generator: string;
}

const openGeneratorDB = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NexusVTT', 5); // Bump to v5 to add tempStorage
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log(`🔧 IndexedDB upgrade for generator: v${event.oldVersion} → v5`);

      // Create existing stores if they don't exist (for compatibility)
      if (!db.objectStoreNames.contains('maps')) {
        const mapsStore = db.createObjectStore('maps', { keyPath: 'id' });
        mapsStore.createIndex('timestamp', 'timestamp', { unique: false });
        mapsStore.createIndex('name', 'name', { unique: false });
        console.log('✅ Created maps store');
      }

      if (!db.objectStoreNames.contains('gameState')) {
        const gameStateStore = db.createObjectStore('gameState', { keyPath: 'id' });
        gameStateStore.createIndex('timestamp', 'timestamp', { unique: false });
        gameStateStore.createIndex('version', 'version', { unique: false });
        console.log('✅ Created gameState store');
      }

      // Create tempStorage store for generator maps (v5+)
      if (!db.objectStoreNames.contains('tempStorage')) {
        db.createObjectStore('tempStorage');
        console.log('✅ Created tempStorage store for generator');
      }
    };
  });
};

const saveGeneratorMapToIndexedDB = async (data: GeneratorMapData): Promise<void> => {
  const db = await openGeneratorDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['tempStorage'], 'readwrite');
    const store = transaction.objectStore('tempStorage');
    const request = store.put(data, GENERATOR_MAP_STORAGE_KEY);
    request.onsuccess = () => {
      console.log('💾 Saved generator map to IndexedDB:', {
        size: `${(data.imageData.length / 1024).toFixed(1)} KB`,
        format: data.format,
        generator: data.generator,
      });
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

const loadGeneratorMapFromIndexedDB = async (): Promise<GeneratorMapData | null> => {
  try {
    const db = await openGeneratorDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tempStorage'], 'readonly');
      const store = transaction.objectStore('tempStorage');
      const request = store.get(GENERATOR_MAP_STORAGE_KEY);
      request.onsuccess = () => {
        const result = request.result as GeneratorMapData | undefined;
        if (result) {
          console.log('📂 Loaded generator map from IndexedDB:', {
            size: `${(result.imageData.length / 1024).toFixed(1)} KB`,
            format: result.format,
            generator: result.generator,
          });
        }
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to load generator map from IndexedDB:', error);
    return null;
  }
};

const deleteGeneratorMapFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openGeneratorDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tempStorage'], 'readwrite');
      const store = transaction.objectStore('tempStorage');
      const request = store.delete(GENERATOR_MAP_STORAGE_KEY);
      request.onsuccess = () => {
        console.log('🗑️ Deleted generator map from IndexedDB');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to delete generator map from IndexedDB:', error);
  }
};

interface GeneratorPanelProps {
  onSwitchToScenes?: () => void;
}

type GeneratorType = 'dungeon' | 'cave' | 'world' | 'city' | 'dwelling';

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  onSwitchToScenes,
}) => {
  const [generatedMap, setGeneratedMap] = useState<string | null>(null);
  const [dungeonData, setDungeonData] = useState<DungeonData | null>(null);
  const [activeGenerator, setActiveGenerator] =
    useState<GeneratorType>('dungeon');
  const [showPreview, setShowPreview] = useState(false);

  // Load map from IndexedDB on mount
  useEffect(() => {
    const loadMap = async () => {
      try {
        const stored = await loadGeneratorMapFromIndexedDB();
        if (stored) {
          setGeneratedMap(stored.imageData);
        }
      } catch (error) {
        console.warn('Failed to load generated map from IndexedDB:', error);
      }
    };
    loadMap();
  }, []);

  // Cleanup IndexedDB when component unmounts
  useEffect(() => {
    return () => {
      deleteGeneratorMapFromIndexedDB();
    };
  }, []);

  const activeScene = useActiveScene();
  const updateScene = useGameStore((state) => state.updateScene);
  const setActiveTab = useGameStore((state) => state.setActiveTab);

  const handleMapGenerated = async (
    imageDataOrData:
      | string
      | {
          full: { dataUrl: string; mime: string; quality: number };
          thumb: { dataUrl: string; mime: string; quality: number };
          meta: {
            width: number;
            height: number;
            timestamp: number;
            generator: string;
          };
        },
    format?: 'webp' | 'png',
    originalSize?: number,
  ) => {
    try {
      let imageData: string;
      let mapFormat: 'webp' | 'png' = 'png';
      let originalSizeValue: number | undefined;

      // Handle new VTT_MAP_EXPORTED format (world generator)
      if (typeof imageDataOrData === 'object' && imageDataOrData.full) {
        imageData = imageDataOrData.full.dataUrl;
        mapFormat = imageDataOrData.full.mime.includes('webp') ? 'webp' : 'png';
        originalSizeValue = Math.floor((imageData.length * 3) / 4); // Estimate binary size
      } else {
        // Handle legacy format (dungeon generator)
        imageData = imageDataOrData as string;
        mapFormat = format || 'png';
        originalSizeValue = originalSize;
      }

      setGeneratedMap(imageData);
      // Store format info in IndexedDB for persistence
      const mapData: GeneratorMapData = {
        imageData,
        format: mapFormat,
        originalSize: originalSizeValue,
        timestamp: Date.now(),
        generator:
          typeof imageDataOrData === 'object'
            ? imageDataOrData.meta.generator
            : 'dungeon',
      };

      // Save to IndexedDB asynchronously (don't block)
      saveGeneratorMapToIndexedDB(mapData).catch((error) => {
        console.error('Failed to save generated map to IndexedDB:', error);
      });

      // Don't automatically save to library - only save when user clicks "Add to Scene"
      // This prevents filling up storage with unwanted maps
    } catch (error) {
      console.error('Failed to handle generated map:', error);
    }
  };

  const handleAddMapToScene = async () => {
    if (!activeScene) {
      console.warn('No active scene. Please create or select a scene first.');
      return;
    }

    // Handle different generators
    if (activeGenerator === 'dungeon' || activeGenerator === 'world') {
      if (!generatedMap) {
        console.warn(
          `No generated map available. Please generate a ${activeGenerator} first.`,
        );
        return;
      }

      try {
        const imageData = generatedMap;
        const mapTitle = `Generated ${activeGenerator.charAt(0).toUpperCase() + activeGenerator.slice(1)} ${new Date().toLocaleString()}`;

        // Extract format information from IndexedDB
        let mapFormat: 'webp' | 'png' = 'png'; // Default to PNG

        try {
          const stored = await loadGeneratorMapFromIndexedDB();
          if (stored?.format) {
            mapFormat = stored.format as 'webp' | 'png';
          }
        } catch {
          // Ignore errors, use defaults
        }

        // Use the image at its original size without scaling
        const img = new Image();
        img.onload = async () => {
          const base64Size = imageData.length;
          const estimatedBinarySize = Math.floor((base64Size * 3) / 4);

          console.log(
            `📐 ${activeGenerator.charAt(0).toUpperCase() + activeGenerator.slice(1)} map imported:`,
          );
          console.log(`   Dimensions: ${img.width}×${img.height}`);
          console.log(
            `   Size: ${(estimatedBinarySize / 1024).toFixed(1)} KB`,
          );
          console.log(`   Format: ${mapFormat.toUpperCase()}`);

          // Save the original image to library with correct format
          try {
            await dungeonMapService.saveGeneratedMap(
              imageData,
              mapTitle,
              mapFormat,
              estimatedBinarySize,
            );
          } catch (saveError) {
            console.warn(
              'Could not save to library (storage may be full):',
              saveError,
            );
            // Continue anyway - the map will still be added to the scene
          }

          const backgroundData = {
            url: imageData,
            width: img.width,
            height: img.height,
            offsetX: -(img.width / 2),
            offsetY: -(img.height / 2),
            scale: 1,
          };

          // Update the active scene with the background image and disable grid for generated maps
          updateScene(activeScene.id, {
            backgroundImage: backgroundData,
            gridSettings: {
              ...activeScene.gridSettings,
              showToPlayers: false, // Turn off grid for generated maps
            },
          });

          // Clear the stored map after successful addition
          setGeneratedMap(null);
          deleteGeneratorMapFromIndexedDB().catch((error) => {
            console.warn('Failed to delete generator map from IndexedDB:', error);
          });

          // Verify the update
          setTimeout(() => {
            useGameStore
              .getState()
              .sceneState.scenes.find((s) => s.id === activeScene.id);
          }, 100);

          // Switch to scenes tab to show the newly added map
          setActiveTab('scenes');

          // Legacy callback support (if provided)
          if (onSwitchToScenes) {
            onSwitchToScenes();
          }
        };

        img.onerror = () => {
          console.error('Failed to load image');
          console.error(
            `Failed to load ${activeGenerator} map image. Please try again.`,
          );
        };

        img.src = imageData;
      } catch (error) {
        console.error(`Failed to add ${activeGenerator} map to scene:`, error);
        console.error('Failed to add map to scene. Please try again.', error);
      }
      return;
    }

    // Handle iframe-based generators (city, cave, dwelling)
    // Note: world generator now uses WorldGenerator component
    if (['city', 'cave', 'dwelling'].includes(activeGenerator)) {
      try {
        // Get the iframe for the active generator
        const iframe = document.querySelector(
          '.generator-iframe',
        ) as HTMLIFrameElement;

        if (!iframe) {
          console.error('Generator iframe not found');
          return;
        }

        // Access iframe content
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;

        if (!iframeDoc) {
          console.error('Cannot access iframe content');
          return;
        }

        // Find canvas element (OpenFL generators use canvas)
        const canvas = iframeDoc.querySelector('canvas') as HTMLCanvasElement;

        if (!canvas) {
          console.error('No canvas found in generator iframe');
          return;
        }

        console.log(`📐 Capturing ${activeGenerator} map from canvas...`);
        console.log(`   Original dimensions: ${canvas.width}×${canvas.height}`);

        // Calculate original size
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.drawImage(canvas, 0, 0);
        const originalImageData = tempCanvas.toDataURL('image/png');
        const originalSize = Math.floor((originalImageData.length * 3) / 4);

        // Scale down to 50% and convert to WebP
        const scaledCanvas = document.createElement('canvas');
        const scaledWidth = Math.floor(canvas.width * 0.5);
        const scaledHeight = Math.floor(canvas.height * 0.5);

        scaledCanvas.width = scaledWidth;
        scaledCanvas.height = scaledHeight;

        const ctx = scaledCanvas.getContext('2d');
        if (!ctx) {
          console.error('Failed to get canvas context for scaling');
          return;
        }

        // High-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);

        // Convert to WebP with 0.75 quality
        const compressedImageData = scaledCanvas.toDataURL('image/webp', 0.75);
        const compressedSize = Math.floor((compressedImageData.length * 3) / 4);

        // Log compression stats
        console.log(
          `📐 ${activeGenerator.charAt(0).toUpperCase() + activeGenerator.slice(1)} compression results:`,
        );
        console.log(`   Original dimensions: ${canvas.width}×${canvas.height}`);
        console.log(
          `   Scaled dimensions: ${scaledWidth}×${scaledHeight} (50%)`,
        );
        console.log(`   Original size: ${(originalSize / 1024).toFixed(1)} KB`);
        console.log(
          `   Compressed size: ${(compressedSize / 1024).toFixed(1)} KB`,
        );
        console.log(
          `   Total savings: ${(((originalSize - compressedSize) / originalSize) * 100).toFixed(1)}%`,
        );

        // Save to library (optional, may fail if storage full)
        const mapTitle = `Generated ${activeGenerator.charAt(0).toUpperCase() + activeGenerator.slice(1)} ${new Date().toLocaleString()}`;
        try {
          await dungeonMapService.saveGeneratedMap(
            compressedImageData,
            mapTitle,
            'webp',
            originalSize,
          );
        } catch (saveError) {
          console.warn(
            'Could not save to library (storage may be full):',
            saveError,
          );
        }

        // Add to scene
        const backgroundData = {
          url: compressedImageData,
          width: scaledWidth,
          height: scaledHeight,
          offsetX: -(scaledWidth / 2),
          offsetY: -(scaledHeight / 2),
          scale: 1,
        };

        updateScene(activeScene.id, {
          backgroundImage: backgroundData,
          gridSettings: {
            ...activeScene.gridSettings,
            showToPlayers: false, // Turn off grid for generated maps
          },
        });

        console.log(`✅ ${activeGenerator} map added to scene successfully`);

        // Switch to scenes panel
        if (onSwitchToScenes) {
          onSwitchToScenes();
        }
      } catch (error) {
        console.error(`Failed to add ${activeGenerator} map to scene:`, error);
        console.error('Failed to add map to scene. Please try again.', error);
      }
    }
  };

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setDungeonData(json);
        setShowPreview(true);
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        alert('Invalid dungeon JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleExportToScene = async () => {
    if (!dungeonData) return;

    // Convert SVG to image data
    const svg = document.querySelector('#dungeon-preview svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);

    // Create canvas to convert SVG to PNG
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      const imageData = canvas.toDataURL('image/png');
      await dungeonMapService.saveGeneratedMap(imageData);

      alert(`Dungeon "${dungeonData.title}" saved to library!`);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  if (showPreview && dungeonData) {
    return (
      <div className="generator-panel">
        <div className="panel-header">
          <h2>🗺️ {dungeonData.title}</h2>
          <p className="panel-instructions">{dungeonData.story}</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setShowPreview(false)}
              className="glass-button secondary"
            >
              ← Back to Generator
            </button>
            <button
              onClick={handleExportToScene}
              className="glass-button primary"
            >
              💾 Save to Library
            </button>
          </div>
        </div>
        <div
          id="dungeon-preview"
          style={{ flex: 1, overflow: 'auto', padding: '1rem' }}
        >
          <DungeonRenderer data={dungeonData} scale={40} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="generator-panel"
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hidden file input for JSON upload */}
      <input
        id="dungeon-json-upload"
        type="file"
        accept=".json"
        onChange={handleJsonUpload}
        style={{ display: 'none' }}
      />

      {/* Floating Controls Panel */}
      <GeneratorFloatingControls
        activeGenerator={activeGenerator}
        onGeneratorChange={setActiveGenerator}
        onAddToScene={handleAddMapToScene}
        onUploadJSON={
          activeGenerator === 'dungeon'
            ? () => document.getElementById('dungeon-json-upload')?.click()
            : undefined
        }
        hasActiveScene={!!activeScene}
      />

      {/* Debug: Show generated map preview */}
      {generatedMap && process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            zIndex: 1000,
            background: 'rgba(0,0,0,0.8)',
            padding: '10px',
            borderRadius: '8px',
            border: '2px solid #4ade80',
          }}
        >
          <div
            style={{ color: '#4ade80', fontSize: '12px', marginBottom: '5px' }}
          >
            ✅ Map Generated ({(generatedMap.length / 1024).toFixed(0)} KB)
          </div>
          <img
            src={generatedMap}
            alt="Generated preview"
            style={{
              width: '150px',
              height: 'auto',
              border: '1px solid #4ade80',
              borderRadius: '4px',
            }}
          />
        </div>
      )}

      {/* Toast notifications removed by user request */}

      {activeGenerator === 'dungeon' && (
        <DungeonGenerator onMapGenerated={handleMapGenerated} />
      )}

      {activeGenerator === 'cave' && (
        <iframe
          src="/cave-generator/index.html"
          className="generator-iframe"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            flex: 1,
          }}
          title="Cave Generator"
        />
      )}

      {activeGenerator === 'world' && (
        <WorldGenerator onMapGenerated={handleMapGenerated} />
      )}

      {activeGenerator === 'city' && (
        <iframe
          src="/city-generator/index.html"
          className="generator-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms"
          allow="cross-origin-isolated"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            flex: 1,
          }}
          title="City Generator"
        />
      )}

      {activeGenerator === 'dwelling' && (
        <iframe
          src="/dwellings-generator/index.html"
          className="generator-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            flex: 1,
          }}
          title="Dwelling Generator"
        />
      )}
    </div>
  );
};
