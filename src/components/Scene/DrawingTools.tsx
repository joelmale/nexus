import React, { useCallback, useState, useEffect } from 'react';
import {
  type Point,
  type Drawing,
  type DrawingStyle,
  type DrawingTool,
} from '@/types/drawing';
import type { Camera, PlacedToken } from '@/types/game';
import {
  useUser,
  useActiveScene,
  useDrawingActions,
  useGameStore,
} from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';
import { clipboardService } from '@/services/clipboardService';
import {
  distance,
  isPointNearLine,
  isPointInRectangle,
  isPointInPolygon,
  isPointInCircle,
  gridSnap,
} from '@/utils/mathUtils';

interface DrawingToolsProps {
  activeTool:
    | DrawingTool
    | 'select'
    | 'pan'
    | 'measure'
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
  drawingStyle: DrawingStyle;
  camera: Camera;
  _gridSize: number;
  svgRef: React.RefObject<SVGSVGElement>;
  snapToGrid?: boolean;
  selectedObjectIds: string[];
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  placedTokens: PlacedToken[];
}

export const DrawingTools: React.FC<DrawingToolsProps> = ({
  activeTool,
  drawingStyle,
  camera,
  _gridSize,
  svgRef,
  snapToGrid: shouldSnapToGrid = false,
  selectedObjectIds,
  setSelection,
  clearSelection,
  placedTokens,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [pencilPath, setPencilPath] = useState<Point[]>([]);

  const [isErasing, setIsErasing] = useState(false);
  const eraserRadius = 20;
  const [selectionBox, setSelectionBox] = useState<{
    start: Point;
    end: Point;
  } | null>(null);

  const user = useUser();
  const activeScene = useActiveScene();
  const { createDrawing, deleteDrawing, updateDrawing } = useDrawingActions();
  const updateScene = useGameStore((state) => state.updateScene);
  const isHost = user.type === 'host';

  // Convert screen coordinates to scene coordinates
  const screenToScene = useCallback(
    (
      screenX: number,
      screenY: number,
      applySnap: boolean = shouldSnapToGrid,
    ): Point => {
      if (!svgRef.current) return { x: 0, y: 0 };

      const rect = svgRef.current.getBoundingClientRect();
      const svgX = screenX - rect.left;
      const svgY = screenY - rect.top;

      let sceneX = (svgX - rect.width / 2) / camera.zoom + camera.x;
      let sceneY = (svgY - rect.height / 2) / camera.zoom + camera.y;

      // Apply grid snapping if enabled
      if (applySnap && _gridSize > 0) {
        const snapped = gridSnap({ x: sceneX, y: sceneY }, _gridSize);
        sceneX = snapped.x;
        sceneY = snapped.y;
      }

      return { x: sceneX, y: sceneY };
    },
    [camera, svgRef, shouldSnapToGrid, _gridSize],
  );

  // Create and sync a drawing
  const createAndSyncDrawing = useCallback(
    (drawing: Drawing) => {
      if (!activeScene) return;

      createDrawing(activeScene.id, drawing);

      webSocketService.sendEvent({
        type: 'drawing/create',
        data: {
          sceneId: activeScene.id,
          drawing,
        },
      });

      console.log(`Created ${drawing.type} drawing`, drawing);
    },
    [activeScene, createDrawing],
  );

  // Delete and sync drawing removal
  const deleteAndSyncDrawing = useCallback(
    (drawingId: string) => {
      if (!activeScene) return;

      deleteDrawing(activeScene.id, drawingId);

      webSocketService.sendEvent({
        type: 'drawing/delete',
        data: {
          sceneId: activeScene.id,
          drawingId,
        },
      });

      console.log(`Deleted drawing: ${drawingId}`);
    },
    [activeScene, deleteDrawing],
  );

  // Handle copy/cut/paste operations
  const handleCopy = useCallback(() => {
    if (!activeScene || selectedObjectIds.length === 0) return;

    const drawingsToCopy = activeScene.drawings.filter((d) =>
      selectedObjectIds.includes(d.id),
    );
    clipboardService.copy(drawingsToCopy);
  }, [activeScene, selectedObjectIds]);

  const handleCut = useCallback(() => {
    if (!activeScene || selectedObjectIds.length === 0) return;

    const drawingsToCopy = activeScene.drawings.filter((d) =>
      selectedObjectIds.includes(d.id),
    );
    clipboardService.copy(drawingsToCopy);

    // Delete the selected drawings
    selectedObjectIds.forEach((drawingId) => {
      deleteAndSyncDrawing(drawingId);
    });

    clearSelection();
  }, [activeScene, selectedObjectIds, deleteAndSyncDrawing, clearSelection]);

  const handlePaste = useCallback(() => {
    if (!activeScene) return;

    const pastedDrawings = clipboardService.paste();
    pastedDrawings.forEach((drawing) => {
      createAndSyncDrawing(drawing);
    });

    // Select the newly pasted drawings
    const pastedIds = pastedDrawings.map((d) => d.id);
    setSelection(pastedIds);
  }, [activeScene, createAndSyncDrawing, setSelection]);

  // Keyboard shortcuts for copy/cut/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        handleCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handleCut, handlePaste]);

  // Handle activeTool changes for copy/cut/paste
  useEffect(() => {
    if (activeTool === 'copy') {
      handleCopy();
      // Switch back to select tool after copying
      const { setActiveTool } = useGameStore.getState();
      setActiveTool('select');
    } else if (activeTool === 'cut') {
      handleCut();
      // Switch back to select tool after cutting
      const { setActiveTool } = useGameStore.getState();
      setActiveTool('select');
    } else if (activeTool === 'paste') {
      handlePaste();
      // Switch back to select tool after pasting
      const { setActiveTool } = useGameStore.getState();
      setActiveTool('select');
    }
  }, [activeTool, handleCopy, handleCut, handlePaste]);

  // Get drawings that intersect with a point (for eraser and selection)
  const getDrawingsAtPoint = useCallback(
    (point: Point, radius: number = 5): string[] => {
      if (!activeScene) return [];

      const intersectedDrawings: string[] = [];

      activeScene.drawings.forEach((drawing) => {
        // Filter: non-hosts can only select their own drawings
        if (!isHost && drawing.createdBy !== user.id) {
          return;
        }

        let intersects = false;

        switch (drawing.type) {
          case 'line': {
            intersects = isPointNearLine(
              point,
              drawing.start,
              drawing.end,
              radius,
            );
            break;
          }
          case 'rectangle': {
            intersects = isPointInRectangle(
              point,
              {
                x: drawing.x,
                y: drawing.y,
                width: drawing.width,
                height: drawing.height,
              },
              radius,
            );
            break;
          }
          case 'circle': {
            intersects = isPointInCircle(
              point,
              drawing.center,
              drawing.radius + radius,
            );
            break;
          }
          case 'pencil': {
            intersects = drawing.points.some((p) =>
              isPointInCircle(point, p, radius),
            );
            break;
          }
          case 'polygon': {
            intersects =
              isPointInPolygon(point, drawing.points) ||
              drawing.points.some((p) => isPointInCircle(point, p, radius));
            break;
          }
          case 'cone': {
            // Check if point is within the cone's bounding area
            const dx = point.x - drawing.origin.x;
            const dy = point.y - drawing.origin.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if click is within the cone's area
            if (distance <= drawing.length + radius) {
              const clickAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
              const angleDiff = Math.abs(
                ((clickAngle - drawing.direction + 180) % 360) - 180,
              );
              const halfConeAngle = drawing.angle / 2;
              intersects = angleDiff <= halfConeAngle + 30; // Add 30° tolerance
            }
            break;
          }
          case 'text':
          case 'ping': {
            // Check if point is near the text/ping position
            intersects = isPointInCircle(point, drawing.position, radius + 15);
            break;
          }
          case 'fog-of-war': {
            intersects =
              isPointInPolygon(point, drawing.area) ||
              drawing.area.some((p) => isPointInCircle(point, p, radius));
            break;
          }
          default:
            break;
        }

        if (intersects) {
          intersectedDrawings.push(drawing.id);
        }
      });

      return intersectedDrawings;
    },
    [activeScene, isHost, user.id],
  );

  // Get drawings in selection box
  const getDrawingsInSelection = useCallback(
    (start: Point, end: Point): string[] => {
      if (!activeScene) return [];

      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);

      return activeScene.drawings
        .filter((drawing) => {
          switch (drawing.type) {
            case 'line':
              return (
                (drawing.start.x >= minX &&
                  drawing.start.x <= maxX &&
                  drawing.start.y >= minY &&
                  drawing.start.y <= maxY) ||
                (drawing.end.x >= minX &&
                  drawing.end.x <= maxX &&
                  drawing.end.y >= minY &&
                  drawing.end.y <= maxY)
              );
            case 'rectangle':
              return !(
                drawing.x + drawing.width < minX ||
                drawing.x > maxX ||
                drawing.y + drawing.height < minY ||
                drawing.y > maxY
              );
            case 'circle':
              return (
                drawing.center.x >= minX &&
                drawing.center.x <= maxX &&
                drawing.center.y >= minY &&
                drawing.center.y <= maxY
              );
            case 'pencil':
              return drawing.points.some(
                (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY,
              );
            case 'polygon':
              return drawing.points.some(
                (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY,
              );
            case 'cone': {
              // Check if cone origin is in selection box
              const originInBox =
                drawing.origin.x >= minX &&
                drawing.origin.x <= maxX &&
                drawing.origin.y >= minY &&
                drawing.origin.y <= maxY;

              // Also check if cone's end point is in selection box
              const directionRad = (drawing.direction * Math.PI) / 180;
              const endX =
                drawing.origin.x + Math.cos(directionRad) * drawing.length;
              const endY =
                drawing.origin.y + Math.sin(directionRad) * drawing.length;
              const endInBox =
                endX >= minX && endX <= maxX && endY >= minY && endY <= maxY;

              return originInBox || endInBox;
            }
            case 'text':
            case 'ping':
              return (
                drawing.position.x >= minX &&
                drawing.position.x <= maxX &&
                drawing.position.y >= minY &&
                drawing.position.y <= maxY
              );
            default:
              return false;
          }
        })
        .map((d) => d.id);
    },
    [activeScene],
  );

  // Handle mouse down for all tools
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      const point = screenToScene(e.clientX, e.clientY);

      // Tools that don't interact with mousedown can be handled with an early return.
      if (activeTool === 'pan' || activeTool === 'move') {
        return;
      }

      // Measure tool - start measuring
      if (activeTool === 'measure') {
        setStartPoint(point);
        setCurrentPoint(point);
        setIsDrawing(true);
        return;
      }

      const defaultHandler = () => {
        setStartPoint(point);
        setCurrentPoint(point);
        setIsDrawing(true);
      };

      const mouseDownHandlers: {
        [key: string]: (event: React.MouseEvent) => void;
      } = {
        select: (event) => {
          const drawingsAtPoint = getDrawingsAtPoint(point, 25);
          const isMultiSelectModifier =
            event.shiftKey || event.metaKey || event.ctrlKey;

          const drawingAtPoint = drawingsAtPoint[0];
          if (drawingAtPoint) {
            // Clicking on an object
            if (isMultiSelectModifier) {
              // Shift+click or Cmd/Ctrl+click: Add/remove from selection
              const newSelection = selectedObjectIds.includes(drawingAtPoint)
                ? selectedObjectIds.filter((id) => id !== drawingAtPoint)
                : [...selectedObjectIds, drawingAtPoint];
              setSelection(newSelection);
            } else {
              // Regular click: Select this object (or keep selection if already selected)
              // If clicking on an already-selected object, don't change selection
              // (this allows dragging to work via SelectionOverlay)
              if (!selectedObjectIds.includes(drawingAtPoint)) {
                setSelection([drawingAtPoint]);
              }
              // Don't call defaultHandler - let SelectionOverlay handle dragging
              return;
            }
          } else {
            // Clicking on empty space
            if (event.shiftKey) {
              // Shift+drag on empty space: Start selection box
              setSelectionBox({ start: point, end: point });
              setIsDrawing(true);
              setStartPoint(point);
              setCurrentPoint(point);
            } else {
              // Regular click on empty space: Clear selection
              clearSelection();
            }
          }
        },
        ping: () => {
          // Create a ping that auto-fades after 3 seconds
          const now = Date.now();
          const ping: Drawing = {
            id: `ping-${now}-${Math.random()}`,
            type: 'ping',
            position: point,
            playerId: user.id,
            playerName: user.name,
            timestamp: now,
            duration: 3000,
            style: drawingStyle,
            layer: 'overlay',
            createdAt: now,
            updatedAt: now,
            createdBy: user.id,
          };

          createAndSyncDrawing(ping);

          // Auto-remove after duration (3000ms)
          setTimeout(() => {
            if (activeScene) {
              deleteDrawing(activeScene.id, ping.id);
              // Sync deletion
              webSocketService.sendEvent({
                type: 'drawing/delete',
                data: {
                  sceneId: activeScene.id,
                  drawingId: ping.id,
                },
              });
            }
          }, 3000);
        },
        note: () => {
          // For now, create a text drawing prompt
          const noteText = prompt('Enter note text:');
          if (noteText && noteText.trim()) {
            const now = Date.now();
            const note: Drawing = {
              id: `note-${now}-${Math.random()}`,
              type: 'text',
              position: point,
              text: noteText.trim(),
              fontSize: 16,
              fontFamily: 'Arial, sans-serif',
              style: drawingStyle,
              layer: 'overlay',
              createdAt: now,
              updatedAt: now,
              createdBy: user.id,
            };
            createAndSyncDrawing(note);
          }
        },
        eraser: () => {
          setIsErasing(true);
          const drawingsToErase = getDrawingsAtPoint(point, eraserRadius);
          drawingsToErase.forEach((id) => deleteAndSyncDrawing(id));
          setStartPoint(point);
        },
        polygon: () => {
          setPolygonPoints((prev) => [...prev, point]);
        },
        pencil: () => {
          setPencilPath([point]);
          setIsDrawing(true);
        },
        'mask-create': () => {
          // Mask-create works like polygon - click to add points, double-click or Escape to finish
          setPolygonPoints((prev) => [...prev, point]);
        },
        'mask-toggle': () => {
          // Toggle the revealed state of the clicked fog mask
          const drawingsAtPoint = getDrawingsAtPoint(point, 25);
          const fogMask = activeScene?.drawings.find(
            (d) => d.type === 'fog-of-war' && drawingsAtPoint.includes(d.id),
          );

          if (fogMask && fogMask.type === 'fog-of-war' && activeScene) {
            const newRevealed = !fogMask.revealed;
            updateDrawing(activeScene.id, fogMask.id, {
              revealed: newRevealed,
            });

            // Sync the update
            webSocketService.sendEvent({
              type: 'drawing/update',
              data: {
                sceneId: activeScene.id,
                drawingId: fogMask.id,
                updates: { revealed: newRevealed },
              },
            });

            console.log(
              `🌫️ Toggled fog mask ${fogMask.id}: revealed=${newRevealed}`,
            );
          }
        },
        'mask-remove': () => {
          // Remove the clicked fog mask
          const drawingsAtPoint = getDrawingsAtPoint(point, 25);
          const fogMask = activeScene?.drawings.find(
            (d) => d.type === 'fog-of-war' && drawingsAtPoint.includes(d.id),
          );

          if (fogMask && activeScene) {
            if (window.confirm('Remove this fog mask?')) {
              deleteAndSyncDrawing(fogMask.id);
              console.log(`🧽 Removed fog mask ${fogMask.id}`);
            }
          }
        },
        'mask-show': () => {
          // Reveal all fog masks on the scene
          if (!activeScene) return;

          const fogMasks = activeScene.drawings.filter(
            (d) => d.type === 'fog-of-war',
          );

          if (fogMasks.length === 0) {
            alert('No fog masks found on this scene.');
            return;
          }

          fogMasks.forEach((mask) => {
            if (mask.type === 'fog-of-war' && !mask.revealed) {
              updateDrawing(activeScene.id, mask.id, { revealed: true });

              // Sync the update
              webSocketService.sendEvent({
                type: 'drawing/update',
                data: {
                  sceneId: activeScene.id,
                  drawingId: mask.id,
                  updates: { revealed: true },
                },
              });
            }
          });

          console.log(`👁 Revealed ${fogMasks.length} fog mask(s)`);
        },
        'mask-hide': () => {
          // Hide all fog masks on the scene
          if (!activeScene) return;

          const fogMasks = activeScene.drawings.filter(
            (d) => d.type === 'fog-of-war',
          );

          if (fogMasks.length === 0) {
            alert('No fog masks found on this scene.');
            return;
          }

          fogMasks.forEach((mask) => {
            if (mask.type === 'fog-of-war' && mask.revealed) {
              updateDrawing(activeScene.id, mask.id, { revealed: false });

              // Sync the update
              webSocketService.sendEvent({
                type: 'drawing/update',
                data: {
                  sceneId: activeScene.id,
                  drawingId: mask.id,
                  updates: { revealed: false },
                },
              });
            }
          });

          console.log(`🙈 Hid ${fogMasks.length} fog mask(s)`);
        },
        'grid-align': () => {
          // Set the clicked point as the new grid origin
          if (!activeScene) return;

          if (!activeScene.gridSettings?.enabled) {
            alert(
              'Please enable the grid first in Scene Settings before aligning it.',
            );
            return;
          }

          // Calculate grid offset - we want the clicked point to be a grid intersection
          // So we find the remainder when dividing by grid size
          const gridSize = activeScene.gridSettings?.size || 50;
          const offsetX = point.x % gridSize;
          const offsetY = point.y % gridSize;

          // Update scene grid settings
          updateScene(activeScene.id, {
            gridSettings: {
              ...activeScene.gridSettings,
              offsetX,
              offsetY,
            },
          });

          // Sync the update
          webSocketService.sendEvent({
            type: 'scene/update',
            data: {
              sceneId: activeScene.id,
              updates: {
                gridSettings: {
                  ...activeScene.gridSettings,
                  offsetX,
                  offsetY,
                },
              },
            },
          });

          console.log(
            `📐 Grid aligned! Click point: (${point.x.toFixed(0)}, ${point.y.toFixed(0)}), Grid offset: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`,
          );

          // Show visual feedback
          const notification = document.createElement('div');
          notification.textContent = '✓ Grid aligned to this point';
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 188, 212, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
          `;
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 2000);
        },
      };

      const handler = mouseDownHandlers[activeTool] || defaultHandler;
      handler(e);

      e.stopPropagation();
    },
    [
      activeTool,
      screenToScene,
      selectedObjectIds,
      setSelection,
      clearSelection,
      getDrawingsAtPoint,
      deleteAndSyncDrawing,
      eraserRadius,
      activeScene,
      createAndSyncDrawing,
      deleteDrawing,
      drawingStyle,
      user.id,
      user.name,
      updateDrawing,
      updateScene,
    ],
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === 'pan') return;

      const point = screenToScene(e.clientX, e.clientY);

      // Measure tool - update measurement line
      if (activeTool === 'measure' && isDrawing && startPoint) {
        setCurrentPoint(point);
        return;
      }

      const defaultHandler = () => {
        if (isDrawing) {
          setCurrentPoint(point);
        }
      };

      const mouseMoveHandlers: { [key: string]: () => void } = {
        select: () => {
          if (isDrawing && selectionBox) {
            setSelectionBox({ start: selectionBox.start, end: point });
            setCurrentPoint(point);
          }
        },
        eraser: () => {
          if (isErasing) {
            const drawingsToErase = getDrawingsAtPoint(point, eraserRadius);
            drawingsToErase.forEach((id) => deleteAndSyncDrawing(id));
          }
        },
        pencil: () => {
          if (isDrawing) {
            setPencilPath((prev) => [...prev, point]);
          }
        },
        polygon: () => {
          setCurrentPoint(point);
        },
        'mask-create': () => {
          setCurrentPoint(point);
        },
      };

      const handler = mouseMoveHandlers[activeTool] || defaultHandler;
      handler();

      e.stopPropagation();
    },
    [
      activeTool,
      screenToScene,
      isDrawing,
      startPoint,
      isErasing,
      selectionBox,
      getDrawingsAtPoint,
      deleteAndSyncDrawing,
      eraserRadius,
    ],
  );

  // Handle mouse up with drawing creation logic
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const endPoint = screenToScene(e.clientX, e.clientY);

      switch (activeTool) {
        case 'select': {
          if (selectionBox) {
            const drawingIds = getDrawingsInSelection(
              selectionBox.start,
              selectionBox.end,
            );

            const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
            const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
            const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
            const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

            const tokenIds = placedTokens
              .filter(
                (token) =>
                  token.x >= minX &&
                  token.x <= maxX &&
                  token.y >= minY &&
                  token.y <= maxY,
              )
              .map((token) => token.id);

            setSelection([...drawingIds, ...tokenIds]);
            setSelectionBox(null);
          }
          setIsDrawing(false);
          break;
        }

        case 'eraser': {
          setIsErasing(false);
          break;
        }

        default: {
          if (!isDrawing || !startPoint || activeTool === 'polygon') return;

          const baseDrawing = {
            id: `drawing-${Date.now()}-${user.id}`,
            style: drawingStyle,
            layer:
              drawingStyle.dmNotesOnly || !drawingStyle.visibleToPlayers
                ? 'dm-only'
                : 'effects',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: user.id,
          } as const;

          // A dispatch table is a cleaner and more scalable alternative to a large switch statement.
          const drawingCreators: { [key in DrawingTool]?: () => Drawing } = {
            line: () => ({
              ...baseDrawing,
              type: 'line',
              start: startPoint,
              end: endPoint,
            }),
            rectangle: () => ({
              ...baseDrawing,
              type: 'rectangle',
              x: Math.min(startPoint.x, endPoint.x),
              y: Math.min(startPoint.y, endPoint.y),
              width: Math.abs(endPoint.x - startPoint.x),
              height: Math.abs(endPoint.y - startPoint.y),
            }),
            circle: () => {
              const radius = distance(startPoint, endPoint);
              return {
                ...baseDrawing,
                type: 'circle',
                center: startPoint,
                radius,
              };
            },
            cone: () => {
              const rawLength = distance(startPoint, endPoint);
              // Snap to 5ft increments (1 grid square = 5ft)
              const snappedLength =
                Math.round(rawLength / _gridSize) * _gridSize;
              const length = Math.max(_gridSize, snappedLength); // Minimum 5ft

              const direction =
                (Math.atan2(
                  endPoint.y - startPoint.y,
                  endPoint.x - startPoint.x,
                ) *
                  180) /
                Math.PI;
              return {
                ...baseDrawing,
                type: 'cone',
                origin: startPoint,
                direction,
                length,
                angle: 53.13, // D&D 5e cone: equilateral triangle, width = distance from origin
              };
            },
            pencil: () => ({
              ...baseDrawing,
              type: 'pencil',
              points: pencilPath,
            }),
          };

          const createDrawingFunc = drawingCreators[activeTool as DrawingTool];

          if (createDrawingFunc) {
            const drawing = createDrawingFunc();
            createAndSyncDrawing(drawing);
          } else {
            // If no creator function is found for the active tool, do nothing.
            console.warn(`No drawing creator found for tool: ${activeTool}`);
          }
          break;
        }
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
      setPencilPath([]);

      e.stopPropagation();
    },
    [
      activeTool,
      screenToScene,
      isDrawing,
      startPoint,
      selectionBox,
      getDrawingsInSelection,
      setSelection,
      drawingStyle,
      placedTokens,
      user.id,
      createAndSyncDrawing,
      pencilPath,
      _gridSize,
    ],
  );

  // Handle polygon completion (also used for mask-create)
  const handlePolygonComplete = useCallback(
    (e: React.MouseEvent) => {
      if (
        (activeTool !== 'polygon' && activeTool !== 'mask-create') ||
        polygonPoints.length < 3
      )
        return;

      if (e.type === 'dblclick' || e.button === 2) {
        if (activeTool === 'mask-create') {
          // Create fog-of-war drawing
          const drawing: Drawing = {
            id: `fog-${Date.now()}-${user.id}`,
            type: 'fog-of-war',
            style: {
              ...drawingStyle,
              fillColor: '#000000',
              fillOpacity: 0.8,
              strokeColor: '#666666',
              strokeWidth: 2,
            },
            layer: 'dm-only',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: user.id,
            area: polygonPoints,
            density: 0.8,
            revealed: false,
          };

          createAndSyncDrawing(drawing);
          setPolygonPoints([]);
          e.preventDefault();
        } else {
          // Regular polygon
          const drawing: Drawing = {
            id: `drawing-${Date.now()}-${user.id}`,
            type: 'polygon',
            style: drawingStyle,
            layer:
              drawingStyle.dmNotesOnly || !drawingStyle.visibleToPlayers
                ? 'dm-only'
                : 'effects',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: user.id,
            points: polygonPoints,
          };

          createAndSyncDrawing(drawing);
          setPolygonPoints([]);
          e.preventDefault();
        }
      }
    },
    [activeTool, polygonPoints, drawingStyle, user.id, createAndSyncDrawing],
  );

  // Delete selected drawings
  const deleteSelection = useCallback(() => {
    selectedObjectIds.forEach((id) => deleteAndSyncDrawing(id));
    clearSelection();
  }, [selectedObjectIds, deleteAndSyncDrawing, clearSelection]);

  // Handle keyboard events for selection tool and polygon/mask tools
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTool === 'select' && selectedObjectIds.length > 0) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          deleteSelection();
          e.preventDefault();
        }
      }

      // Handle polygon and mask-create keyboard shortcuts
      if (
        (activeTool === 'polygon' || activeTool === 'mask-create') &&
        polygonPoints.length >= 3
      ) {
        if (e.key === 'Enter') {
          // Complete the polygon/mask
          if (activeTool === 'mask-create') {
            const drawing: Drawing = {
              id: `fog-${Date.now()}-${user.id}`,
              type: 'fog-of-war',
              style: {
                ...drawingStyle,
                fillColor: '#000000',
                fillOpacity: 0.8,
                strokeColor: '#666666',
                strokeWidth: 2,
              },
              layer: 'dm-only',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              createdBy: user.id,
              area: polygonPoints,
              density: 0.8,
              revealed: false,
            };
            createAndSyncDrawing(drawing);
          } else {
            const drawing: Drawing = {
              id: `drawing-${Date.now()}-${user.id}`,
              type: 'polygon',
              style: drawingStyle,
              layer:
                drawingStyle.dmNotesOnly || !drawingStyle.visibleToPlayers
                  ? 'dm-only'
                  : 'effects',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              createdBy: user.id,
              points: polygonPoints,
            };
            createAndSyncDrawing(drawing);
          }
          setPolygonPoints([]);
          e.preventDefault();
        } else if (e.key === 'Escape') {
          // Cancel the polygon/mask
          setPolygonPoints([]);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTool,
    selectedObjectIds,
    deleteSelection,
    polygonPoints,
    drawingStyle,
    user.id,
    createAndSyncDrawing,
  ]);

  if (activeTool === 'pan') {
    return null;
  }

  // Render preview shapes while drawing
  const renderPreview = () => {
    if (!isDrawing || !startPoint || !currentPoint) return null;

    const previewStyle = {
      fill: drawingStyle.fillColor,
      fillOpacity: drawingStyle.fillOpacity * 0.5, // Make preview semi-transparent
      stroke: drawingStyle.strokeColor,
      strokeWidth: drawingStyle.strokeWidth / camera.zoom,
      strokeDasharray: '5,5', // Dashed preview
      pointerEvents: 'none' as const,
    };

    // Calculate distance for measurement label
    const distanceInPixels = distance(startPoint, currentPoint);
    const distanceInFeet = (distanceInPixels / _gridSize) * 5; // Assuming 5ft per grid square
    const midX = (startPoint.x + currentPoint.x) / 2;
    const midY = (startPoint.y + currentPoint.y) / 2;

    switch (activeTool) {
      case 'measure':
        return (
          <>
            <line
              x1={startPoint.x}
              y1={startPoint.y}
              x2={currentPoint.x}
              y2={currentPoint.y}
              stroke="#00bcd4"
              strokeWidth={3 / camera.zoom}
              fill="none"
              pointerEvents="none"
            />
            {/* Distance indicator */}
            <text
              x={midX}
              y={midY - 15 / camera.zoom}
              fill="#00bcd4"
              fontSize={16 / camera.zoom}
              fontWeight="bold"
              textAnchor="middle"
              pointerEvents="none"
              style={{
                textShadow:
                  '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,188,212,0.5)',
              }}
            >
              📏 {distanceInFeet.toFixed(1)} ft ({distanceInPixels.toFixed(0)}
              px)
            </text>
            {/* Start point marker */}
            <circle
              cx={startPoint.x}
              cy={startPoint.y}
              r={5 / camera.zoom}
              fill="#00ff00"
              stroke="#ffffff"
              strokeWidth={2 / camera.zoom}
              pointerEvents="none"
            />
            {/* End point marker */}
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r={5 / camera.zoom}
              fill="#ff0000"
              stroke="#ffffff"
              strokeWidth={2 / camera.zoom}
              pointerEvents="none"
            />
          </>
        );

      case 'line':
        return (
          <>
            <line
              x1={startPoint.x}
              y1={startPoint.y}
              x2={currentPoint.x}
              y2={currentPoint.y}
              {...previewStyle}
              fill="none"
            />
            {/* Distance indicator */}
            <text
              x={midX}
              y={midY - 10 / camera.zoom}
              fill="#00bcd4"
              fontSize={14 / camera.zoom}
              fontWeight="bold"
              textAnchor="middle"
              pointerEvents="none"
              style={{
                textShadow:
                  '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,188,212,0.5)',
              }}
            >
              {distanceInFeet.toFixed(1)} ft
            </text>
          </>
        );

      case 'rectangle': {
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);
        const widthFeet = (width / _gridSize) * 5;
        const heightFeet = (height / _gridSize) * 5;
        const rectMidX = Math.min(startPoint.x, currentPoint.x) + width / 2;
        const rectMidY = Math.min(startPoint.y, currentPoint.y) + height / 2;

        return (
          <>
            <rect
              x={Math.min(startPoint.x, currentPoint.x)}
              y={Math.min(startPoint.y, currentPoint.y)}
              width={width}
              height={height}
              {...previewStyle}
            />
            {/* Dimension indicator */}
            <text
              x={rectMidX}
              y={rectMidY - 10 / camera.zoom}
              fill="#00bcd4"
              fontSize={14 / camera.zoom}
              fontWeight="bold"
              textAnchor="middle"
              pointerEvents="none"
              style={{
                textShadow:
                  '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,188,212,0.5)',
              }}
            >
              {widthFeet.toFixed(1)} × {heightFeet.toFixed(1)} ft
            </text>
          </>
        );
      }

      case 'circle': {
        const radius = distance(startPoint, currentPoint);
        const radiusFeet = (radius / _gridSize) * 5;

        return (
          <>
            <circle
              cx={startPoint.x}
              cy={startPoint.y}
              r={radius}
              {...previewStyle}
            />
            {/* Radius indicator */}
            <text
              x={startPoint.x}
              y={startPoint.y - radius - 15 / camera.zoom}
              fill="#00bcd4"
              fontSize={14 / camera.zoom}
              fontWeight="bold"
              textAnchor="middle"
              pointerEvents="none"
              style={{
                textShadow:
                  '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,188,212,0.5)',
              }}
            >
              r: {radiusFeet.toFixed(1)} ft
            </text>
          </>
        );
      }

      case 'cone': {
        const rawLength = distance(startPoint, currentPoint);
        // Snap to 5ft increments
        const snappedLength = Math.round(rawLength / _gridSize) * _gridSize;
        const length = Math.max(_gridSize, snappedLength);
        const lengthFeet = (length / _gridSize) * 5;

        const direction =
          (Math.atan2(
            currentPoint.y - startPoint.y,
            currentPoint.x - startPoint.x,
          ) *
            180) /
          Math.PI;
        const angleRad = (direction * Math.PI) / 180;
        // D&D 5e cone: 53.13 degrees (equilateral triangle, width = distance)
        const coneAngleRad = (53.13 * Math.PI) / 180;

        const leftX =
          startPoint.x + Math.cos(angleRad - coneAngleRad / 2) * length;
        const leftY =
          startPoint.y + Math.sin(angleRad - coneAngleRad / 2) * length;
        const rightX =
          startPoint.x + Math.cos(angleRad + coneAngleRad / 2) * length;
        const rightY =
          startPoint.y + Math.sin(angleRad + coneAngleRad / 2) * length;

        const pathData = `M ${startPoint.x} ${startPoint.y} L ${leftX} ${leftY} A ${length} ${length} 0 0 1 ${rightX} ${rightY} Z`;

        // Calculate label position at the end of the cone
        const labelX = startPoint.x + Math.cos(angleRad) * length;
        const labelY = startPoint.y + Math.sin(angleRad) * length;

        return (
          <>
            <path d={pathData} {...previewStyle} />
            {/* Length indicator */}
            <text
              x={labelX}
              y={labelY - 15 / camera.zoom}
              fill="#00bcd4"
              fontSize={14 / camera.zoom}
              fontWeight="bold"
              textAnchor="middle"
              pointerEvents="none"
              style={{
                textShadow:
                  '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,188,212,0.5)',
              }}
            >
              {lengthFeet.toFixed(0)} ft
            </text>
          </>
        );
      }

      default:
        return null;
    }
  };

  // Render polygon preview lines (also used for mask-create)
  const renderPolygonPreview = () => {
    if (
      (activeTool !== 'polygon' && activeTool !== 'mask-create') ||
      polygonPoints.length === 0
    )
      return null;

    const isMask = activeTool === 'mask-create';
    const previewStyle = {
      stroke: isMask ? '#666666' : drawingStyle.strokeColor,
      strokeWidth: (isMask ? 2 : drawingStyle.strokeWidth) / camera.zoom,
      fill: 'none',
      strokeDasharray: '5,5',
      pointerEvents: 'none' as const,
    };

    return (
      <>
        {/* Draw lines between polygon points */}
        {polygonPoints.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = polygonPoints[index - 1];
          return (
            <line
              key={`polygon-line-${index}`}
              x1={prevPoint.x}
              y1={prevPoint.y}
              x2={point.x}
              y2={point.y}
              {...previewStyle}
            />
          );
        })}

        {/* Draw line from last point to current cursor position */}
        {currentPoint && (
          <line
            x1={polygonPoints[polygonPoints.length - 1].x}
            y1={polygonPoints[polygonPoints.length - 1].y}
            x2={currentPoint.x}
            y2={currentPoint.y}
            {...previewStyle}
          />
        )}

        {/* Draw points as small circles */}
        {polygonPoints.map((point, index) => (
          <circle
            key={`polygon-point-${index}`}
            cx={point.x}
            cy={point.y}
            r={3 / camera.zoom}
            fill={isMask ? '#666666' : drawingStyle.strokeColor}
            pointerEvents="none"
          />
        ))}
      </>
    );
  };

  // Render selection box
  const renderSelectionBox = () => {
    if (!selectionBox) return null;

    const x = Math.min(selectionBox.start.x, selectionBox.end.x);
    const y = Math.min(selectionBox.start.y, selectionBox.end.y);
    const width = Math.abs(selectionBox.end.x - selectionBox.start.x);
    const height = Math.abs(selectionBox.end.y - selectionBox.start.y);

    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(0, 120, 255, 0.1)"
        stroke="rgba(0, 120, 255, 0.5)"
        strokeWidth={1 / camera.zoom}
        strokeDasharray="5,5"
        pointerEvents="none"
      />
    );
  };

  return (
    <g className="drawing-tools">
      {/* Interaction layer */}
      <rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handlePolygonComplete}
        onContextMenu={handlePolygonComplete}
        style={{
          cursor:
            activeTool === 'select'
              ? 'default'
              : activeTool === 'eraser'
                ? 'crosshair'
                : 'crosshair',
          pointerEvents: 'auto',
        }}
      />

      {/* Render preview shapes */}
      <g className="drawing-preview">
        {renderPreview()}
        {renderPolygonPreview()}
        {renderSelectionBox()}
      </g>
    </g>
  );
};
