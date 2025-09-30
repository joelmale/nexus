import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { useGameStore, useIsHost, useCamera } from '@/stores/gameStore';

interface Position {
  x: number;
  y: number;
}

const TOOLBAR_TYPE = 'GAME_TOOLBAR';

export const GameToolbar: React.FC = () => {
  const [activeTool, setActiveTool] = useState('select');
  const [isCompact, setIsCompact] = useState(false);
  const isHost = useIsHost();
  const { updateCamera, settings } = useGameStore();
  const camera = useCamera();

  // Check if toolbar is in floating mode (experimental feature)
  const isFloating = settings.floatingToolbar ?? false;

  // Position state - offset from center
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with state
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Set up react-dnd dragging on the drag handle
  const [{ isDragging }, dragRef, preview] = useDrag({
    type: TOOLBAR_TYPE,
    item: () => {
      return {
        type: TOOLBAR_TYPE,
        initialPosition: { ...positionRef.current },
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const differenceOffset = monitor.getDifferenceFromInitialOffset();

      if (
        differenceOffset &&
        (differenceOffset.x !== 0 || differenceOffset.y !== 0)
      ) {
        const newPosition = {
          x: item.initialPosition.x + differenceOffset.x,
          y: item.initialPosition.y + differenceOffset.y,
        };
        setPosition(newPosition);
      }
    },
  });

  // Connect the actual toolbar element as the drag preview
  useEffect(() => {
    const connectPreview = () => {
      if (toolbarRef.current) {
        preview(toolbarRef.current, {
          captureDraggingState: false,
          anchorX: 0.5,
          anchorY: 0.1,
        });
      }
    };
    const timer = setTimeout(connectPreview, 100);
    return () => clearTimeout(timer);
  }, [preview]);

  // Just use the saved position - don't try real-time updates
  const displayPosition = position;

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

  // Double click to reset position
  const handleDoubleClick = () => {
    setPosition({ x: 0, y: 0 });
  };

  // Organize tools into groups with headers
  const toolGroups = [
    {
      id: 'basic',
      label: 'Basic Tools',
      tools: [
        { id: 'select', icon: '👆', label: 'Select' },
        { id: 'measure', icon: '📏', label: 'Measure' },
        { id: 'note', icon: '📝', label: 'Note' },
        { id: 'focus', icon: '📷', label: 'Focus' },
      ],
    },
    {
      id: 'shapes',
      label: 'Drawing Shapes',
      tools: [
        { id: 'circle', icon: '⭕', label: 'Circle' },
        { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
        { id: 'cone', icon: '🔺', label: 'Cone' },
        { id: 'polygon', icon: '⬟', label: 'Polygon' },
        { id: 'line', icon: '➖', label: 'Line' },
      ],
    },
  ];

  const dmToolGroup = isHost
    ? {
        id: 'dm',
        label: 'DM Tools',
        tools: [
          { id: 'mask-create', icon: '🌟', label: 'Create Mask' },
          { id: 'mask-toggle', icon: '✨', label: 'Toggle Mask' },
          { id: 'mask-remove', icon: '🧽', label: 'Remove Mask' },
          { id: 'mask-show', icon: '👁', label: 'Show All' },
          { id: 'mask-hide', icon: '🙈', label: 'Hide All' },
          { id: 'grid', icon: '⊞', label: 'Grid' },
        ],
      }
    : null;

  const cameraControls = [
    {
      id: 'zoom-out',
      icon: '➖',
      label: 'Zoom Out',
      action: handleZoomOut,
      disabled: camera.zoom <= 0.1,
    },
    {
      id: 'zoom-reset',
      label: `${Math.round(camera.zoom * 100)}%`,
      action: handleZoomReset,
      className: 'zoom-display',
    },
    {
      id: 'zoom-in',
      icon: '➕',
      label: 'Zoom In',
      action: handleZoomIn,
      disabled: camera.zoom >= 5.0,
    },
  ];

  // Keyboard shortcut for compact mode (Ctrl/Cmd + Shift + T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setIsCompact((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={toolbarRef}
      className={`game-toolbar ${isFloating ? 'floating' : 'docked'} ${position.x !== 0 || position.y !== 0 ? 'positioned' : ''} ${isCompact ? 'compact' : ''} ${isDragging ? 'dragging' : ''}`}
      role="toolbar"
      style={
        {
          '--tw-translate-x': isFloating ? `${displayPosition.x}px` : '0',
          '--tw-translate-y': isFloating ? `${displayPosition.y}px` : '0',
          opacity: isDragging ? 0.3 : 1,
          transition: isDragging ? 'none' : 'all 0.2s ease',
          pointerEvents: 'auto',
        } as React.CSSProperties
      }
    >
      {/* Drag Handle and Compact Toggle - Only show in floating mode */}
      {isFloating && (
        <div className="toolbar-controls">
          <div
            ref={dragRef}
            className="toolbar-drag-handle"
            title="Drag to move | Double-click: reset position"
            onDoubleClick={handleDoubleClick}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
            }}
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
      )}

      <div className="toolbar-content">
        {isFloating ? (
          /* Floating Mode: Compact layout without labels */
          <>
            <div className="toolbar-row">
              <div className="toolbar-group">
                {toolGroups[0].tools.map((tool) => (
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
                ))}
              </div>

              <div className="toolbar-separator" />

              <div className="toolbar-group">
                {toolGroups[1].tools.map((tool) => (
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
                ))}
              </div>

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

            {isHost && dmToolGroup && (
              <div className="toolbar-row toolbar-row-secondary">
                <div className="toolbar-group">
                  {dmToolGroup.tools.map((tool) => (
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
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Docked Mode: Two-row layout with tooltips only */
          <div className="toolbar-docked-layout">
            {/* First Row - Basic Tools, Shapes, and View */}
            <div className="toolbar-docked-row">
              {toolGroups[0].tools.map((tool) => (
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
              ))}

              <div className="toolbar-separator" />

              {toolGroups[1].tools.map((tool) => (
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
              ))}

              <div className="toolbar-separator" />

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

            {/* Second Row - DM Tools (if host) */}
            {isHost && dmToolGroup && (
              <div className="toolbar-docked-row">
                {dmToolGroup.tools.map((tool) => (
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
