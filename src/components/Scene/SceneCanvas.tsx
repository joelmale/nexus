import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore, useCamera, useFollowDM, useIsHost } from '@/stores/gameStore';
import { SceneGrid } from './SceneGrid';
import { SceneBackground } from './SceneBackground';
import { CameraControls } from './CameraControls';
import type { Scene, Camera } from '@/types/game';

interface SceneCanvasProps {
  scene: Scene;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({ scene }) => {
  const { updateCamera } = useGameStore();
  const camera = useCamera();
  const followDM = useFollowDM();
  const isHost = useIsHost();
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });

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

  // Camera controls
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isHost && followDM) return; // Players can't zoom when following DM
    
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5.0, camera.zoom * zoomFactor));
    
    updateCamera({ zoom: newZoom });
    // TODO: Send camera update event to other players when implementing websocket integration
  }, [camera.zoom, updateCamera, isHost, followDM]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      if (!isHost && followDM) return; // Players can't pan when following DM
      
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isHost, followDM]);

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
      // TODO: Send camera update event to other players when implementing websocket integration
    }
  }, [isPanning, lastMousePos, camera, updateCamera]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
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
  }, [scene.gridSettings]);

  return (
    <div className="scene-canvas-container">
      <div className="scene-canvas-toolbar">
        <CameraControls 
          camera={camera}
          onCameraUpdate={updateCamera}
          canControl={isHost || !followDM}
        />
        
        {!isHost && (
          <div className="follow-dm-indicator">
            {followDM ? '👁 Following DM' : '🔓 Free Camera'}
          </div>
        )}
      </div>

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
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
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

          {/* Content layers will be added here (tokens, drawings, etc.) */}
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
