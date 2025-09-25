import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  const [position, setPosition] = useState<Position | null>(null); // null means use default position
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const initialPosRef = useRef<Position>({ x: 0, y: 0 });
  
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
  
  // Improved drag handlers
  useEffect(() => {
    const dragHandle = dragHandleRef.current;
    const toolbar = toolbarRef.current;
    if (!dragHandle || !toolbar) return;
    
    const handleMouseDown = (e: MouseEvent) => {
      // Prevent text selection and default drag behavior
      e.preventDefault();
      e.stopPropagation();
      
      isDraggingRef.current = true;
      
      // Get initial toolbar position
      const rect = toolbar.getBoundingClientRect();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY
      };
      initialPosRef.current = {
        x: rect.left,
        y: rect.top
      };
      
      // Add dragging class for visual feedback
      toolbar.classList.add('dragging');
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      
      // Add a visual indication that the toolbar is being dragged
      toolbar.style.zIndex = '1000';
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      // Calculate new position based on mouse movement
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      const newX = initialPosRef.current.x + deltaX;
      const newY = initialPosRef.current.y + deltaY;
      
      // Get toolbar dimensions
      const rect = toolbar.getBoundingClientRect();
      
      // Constrain to viewport with padding
      const padding = 10;
      const maxX = window.innerWidth - rect.width - padding;
      const maxY = window.innerHeight - rect.height - padding;
      
      const constrainedPosition = {
        x: Math.max(padding, Math.min(maxX, newX)),
        y: Math.max(padding, Math.min(maxY, newY))
      };
      
      setPosition(constrainedPosition);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      isDraggingRef.current = false;
      toolbar.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Reset z-index after dragging
      toolbar.style.zIndex = '';
    };
    
    // Double click to reset position
    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      setPosition(null);
      toolbar.classList.add('resetting');
      setTimeout(() => toolbar.classList.remove('resetting'), 300);
    };
    
    // Add event listeners to the drag handle
    dragHandle.addEventListener('mousedown', handleMouseDown);
    dragHandle.addEventListener('dblclick', handleDoubleClick);
    
    // Add global event listeners for move and up
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = (e: MouseEvent) => handleMouseUp(e);
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // Touch event support for mobile/tablet
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMouseDown(new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      }));
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMouseMove(new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      }));
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      handleMouseUp(new MouseEvent('mouseup'));
    };
    
    dragHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    // Cleanup
    return () => {
      dragHandle.removeEventListener('mousedown', handleMouseDown);
      dragHandle.removeEventListener('dblclick', handleDoubleClick);
      dragHandle.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
  
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
      className={`game-toolbar ${position ? 'positioned' : ''}`} 
      role="toolbar"
      style={position ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed'
      } : {}}
    >
      {/* Drag Handle */}
      <div 
        ref={dragHandleRef}
        className="toolbar-drag-handle"
        title="Drag to move toolbar / Double-click to reset position"
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
