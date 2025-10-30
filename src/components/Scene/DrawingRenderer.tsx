import React, { useMemo, useState, useEffect } from 'react';
import { useActiveScene } from '@/stores/gameStore';
import type { Drawing, BaseDrawing } from '@/types/drawing';
import type { Camera } from '@/types/game';

interface DrawingRendererProps {
  sceneId: string;
  camera: Camera;
  isHost: boolean;
  activeTool?: string;
  selectedObjectIds?: string[];
}

const PingDrawing: React.FC<{
  drawing: Drawing & { type: 'ping' };
  camera: Camera;
  commonProps: React.SVGAttributes<SVGElement>;
}> = ({ drawing, camera, commonProps }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const updateFrame = () => {
      setElapsed(Date.now() - drawing.timestamp);
      requestAnimationFrame(updateFrame);
    };

    const frameId = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(frameId);
  }, [drawing.timestamp]);

  const progress = Math.min(elapsed / drawing.duration, 1);

  if (progress >= 1) {
    return null;
  }

  const opacity = 1 - progress;
  const scale = 1 + progress * 0.5;

  return (
    <g key={drawing.id} opacity={opacity}>
      <circle
        cx={drawing.position.x}
        cy={drawing.position.y}
        r={(20 / camera.zoom) * scale}
        fill="none"
        stroke="#00bcd4"
        strokeWidth={3 / camera.zoom}
        className={commonProps.className}
      />
      <circle
        cx={drawing.position.x}
        cy={drawing.position.y}
        r={10 / camera.zoom}
        fill="#00bcd4"
        opacity={0.6}
        className={commonProps.className}
      />
      <text
        x={drawing.position.x}
        y={drawing.position.y - 30 / camera.zoom}
        fontSize={14 / camera.zoom}
        fontWeight="bold"
        fill="#00bcd4"
        textAnchor="middle"
        className={commonProps.className}
        style={{
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
        }}
      >
        {drawing.playerName}
      </text>
    </g>
  );
};

export const DrawingRenderer: React.FC<DrawingRendererProps> = ({
  sceneId,
  camera,
  isHost,
  activeTool: _activeTool = '',
  selectedObjectIds = [],
}) => {
  const activeScene = useActiveScene();

  const drawings = useMemo(() => {
    if (!activeScene || activeScene.id !== sceneId) return [];
    return activeScene.drawings || [];
  }, [activeScene, sceneId]);

  const visibleDrawings = useMemo(() => {
    return drawings.filter((drawing) => {
      if (isHost) return true;
      if (drawing.layer === 'dm-only') return false;
      if (drawing.style.dmNotesOnly) return false;
      if (drawing.style.visibleToPlayers === false) return false;
      return true;
    });
  }, [drawings, isHost]);

  const renderDrawing = (drawing: Drawing) => {
    const { style } = drawing;
    const strokeWidth = style.strokeWidth / camera.zoom;
    const isSelected = selectedObjectIds.includes(drawing.id);

    const commonProps = {
      fill: style.fillColor,
      fillOpacity: style.fillOpacity,
      stroke: style.strokeColor,
      strokeWidth: strokeWidth,
      strokeDasharray: style.strokeDashArray,
      className: `drawing drawing-${drawing.type} ${drawing.layer}${isSelected ? ' selected' : ''}`,
      'data-drawing-id': drawing.id,
      'data-created-by': drawing.createdBy,
      style: {
        pointerEvents: 'none' as const, // Let DrawingTools layer handle all pointer events
        cursor: 'default',
      },
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

      case 'polygon': {
        if (drawing.points.length < 3) return null;
        const pathData = `M ${drawing.points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
        return <path key={drawing.id} d={pathData} {...commonProps} />;
      }

      case 'pencil': {
        if (drawing.points.length < 2) return null;
        const pencilPath = `M ${drawing.points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
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
      }

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
            <circle
              cx={drawing.center.x}
              cy={drawing.center.y}
              r={drawing.radius}
              {...commonProps}
            />
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

      case 'text':
        return (
          <text
            key={drawing.id}
            x={drawing.position.x}
            y={drawing.position.y}
            fontSize={drawing.fontSize / camera.zoom}
            fontFamily={drawing.fontFamily}
            fill="#ffffff"
            stroke="#000000"
            strokeWidth={0.5 / camera.zoom}
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="all"
            className={commonProps.className}
            style={{
              paintOrder: 'stroke fill',
            }}
          >
            {drawing.text}
          </text>
        );

      case 'ping':
        return (
          <PingDrawing
            key={drawing.id}
            drawing={drawing}
            camera={camera}
            commonProps={commonProps}
          />
        );

      case 'fog-of-war': {
        if (drawing.area.length < 3) return null;
        const pathData = `M ${drawing.area.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;

        const fogOpacity = drawing.revealed ? 0 : drawing.density;

        return (
          <g key={drawing.id} className="fog-of-war-layer">
            <path
              d={pathData}
              fill="#000000"
              fillOpacity={fogOpacity}
              stroke="#666666"
              strokeWidth={strokeWidth}
              strokeDasharray={isHost && !drawing.revealed ? '5,5' : undefined}
              className={commonProps.className}
            />
            {isHost && drawing.revealed && (
              <text
                x={drawing.area[0].x}
                y={drawing.area[0].y - 10 / camera.zoom}
                fill="#00ff00"
                fontSize={12 / camera.zoom}
                opacity={0.6}
              >
                ✓ Revealed
              </text>
            )}
          </g>
        );
      }

      default:
        console.warn(`Unknown drawing type: ${(drawing as BaseDrawing).type}`);
        return null;
    }
  };

  const renderCone = (
    drawing: Drawing & { type: 'cone' },
    props: React.SVGAttributes<SVGPathElement>,
  ) => {
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

  const renderLineAoE = (
    drawing: Drawing & { type: 'aoe-line' },
    props: React.SVGAttributes<SVGPathElement>,
  ) => {
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
      <g className="background-drawings">
        {visibleDrawings
          .filter((d) => d.layer === 'background')
          .map(renderDrawing)}
      </g>

      <g className="effects-drawings">
        {visibleDrawings
          .filter((d) => d.layer === 'effects')
          .map(renderDrawing)}
      </g>

      {isHost && (
        <g className="dm-only-drawings" opacity="0.7">
          {visibleDrawings
            .filter((d) => d.layer === 'dm-only')
            .map(renderDrawing)}
        </g>
      )}

      <g className="overlay-drawings">
        {visibleDrawings
          .filter((d) => d.layer === 'overlay')
          .map(renderDrawing)}
      </g>
    </g>
  );
};
