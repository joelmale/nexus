import React from 'react';
import type { Scene, Camera } from '@/types/game';

interface SceneGridProps {
  scene: Scene;
  viewportSize: { width: number; height: number };
  camera: Camera;
}

export const SceneGrid: React.FC<SceneGridProps> = ({ scene, viewportSize, camera }) => {
  const { gridSettings } = scene;
  
  if (!gridSettings.enabled) return null;

  // Calculate the grid bounds based on camera position and zoom
  const gridSize = gridSettings.size;
  const zoom = camera.zoom;
  
  // Calculate visible area in world coordinates
  const worldWidth = viewportSize.width / zoom;
  const worldHeight = viewportSize.height / zoom;
  
  const worldLeft = camera.x - worldWidth / 2;
  const worldTop = camera.y - worldHeight / 2;
  const worldRight = camera.x + worldWidth / 2;
  const worldBottom = camera.y + worldHeight / 2;
  
  // Extend the grid slightly beyond visible area for smooth panning
  const padding = gridSize * 2;
  const gridLeft = Math.floor((worldLeft - padding) / gridSize) * gridSize;
  const gridTop = Math.floor((worldTop - padding) / gridSize) * gridSize;
  const gridRight = Math.ceil((worldRight + padding) / gridSize) * gridSize;
  const gridBottom = Math.ceil((worldBottom + padding) / gridSize) * gridSize;

  // Generate grid lines
  const verticalLines = [];
  const horizontalLines = [];

  // Vertical lines
  for (let x = gridLeft; x <= gridRight; x += gridSize) {
    verticalLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={gridTop}
        x2={x}
        y2={gridBottom}
        stroke={gridSettings.color}
        strokeWidth={1 / zoom} // Scale line width with zoom
        opacity={gridSettings.opacity}
      />
    );
  }

  // Horizontal lines
  for (let y = gridTop; y <= gridBottom; y += gridSize) {
    horizontalLines.push(
      <line
        key={`h-${y}`}
        x1={gridLeft}
        y1={y}
        x2={gridRight}
        y2={y}
        stroke={gridSettings.color}
        strokeWidth={1 / zoom} // Scale line width with zoom
        opacity={gridSettings.opacity}
      />
    );
  }

  return (
    <g className="scene-grid">
      {verticalLines}
      {horizontalLines}
    </g>
  );
};
