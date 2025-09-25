import React, { useState, useRef, useCallback } from 'react';
import { useGameStore, useIsHost, useCamera } from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';

interface Position {
  x: number;
  y: number;
}

export const GameToolbar: React.FC = () => {
  const [activeTool, setActiveTool] = useState('select');
  const isHost = useIsHost();
  const { updateCamera } = useGameStore();
  const camera = useCamera();
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position | null>(null); // null means use default position
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  const handleZoomIn = () => {
    const newZoom = Math.min(5.0, camera.zoom * 1.2);
    updateCamera({ zoom: newZoom });
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(0.1, camera.zoom / 1.2);
    updateCamera({ zoom: newZoom });
  };
  
  const handleZoomReset = () => {
    updateCamera({ x: 0, y: 0, zoom: 1.0 });
  };
  
  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!toolbarRef.current) return;
    
    const rect = toolbarRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    };
    
    // Constrain to viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const toolbarWidth = 400; // Approximate toolbar width
    const toolbarHeight = 60; // Approximate toolbar height
    
    newPosition.x = Math.max(10, Math.min(viewport.width - toolbarWidth - 10, newPosition.x));
    newPosition.y = Math.max(10, Math.min(viewport.height - toolbarHeight - 10, newPosition.y));
    
    setPosition(newPosition);
  }, [isDragging, dragOffset]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Add global mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const tools = [
    { id: 'select', icon: '👆', label: 'Select' },
    { id: 'measure', icon: '📏', label: 'Measure' },
    { id: 'note', icon: '📝', label: 'Note' },
    { id: 'focus', icon: '📷', label: 'Focus' },
    '---', // Separator
    { id: 'circle', icon: '⭕', label: 'Circle' },
    { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
    { id: 'cone', icon: '🔺', label: 'Cone' },
    { id: 'polygon', icon: '⬟', label: 'Polygon' },
    { id: 'line', icon: '📏', label: 'Line' },
  ];

  // Add DM-only tools
  const dmTools = [
    '---', // Separator
    { id: 'mask-create', icon: '🌟', label: 'Create Mask' },
    { id: 'mask-toggle', icon: '✨', label: 'Toggle Mask' },
    { id: 'mask-remove', icon: '🧽', label: 'Remove Mask' },
    { id: 'mask-show', icon: '👁', label: 'Show All' },
    { id: 'mask-hide', icon: '🙈', label: 'Hide All' },
    '---', // Separator
    { id: 'grid', icon: '⊞', label: 'Grid' },
  ];

  const allTools = isHost ? [...tools, ...dmTools] : tools;
  
  return (
    <div 
      ref={toolbarRef}
      className={`game-toolbar ${
        isDragging ? 'dragging' : ''
      } ${
        position ? 'positioned' : ''
      }`} 
      role="toolbar"
      style={position ? {
        left: `${position.x}px`,
        top: `${position.y}px`
      } : {}}
    >
      {/* Drag Handle */}
      <div 
        className="toolbar-drag-handle"
        onMouseDown={handleMouseDown}
        title="Drag to move toolbar"
      >
        <span className="drag-dots">⋮⋮</span>
      </div>
      
      <div className="toolbar-actions">
        {/* Drawing Tools */}
        {allTools.map((tool, index) => {
          if (tool === '---') {
            return <div key={index} className="toolbar-separator" />;
          }
          
          return (
            <button
              key={tool.id}
              type="button"
              className={`toolbar-btn ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              aria-pressed={activeTool === tool.id}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
            </button>
          );
        })}
        
        {/* Camera Controls Separator */}
        <div className="toolbar-separator" />
        
        {/* Zoom Out */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleZoomOut}
          title="Zoom Out"
          disabled={camera.zoom <= 0.1}
        >
          <span className="tool-icon">🔍-</span>
        </button>
        
        {/* Zoom Level Display */}
        <button
          type="button"
          className="toolbar-btn zoom-display"
          onClick={handleZoomReset}
          title="Reset Zoom (100%)"
        >
          <span className="zoom-text">{Math.round(camera.zoom * 100)}%</span>
        </button>
        
        {/* Zoom In */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleZoomIn}
          title="Zoom In"
          disabled={camera.zoom >= 5.0}
        >
          <span className="tool-icon">🔍+</span>
        </button>
      </div>
    </div>
  );
};
