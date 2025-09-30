import React, { useCallback, useState } from 'react';
import {
  type Point,
  type Drawing,
  type DrawingStyle,
  type DrawingTool,
} from '@/types/drawing';
import type { Camera } from '@/types/game';
import { useUser, useActiveScene, useDrawingActions } from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';
import {
  distance,
  isPointNearLine,
  isPointInRectangle,
  isPointInPolygon,
  isPointInCircle,
  gridSnap,
} from '@/utils/mathUtils';

interface DrawingToolsProps {
  activeTool: DrawingTool | 'select' | 'pan' | 'measure';
  drawingStyle: DrawingStyle;
  camera: Camera;
  _gridSize: number;
  svgRef: React.RefObject<SVGSVGElement>;
  onSelectionChange?: (selectedDrawings: string[]) => void;
  snapToGrid?: boolean;
}

export const DrawingTools: React.FC<DrawingToolsProps> = ({
  activeTool,
  drawingStyle,
  camera,
  _gridSize,
  svgRef,
  onSelectionChange,
  snapToGrid: shouldSnapToGrid = false,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [pencilPath, setPencilPath] = useState<Point[]>([]);
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [isErasing, setIsErasing] = useState(false);
  const eraserRadius = 20;
  const [selectionBox, setSelectionBox] = useState<{
    start: Point;
    end: Point;
  } | null>(null);

  const user = useUser();
  const activeScene = useActiveScene();
  const { createDrawing, deleteDrawing } = useDrawingActions();
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

  // Get drawings that intersect with a point (for eraser)
  const getDrawingsAtPoint = useCallback(
    (point: Point, radius: number = 5): string[] => {
      if (!activeScene) return [];

      const intersectedDrawings: string[] = [];

      activeScene.drawings.forEach((drawing) => {
        if (!isHost && drawing.createdBy !== user.id) return;

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

      // Tools that don't interact with mousedown can be handled with an early return.
      if (activeTool === 'pan' || activeTool === 'measure') {
        return;
      }

      const point = screenToScene(e.clientX, e.clientY);

      const defaultHandler = () => {
        setStartPoint(point);
        setCurrentPoint(point);
        setIsDrawing(true);
      };

      const mouseDownHandlers: {
        [key: string]: (event: React.MouseEvent) => void;
      } = {
        select: (event) => {
          const drawingAtPoint = getDrawingsAtPoint(point, 10)[0];
          if (drawingAtPoint) {
            if (event.shiftKey) {
              const newSelection = selectedDrawings.includes(drawingAtPoint)
                ? selectedDrawings.filter((id) => id !== drawingAtPoint)
                : [...selectedDrawings, drawingAtPoint];
              setSelectedDrawings(newSelection);
              onSelectionChange?.(newSelection);
            } else {
              setSelectedDrawings([drawingAtPoint]);
              onSelectionChange?.([drawingAtPoint]);
            }
          } else {
            setSelectionBox({ start: point, end: point });
            setSelectedDrawings([]);
            onSelectionChange?.([]);
          }
          defaultHandler();
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
      };

      const handler = mouseDownHandlers[activeTool] || defaultHandler;
      handler(e);

      e.stopPropagation();
    },
    [
      activeTool,
      screenToScene,
      selectedDrawings,
      onSelectionChange,
      getDrawingsAtPoint,
      deleteAndSyncDrawing,
      eraserRadius,
    ],
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === 'pan' || activeTool === 'measure') return;

      const point = screenToScene(e.clientX, e.clientY);

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
      };

      const handler = mouseMoveHandlers[activeTool] || defaultHandler;
      handler();

      e.stopPropagation();
    },
    [
      activeTool,
      screenToScene,
      isDrawing,
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
            const selectedIds = getDrawingsInSelection(
              selectionBox.start,
              selectionBox.end,
            );
            setSelectedDrawings(selectedIds);
            onSelectionChange?.(selectedIds);
            setSelectionBox(null);
          }
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
      onSelectionChange,
      drawingStyle,
      user.id,
      createAndSyncDrawing,
      pencilPath,
      _gridSize,
    ],
  );

  // Handle polygon completion
  const handlePolygonComplete = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== 'polygon' || polygonPoints.length < 3) return;

      if (e.type === 'dblclick' || e.button === 2) {
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
    },
    [activeTool, polygonPoints, drawingStyle, user.id, createAndSyncDrawing],
  );

  // Delete selected drawings
  const deleteSelectedDrawings = useCallback(() => {
    selectedDrawings.forEach((id) => deleteAndSyncDrawing(id));
    setSelectedDrawings([]);
    onSelectionChange?.([]);
  }, [selectedDrawings, deleteAndSyncDrawing, onSelectionChange]);

  // Handle keyboard events for selection tool
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTool === 'select' && selectedDrawings.length > 0) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          deleteSelectedDrawings();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, selectedDrawings, deleteSelectedDrawings]);

  if (activeTool === 'pan' || activeTool === 'measure') {
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

  // Render polygon preview lines
  const renderPolygonPreview = () => {
    if (activeTool !== 'polygon' || polygonPoints.length === 0) return null;

    const previewStyle = {
      stroke: drawingStyle.strokeColor,
      strokeWidth: drawingStyle.strokeWidth / camera.zoom,
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
            fill={drawingStyle.strokeColor}
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
