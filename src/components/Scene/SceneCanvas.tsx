import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore, useCamera, useFollowDM, useIsHost, useActiveScene } from '@/stores/gameStore';
import { SceneGrid } from './SceneGrid';
import { SceneBackground } from './SceneBackground';
import { DrawingTools } from './DrawingTools';
import { DrawingRenderer } from './DrawingRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { webSocketService } from '@/utils/websocket';
import type { Scene, Camera } from '@/types/game';
import type { DrawingTool, DrawingStyle, MeasurementTool } from '@/types/drawing';

interface SceneCanvasProps {
  scene: Scene;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({ scene }) => {
  const { updateCamera } = useGameStore();
  const camera = useCamera();
  const followDM = useFollowDM();
  const isHost = useIsHost();
  const activeScene = useActiveScene();
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });

  // Drawing state with selection support
  const [activeTool, setActiveTool] = useState<DrawingTool | MeasurementTool | 'select' | 'pan'>('select');
  const [drawingStyle, setDrawingStyle] = useState<DrawingStyle>({
    fillColor: '#ff0000',
    fillOpacity: 0.3,
    strokeColor: '#000000',
    strokeWidth: 2,
    strokeDashArray: undefined,
    visibleToPlayers: true,
    dmNotesOnly: false,
    aoeRadius: 20,
    coneLength: 15,
    dndSpellLevel: 1,
  });
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);

  // Update viewport size when container resizes
  useEffect(() => {
    const updateViewportSize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setViewportSize({ width: rect.width, height: rect.height });
      }
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  // WebSocket event handling for incoming drawings and camera sync
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      const message = event.detail;
      
      // Handle drawing synchronization events
      if (message.type === 'event' && message.data.name?.startsWith('drawing/')) {
        if (message.data.sceneId === scene.id) {
          console.log('Received drawing sync event:', message.data.name, message.data);
          // The event has already been processed by the game store
          // This is just for additional UI updates if needed
        }
      }
      
      // Handle camera synchronization for players following DM
      if (message.type === 'event' && message.data.name === 'camera/update') {
        if (message.data.sceneId === scene.id && !isHost && followDM) {
          console.log('Following DM camera update:', message.data.camera);
          // Camera update is handled by the game store
        }
      }
    };

    // Listen for WebSocket events
    webSocketService.addEventListener('message', handleWebSocketMessage);
    
    return () => {
      webSocketService.removeEventListener('message', handleWebSocketMessage);
    };
  }, [scene.id, isHost, followDM]);

  // Camera controls
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (activeTool !== 'pan' && activeTool !== 'select') return; // Only zoom when in pan/select mode
    if (!isHost && followDM) return; // Players can't zoom when following DM
    
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5.0, camera.zoom * zoomFactor));
    
    updateCamera({ zoom: newZoom });
    
    // Send camera update to other players if host
    if (isHost) {
      webSocketService.sendEvent({
        type: 'camera/update',
        data: {
          sceneId: scene.id,
          camera: { ...camera, zoom: newZoom },
        },
      });
    }
  }, [camera, updateCamera, isHost, followDM, activeTool, scene.id]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      if (activeTool === 'pan' || (activeTool === 'select' && e.altKey)) {
        if (!isHost && followDM) return; // Players can't pan when following DM
        
        setIsPanning(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
        e.stopPropagation();
      }
    }
  }, [isHost, followDM, activeTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      // Apply zoom scaling to movement
      const scaledDeltaX = deltaX / camera.zoom;
      const scaledDeltaY = deltaY / camera.zoom;
      
      updateCamera({
        x: camera.x - scaledDeltaX,
        y: camera.y - scaledDeltaY,
      });
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
      
      // Send camera update to other players if host
      if (isHost) {
        webSocketService.sendEvent({
          type: 'camera/update',
          data: {
            sceneId: scene.id,
            camera: {
              x: camera.x - scaledDeltaX,
              y: camera.y - scaledDeltaY,
              zoom: camera.zoom,
            },
          },
        });
      }
    }
  }, [isPanning, lastMousePos, camera, updateCamera, isHost, scene.id]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleStyleChange = useCallback((newStyle: Partial<DrawingStyle>) => {
    setDrawingStyle(prev => ({ ...prev, ...newStyle }));
  }, []);

  const handleSelectionChange = useCallback((newSelection: string[]) => {
    setSelectedDrawings(newSelection);
    console.log(`Selection changed: ${newSelection.length} drawing(s) selected`);
  }, []);

  // Calculate transform for the scene content
  const transform = `translate(${viewportSize.width / 2 - camera.x * camera.zoom}, ${viewportSize.height / 2 - camera.y * camera.zoom}) scale(${camera.zoom})`;

  // Grid snapping utility
  const snapToGrid = useCallback((x: number, y: number): { x: number; y: number } => {
    if (!scene.gridSettings.snapToGrid || !scene.gridSettings.enabled) {
      return { x, y };
    }
    
    const gridSize = scene.gridSettings.size;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }, [scene.gridSettings.snapToGrid, scene.gridSettings.enabled, scene.gridSettings.size]);

  // Determine cursor based on active tool and state
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (activeTool === 'pan') return 'grab';
    if (activeTool === 'select') return 'default';
    return 'crosshair';
  };

  return (
    <div className="scene-canvas-container">
      <svg
        ref={svgRef}
        className="scene-canvas"
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: getCursor() }}
      >
          <defs>
            {/* Define patterns and gradients here */}
            <pattern
              id={`grid-${scene.id}`}
              width={scene.gridSettings.size}
              height={scene.gridSettings.size}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${scene.gridSettings.size} 0 L 0 0 0 ${scene.gridSettings.size}`}
                fill="none"
                stroke={scene.gridSettings.color}
                strokeWidth="1"
                opacity={scene.gridSettings.opacity}
              />
            </pattern>
          </defs>

          <g className="scene-content" transform={transform}>
            {/* Background layer */}
            {scene.backgroundImage && (
              <SceneBackground 
                backgroundImage={scene.backgroundImage}
                sceneId={scene.id}
              />
            )}

            {/* Grid layer */}
            {scene.gridSettings.enabled && (
              <SceneGrid 
                scene={scene}
                viewportSize={viewportSize}
                camera={camera}
              />
            )}

            {/* Drawings layer */}
            <DrawingRenderer
              sceneId={scene.id}
              camera={camera}
              isHost={isHost}
            />

            {/* Drawing tools layer (interactive) */}
            <DrawingTools
              activeTool={activeTool}
              drawingStyle={drawingStyle}
              camera={camera}
              gridSize={scene.gridSettings.size}
              svgRef={svgRef}
              onSelectionChange={handleSelectionChange}
            />

            {/* Selection overlay */}
            <SelectionOverlay
              selectedDrawings={selectedDrawings}
              sceneId={scene.id}
              camera={camera}
              onClearSelection={() => setSelectedDrawings([])}
            />

            {/* Content layers will be added here (tokens, etc.) */}
          </g>

          {/* UI overlay elements (not affected by camera transform) */}
          <g className="ui-overlay">
            {/* Coordinate display for debugging */}
            {process.env.NODE_ENV === 'development' && (
              <text x="10" y="20" fill="white" fontSize="12">
                Camera: ({Math.round(camera.x)}, {Math.round(camera.y)}) Zoom: {camera.zoom.toFixed(2)}
              </text>
            )}
          </g>
        </svg>
    </div>
  );
};
