import React from 'react';
import type { Scene } from '@/types/game';

interface SceneBackgroundProps {
  backgroundImage: NonNullable<Scene['backgroundImage']>;
  sceneId: string;
}

export const SceneBackground: React.FC<SceneBackgroundProps> = ({ 
  backgroundImage, 
  sceneId: _sceneId 
}) => {
  const { url, width, height, offsetX = 0, offsetY = 0, scale = 1 } = backgroundImage;

  // Set reasonable defaults for background sizing
  const bgWidth = width || 1920;
  const bgHeight = height || 1080;
  const bgOffsetX = offsetX || -(bgWidth * scale) / 2;
  const bgOffsetY = offsetY || -(bgHeight * scale) / 2;

  return (
    <g className="scene-background">
      <image
        href={url}
        x={bgOffsetX}
        y={bgOffsetY}
        width={bgWidth * scale}
        height={bgHeight * scale}
        preserveAspectRatio="xMidYMid slice"
        opacity={0.9}
      />
    </g>
  );
};
