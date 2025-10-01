import React, { useState } from 'react';
import type { PlacedToken, Token } from '@/types/token';
import { getTokenPixelSize } from '@/types/token';

interface TokenRendererProps {
  placedToken: PlacedToken;
  token: Token;
  gridSize: number;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onMove: (id: string, deltaX: number, deltaY: number) => void;
  onRotate?: (id: string, rotation: number) => void;
  canEdit: boolean;
}

/**
 * Renders a placed token on the scene canvas
 */
export const TokenRenderer: React.FC<TokenRendererProps> = ({
  placedToken,
  token,
  gridSize,
  isSelected,
  onSelect,
  onMove,
  canEdit,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate token size in pixels
  const tokenSize = getTokenPixelSize(token.size, gridSize) * placedToken.scale;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canEdit) return;

    e.stopPropagation();

    // Select this token
    onSelect(placedToken.id, e.shiftKey);

    // Start dragging
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canEdit) return;

    e.preventDefault();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    onMove(placedToken.id, deltaX, deltaY);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <g
      transform={`translate(${placedToken.x}, ${placedToken.y}) rotate(${placedToken.rotation})`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* Token Image */}
      <image
        href={token.image}
        x={-tokenSize / 2}
        y={-tokenSize / 2}
        width={tokenSize}
        height={tokenSize}
        style={{
          opacity: isDragging ? 0.7 : 1,
        }}
      />

      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={0}
          cy={0}
          r={tokenSize / 2 + 5}
          fill="none"
          stroke="#007bff"
          strokeWidth={3}
          strokeDasharray="5,5"
        />
      )}

      {/* Token border */}
      <circle
        cx={0}
        cy={0}
        r={tokenSize / 2}
        fill="none"
        stroke={placedToken.dmNotesOnly ? '#ff0000' : '#333'}
        strokeWidth={2}
        opacity={0.8}
      />

      {/* Conditions/status indicators */}
      {placedToken.conditions.length > 0 && (
        <g transform={`translate(${tokenSize / 2}, ${-tokenSize / 2})`}>
          {placedToken.conditions.slice(0, 3).map((condition, index) => (
            <circle
              key={condition.id}
              cx={-10 * index}
              cy={0}
              r={8}
              fill={condition.color || '#ffc107'}
              stroke="#000"
              strokeWidth={1}
              title={condition.name}
            />
          ))}
        </g>
      )}

      {/* Token label */}
      {token.name && (
        <text
          x={0}
          y={tokenSize / 2 + 15}
          textAnchor="middle"
          fill="#fff"
          stroke="#000"
          strokeWidth={2}
          paintOrder="stroke"
          fontSize={12}
          fontWeight="bold"
        >
          {token.name}
        </text>
      )}
    </g>
  );
};
