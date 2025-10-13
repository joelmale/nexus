import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useDrag } from 'react-dnd';
import {
  useGameStore,
  useIsHost,
  useCamera,
  useActiveTool,
} from '@/stores/gameStore';
import { Tooltip } from './Tooltip';

interface Position {
  x: number;
  y: number;
}

interface ToolbarItem {
  id: string;
  icon?: string;
  label: string;
  shortcut?: string;
  tooltip?: string;
  className?: string;
  disabled?: boolean;
  action?: () => void;
}

interface ToolbarGroup {
  id: string;
  label: string;
  tools: ToolbarItem[];
}

const TOOLBAR_TYPE = 'GAME_TOOLBAR';

export const GameToolbar: React.FC = () => {
  const activeTool = useActiveTool();
  const [isCompact, setIsCompact] = useState(false);
  const isHost = useIsHost();
  const { updateCamera, settings, setActiveTool } = useGameStore();
  const camera = useCamera();

  const isFloating = settings.floatingToolbar ?? false;

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const [{ isDragging }, dragRef, preview] = useDrag({
    type: TOOLBAR_TYPE,
    item: () => ({
      type: TOOLBAR_TYPE,
      initialPosition: { ...positionRef.current },
    }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
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

  useEffect(() => {
    if (toolbarRef.current) {
      preview(toolbarRef.current, {
        captureDraggingState: false,
        anchorX: 0.5,
        anchorY: 0.1,
      });
    }
  }, [preview]);

  const displayPosition = position;

  const handleZoomIn = useCallback(
    () => updateCamera({ zoom: Math.min(5.0, camera.zoom * 1.2) }),
    [camera.zoom, updateCamera],
  );
  const handleZoomOut = useCallback(
    () => updateCamera({ zoom: Math.max(0.1, camera.zoom / 1.2) }),
    [camera.zoom, updateCamera],
  );
  const handleZoomReset = useCallback(
    () => updateCamera({ x: 0, y: 0, zoom: 1.0 }),
    [updateCamera],
  );
  const handleDoubleClick = () => setPosition({ x: 0, y: 0 });

  const toolGroups: ToolbarGroup[] = useMemo(
    () => [
      {
        id: 'basic',
        label: 'Basic Tools',
        tools: [
          {
            id: 'select',
            icon: '👆',
            label: 'Select / Move',
            shortcut: 'V',
            tooltip:
              'Select and move objects. Hold Shift+drag OR Cmd/Ctrl+click for multi-select',
          },
          { id: 'pan', icon: '✋', label: 'Pan', shortcut: 'H' },
          { id: 'copy', icon: '📋', label: 'Copy', shortcut: 'Ctrl+C' },
          { id: 'cut', icon: '✂️', label: 'Cut', shortcut: 'Ctrl+X' },
          { id: 'paste', icon: '📄', label: 'Paste', shortcut: 'Ctrl+V' },
          { id: 'measure', icon: '📏', label: 'Measure', shortcut: 'M' },
          { id: 'note', icon: '📝', label: 'Note' },
          { id: 'ping', icon: '📍', label: 'Ping', shortcut: 'P' },
        ],
      },
      {
        id: 'shapes',
        label: 'Drawing Shapes',
        tools: [
          { id: 'circle', icon: '⭕', label: 'Circle', shortcut: 'O' },
          { id: 'rectangle', icon: '⬜', label: 'Rectangle', shortcut: 'R' },
          { id: 'cone', icon: '🔺', label: 'Cone' },
          { id: 'polygon', icon: '⬟', label: 'Polygon' },
          { id: 'line', icon: '➖', label: 'Line', shortcut: 'L' },
        ],
      },
    ],
    [],
  );

  const dmToolGroup: ToolbarGroup | null = useMemo(
    () =>
      isHost
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
        : null,
    [isHost],
  );

  const cameraControls: ToolbarItem[] = useMemo(
    () => [
      {
        id: 'zoom-out',
        icon: '➖',
        label: 'Zoom Out',
        action: handleZoomOut,
        disabled: camera.zoom <= 0.1,
        shortcut: '-',
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
        shortcut: '+',
      },
    ],
    [camera.zoom, handleZoomOut, handleZoomIn, handleZoomReset],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setIsCompact((prev) => !prev);
        return;
      }

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      const allTools = [
        ...toolGroups.flatMap((g) => g.tools),
        ...(dmToolGroup ? dmToolGroup.tools : []),
      ];
      const tool = allTools.find(
        (t) =>
          t.shortcut &&
          t.shortcut.toUpperCase() === key &&
          !t.shortcut.includes('+'),
      );

      if (tool) {
        e.preventDefault();
        setActiveTool(tool.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, toolGroups, dmToolGroup]);

  const renderToolButton = (tool: any) => {
    const tooltipText = `${tool.label}${tool.shortcut ? `<span class="shortcut">${tool.shortcut}</span>` : ''}`;
    return (
      <Tooltip text={tooltipText} key={tool.id}>
        <button
          type="button"
          className={`unstyled px-3 py-2 rounded-lg text-base transition-all duration-150 ${
            activeTool === tool.id
              ? 'bg-gradient-to-b from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-500/50 translate-y-0'
              : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-white hover:shadow-lg active:translate-y-0.5 active:shadow-sm'
          }`}
          onClick={() => setActiveTool(tool.id)}
          aria-pressed={activeTool === tool.id}
        >
          {tool.icon}
        </button>
      </Tooltip>
    );
  };

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
          <>
            <div className="flex gap-2 mb-2">
              <div className="flex gap-1">
                {toolGroups[0].tools.map(renderToolButton)}
              </div>
              <div className="w-px bg-gray-600" />
              <div className="flex gap-1">
                {toolGroups[1].tools.map(renderToolButton)}
              </div>
            </div>
            <div className="flex gap-2">
              {isHost && dmToolGroup && (
                <>
                  <div className="flex gap-1">
                    {dmToolGroup.tools.map(renderToolButton)}
                  </div>
                  <div className="w-px bg-gray-600" />
                </>
              )}
              <div className="flex gap-1">
                {cameraControls.map((control) => (
                  <Tooltip
                    text={`${control.label}${control.shortcut ? `<span class="shortcut">${control.shortcut}</span>` : ''}`}
                    key={control.id}
                  >
                    <button
                      type="button"
                      className="unstyled px-3 py-2 rounded-lg text-sm transition-all duration-150 bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-gray-200 hover:shadow-lg active:translate-y-0.5 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={control.action}
                      disabled={control.disabled}
                    >
                      {control.icon ? control.icon : control.label}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              {toolGroups[0].tools.map(renderToolButton)}
              <div className="w-px h-8 bg-gray-600" />
              {toolGroups[1].tools.map(renderToolButton)}
            </div>
            <div className="flex gap-2 items-center">
              {isHost && dmToolGroup && (
                <>
                  {dmToolGroup.tools.map(renderToolButton)}
                  <div className="w-px h-8 bg-gray-600" />
                </>
              )}
              {cameraControls.map((control) => (
                <Tooltip
                  text={`${control.label}${control.shortcut ? `<span class="shortcut">${control.shortcut}</span>` : ''}`}
                  key={control.id}
                >
                  <button
                    type="button"
                    className="unstyled px-3 py-2 rounded-lg text-sm transition-all duration-150 bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-md hover:from-gray-600 hover:to-gray-700 hover:text-gray-200 hover:shadow-lg active:translate-y-0.5 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={control.action}
                    disabled={control.disabled}
                  >
                    {control.icon ? control.icon : control.label}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
