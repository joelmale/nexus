import React from 'react';
import { useDrag } from 'react-dnd';
import type { Token } from '@/types/token';

interface DraggableTokenProps {
  token: Token;
  onClick?: (token: Token) => void;
}

/**
 * Draggable token component for token gallery
 * Based on Ogres VTT drag-and-drop approach
 */
export const DraggableToken: React.FC<DraggableTokenProps> = ({
  token,
  onClick,
}) => {
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

  return (
    <div
      ref={drag}
      onClick={() => onClick?.(token)}
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '10px',
        padding: '10px',
        cursor: isDragging ? 'grabbing' : 'grab',
        textAlign: 'center',
        backgroundColor: 'white',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = '#007bff';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.2)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = '#e0e0e0';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div
        style={{
          width: '100%',
          height: '80px',
          backgroundImage: `url(${token.thumbnailImage || token.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
        }}
        title={token.name}
      >
        {token.name}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: '#666',
          marginBottom: '4px',
        }}
      >
        {token.size}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: '#999',
          textTransform: 'uppercase',
        }}
      >
        {token.category}
      </div>
      {token.isCustom && (
        <div
          style={{
            fontSize: '9px',
            color: '#007bff',
            backgroundColor: '#e3f2fd',
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
            color: '#dc3545',
            backgroundColor: '#f8d7da',
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
