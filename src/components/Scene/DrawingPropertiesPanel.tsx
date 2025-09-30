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
    firstDrawing?.style.fillOpacity ?? 0.5,
  );
  const [strokeColor, setStrokeColor] = useState(
    firstDrawing?.style.strokeColor || '#000000',
  );
  const [strokeWidth, setStrokeWidth] = useState(
    firstDrawing?.style.strokeWidth || 5,
  );
  const [strokeDashArray, setStrokeDashArray] = useState(
    firstDrawing?.style.strokeDashArray || undefined,
  );

  // Update local state when selection changes
  useEffect(() => {
    if (firstDrawing) {
      setFillColor(firstDrawing.style.fillColor);
      setFillOpacity(firstDrawing.style.fillOpacity);
      setStrokeColor(firstDrawing.style.strokeColor);
      setStrokeWidth(firstDrawing.style.strokeWidth);
      setStrokeDashArray(firstDrawing.style.strokeDashArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    firstDrawing?.id,
    firstDrawing?.style.fillColor,
    firstDrawing?.style.fillOpacity,
    firstDrawing?.style.strokeColor,
    firstDrawing?.style.strokeWidth,
    firstDrawing?.style.strokeDashArray,
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

  const handleBorderStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newDashArray = value === 'dashed' ? '5,5' : undefined;
    setStrokeDashArray(newDashArray);
    handleStyleUpdate({ strokeDashArray: newDashArray });
  };

  return (
    <div
      className="absolute top-5 right-5 w-[300px] border border-white/10 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-[1000] backdrop-blur-md animate-[slideInRight_0.3s_ease]"
      style={{
        background:
          'linear-gradient(135deg, rgba(var(--color-surface-rgb, 42, 42, 62), 0.8) 0%, rgba(var(--color-background-rgb, 32, 32, 52), 0.8) 100%)',
      }}
    >
      <style>
        {`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
      <div className="flex justify-between items-center p-4 border-b border-white/10">
        <h3 className="m-0 text-base font-semibold text-[var(--glass-text,#e0e0e0)] capitalize">
          {selectedDrawings.length === 1
            ? `Edit ${firstDrawing.type}`
            : `Edit ${selectedDrawings.length} drawings`}
        </h3>
        <button
          type="button"
          className="bg-transparent border-none text-[var(--glass-text,#e0e0e0)] text-2xl leading-none cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded transition-all duration-200 hover:bg-white/10 hover:text-[var(--color-primary,#00bcd4)]"
          onClick={onClose}
          aria-label="Close properties panel"
        >
          ×
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-120px)]">
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

        {/* Border Style */}
        <div className="property-group">
          <label htmlFor="border-style">Border Style</label>
          <select
            id="border-style"
            value={strokeDashArray ? 'dashed' : 'solid'}
            onChange={handleBorderStyleChange}
            className="color-text"
            style={{ cursor: 'pointer' }}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
          </select>
        </div>

        {/* Delete Button */}
        <div className="property-group">
          <button
            type="button"
            className="px-4 py-2.5 bg-red-500/20 border border-red-500/40 rounded-md text-red-400 text-sm font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 hover:bg-red-500/30 hover:border-red-500/60 hover:text-red-300 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)] active:translate-y-0"
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
