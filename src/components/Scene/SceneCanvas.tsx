import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  useGameStore,
  useCamera,
  useFollowDM,
  useIsHost,
  useActiveTool,
} from '@/stores/gameStore';
import { SceneGrid } from './SceneGrid';
import { SceneBackground } from './SceneBackground';
import { DrawingTools } from './DrawingTools';
import { DrawingRenderer } from './DrawingRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { DrawingPropertiesPanel } from './DrawingPropertiesPanel';
import { TokenDropZone } from './TokenDropZone';
import { TokenRenderer } from './TokenRenderer';
import { webSocketService } from '@/utils/websocket';
import { tokenAssetManager } from '@/services/tokenAssets';
import { createPlacedToken } from '@/types/token';
import type { Scene, WebSocketMessage } from '@/types/game';
import type { Token } from '@/types/token';
import type {
  DrawingTool,
  DrawingStyle,
  MeasurementTool,
} from '@/types/drawing';

interface SceneCanvasProps {
  scene: Scene;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({ scene }) => {
  const { updateCamera, placeToken, moveToken, getSceneTokens, user } =
    useGameStore();
  const camera = useCamera();
  const followDM = useFollowDM();
  const isHost = useIsHost();
  const activeTool = useActiveTool() as
    | DrawingTool
    | MeasurementTool
    | 'select'
    | 'pan'
    | 'move'
    | 'copy'
    | 'cut'
    | 'paste'
    | 'mask-create'
    | 'mask-toggle'
    | 'mask-remove'
    | 'mask-show'
    | 'mask-hide'
    | 'grid-align';

  // Safe access to scene properties with defaults
  const safeGridSettings = useMemo(
    () =>
      scene.gridSettings || {
        enabled: true,
        size: 50,
        color: '#ffffff',
        opacity: 0.3,
        snapToGrid: true,
        showToPlayers: true,
      },
    [scene.gridSettings],
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [drawingStyle] = useState<DrawingStyle>({
    fillColor: '#ff0000',
    fillOpacity: 0.5,
    strokeColor: '#000000',
    strokeWidth: 5,
    strokeDashArray: undefined,
    visibleToPlayers: true,
    dmNotesOnly: false,
    aoeRadius: 20,
    coneLength: 15,
    dndSpellLevel: 1,
  });
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

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
    const handleWebSocketMessage = (event: Event) => {
      const customEvent = event as CustomEvent<WebSocketMessage>;
      const message = customEvent.detail;

      // Handle drawing synchronization events
      if (
        message.type === 'event' &&
        message.data.name?.startsWith('drawing/')
      ) {
        if (message.data.sceneId === scene.id) {
          console.log(
            'Received drawing sync event:',
            message.data.name,
            message.data,
          );
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
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (activeTool !== 'pan' && activeTool !== 'select') return; // Only zoom when in pan/select mode
      if (!isHost && followDM) return; // Players can't zoom when following DM

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
    },
    [camera, updateCamera, isHost, followDM, activeTool, scene.id],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        // Left mouse button
        if (activeTool === 'pan' || (activeTool === 'select' && e.altKey)) {
          if (!isHost && followDM) return; // Players can't pan when following DM

          setIsPanning(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          e.stopPropagation();
        }
      }
    },
    [isHost, followDM, activeTool],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [isPanning, lastMousePos, camera, updateCamera, isHost, scene.id],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Get tokens for this scene - must be defined before callbacks that use it
  const placedTokens = getSceneTokens(scene.id);

  const handleSelectionChange = useCallback(
    (
      newSelection: string[],
      selectionBox?: {
        start: { x: number; y: number };
        end: { x: number; y: number };
      },
    ) => {
      setSelectedDrawings(newSelection);

      // Also select tokens in the selection box if provided
      if (selectionBox) {
        const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
        const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
        const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
        const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

        const tokensInBox = placedTokens
          .filter(
            (token) =>
              token.x >= minX &&
              token.x <= maxX &&
              token.y >= minY &&
              token.y <= maxY,
          )
          .map((token) => token.id);

        setSelectedTokens(tokensInBox);
      }
    },
    [placedTokens],
  );

  const handleClosePropertiesPanel = useCallback(() => {
    setSelectedDrawings([]);
  }, []);

  // Token handlers
  const handleTokenDrop = useCallback(
    (token: Token, x: number, y: number) => {
      const placedToken = createPlacedToken(
        token,
        { x, y },
        scene.id,
        user.id,
        {
          visibleToPlayers: token.isPublic !== false,
        },
      );

      placeToken(scene.id, placedToken);

      // Broadcast over WebSocket
      webSocketService.sendEvent({
        type: 'token/place',
        data: {
          sceneId: scene.id,
          token: placedToken,
        },
      });

      console.log(`Token placed: ${token.name} at (${x}, ${y})`);
    },
    [scene.id, user.id, placeToken],
  );

  const handleTokenSelect = useCallback((tokenId: string, multi: boolean) => {
    setSelectedTokens((prev) => {
      if (multi) {
        return prev.includes(tokenId)
          ? prev.filter((id) => id !== tokenId)
          : [...prev, tokenId];
      }
      return [tokenId];
    });
  }, []);

  const handleTokenMove = useCallback(
    (tokenId: string, deltaX: number, deltaY: number) => {
      const tokens = getSceneTokens(scene.id);
      const token = tokens.find((t) => t.id === tokenId);
      if (!token) return;

      const newX = token.x + deltaX / camera.zoom;
      const newY = token.y + deltaY / camera.zoom;

      // Apply grid snapping if enabled
      let finalX = newX;
      let finalY = newY;
      if (safeGridSettings.snapToGrid && safeGridSettings.size > 0) {
        finalX =
          Math.round(newX / safeGridSettings.size) * safeGridSettings.size;
        finalY =
          Math.round(newY / safeGridSettings.size) * safeGridSettings.size;
      }

      moveToken(scene.id, tokenId, { x: finalX, y: finalY });

      // Broadcast over WebSocket
      webSocketService.sendEvent({
        type: 'token/move',
        data: {
          sceneId: scene.id,
          tokenId,
          position: { x: finalX, y: finalY },
        },
      });
    },
    [scene.id, camera.zoom, safeGridSettings, getSceneTokens, moveToken],
  );

  // Determine cursor based on active tool and state
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (activeTool === 'pan') return 'grab';
    if (activeTool === 'select') return 'default';
    if (activeTool === 'move') return 'move';
    return 'crosshair';
  };

  // Calculate transform for the scene content
  const transform = `translate(${viewportSize.width / 2 - camera.x * camera.zoom}, ${viewportSize.height / 2 - camera.y * camera.zoom}) scale(${camera.zoom})`;

  return (
    <div className="scene-canvas-container">
      {/* Drawing Properties Panel */}
      {selectedDrawings.length > 0 && (
        <DrawingPropertiesPanel
          selectedDrawingIds={selectedDrawings}
          sceneId={scene.id}
          onClose={handleClosePropertiesPanel}
        />
      )}

      <TokenDropZone
        sceneId={scene.id}
        camera={camera}
        gridSize={safeGridSettings.size}
        snapToGrid={safeGridSettings.snapToGrid}
        onTokenDrop={handleTokenDrop}
      >
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
              width={safeGridSettings.size}
              height={safeGridSettings.size}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${safeGridSettings.size} 0 L 0 0 0 ${safeGridSettings.size}`}
                fill="none"
                stroke={safeGridSettings.color}
                strokeWidth="1"
                opacity={safeGridSettings.opacity}
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
            {safeGridSettings.enabled && (
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

            {/* Tokens layer */}
            <g id="tokens-layer">
              {placedTokens.map((placedToken) => {
                const token = tokenAssetManager.getTokenById(
                  placedToken.tokenId,
                );
                if (!token) return null;

                // Filter by visibility
                if (!isHost && !placedToken.visibleToPlayers) return null;

                return (
                  <TokenRenderer
                    key={placedToken.id}
                    placedToken={placedToken}
                    token={token}
                    gridSize={safeGridSettings.size}
                    isSelected={selectedTokens.includes(placedToken.id)}
                    onSelect={handleTokenSelect}
                    onMove={handleTokenMove}
                    canEdit={isHost || placedToken.placedBy === user.id}
                  />
                );
              })}
            </g>

            {/* Drawing tools layer (interactive) */}
            <DrawingTools
              activeTool={activeTool}
              drawingStyle={drawingStyle}
              camera={camera}
              _gridSize={safeGridSettings.size}
              svgRef={svgRef}
              onSelectionChange={handleSelectionChange}
              snapToGrid={safeGridSettings.snapToGrid}
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
                Camera: ({Math.round(camera.x)}, {Math.round(camera.y)}) Zoom:{' '}
                {camera.zoom.toFixed(2)}
              </text>
            )}
          </g>
        </svg>
      </TokenDropZone>
    </div>
  );
};
