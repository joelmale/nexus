import React, { useMemo } from 'react';
import { useUser, useActiveScene } from '@/stores/gameStore';
import type { Drawing } from '@/types/drawing';
import type { Camera } from '@/types/game';

interface DrawingRendererProps {
  sceneId: string;
  camera: Camera;
  isHost: boolean;
}

export const DrawingRenderer: React.FC<DrawingRendererProps> = ({ 
  sceneId, 
  camera, 
  isHost 
}) => {
  const user = useUser();
  const activeScene = useActiveScene();

  // Get all drawings for this scene
  const drawings = useMemo(() => {
    if (!activeScene || activeScene.id !== sceneId) return [];
    return activeScene.drawings || [];
  }, [activeScene, sceneId]);

  // Filter drawings based on visibility rules
  const visibleDrawings = useMemo(() => {
    return drawings.filter(drawing => {
      // DMs can see all drawings
      if (isHost) return true;
      
      // Players can only see drawings that are visible to them
      if (drawing.layer === 'dm-only') return false;
      if (drawing.style.dmNotesOnly) return false;
      if (drawing.style.visibleToPlayers === false) return false;
      
      return true;
    });
  }, [drawings, isHost]);

  const renderDrawing = (drawing: Drawing) => {
    const { style } = drawing;
    const strokeWidth = style.strokeWidth / camera.zoom; // Scale stroke width with zoom
    
    const commonProps = {
      fill: style.fillColor,
      fillOpacity: style.fillOpacity,
      stroke: style.strokeColor,
      strokeWidth: strokeWidth,
      strokeDasharray: style.strokeDashArray,
      className: `drawing drawing-${drawing.type} ${drawing.layer}`,
      'data-drawing-id': drawing.id,
      'data-created-by': drawing.createdBy,
    };

    switch (drawing.type) {
      case 'line':
        return (
          <line
            key={drawing.id}
            x1={drawing.start.x}
            y1={drawing.start.y}
            x2={drawing.end.x}
            y2={drawing.end.y}
            {...commonProps}
            fill="none"
          />
        );

      case 'rectangle':
        return (
          <rect
            key={drawing.id}
            x={drawing.x}
            y={drawing.y}
            width={drawing.width}
            height={drawing.height}
            {...commonProps}
          />
        );

      case 'circle':
        return (
          <circle
            key={drawing.id}
            cx={drawing.center.x}
            cy={drawing.center.y}
            r={drawing.radius}
            {...commonProps}
          />
        );

      case 'polygon':
        if (drawing.points.length < 3) return null;
        const pathData = `M ${drawing.points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
        return (
          <path
            key={drawing.id}
            d={pathData}
            {...commonProps}
          />
        );

      case 'pencil':
        if (drawing.points.length < 2) return null;
        const pencilPath = `M ${drawing.points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
        return (
          <path
            key={drawing.id}
            d={pencilPath}
            {...commonProps}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'cone':
        return renderCone(drawing, commonProps);

      case 'aoe-sphere':
        return (
          <circle
            key={drawing.id}
            cx={drawing.center.x}
            cy={drawing.center.y}
            r={drawing.radius}
            {...commonProps}
            className={`${commonProps.className} aoe-effect`}
          />
        );

      case 'aoe-cube':
        return (
          <rect
            key={drawing.id}
            x={drawing.origin.x - drawing.size / 2}
            y={drawing.origin.y - drawing.size / 2}
            width={drawing.size}
            height={drawing.size}
            {...commonProps}
            className={`${commonProps.className} aoe-effect`}
          />
        );

      case 'aoe-cylinder':
        return (
          <g key={drawing.id} className={`${commonProps.className} aoe-effect`}>
            {/* Base circle */}
            <circle
              cx={drawing.center.x}
              cy={drawing.center.y}
              r={drawing.radius}
              {...commonProps}
            />
            {/* Height indicator (visual representation) */}
            <text
              x={drawing.center.x}
              y={drawing.center.y}
              fill={style.strokeColor}
              fontSize={12 / camera.zoom}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {drawing.height}ft
            </text>
          </g>
        );

      case 'aoe-line':
        return renderLineAoE(drawing, commonProps);

      default:
        console.warn(`Unknown drawing type: ${(drawing as any).type}`);
        return null;
    }
  };

  const renderCone = (drawing: Drawing & { type: 'cone' }, props: any) => {
    const { origin, direction, length, angle } = drawing;
    const angleRad = (direction * Math.PI) / 180;
    const coneAngleRad = (angle * Math.PI) / 180;
    
    const leftX = origin.x + Math.cos(angleRad - coneAngleRad / 2) * length;
    const leftY = origin.y + Math.sin(angleRad - coneAngleRad / 2) * length;
    
    const rightX = origin.x + Math.cos(angleRad + coneAngleRad / 2) * length;
    const rightY = origin.y + Math.sin(angleRad + coneAngleRad / 2) * length;
    
    const pathData = `M ${origin.x} ${origin.y} L ${leftX} ${leftY} A ${length} ${length} 0 0 1 ${rightX} ${rightY} Z`;
    
    return (
      <path
        key={drawing.id}
        d={pathData}
        {...props}
        className={`${props.className} aoe-effect`}
      />
    );
  };

  const renderLineAoE = (drawing: Drawing & { type: 'aoe-line' }, props: any) => {
    const { start, end, width } = drawing;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    const halfWidth = width / 2;
    const cos = Math.cos(angle + Math.PI / 2);
    const sin = Math.sin(angle + Math.PI / 2);
    
    const p1 = { x: start.x + cos * halfWidth, y: start.y + sin * halfWidth };
    const p2 = { x: start.x - cos * halfWidth, y: start.y - sin * halfWidth };
    const p3 = { x: end.x - cos * halfWidth, y: end.y - sin * halfWidth };
    const p4 = { x: end.x + cos * halfWidth, y: end.y + sin * halfWidth };
    
    const pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
    
    return (
      <path
        key={drawing.id}
        d={pathData}
        {...props}
        className={`${props.className} aoe-effect`}
      />
    );
  };

  if (visibleDrawings.length === 0) {
    return null;
  }

  return (
    <g className="drawings-layer">
      {/* Group drawings by layer for proper rendering order */}
      <g className="background-drawings">
        {visibleDrawings
          .filter(d => d.layer === 'background')
          .map(renderDrawing)}
      </g>
      
      <g className="effects-drawings">
        {visibleDrawings
          .filter(d => d.layer === 'effects')
          .map(renderDrawing)}
      </g>
      
      {/* DM-only drawings (only visible to DMs) */}
      {isHost && (
        <g className="dm-only-drawings" opacity="0.7">
          {visibleDrawings
            .filter(d => d.layer === 'dm-only')
            .map(renderDrawing)}
        </g>
      )}
      
      <g className="overlay-drawings">
        {visibleDrawings
          .filter(d => d.layer === 'overlay')
          .map(renderDrawing)}
      </g>
    </g>
  );
};
