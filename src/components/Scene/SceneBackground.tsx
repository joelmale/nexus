import React from 'react';
import type { Scene } from '@/types/game';

interface SceneBackgroundProps {
  backgroundImage: NonNullable<Scene['backgroundImage']>;
  sceneId: string;
}

export const SceneBackground: React.FC<SceneBackgroundProps> = ({ 
  backgroundImage, 
  sceneId 
}) => {
  const { url, width, height, offsetX, offsetY, scale } = backgroundImage;

  return (
    <g className="scene-background">
      <image
        href={url}
        x={offsetX}
        y={offsetY}
        width={width * scale}
        height={height * scale}
        preserveAspectRatio="none"
        opacity={0.9}
      />
    </g>
  );
};
