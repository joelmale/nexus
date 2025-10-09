import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import type { Token } from '@/types/token';

interface DraggableTokenProps {
  token: Token;
  onClick?: (token: Token) => void;
  onConfigure?: (token: Token) => void;
}

// Category color mapping to CSS variables
const categoryColors = {
  pc: '--color-primary',
  npc: '--color-secondary',
  monster: '--color-accent',
  default: '--color-accent',
};

/**
 * Draggable token component for token gallery
 * Based on Ogres VTT drag-and-drop approach
 */
export const DraggableToken: React.FC<DraggableTokenProps> = ({
  token,
  onClick,
  onConfigure,
}) => {
  const [showConfigButton, setShowConfigButton] = useState(false);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'TOKEN',
      item: { token },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [token],
  );

  // Get category color CSS variable
  const categoryColorVar =
    categoryColors[token.category as keyof typeof categoryColors] ||
    categoryColors.default;
  const categoryColor = `var(${categoryColorVar})`;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onConfigure) {
      onConfigure(token);
    }
  };

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      onClick={() => onClick?.(token)}
      onContextMenu={handleContextMenu}
      className="draggable-token"
      style={{
        border: '1px solid var(--glass-border)',
        borderTop: `3px solid ${categoryColor}`,
        borderRadius: '10px',
        padding: '10px',
        cursor: isDragging ? 'grabbing' : 'grab',
        textAlign: 'center',
        background: 'var(--glass-surface-strong)',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        setShowConfigButton(true);
        if (!isDragging) {
          e.currentTarget.style.borderColor = categoryColor;
          e.currentTarget.style.boxShadow = `0 4px 12px rgba(var(${categoryColorVar}-rgb), 0.3)`;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        setShowConfigButton(false);
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'var(--glass-border)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {/* Config button */}
      {showConfigButton && onConfigure && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfigure(token);
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-surface-strong)',
            color: 'var(--glass-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
          title="Configure token (or right-click)"
        >
          ⚙️
        </button>
      )}
      <div
        style={{
          width: '100%',
          height: '90px',
          backgroundImage: `url(${token.thumbnailImage || token.image})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderRadius: '8px',
          marginBottom: '8px',
          border: '1px solid #ccc',
        }}
      />
      <div
        style={{
          fontWeight: 'bold',
          fontSize: '12px',
          marginBottom: '4px',
          lineHeight: '1.3',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--glass-text)',
        }}
        title={token.name}
      >
        {token.name}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: 'var(--glass-text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        <span>{token.size}</span>
      </div>
      {token.isCustom && (
        <div
          style={{
            fontSize: '9px',
            color: 'var(--color-primary)',
            background: 'rgba(var(--color-primary-rgb), 0.1)',
            border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
            padding: '2px 6px',
            borderRadius: '10px',
            display: 'inline-block',
            marginTop: '4px',
          }}
        >
          Custom
        </div>
      )}
      {token.isPublic === false && (
        <div
          style={{
            fontSize: '9px',
            color: 'var(--color-accent)',
            background: 'rgba(var(--color-accent-rgb), 0.1)',
            border: '1px solid rgba(var(--color-accent-rgb), 0.3)',
            padding: '2px 6px',
            borderRadius: '10px',
            display: 'inline-block',
            marginTop: '4px',
            marginLeft: '4px',
          }}
        >
          Private
        </div>
      )}
    </div>
  );
};
