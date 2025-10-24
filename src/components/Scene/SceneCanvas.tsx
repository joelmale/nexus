import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useTransition,
} from 'react';
import {
  useGameStore,
  useCamera,
  useFollowDM,
  useIsHost,
  useActiveTool,
  useSceneState,
  useSceneDrawings,
  useServerRoomCode,
} from '@/stores/gameStore';
import { SceneGrid } from './SceneGrid';
import { SceneBackground } from './SceneBackground';
import { DrawingTools } from './DrawingTools';
import { RemoteCursors } from './RemoteCursors';
import { DrawingRenderer } from './DrawingRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { DrawingPropertiesPanel } from './DrawingPropertiesPanel';
import { TokenDropZone } from './TokenDropZone';
import { TokenRenderer } from './TokenRenderer';
import { TokenToolbar } from '../Tokens/TokenToolbar';
import { CanvasErrorBoundary, TokenErrorBoundary } from '../ErrorBoundary';
import { webSocketService } from '@/utils/websocket';
import { tokenAssetManager } from '@/services/tokenAssets';
import { createPlacedToken, getTokenPixelSize } from '@/types/token';
import { useTokenStore, useSelectedToken } from '@/stores/tokenStore';
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
  const {
    updateCamera,
    placeToken,
    moveTokenOptimistic,
    getSceneTokens,
    user,
    setSelection,
    addToSelection,
    clearSelection,
  } = useGameStore();
  const { selectToken } = useTokenStore();
  const selectedToken = useSelectedToken();
  const { selectedObjectIds } = useSceneState();
  const camera = useCamera();
  const followDM = useFollowDM();
  const isHost = useIsHost();
  const activeTool = useActiveTool() as
    | DrawingTool
    | MeasurementTool
    | 'pan'
    | 'move'
    | 'select'
    | 'eraser'
    | 'ping'
    | 'polygon'
    | 'pencil'
    | 'mask-create'
    | 'mask-toggle'
    | 'mask-remove'
    | 'mask-show'
    | 'mask-hide'
    | 'grid-align';

  const [, startSelectionTransition] = useTransition();
  const roomCode = useServerRoomCode();

  // Debug log for background image
  useEffect(() => {}, [scene.id, scene.name, scene.backgroundImage]);

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

  const drawings = useSceneDrawings(scene.id);

  const selectedDrawingIds = useMemo(() => {
    const drawingIds = new Set(drawings.map((d) => d.id));
    return selectedObjectIds.filter((id) => drawingIds.has(id));
  }, [selectedObjectIds, drawings]);

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
          // The event has already been processed by the game store
          // This is just for additional UI updates if needed
        }
      }

      // Handle camera synchronization for players following DM
      if (message.type === 'event' && message.data.name === 'camera/update') {
        if (message.data.sceneId === scene.id && !isHost && followDM) {
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

  const handleClosePropertiesPanel = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Token handlers
  const handleTokenDrop = useCallback(
    (token: Token, x: number, y: number) => {
      const placedToken = createPlacedToken(
        token,
        { x, y },
        scene.id,
        roomCode || '',
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
    },
    [scene.id, user.id, placeToken, roomCode],
  );

  const handleTokenSelect = useCallback(
    (tokenId: string, multi: boolean) => {
      if (multi) {
        // Urgent: Update selection immediately for visual feedback
        addToSelection([tokenId]);
        // For multi-select, we don't update token toolbar selection
      } else {
        // Urgent: Update selection immediately for visual feedback
        setSelection([tokenId]);
        // Non-urgent: Update token store selection for toolbar
        startSelectionTransition(() => {
          selectToken(tokenId);
        });
      }
    },
    [addToSelection, setSelection, startSelectionTransition, selectToken],
  );

  const handleTokenMove = useCallback(
    (tokenId: string, deltaX: number, deltaY: number) => {
      const tokens = getSceneTokens(scene.id);
      const token = tokens.find((t) => t.id === tokenId);
      if (!token) return;

      const newX = token.x + deltaX / camera.zoom;
      const newY = token.y + deltaY / camera.zoom;

      // Optimistic update - move locally first, then send to server
      moveTokenOptimistic(scene.id, tokenId, { x: newX, y: newY });
    },
    [scene.id, camera.zoom, getSceneTokens, moveTokenOptimistic],
  );

  const handleTokenMoveEnd = useCallback(
    (tokenId: string) => {
      // Apply grid snapping when drag ends
      if (safeGridSettings.snapToGrid && safeGridSettings.size > 0) {
        const tokens = getSceneTokens(scene.id);
        const token = tokens.find((t) => t.id === tokenId);
        if (!token) return;

        const snappedX =
          Math.round(token.x / safeGridSettings.size) * safeGridSettings.size;
        const snappedY =
          Math.round(token.y / safeGridSettings.size) * safeGridSettings.size;

        // Only update if position changed after snapping
        if (snappedX !== token.x || snappedY !== token.y) {
          moveTokenOptimistic(scene.id, tokenId, { x: snappedX, y: snappedY });
        }
      }
    },
    [scene.id, safeGridSettings, getSceneTokens, moveTokenOptimistic],
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

  // Calculate toolbar position for selected token
  const getToolbarPosition = useCallback(() => {
    if (!selectedToken) return { x: 0, y: 0 };

    // Find the placed token data
    const placedToken = placedTokens.find((pt) => pt.id === selectedToken.id);
    if (!placedToken) return { x: 0, y: 0 };

    // Calculate screen position: apply camera transform to token position
    const screenX =
      viewportSize.width / 2 + (placedToken.x - camera.x) * camera.zoom;
    const screenY =
      viewportSize.height / 2 + (placedToken.y - camera.y) * camera.zoom;

    // Position toolbar above and to the right of the token
    const tokenSize =
      getTokenPixelSize(
        tokenAssetManager.getTokenById(placedToken.tokenId)?.size || 'medium',
        safeGridSettings.size,
      ) *
      placedToken.scale *
      camera.zoom;

    return {
      x: screenX + tokenSize / 2 + 10, // 10px offset from token edge
      y: screenY - tokenSize / 2 - 10, // Above the token
    };
  }, [
    selectedToken,
    placedTokens,
    camera,
    viewportSize,
    safeGridSettings.size,
  ]);

  return (
    <CanvasErrorBoundary>
      <div className="scene-canvas-container">
        {/* Drawing Properties Panel */}
        {selectedDrawingIds.length > 0 && (
          <DrawingPropertiesPanel
            selectedDrawingIds={selectedDrawingIds}
            sceneId={scene.id}
            onClose={handleClosePropertiesPanel}
          />
        )}

        {/* Token Toolbar */}
        {selectedToken && <TokenToolbar position={getToolbarPosition()} />}

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
              <TokenErrorBoundary>
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
                        isSelected={selectedObjectIds.includes(placedToken.id)}
                        onSelect={handleTokenSelect}
                        onMove={handleTokenMove}
                        onMoveEnd={handleTokenMoveEnd}
                        canEdit={isHost || placedToken.placedBy === user.id}
                      />
                    );
                  })}
                </g>
              </TokenErrorBoundary>

              {/* Drawing tools layer (interactive) */}
              <DrawingTools
                activeTool={activeTool}
                drawingStyle={drawingStyle}
                camera={camera}
                _gridSize={safeGridSettings.size}
                svgRef={svgRef as React.RefObject<SVGSVGElement>}
                snapToGrid={safeGridSettings.snapToGrid}
                selectedObjectIds={selectedObjectIds}
                setSelection={setSelection}
                clearSelection={clearSelection}
                placedTokens={placedTokens}
              />

              {/* Selection overlay */}
              <SelectionOverlay
                selectedDrawings={selectedObjectIds}
                sceneId={scene.id}
                camera={camera}
                onClearSelection={clearSelection}
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

        {/* Remote cursors overlay */}
        <RemoteCursors sceneId={scene.id} />
      </div>
    </CanvasErrorBoundary>
  );
};
