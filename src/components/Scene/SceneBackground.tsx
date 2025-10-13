import React from 'react';
import type { Scene } from '@/types/game';

interface SceneBackgroundProps {
  backgroundImage: NonNullable<Scene['backgroundImage']>;
  sceneId: string;
}

export const SceneBackground: React.FC<SceneBackgroundProps> = React.memo(
  ({ backgroundImage, sceneId: _sceneId }) => {
    const {
      url,
      width,
      height,
      offsetX = 0,
      offsetY = 0,
      scale = 1,
    } = backgroundImage;

    // Set reasonable defaults for background sizing
    const bgWidth = width || 1920;
    const bgHeight = height || 1080;
    const bgOffsetX = offsetX || -(bgWidth * scale) / 2;
    const bgOffsetY = offsetY || -(bgHeight * scale) / 2;

    // Debug log
    React.useEffect(() => {
      // SceneBackground rendering
    }, [url, bgWidth, bgHeight, bgOffsetX, bgOffsetY, scale]);

    // Handle error state
    const [imageError, setImageError] = React.useState(false);

    const handleImageError = (
      e: React.SyntheticEvent<SVGImageElement, Event>,
    ) => {
      console.error('🖼️ Image load error:', {
        url: url.substring(0, 100) + '...',
        error: e,
      });
      setImageError(true);
    };

    const handleImageLoad = () => {
      setImageError(false);
    };

    if (imageError) {
      return (
        <g className="scene-background">
          <rect
            x={bgOffsetX}
            y={bgOffsetY}
            width={bgWidth * scale}
            height={bgHeight * scale}
            fill="#1a1a2e"
            opacity={0.8}
          />
          <text x={0} y={0} fill="#ff6b6b" fontSize="24" textAnchor="middle">
            ⚠️ Failed to load background image
          </text>
        </g>
      );
    }

    return (
      <g className="scene-background">
        <image
          href={url}
          xlinkHref={url}
          x={bgOffsetX}
          y={bgOffsetY}
          width={bgWidth * scale}
          height={bgHeight * scale}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.9}
          onError={handleImageError}
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />
      </g>
    );
  },
);
