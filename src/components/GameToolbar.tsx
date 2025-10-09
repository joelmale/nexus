import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import {
  useGameStore,
  useIsHost,
  useCamera,
  useActiveTool,
} from '@/stores/gameStore';

interface Position {
  x: number;
  y: number;
}

const TOOLBAR_TYPE = 'GAME_TOOLBAR';

export const GameToolbar: React.FC = () => {
  const activeTool = useActiveTool();
  const [isCompact, setIsCompact] = useState(false);
  const isHost = useIsHost();
  const { updateCamera, settings, setActiveTool } = useGameStore();
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
        {
          id: 'select',
          icon: '👆',
          label: 'Select / Move',
          tooltip:
            'Select and move objects. Hold Shift+drag OR Cmd/Ctrl+click for multi-select',
        },
        { id: 'pan', icon: '✋', label: 'Pan' },
        { id: 'copy', icon: '📋', label: 'Copy' },
        { id: 'cut', icon: '✂️', label: 'Cut' },
        { id: 'paste', icon: '📄', label: 'Paste' },
        { id: 'measure', icon: '📏', label: 'Measure' },
        { id: 'note', icon: '📝', label: 'Note' },
        { id: 'ping', icon: '📍', label: 'Ping' },
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
          { id: 'mask-show', icon: '👁', label: 'Reveal Scene' },
          { id: 'mask-hide', icon: '🙈', label: 'Hide Scene' },
          { id: 'grid-align', icon: '📐', label: 'Grid Alignment' },
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
      onClick={(e) => {
        console.log('🔧 GameToolbar div clicked!', e.target);
      }}
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
            ref={dragRef as unknown as React.Ref<HTMLDivElement>}
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
            <div className="flex gap-2 mb-2">
              <div className="flex gap-1">
                {toolGroups[0].tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={`
                      unstyled px-3 py-2 rounded-lg text-base transition-all duration-150
                      ${
                        activeTool === tool.id
                          ? 'bg-gradient-to-b from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-500/50 translate-y-0'
                          : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-white hover:shadow-lg active:translate-y-0.5 active:shadow-sm'
                      }
                    `}
                    onClick={() => setActiveTool(tool.id)}
                    aria-pressed={activeTool === tool.id}
                    title={
                      'tooltip' in tool
                        ? `${tool.label}\n\n${tool.tooltip}`
                        : tool.label
                    }
                  >
                    {tool.icon}
                  </button>
                ))}
              </div>

              <div className="w-px bg-gray-600" />

              <div className="flex gap-1">
                {toolGroups[1].tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={`
                      unstyled px-3 py-2 rounded-lg text-base transition-all duration-150
                      ${
                        activeTool === tool.id
                          ? 'bg-gradient-to-b from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-500/50 translate-y-0'
                          : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-white hover:shadow-lg active:translate-y-0.5 active:shadow-sm'
                      }
                    `}
                    onClick={() => {
                      console.log('🔧 Toolbar: Setting tool to', tool.id);
                      setActiveTool(tool.id);
                    }}
                    aria-pressed={activeTool === tool.id}
                    title={tool.label}
                  >
                    {tool.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {isHost && dmToolGroup && (
                <>
                  <div className="flex gap-1">
                    {dmToolGroup.tools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        className={`
                          unstyled px-3 py-2 rounded-lg text-base transition-all duration-150
                          ${
                            activeTool === tool.id
                              ? 'bg-gradient-to-b from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-400/50 translate-y-0'
                              : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-white hover:shadow-lg active:translate-y-0.5 active:shadow-sm'
                          }
                        `}
                        onClick={() => setActiveTool(tool.id)}
                        aria-pressed={activeTool === tool.id}
                        title={tool.label}
                      >
                        {tool.icon}
                      </button>
                    ))}
                  </div>

                  <div className="w-px bg-gray-600" />
                </>
              )}

              <div className="flex gap-1">
                {cameraControls.map((control) => (
                  <button
                    key={control.id}
                    type="button"
                    className="unstyled px-3 py-2 rounded-lg text-sm transition-all duration-150 bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-gray-200 hover:shadow-lg active:translate-y-0.5 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={control.action}
                    title={control.label}
                    disabled={control.disabled}
                  >
                    {control.icon ? control.icon : control.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Docked Mode: Two-row layout with tooltips only */
          <div className="flex flex-col gap-2">
            {/* First Row - Basic Tools and Shapes */}
            <div className="flex gap-2 items-center">
              {toolGroups[0].tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={`
                    unstyled px-3 py-2 rounded-lg text-base transition-all duration-150
                    ${
                      activeTool === tool.id
                        ? 'bg-gradient-to-b from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-500/50 translate-y-0'
                        : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-white hover:shadow-lg active:translate-y-0.5 active:shadow-sm'
                    }
                  `}
                  onClick={() => setActiveTool(tool.id)}
                  aria-pressed={activeTool === tool.id}
                  title={
                    'tooltip' in tool
                      ? `${tool.label}\n\n${tool.tooltip}`
                      : tool.label
                  }
                >
                  {tool.icon}
                </button>
              ))}

              <div className="w-px h-8 bg-gray-600" />

              {toolGroups[1].tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={`
                    unstyled px-3 py-2 rounded-lg text-base transition-all duration-150
                    ${
                      activeTool === tool.id
                        ? 'bg-gradient-to-b from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-400/50 translate-y-0'
                        : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-white hover:shadow-lg active:translate-y-0.5 active:shadow-sm'
                    }
                  `}
                  onClick={() => {
                    console.log('🔧 Toolbar: Setting tool to', tool.id);
                    setActiveTool(tool.id);
                  }}
                  aria-pressed={activeTool === tool.id}
                  title={tool.label}
                >
                  {tool.icon}
                </button>
              ))}
            </div>

            {/* Second Row - DM Tools (if host) and Camera Controls */}
            <div className="flex gap-2 items-center">
              {isHost && dmToolGroup && (
                <>
                  {dmToolGroup.tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      className={`
                        unstyled px-3 py-2 rounded-lg text-base transition-all duration-150
                        ${
                          activeTool === tool.id
                            ? 'bg-gradient-to-b from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-400/50 translate-y-0'
                            : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-white hover:shadow-lg active:translate-y-0.5 active:shadow-sm'
                        }
                      `}
                      onClick={() => setActiveTool(tool.id)}
                      aria-pressed={activeTool === tool.id}
                      title={tool.label}
                    >
                      {tool.icon}
                    </button>
                  ))}

                  <div className="w-px h-8 bg-gray-600" />
                </>
              )}

              {cameraControls.map((control) => (
                <button
                  key={control.id}
                  type="button"
                  className="unstyled px-3 py-2 rounded-lg text-sm transition-all duration-150 bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-gray-200 hover:shadow-lg active:translate-y-0.5 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={control.action}
                  title={control.label}
                  disabled={control.disabled}
                >
                  {control.icon ? control.icon : control.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
