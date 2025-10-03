import React from 'react';

export interface DungeonData {
  version: string;
  title: string;
  story: string;
  rects: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    ending?: boolean;
  }>;
  doors: Array<{
    x: number;
    y: number;
    dir: { x: number; y: number };
    type: number; // 0=normal, 1=locked, 2=secret, 3=portcullis, 5=double, 6=arch
  }>;
  notes: Array<{
    text: string;
    ref: string;
    pos: { x: number; y: number };
  }>;
  columns: Array<{ x: number; y: number }>;
  water: Array<{ x: number; y: number; width: number; height: number }>;
}

interface DungeonRendererProps {
  data: DungeonData;
  scale?: number; // pixels per grid unit
  wallThickness?: number;
}

export const DungeonRenderer: React.FC<DungeonRendererProps> = ({
  data,
  scale = 30,
  wallThickness = 3,
}) => {
  // Calculate bounds
  const bounds = {
    minX: Math.min(...data.rects.map((r) => r.x)),
    maxX: Math.max(...data.rects.map((r) => r.x + r.w)),
    minY: Math.min(...data.rects.map((r) => r.y)),
    maxY: Math.max(...data.rects.map((r) => r.y + r.h)),
  };

  const width = (bounds.maxX - bounds.minX) * scale;
  const height = (bounds.maxY - bounds.minY) * scale;
  const offsetX = -bounds.minX * scale;
  const offsetY = -bounds.minY * scale;

  const transform = (x: number, y: number) => ({
    x: x * scale + offsetX,
    y: y * scale + offsetY,
  });

  const getDoorColor = (type: number) => {
    switch (type) {
      case 1:
        return '#d4af37'; // Locked - gold
      case 2:
        return '#8b4513'; // Secret - brown
      case 3:
        return '#708090'; // Portcullis - slate
      case 5:
        return '#654321'; // Double - dark brown
      case 6:
        return '#daa520'; // Arch - goldenrod
      default:
        return '#8b4513'; // Normal - brown
    }
  };

  return (
    <svg
      width={width}
      height={height}
      style={{ background: '#1a1a1a' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid (optional) */}
      <defs>
        <pattern
          id="grid"
          width={scale}
          height={scale}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${scale} 0 L 0 0 0 ${scale}`}
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#grid)" />

      {/* Rooms */}
      {data.rects.map((rect, i) => {
        const pos = transform(rect.x, rect.y);
        const w = rect.w * scale;
        const h = rect.h * scale;

        return (
          <g key={`room-${i}`}>
            {/* Floor */}
            <rect
              x={pos.x}
              y={pos.y}
              width={w}
              height={h}
              fill={rect.ending ? '#1a3a1a' : '#2a2a2a'}
              stroke="#555"
              strokeWidth={wallThickness}
            />

            {/* Room number (for debugging) */}
            {/* <text
              x={pos.x + w / 2}
              y={pos.y + h / 2}
              fill="#666"
              fontSize="10"
              textAnchor="middle"
            >
              {i}
            </text> */}
          </g>
        );
      })}

      {/* Doors */}
      {data.doors.map((door, i) => {
        const pos = transform(door.x, door.y);
        const doorSize = scale * 0.8;
        const doorThickness = scale * 0.15;

        // Determine door orientation
        const isVertical = door.dir.x !== 0;

        return (
          <rect
            key={`door-${i}`}
            x={
              isVertical
                ? pos.x - doorThickness / 2
                : pos.x + (scale - doorSize) / 2
            }
            y={
              isVertical
                ? pos.y + (scale - doorSize) / 2
                : pos.y - doorThickness / 2
            }
            width={isVertical ? doorThickness : doorSize}
            height={isVertical ? doorSize : doorThickness}
            fill={getDoorColor(door.type)}
            stroke="#000"
            strokeWidth="1"
          />
        );
      })}

      {/* Notes/Markers */}
      {data.notes.map((note, i) => {
        const pos = transform(note.pos.x, note.pos.y);

        return (
          <g key={`note-${i}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={8}
              fill="#ff6b6b"
              stroke="#fff"
              strokeWidth="2"
            />
            <text
              x={pos.x}
              y={pos.y + 4}
              fill="#fff"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              {note.ref}
            </text>
          </g>
        );
      })}

      {/* Columns */}
      {data.columns.map((col, i) => {
        const pos = transform(col.x + 0.5, col.y + 0.5);

        return (
          <circle
            key={`col-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={scale * 0.3}
            fill="#4a4a4a"
            stroke="#666"
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
};
