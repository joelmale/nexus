import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  useGameStore,
  useIsHost,
  useCamera,
  useActiveTool,
} from '@/stores/gameStore';

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

export const GameToolbar: React.FC = () => {
  const activeTool = useActiveTool();
  const isHost = useIsHost();
  const { updateCamera, setActiveTool } = useGameStore();
  const camera = useCamera();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [hoveredTool, setHoveredTool] = useState<ToolbarItem | null>(null);

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

  const renderToolButton = (tool: ToolbarItem) => {
    return (
      <button
        key={tool.id}
        data-id={tool.id}
        type="button"
        className={`toolbar-btn ${activeTool === tool.id ? 'active' : ''} ${
          tool.disabled ? 'disabled' : ''
        } ${tool.className || ''}`}
        onClick={tool.action ? tool.action : () => setActiveTool(tool.id)}
        disabled={tool.disabled}
        aria-pressed={activeTool === tool.id}
        onMouseEnter={() => setHoveredTool(tool)}
      >
        {tool.icon ? <span className="tool-icon">{tool.icon}</span> : tool.label}
      </button>
    );
  };

  return (
    <>
      <div id="toolbar-info-banner">
        {hoveredTool ? (
          <>
            <span>{hoveredTool.tooltip || hoveredTool.label}</span>
            {hoveredTool.shortcut && (
              <span className="shortcut">{hoveredTool.shortcut}</span>
            )}
          </>
        ) : (
          <span>Hover over a tool for information.</span>
        )}
      </div>

      <div
        ref={toolbarRef}
        className="game-toolbar"
        role="toolbar"
        onMouseLeave={() => setHoveredTool(null)}
      >
        <div className="toolbar-row">
          {toolGroups.flatMap(g => g.tools).map(renderToolButton)}
        </div>
        <div className="toolbar-row">
          {isHost && dmToolGroup && dmToolGroup.tools.map(renderToolButton)}
          {cameraControls.map(renderToolButton)}
        </div>
      </div>
    </>
  );
};

