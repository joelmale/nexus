import React, { useState } from 'react';
import { useIsHost } from '@/stores/gameStore';
import type {
  DrawingTool,
  DrawingStyle,
  MeasurementTool,
} from '@/types/drawing';

export interface ToolbarProps {
  activeTool:
    | DrawingTool
    | MeasurementTool
    | 'select'
    | 'pan'
    | 'move'
    | 'copy'
    | 'cut'
    | 'paste';
  onToolChange: (
    tool:
      | DrawingTool
      | MeasurementTool
      | 'select'
      | 'pan'
      | 'move'
      | 'copy'
      | 'cut'
      | 'paste',
  ) => void;
  drawingStyle: DrawingStyle;
  onStyleChange: (style: Partial<DrawingStyle>) => void;
}

export const SceneCanvasToolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  drawingStyle,
  onStyleChange,
}) => {
  const isHost = useIsHost();
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showDMPanel, setShowDMPanel] = useState(false);

  const basicTools = [
    { id: 'select', icon: '👆', label: 'Select/Move', shortcut: 'V' },
    { id: 'pan', icon: '✋', label: 'Pan', shortcut: 'H' },
    { id: 'measure', icon: '📏', label: 'Measure', shortcut: 'M' },
  ];

  const drawingTools = [
    { id: 'pencil', icon: '✏️', label: 'Freehand', shortcut: 'P' },
    { id: 'line', icon: '📏', label: 'Line', shortcut: 'L' },
    { id: 'rectangle', icon: '⬜', label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: '⭕', label: 'Circle', shortcut: 'C' },
    { id: 'polygon', icon: '🔷', label: 'Polygon', shortcut: 'G' },
  ];

  const dndTools = [
    { id: 'cone', icon: '🔺', label: 'Cone (D&D)', shortcut: 'N' },
    { id: 'aoe-sphere', icon: '🌐', label: 'Sphere AoE', shortcut: 'S' },
    { id: 'aoe-cube', icon: '🧊', label: 'Cube AoE', shortcut: 'U' },
    { id: 'aoe-cylinder', icon: '🥫', label: 'Cylinder AoE', shortcut: 'Y' },
    { id: 'aoe-line', icon: '➡️', label: 'Line AoE', shortcut: 'I' },
  ];

  const dmOnlyTools = [
    { id: 'fog-of-war', icon: '🌫️', label: 'Fog of War', shortcut: 'F' },
    {
      id: 'dynamic-lighting',
      icon: '💡',
      label: 'Dynamic Light',
      shortcut: 'D',
    },
    { id: 'vision-blocking', icon: '🚫', label: 'Vision Block', shortcut: 'B' },
    { id: 'dm-notes', icon: '📝', label: 'DM Notes', shortcut: 'T' },
  ];

  const utilityTools = [
    { id: 'text', icon: '📝', label: 'Text', shortcut: 'T' },
    { id: 'eraser', icon: '🧽', label: 'Eraser', shortcut: 'E' },
    { id: 'clear-all', icon: '🗑️', label: 'Clear All', shortcut: 'Del' },
  ];

  const handleToolClick = (toolId: string) => {
    if (toolId === 'clear-all') {
      if (window.confirm('Clear all drawings? This cannot be undone.')) {
        // TODO: Implement clear all functionality
        console.log('Clear all drawings');
      }
      return;
    }
    onToolChange(toolId as DrawingTool | MeasurementTool | 'select' | 'pan');
  };

  const ToolButton: React.FC<{
    tool: { id: string; icon: string; label: string; shortcut: string };
    isActive?: boolean;
    disabled?: boolean;
  }> = ({ tool, isActive = false, disabled = false }) => (
    <button
      className={`toolbar-btn ${
        isActive ? 'active' : ''
      } ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && handleToolClick(tool.id)}
      title={`${tool.label} (${tool.shortcut})`}
      disabled={disabled}
    >
      <span className="tool-icon">{tool.icon}</span>
      <span className="tool-label">{tool.label}</span>
    </button>
  );

  return (
    <div className="scene-canvas-toolbar">
      {/* Basic Tools */}
      <div className="toolbar-section">
        <div className="toolbar-section-label">Navigation</div>
        <div className="toolbar-buttons">
          {basicTools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={activeTool === tool.id}
            />
          ))}
        </div>
      </div>

      {/* Drawing Tools */}
      <div className="toolbar-section">
        <div className="toolbar-section-label">Drawing</div>
        <div className="toolbar-buttons">
          {drawingTools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={activeTool === tool.id}
            />
          ))}
        </div>
      </div>

      {/* D&D 5e Specific Tools */}
      <div className="toolbar-section">
        <div className="toolbar-section-label">D&D Effects</div>
        <div className="toolbar-buttons">
          {dndTools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={activeTool === tool.id}
            />
          ))}
        </div>
      </div>

      {/* DM Only Tools */}
      {isHost && (
        <div className="toolbar-section">
          <div className="toolbar-section-label">DM Tools</div>
          <div className="toolbar-buttons">
            {dmOnlyTools.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                isActive={activeTool === tool.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Utility Tools */}
      <div className="toolbar-section">
        <div className="toolbar-section-label">Utility</div>
        <div className="toolbar-buttons">
          {utilityTools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={activeTool === tool.id}
              disabled={tool.id === 'clear-all' && !isHost}
            />
          ))}
        </div>
      </div>

      {/* Style Panel Toggle */}
      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${showStylePanel ? 'active' : ''}`}
          onClick={() => setShowStylePanel(!showStylePanel)}
          title="Style Options"
        >
          <span className="tool-icon">🎨</span>
          <span className="tool-label">Style</span>
        </button>
      </div>

      {/* Style Panel */}
      {showStylePanel && (
        <div className="style-panel">
          <div className="style-section">
            <h4>Fill</h4>
            <div className="style-controls">
              <label>
                <input
                  type="color"
                  value={drawingStyle.fillColor}
                  onChange={(e) => onStyleChange({ fillColor: e.target.value })}
                />
                Fill Color
              </label>
              <label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={drawingStyle.fillOpacity}
                  onChange={(e) =>
                    onStyleChange({ fillOpacity: parseFloat(e.target.value) })
                  }
                />
                Fill Opacity: {Math.round(drawingStyle.fillOpacity * 100)}%
              </label>
            </div>
          </div>

          <div className="style-section">
            <h4>Stroke</h4>
            <div className="style-controls">
              <label>
                <input
                  type="color"
                  value={drawingStyle.strokeColor}
                  onChange={(e) =>
                    onStyleChange({ strokeColor: e.target.value })
                  }
                />
                Stroke Color
              </label>
              <label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={drawingStyle.strokeWidth}
                  onChange={(e) =>
                    onStyleChange({ strokeWidth: parseInt(e.target.value) })
                  }
                />
                Width: {drawingStyle.strokeWidth}px
              </label>
              <label>
                <select
                  value={drawingStyle.strokeDashArray || 'solid'}
                  onChange={(e) =>
                    onStyleChange({
                      strokeDashArray:
                        e.target.value === 'solid' ? undefined : e.target.value,
                    })
                  }
                >
                  <option value="solid">Solid</option>
                  <option value="5,5">Dashed</option>
                  <option value="2,3">Dotted</option>
                  <option value="10,5,2,5">Dash-Dot</option>
                </select>
                Line Style
              </label>
            </div>
          </div>

          {/* D&D Specific Settings */}
          {(activeTool === 'cone' || activeTool.startsWith('aoe-')) && (
            <div className="style-section">
              <h4>D&D Settings</h4>
              <div className="style-controls">
                <label>
                  <select
                    value={drawingStyle.dndSpellLevel || '1'}
                    onChange={(e) =>
                      onStyleChange({ dndSpellLevel: parseInt(e.target.value) })
                    }
                  >
                    <option value="0">Cantrip</option>
                    <option value="1">1st Level</option>
                    <option value="2">2nd Level</option>
                    <option value="3">3rd Level</option>
                    <option value="4">4th Level</option>
                    <option value="5">5th Level</option>
                    <option value="6">6th Level</option>
                    <option value="7">7th Level</option>
                    <option value="8">8th Level</option>
                    <option value="9">9th Level</option>
                  </select>
                  Spell Level
                </label>

                {activeTool === 'cone' && (
                  <div className="dnd-cone-info">
                    <p>
                      📐 <strong>Cone Rules (5e):</strong>
                    </p>
                    <p>• 15-foot cone for most spells</p>
                    <p>• 30-foot cone for higher level spells</p>
                    <p>• Width equals distance at any point</p>
                  </div>
                )}

                {activeTool === 'aoe-sphere' && (
                  <label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      step="5"
                      value={drawingStyle.aoeRadius || 20}
                      onChange={(e) =>
                        onStyleChange({ aoeRadius: parseInt(e.target.value) })
                      }
                    />
                    Radius (feet)
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DM Panel Toggle */}
      {isHost && (
        <div className="toolbar-section">
          <button
            className={`toolbar-btn ${showDMPanel ? 'active' : ''}`}
            onClick={() => setShowDMPanel(!showDMPanel)}
            title="DM Controls"
          >
            <span className="tool-icon">👑</span>
            <span className="tool-label">DM</span>
          </button>
        </div>
      )}

      {/* Enhanced DM Panel with Drawing Controls */}
      {isHost && showDMPanel && (
        <div className="dm-panel">
          <div className="dm-section">
            <h4>Drawing Sharing Controls</h4>
            <div className="dm-controls">
              <label>
                <input
                  type="checkbox"
                  checked={drawingStyle.visibleToPlayers !== false}
                  onChange={(e) =>
                    onStyleChange({ visibleToPlayers: e.target.checked })
                  }
                />
                Share New Drawings with Players
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={drawingStyle.dmNotesOnly || false}
                  onChange={(e) =>
                    onStyleChange({ dmNotesOnly: e.target.checked })
                  }
                />
                DM Notes Only (Private)
              </label>
              <div className="dm-quick-actions">
                <button
                  className="btn btn-small"
                  onClick={() => {
                    // TODO: Implement toggle all drawings visibility
                    console.log('Toggle all drawings visibility');
                  }}
                >
                  Toggle All Visibility
                </button>
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Clear all drawings? This cannot be undone.',
                      )
                    ) {
                      // TODO: Implement clear all drawings
                      console.log('Clear all drawings');
                    }
                  }}
                >
                  Clear All Drawings
                </button>
              </div>
            </div>
          </div>

          <div className="dm-section">
            <h4>Visibility Controls</h4>
            <div className="dm-controls">
              <label>
                <input
                  type="checkbox"
                  // TODO: Connect to fog of war state
                  defaultChecked={false}
                />
                Fog of War Enabled
              </label>
              <label>
                <input
                  type="checkbox"
                  // TODO: Connect to dynamic lighting state
                  defaultChecked={true}
                />
                Dynamic Lighting Enabled
              </label>
              <label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  // TODO: Connect to fog density state
                />
                Fog Density: 50%
              </label>
            </div>
          </div>

          <div className="dm-section">
            <h4>Quick Actions</h4>
            <div className="dm-controls">
              <button className="btn btn-small">Reveal All</button>
              <button className="btn btn-small">Hide All</button>
              <button className="btn btn-small">Reset Fog</button>
              <button className="btn btn-small">Toggle Grid</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
