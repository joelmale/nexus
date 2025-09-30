import React, { useState, useEffect } from 'react';
import { useActiveScene, useDrawingActions } from '@/stores/gameStore';
import { webSocketService } from '@/utils/websocket';
import type { DrawingStyle } from '@/types/drawing';

interface DrawingPropertiesPanelProps {
  selectedDrawingIds: string[];
  sceneId: string;
  onClose: () => void;
}

export const DrawingPropertiesPanel: React.FC<DrawingPropertiesPanelProps> = ({
  selectedDrawingIds,
  sceneId,
  onClose,
}) => {
  const activeScene = useActiveScene();
  const { updateDrawing, deleteDrawing } = useDrawingActions();

  // Get the selected drawings
  const selectedDrawings =
    activeScene?.drawings.filter((d) => selectedDrawingIds.includes(d.id)) ||
    [];

  // For single selection, use the drawing's style
  // For multi-selection, use the first drawing's style as default
  const firstDrawing = selectedDrawings[0];

  const [fillColor, setFillColor] = useState(
    firstDrawing?.style.fillColor || '#ff0000',
  );
  const [fillOpacity, setFillOpacity] = useState(
    firstDrawing?.style.fillOpacity ?? 0.3,
  );
  const [strokeColor, setStrokeColor] = useState(
    firstDrawing?.style.strokeColor || '#000000',
  );
  const [strokeWidth, setStrokeWidth] = useState(
    firstDrawing?.style.strokeWidth || 2,
  );

  // Update local state when selection changes
  useEffect(() => {
    if (firstDrawing) {
      setFillColor(firstDrawing.style.fillColor);
      setFillOpacity(firstDrawing.style.fillOpacity);
      setStrokeColor(firstDrawing.style.strokeColor);
      setStrokeWidth(firstDrawing.style.strokeWidth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    firstDrawing?.id,
    firstDrawing?.style.fillColor,
    firstDrawing?.style.fillOpacity,
    firstDrawing?.style.strokeColor,
    firstDrawing?.style.strokeWidth,
  ]);

  if (!activeScene || selectedDrawings.length === 0) {
    return null;
  }

  const handleStyleUpdate = (styleUpdates: Partial<DrawingStyle>) => {
    selectedDrawingIds.forEach((drawingId) => {
      const updates = { style: { ...firstDrawing.style, ...styleUpdates } };
      updateDrawing(sceneId, drawingId, updates);

      // Sync to other players
      webSocketService.sendEvent({
        type: 'drawing/update',
        data: {
          sceneId,
          drawingId,
          updates,
        },
      });
    });
  };

  const handleDelete = () => {
    selectedDrawingIds.forEach((drawingId) => {
      deleteDrawing(sceneId, drawingId);

      // Sync to other players
      webSocketService.sendEvent({
        type: 'drawing/delete',
        data: {
          sceneId,
          drawingId,
        },
      });
    });
    onClose();
  };

  const handleFillColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setFillColor(newColor);
    handleStyleUpdate({ fillColor: newColor });
  };

  const handleFillOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setFillOpacity(newOpacity);
    handleStyleUpdate({ fillOpacity: newOpacity });
  };

  const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setStrokeColor(newColor);
    handleStyleUpdate({ strokeColor: newColor });
  };

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseFloat(e.target.value);
    setStrokeWidth(newWidth);
    handleStyleUpdate({ strokeWidth: newWidth });
  };

  return (
    <div className="drawing-properties-panel">
      <div className="panel-header">
        <h3>
          {selectedDrawings.length === 1
            ? `Edit ${firstDrawing.type}`
            : `Edit ${selectedDrawings.length} drawings`}
        </h3>
        <button
          type="button"
          className="close-btn"
          onClick={onClose}
          aria-label="Close properties panel"
        >
          ×
        </button>
      </div>

      <div className="panel-content">
        {/* Fill Color */}
        <div className="property-group">
          <label htmlFor="fill-color">Fill Color</label>
          <div className="color-input-group">
            <input
              id="fill-color"
              type="color"
              value={fillColor}
              onChange={handleFillColorChange}
              className="color-picker"
            />
            <input
              type="text"
              value={fillColor}
              onChange={handleFillColorChange}
              className="color-text"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Fill Opacity */}
        <div className="property-group">
          <label htmlFor="fill-opacity">
            Fill Opacity: {Math.round(fillOpacity * 100)}%
          </label>
          <input
            id="fill-opacity"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={fillOpacity}
            onChange={handleFillOpacityChange}
            className="slider"
          />
        </div>

        {/* Stroke Color */}
        <div className="property-group">
          <label htmlFor="stroke-color">Border Color</label>
          <div className="color-input-group">
            <input
              id="stroke-color"
              type="color"
              value={strokeColor}
              onChange={handleStrokeColorChange}
              className="color-picker"
            />
            <input
              type="text"
              value={strokeColor}
              onChange={handleStrokeColorChange}
              className="color-text"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Stroke Width */}
        <div className="property-group">
          <label htmlFor="stroke-width">
            Border Width: {strokeWidth.toFixed(1)}px
          </label>
          <input
            id="stroke-width"
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={strokeWidth}
            onChange={handleStrokeWidthChange}
            className="slider"
          />
        </div>

        {/* Delete Button */}
        <div className="property-group">
          <button
            type="button"
            className="delete-btn"
            onClick={handleDelete}
            aria-label={`Delete ${selectedDrawings.length} drawing(s)`}
          >
            🗑️ Delete{' '}
            {selectedDrawings.length > 1 ? `(${selectedDrawings.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
