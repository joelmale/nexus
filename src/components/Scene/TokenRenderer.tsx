import React, { useState, useEffect, useRef } from 'react';
import type { PlacedToken, Token } from '@/types/token';
import { getTokenPixelSize } from '@/types/token';
import { useActiveTool } from '@/stores/gameStore';

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
  const activeTool = useActiveTool();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Calculate token size in pixels
  const tokenSize = getTokenPixelSize(token.size, gridSize) * placedToken.scale;

  // Only handle interactions when select tool is active (select tool combines select + move)
  const canInteract = canEdit && activeTool === 'select';

  // Global mouse handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      onMove(placedToken.id, deltaX, deltaY);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onMove, placedToken.id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('🖱️ Token mouseDown:', {
      tokenId: placedToken.id,
      tokenName: token.name,
      canInteract,
      canEdit,
      activeTool,
      isSelected,
    });

    if (!canInteract) {
      console.log('❌ Cannot interact - canEdit:', canEdit, 'activeTool:', activeTool);
      return;
    }

    e.stopPropagation();

    // Select this token (or add to multi-select with Shift/Cmd/Ctrl)
    const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
    console.log('✅ Selecting token:', placedToken.id, 'multi:', isMultiSelect);
    onSelect(placedToken.id, isMultiSelect);

    // Start dragging if already selected or just selected
    if (isSelected || !isMultiSelect) {
      console.log('🎯 Starting drag');
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  return (
    <g
      transform={`translate(${placedToken.x}, ${placedToken.y}) rotate(${placedToken.rotation})`}
      onMouseDown={handleMouseDown}
      style={{
        cursor: canInteract ? (isDragging ? 'grabbing' : 'grab') : 'default',
        pointerEvents: canInteract ? 'auto' : 'none',
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
          stroke="var(--color-primary)"
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
            <g key={condition.id}>
              <circle
                cx={-10 * index}
                cy={0}
                r={8}
                fill={condition.color || '#ffc107'}
                stroke="#000"
                strokeWidth={1}
              />
              <title>{condition.name}</title>
            </g>
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
