import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore, useIsHost, useCamera } from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';

interface Position {
  x: number;
  y: number;
}

export const GameToolbar: React.FC = () => {
  const [activeTool, setActiveTool] = useState('select');
  const [isCompact, setIsCompact] = useState(false);
  const isHost = useIsHost();
  const { updateCamera } = useGameStore();
  const camera = useCamera();
  
  // Dragging state
  const [isPositioned, setIsPositioned] = useState(false);
  const [translation, setTranslation] = useState<Position>({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const initialTranslationRef = useRef<Position>({ x: 0, y: 0 });
  
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
      
      // Get initial mouse position and translation
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialTranslationRef.current = translation;
      
      // Add dragging class for visual feedback
      toolbar.classList.add('dragging');
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      // Calculate new position based on mouse movement
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      const newX = initialTranslationRef.current.x + deltaX;
      const newY = initialTranslationRef.current.y + deltaY;
      
      setTranslation({ x: newX, y: newY });
      if (deltaX !== 0 || deltaY !== 0) {
        setIsPositioned(true);
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      isDraggingRef.current = false;
      toolbar.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    // Double click to reset position
    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      setTranslation({ x: 0, y: 0 });
      setIsPositioned(false);
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
  
  // Organize tools into two rows for more compact layout
  const toolsRow1 = [
    { id: 'select', icon: '👆', label: 'Select' },
    { id: 'measure', icon: '📏', label: 'Measure' },
    { id: 'note', icon: '📝', label: 'Note' },
    { id: 'focus', icon: '📷', label: 'Focus' },
    '---', // Separator
    { id: 'circle', icon: '⭕', label: 'Circle' },
    { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
    { id: 'cone', icon: '🔺', label: 'Cone' },
    { id: 'polygon', icon: '⬟', label: 'Polygon' },
    { id: 'line', icon: '➖', label: 'Line' },
  ];
  
  const toolsRow2 = isHost ? [
    { id: 'mask-create', icon: '🌟', label: 'Create Mask' },
    { id: 'mask-toggle', icon: '✨', label: 'Toggle Mask' },
    { id: 'mask-remove', icon: '🧽', label: 'Remove Mask' },
    { id: 'mask-show', icon: '👁', label: 'Show All' },
    { id: 'mask-hide', icon: '🙈', label: 'Hide All' },
    '---', // Separator
    { id: 'grid', icon: '⊞', label: 'Grid' },
  ] : [];
  
  const cameraControls = [
    { id: 'zoom-out', icon: '➖', label: 'Zoom Out', action: handleZoomOut, disabled: camera.zoom <= 0.1 },
    { id: 'zoom-reset', label: `${Math.round(camera.zoom * 100)}%`, action: handleZoomReset, className: 'zoom-display' },
    { id: 'zoom-in', icon: '➕', label: 'Zoom In', action: handleZoomIn, disabled: camera.zoom >= 5.0 },
  ];
  
  // Keyboard shortcut for compact mode (Ctrl/Cmd + Shift + T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setIsCompact(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <div 
      ref={toolbarRef}
      className={`game-toolbar ${isPositioned ? 'positioned' : ''} ${isCompact ? 'compact' : ''}`} 
      role="toolbar"
      style={{
        '--tw-translate-x': `${translation.x}px`,
        '--tw-translate-y': `${translation.y}px`,
      } as React.CSSProperties}
    >
      {/* Drag Handle and Compact Toggle */}
      <div className="toolbar-controls">
        <div 
          ref={dragHandleRef}
          className="toolbar-drag-handle"
          title="Drag to move | Double-click: reset position"
        >
          <span className="drag-dots">⋮⋮</span>
        </div>
        <button
          type="button"
          className="compact-toggle"
          onClick={() => setIsCompact(!isCompact)}
          title={`${isCompact ? 'Expand' : 'Compact'} toolbar (Ctrl+Shift+T)`}
          aria-label={isCompact ? 'Expand toolbar' : 'Compact toolbar'}
        >
          <span className="compact-icon">{isCompact ? '⊞' : '⊟'}</span>
        </button>
      </div>
      
      <div className="toolbar-content">
        {/* First Row - Main Tools and Camera */}
        <div className="toolbar-row">
          <div className="toolbar-group">
            {toolsRow1.map((tool, index) => {
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
          </div>
          
          {/* Camera Controls */}
          <div className="toolbar-separator" />
          <div className="toolbar-group camera-group">
            {cameraControls.map((control) => (
              <button
                key={control.id}
                type="button"
                className={`toolbar-btn ${control.className || ''}`}
                onClick={control.action}
                title={control.label}
                disabled={control.disabled}
              >
                {control.icon ? (
                  <span className="tool-icon">{control.icon}</span>
                ) : (
                  <span className="zoom-text">{control.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Second Row - DM Tools (if host) */}
        {isHost && toolsRow2.length > 0 && (
          <div className="toolbar-row toolbar-row-secondary">
            <div className="toolbar-group">
              {toolsRow2.map((tool, index) => {
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
