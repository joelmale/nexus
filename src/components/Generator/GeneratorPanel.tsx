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
      return sessionStorage.getItem(GENERATOR_MAP_STORAGE_KEY) || null;
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

  const handleMapGenerated = async (imageData: string) => {
    try {
      setGeneratedMap(imageData);
      sessionStorage.setItem(GENERATOR_MAP_STORAGE_KEY, imageData);

      // Don't automatically save to library - only save when user clicks "Add to Scene"
      // This prevents filling up localStorage with unwanted maps
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

      // Try to save to dungeon map service with custom name
      try {
        await dungeonMapService.saveGeneratedMap(imageData, dungeonTitle);
      } catch (saveError) {
        console.warn(
          'Could not save to library (storage may be full):',
          saveError,
        );
        // Continue anyway - the map will still be added to the scene
      }

      // Create image to get dimensions
      const img = new Image();
      img.onload = () => {
        const backgroundData = {
          url: imageData,
          width: img.width,
          height: img.height,
          offsetX: -(img.width / 2),
          offsetY: -(img.height / 2),
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
