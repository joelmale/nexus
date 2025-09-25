import React, { useCallback, useState, useEffect } from 'react';
import { dndUtils, type Point, type Measurement } from '@/types/drawing';
import type { Camera } from '@/types/game';

interface MeasurementToolProps {
  isActive: boolean;
  camera: Camera;
  gridSize: number;
  onMeasurement: (measurement: Measurement) => void;
  svgRef: React.RefObject<SVGSVGElement>;
}

export const MeasurementTool: React.FC<MeasurementToolProps> = ({
  isActive,
  camera,
  gridSize,
  onMeasurement,
  svgRef
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // Convert screen coordinates to scene coordinates
  const screenToScene = useCallback((screenX: number, screenY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = screenX - rect.left;
    const svgY = screenY - rect.top;
    
    // Account for camera transform
    const sceneX = (svgX - rect.width / 2) / camera.zoom + camera.x;
    const sceneY = (svgY - rect.height / 2) / camera.zoom + camera.y;
    
    return { x: sceneX, y: sceneY };
  }, [camera, svgRef]);

  // Handle mouse events for measurement
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive || e.button !== 0) return;
    
    const point = screenToScene(e.clientX, e.clientY);
    setStartPoint(point);
    setCurrentPoint(point);
    setIsDrawing(true);
    e.stopPropagation();
  }, [isActive, screenToScene]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return;
    
    const point = screenToScene(e.clientX, e.clientY);
    setCurrentPoint(point);
    e.stopPropagation();
  }, [isDrawing, startPoint, screenToScene]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return;
    
    const endPoint = screenToScene(e.clientX, e.clientY);
    
    // Calculate distance using D&D 5e diagonal rules
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const feetDistance = dndUtils.calculateDiagonalDistance(deltaX, deltaY, gridSize);
    const gridDistance = Math.round(feetDistance / 5);
    
    // Create measurement
    const measurement: Measurement = {
      id: `measurement-${Date.now()}`,
      start: startPoint,
      end: endPoint,
      distance: feetDistance,
      gridDistance,
      createdAt: Date.now(),
      createdBy: 'current-user',
      temporary: true,
    };
    
    // Add to measurements and notify parent
    setMeasurements(prev => [...prev, measurement]);
    onMeasurement(measurement);
    
    // Reset drawing state
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    
    // Auto-remove temporary measurements after 5 seconds
    setTimeout(() => {
      setMeasurements(prev => prev.filter(m => m.id !== measurement.id));
    }, 5000);
    
    e.stopPropagation();
  }, [isDrawing, startPoint, screenToScene, gridSize, onMeasurement]);

  // Clear measurements when tool becomes inactive
  useEffect(() => {
    if (!isActive) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
      setMeasurements(prev => prev.filter(m => !m.temporary));
    }
  }, [isActive]);

  // Calculate current measurement while drawing
  const getCurrentMeasurement = useCallback(() => {
    if (!startPoint || !currentPoint) return null;
    
    const deltaX = currentPoint.x - startPoint.x;
    const deltaY = currentPoint.y - startPoint.y;
    const feetDistance = dndUtils.calculateDiagonalDistance(deltaX, deltaY, gridSize);
    const gridDistance = Math.round(feetDistance / 5);
    
    return { feetDistance, gridDistance };
  }, [startPoint, currentPoint, gridSize]);

  const currentMeasurement = getCurrentMeasurement();

  // Render measurement overlays
  const renderMeasurement = (measurement: Measurement, isCurrent = false) => {
    const midPoint = {
      x: (measurement.start.x + measurement.end.x) / 2,
      y: (measurement.start.y + measurement.end.y) / 2
    };

    return (
      <g key={measurement.id} className={`measurement ${isCurrent ? 'current' : 'completed'}`}>
        {/* Measurement line */}
        <line
          x1={measurement.start.x}
          y1={measurement.start.y}
          x2={measurement.end.x}
          y2={measurement.end.y}
          stroke={isCurrent ? '#00ff00' : '#ffff00'}
          strokeWidth={2 / camera.zoom}
          strokeDasharray={isCurrent ? '5,3' : 'none'}
          markerEnd="url(#measurement-arrow)"
        />
        
        {/* Start point */}
        <circle
          cx={measurement.start.x}
          cy={measurement.start.y}
          r={4 / camera.zoom}
          fill={isCurrent ? '#00ff00' : '#ffff00'}
          stroke="#000000"
          strokeWidth={1 / camera.zoom}
        />
        
        {/* End point */}
        <circle
          cx={measurement.end.x}
          cy={measurement.end.y}
          r={4 / camera.zoom}
          fill={isCurrent ? '#00ff00' : '#ffff00'}
          stroke="#000000"
          strokeWidth={1 / camera.zoom}
        />
        
        {/* Distance label */}
        <g transform={`translate(${midPoint.x}, ${midPoint.y})`}>
          <rect
            x={-30 / camera.zoom}
            y={-12 / camera.zoom}
            width={60 / camera.zoom}
            height={24 / camera.zoom}
            fill="rgba(0, 0, 0, 0.8)"
            rx={4 / camera.zoom}
          />
          <text
            x={0}
            y={4 / camera.zoom}
            textAnchor="middle"
            fill="white"
            fontSize={12 / camera.zoom}
            fontFamily="Arial, sans-serif"
          >
            {measurement.distance}'
          </text>
          <text
            x={0}
            y={-8 / camera.zoom}
            textAnchor="middle"
            fill="#cccccc"
            fontSize={10 / camera.zoom}
            fontFamily="Arial, sans-serif"
          >
            {measurement.gridDistance} sq
          </text>
        </g>
      </g>
    );
  };

  if (!isActive) return null;

  return (
    <g className="measurement-tool">
      <defs>
        <marker
          id="measurement-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="3"
          markerUnits="strokeWidth"
          markerWidth="4"
          markerHeight="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#ffff00" />
        </marker>
      </defs>
      
      {measurements.map(measurement => renderMeasurement(measurement))}
      
      {isDrawing && startPoint && currentPoint && currentMeasurement && renderMeasurement({
        id: 'current',
        start: startPoint,
        end: currentPoint,
        distance: currentMeasurement.feetDistance,
        gridDistance: currentMeasurement.gridDistance,
        createdAt: Date.now(),
        createdBy: 'current-user',
        temporary: true,
      }, true)}
      
      <rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="transparent"
        style={{ cursor: isActive ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      
      {isActive && !isDrawing && (
        <g className="measurement-instructions">
          <text
            x={10}
            y={30}
            fill="white"
            fontSize={14}
            fontFamily="Arial, sans-serif"
          >
            📏 Click and drag to measure distance
          </text>
          <text
            x={10}
            y={50}
            fill="#cccccc"
            fontSize={12}
            fontFamily="Arial, sans-serif"
          >
            Uses D&D 5e diagonal movement rules
          </text>
        </g>
      )}
    </g>
  );
};

export const useMeasurements = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  
  const addMeasurement = useCallback((measurement: Measurement) => {
    setMeasurements(prev => [...prev, measurement]);
    console.log(`📏 Measured: ${measurement.distance} feet (${measurement.gridDistance} squares)`);
  }, []);
  
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);
  
  const removeMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);
  
  return {
    measurements,
    addMeasurement,
    clearMeasurements,
    removeMeasurement,
  };
};