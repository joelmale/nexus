import React, { useState, useEffect } from 'react';
import { DungeonGenerator } from './DungeonGenerator';
import { dungeonMapService } from '../../services/dungeonMapService';
import { DungeonRenderer, type DungeonData } from './DungeonRenderer';
import { GeneratorFloatingControls } from './GeneratorFloatingControls';
import { useGameStore, useActiveScene } from '@/stores/gameStore';
import '@/styles/generator-panel.css';

const GENERATOR_MAP_STORAGE_KEY = 'nexus-generator-current-map';

interface GeneratorPanelProps {
  onSwitchToScenes?: () => void;
}

type GeneratorType = 'dungeon' | 'cave' | 'world' | 'city' | 'dwelling';

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  onSwitchToScenes,
}) => {
  const [generatedMap, setGeneratedMap] = useState<string | null>(() => {
    try {
      const stored = sessionStorage.getItem(GENERATOR_MAP_STORAGE_KEY);
      if (stored) {
        // Handle both old string format and new object format
        try {
          const parsed = JSON.parse(stored);
          return typeof parsed === 'object' && parsed.imageData
            ? parsed.imageData
            : stored;
        } catch {
          // Old format - just a string
          return stored;
        }
      }
      return null;
    } catch (error) {
      console.warn('Failed to load generated map from sessionStorage:', error);
      return null;
    }
  });
  const [dungeonData, setDungeonData] = useState<DungeonData | null>(null);
  const [activeGenerator, setActiveGenerator] =
    useState<GeneratorType>('dungeon');
  const [showPreview, setShowPreview] = useState(false);

  // Cleanup sessionStorage when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem(GENERATOR_MAP_STORAGE_KEY);
    };
  }, []);

  const activeScene = useActiveScene();
  const updateScene = useGameStore((state) => state.updateScene);

  const handleMapGenerated = async (
    imageData: string,
    format: 'webp' | 'png' = 'png',
    originalSize?: number,
  ) => {
    try {
      setGeneratedMap(imageData);
      // Store format info in sessionStorage for persistence
      const mapData = {
        imageData,
        format,
        originalSize,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(
        GENERATOR_MAP_STORAGE_KEY,
        JSON.stringify(mapData),
      );

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

    // Use stored generatedMap instead of accessing iframe
    if (!generatedMap) {
      console.warn(
        'No generated map available. Please generate a dungeon first.',
      );
      return;
    }

    try {
      const imageData = generatedMap; // Use the stored, valid image data
      const dungeonTitle = `Generated Dungeon ${new Date().toLocaleString()}`;

      // Extract original size information from sessionStorage for compression stats
      let originalSize: number | undefined;

      try {
        const stored = sessionStorage.getItem(GENERATOR_MAP_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed.originalSize) {
            originalSize = parsed.originalSize;
          }
        }
      } catch {
        // Ignore parsing errors, use defaults
      }

      // First, scale and compress the image BEFORE saving anywhere
      const img = new Image();
      img.onload = async () => {
        // Scale down by 50% to reduce storage size and improve performance
        const canvas = document.createElement('canvas');
        const scaledWidth = Math.floor(img.width * 0.5);
        const scaledHeight = Math.floor(img.height * 0.5);

        canvas.width = scaledWidth;
        canvas.height = scaledHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Failed to get canvas context for scaling');
          return;
        }

        // Use high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        // Convert to WebP with aggressive compression (0.75 quality for better compression)
        const scaledImageData = canvas.toDataURL('image/webp', 0.75);
        const base64Size = scaledImageData.length;

        // Base64 adds ~33% overhead, so actual binary size is roughly 75% of base64 length
        const estimatedBinarySize = Math.floor((base64Size * 3) / 4);
        const originalBinarySize = originalSize || Math.floor((imageData.length * 3) / 4);

        console.log(`📐 Dungeon compression results:`);
        console.log(`   Original dimensions: ${img.width}×${img.height}`);
        console.log(`   Scaled dimensions: ${scaledWidth}×${scaledHeight} (50%)`);
        console.log(`   Original size: ${(originalBinarySize / 1024).toFixed(1)} KB`);
        console.log(`   Base64 encoded: ${(base64Size / 1024).toFixed(1)} KB`);
        console.log(`   Estimated binary: ${(estimatedBinarySize / 1024).toFixed(1)} KB`);
        console.log(`   Total savings: ${(((originalBinarySize - estimatedBinarySize) / originalBinarySize) * 100).toFixed(1)}%`);

        // Now save the SCALED image to library
        try {
          await dungeonMapService.saveGeneratedMap(
            scaledImageData,
            dungeonTitle,
            'webp', // Always WebP now
            originalBinarySize, // Original size before compression
          );
        } catch (saveError) {
          console.warn(
            'Could not save to library (storage may be full):',
            saveError,
          );
          // Continue anyway - the map will still be added to the scene
        }

        const backgroundData = {
          url: scaledImageData,
          width: scaledWidth,
          height: scaledHeight,
          offsetX: -(scaledWidth / 2),
          offsetY: -(scaledHeight / 2),
          scale: 1,
        };

        // Update the active scene with the background image and disable grid for dungeon maps
        updateScene(activeScene.id, {
          backgroundImage: backgroundData,
          gridSettings: {
            ...activeScene.gridSettings,
            showToPlayers: false, // Turn off grid for dungeon maps
          },
        });

        // Clear the stored map after successful addition
        setGeneratedMap(null);
        sessionStorage.removeItem(GENERATOR_MAP_STORAGE_KEY);

        // Verify the update
        setTimeout(() => {
          useGameStore
            .getState()
            .sceneState.scenes.find((s) => s.id === activeScene.id);
        }, 100);

        // Switch to scenes panel
        if (onSwitchToScenes) {
          onSwitchToScenes();
        }
      };

      img.onerror = () => {
        console.error('Failed to load image');
        console.error('Failed to load dungeon map image. Please try again.');
      };

      img.src = imageData;
    } catch (error) {
      console.error('Failed to add map to scene:', error);
      console.error('Failed to add map to scene. Please try again.', error);
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
        <iframe
          src="/world-map-generator/index.html"
          className="generator-iframe"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            flex: 1,
          }}
          title="World Map Generator"
        />
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
