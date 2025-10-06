import React, { useState, useEffect } from 'react';
import { DungeonGenerator } from './DungeonGenerator';
import { dungeonMapService } from '../../services/dungeonMapService';
import { DungeonRenderer, type DungeonData } from './DungeonRenderer';
import { GeneratorFloatingControls } from './GeneratorFloatingControls';
import { useGameStore } from '@/stores/gameStore';
import '@/styles/generator-panel.css';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface GeneratorPanelProps {
  onSwitchToScenes?: () => void;
}

type GeneratorType = 'dungeon' | 'cave' | 'world' | 'city' | 'dwelling';

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  onSwitchToScenes,
}) => {
  const [generatedMap, setGeneratedMap] = useState<string | null>(null);
  const [dungeonData, setDungeonData] = useState<DungeonData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeGenerator, setActiveGenerator] =
    useState<GeneratorType>('dungeon');

  // Get active scene from store
  const activeScene = useGameStore((state) => {
    const { scenes, activeSceneId } = state.sceneState;
    return scenes.find((s) => s.id === activeSceneId) || null;
  });
  const updateScene = useGameStore((state) => state.updateScene);

  const showToast = (message: string, type: ToastMessage['type']) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  useEffect(() => {
    // Show initial toast when component mounts
    const timer = setTimeout(() => {
      showToast('Click to add map to current Scene Background', 'info');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleMapGenerated = async (imageData: string) => {
    try {
      setGeneratedMap(imageData);

      // Save to dungeon map service
      const mapId = await dungeonMapService.saveGeneratedMap(imageData);

      console.log('Dungeon map saved to library:', mapId);

      // Show success notification
      showToast('✅ Saved to library!', 'success');
    } catch (error) {
      console.error('Failed to save dungeon map:', error);
    }
  };

  const handleAddMapToScene = async () => {
    console.log('handleAddMapToScene clicked', { generatedMap, activeScene });

    if (!activeScene) {
      showToast(
        'No active scene. Please create or select a scene first.',
        'warning',
      );
      return;
    }

    try {
      // Get canvas from iframe
      const iframe = document.querySelector(
        '.generator-iframe',
      ) as HTMLIFrameElement;
      if (!iframe || !iframe.contentWindow) {
        showToast(
          'Generator not loaded. Please wait and try again.',
          'warning',
        );
        return;
      }

      // Try to get the canvas from the iframe
      const canvas = iframe.contentWindow.document.querySelector('canvas');
      if (!canvas) {
        showToast(
          'No dungeon visible. Generate a dungeon first (press Enter).',
          'warning',
        );
        return;
      }

      // Convert canvas to data URL
      const imageData = canvas.toDataURL('image/png');
      console.log('Captured image from canvas');

      // Try to extract dungeon title from the iframe
      let dungeonTitle = '';
      try {
        // The dungeon generator draws the title on the canvas, but we need to extract it from the data
        // Try multiple selectors to find the title
        const iframeDoc = iframe.contentWindow.document;

        // Check common places where the title might be stored
        const titleSelectors = [
          'h1',
          'h2',
          '.title',
          '.dungeon-title',
          '#title',
          '[data-title]',
          '.name',
          '.dungeon-name',
        ];

        for (const selector of titleSelectors) {
          const element = iframeDoc.querySelector(selector);
          if (element && element.textContent?.trim()) {
            dungeonTitle = element.textContent.trim();
            console.log(
              `Found title with selector "${selector}":`,
              dungeonTitle,
            );
            break;
          }
        }

        // If still not found, try to get it from the canvas text or check if there's a data attribute
        if (!dungeonTitle) {
          // Log the iframe body HTML to help debug
          console.log(
            'Iframe body HTML (first 500 chars):',
            iframeDoc.body.innerHTML.substring(0, 500),
          );
        }
      } catch (error) {
        console.log('Could not extract dungeon title:', error);
      }

      // If no title found, use timestamp
      if (!dungeonTitle) {
        dungeonTitle = `Dungeon ${new Date().toLocaleString()}`;
      }

      // Save to dungeon map service with custom name
      const mapId = await dungeonMapService.saveGeneratedMap(
        imageData,
        dungeonTitle,
      );
      console.log('Saved to library:', mapId, 'with name:', dungeonTitle);

      // Create image to get dimensions
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded:', img.width, 'x', img.height);

        // Update the active scene with the background image
        updateScene(activeScene.id, {
          backgroundImage: {
            url: imageData,
            width: img.width,
            height: img.height,
            offsetX: -(img.width / 2),
            offsetY: -(img.height / 2),
            scale: 1,
          },
        });

        console.log('Scene updated with background');
        console.log('Updated scene backgroundImage:', {
          url: imageData.substring(0, 50) + '...',
          width: img.width,
          height: img.height,
          offsetX: -(img.width / 2),
          offsetY: -(img.height / 2),
          scale: 1,
        });

        // Verify the update
        setTimeout(() => {
          const updatedScene = useGameStore
            .getState()
            .sceneState.scenes.find((s) => s.id === activeScene.id);
          console.log('Scene after update:', {
            id: updatedScene?.id,
            name: updatedScene?.name,
            hasBackground: !!updatedScene?.backgroundImage,
            backgroundUrl:
              updatedScene?.backgroundImage?.url?.substring(0, 50) + '...',
          });
        }, 100);

        showToast(
          `✅ Map added to "${activeScene.name}" successfully!`,
          'success',
        );

        // Switch to scenes panel
        if (onSwitchToScenes) {
          onSwitchToScenes();
        }
      };

      img.onerror = () => {
        console.error('Failed to load image');
        showToast(
          'Failed to load dungeon map image. Please try again.',
          'warning',
        );
      };

      img.src = imageData;
    } catch (error) {
      console.error('Failed to add map to scene:', error);
      showToast('Failed to add map to scene. Please try again.', 'warning');
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
      const mapId = await dungeonMapService.saveGeneratedMap(imageData);

      console.log('Dungeon JSON converted and saved:', mapId);
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
    <div className="generator-panel" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
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

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

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
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>City Generator requires external resources and cannot run locally.</p>
          <p>
            Visit:{' '}
            <a
              href="https://watabou.github.io/city-generator/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#6366f1' }}
            >
              https://watabou.github.io/city-generator/
            </a>
          </p>
        </div>
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
