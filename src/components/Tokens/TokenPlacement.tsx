import React, { useCallback } from 'react';
import type { PlacedToken, Token } from '@/types/token';
import type { Camera } from '@/types/game';
import { useUser, useActiveScene } from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';
import { getTokenPixelSize } from '@/types/token';

interface TokenPlacementProps {
  activeTool: 'token-place' | string;
  selectedToken: Token | null;
  camera: Camera;
  gridSize: number;
  svgRef: React.RefObject<SVGSVGElement>;
  onTokenPlaced?: (token: PlacedToken) => void;
}

export const TokenPlacement: React.FC<TokenPlacementProps> = ({
  activeTool,
  selectedToken,
  camera,
  gridSize,
  svgRef,
  onTokenPlaced
}) => {
  const user = useUser();
  const activeScene = useActiveScene();

  const screenToScene = useCallback((screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = screenX - rect.left;
    const svgY = screenY - rect.top;
    
    const sceneX = (svgX - rect.width / 2) / camera.zoom + camera.x;
    const sceneY = (svgY - rect.height / 2) / camera.zoom + camera.y;
    
    return { x: sceneX, y: sceneY };
  }, [camera, svgRef]);

  const snapToGrid = useCallback((x: number, y: number) => {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }, [gridSize]);

  const placeToken = useCallback((position: { x: number; y: number }) => {
    if (!selectedToken || !activeScene) return;

    const snappedPosition = snapToGrid(position.x, position.y);
    
    const placedToken: PlacedToken = {
      id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tokenId: selectedToken.id,
      sceneId: activeScene.id,
      x: snappedPosition.x,
      y: snappedPosition.y,
      rotation: 0,
      scale: 1.0,
      layer: 'tokens',
      visibleToPlayers: true,
      dmNotesOnly: false,
      conditions: [],
      placedBy: user.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Sync via WebSocket
    webSocketService.sendEvent({
      type: 'token/place',
      data: {
        sceneId: activeScene.id,
        token: placedToken,
      },
    });

    onTokenPlaced?.(placedToken);
    console.log('Placed token:', placedToken);
  }, [selectedToken, activeScene, snapToGrid, user.id, onTokenPlaced]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'token-place' || !selectedToken) return;

    const scenePosition = screenToScene(e.clientX, e.clientY);
    placeToken(scenePosition);
    
    e.stopPropagation();
  }, [activeTool, selectedToken, screenToScene, placeToken]);

  if (activeTool !== 'token-place') {
    return null;
  }

  return (
    <g className="token-placement">
      <rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="transparent"
        onClick={handleCanvasClick}
        style={{ cursor: selectedToken ? 'crosshair' : 'default' }}
      />
    </g>
  );
};
