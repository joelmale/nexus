// Drawing and measurement tool types for Scene Canvas

// Basic drawing tools
export type DrawingTool =
  | 'pencil' // Freehand drawing
  | 'line' // Straight lines
  | 'rectangle' // Rectangles/squares
  | 'circle' // Circles/ellipses
  | 'polygon' // Multi-point polygons
  | 'text' // Text annotations
  | 'eraser' // Eraser tool
  | 'ping' // Ping location marker

  // D&D 5e specific shapes
  | 'cone' // Cone of effect (follows 5e rules)
  | 'aoe-sphere' // Sphere/radius effects
  | 'aoe-cube' // Cube effects
  | 'aoe-cylinder' // Cylinder effects
  | 'aoe-line' // Line effects

  // DM-only tools
  | 'fog-of-war' // Fog of war areas
  | 'dynamic-lighting' // Light sources
  | 'vision-blocking' // Vision blocking walls
  | 'dm-notes'; // DM-only annotations

// Measurement tools
export type MeasurementTool = 'measure';

// Drawing style configuration
export interface DrawingStyle {
  // Fill properties
  fillColor: string;
  fillOpacity: number;

  // Stroke properties
  strokeColor: string;
  strokeWidth: number;
  strokeDashArray?: string; // CSS dash pattern, e.g., "5,5" for dashed

  // D&D specific properties
  dndSpellLevel?: number; // 0-9 for cantrip to 9th level
  aoeRadius?: number; // Radius in feet for sphere effects
  coneLength?: number; // Length in feet for cone effects

  // DM visibility properties
  visibleToPlayers?: boolean; // DM can hide drawings from players
  dmNotesOnly?: boolean; // Only visible to DM
}

// Default drawing styles
export const defaultDrawingStyle: DrawingStyle = {
  fillColor: '#ff0000',
  fillOpacity: 0.3,
  strokeColor: '#ff0000',
  strokeWidth: 2,
  strokeDashArray: undefined,
  dndSpellLevel: 1,
  aoeRadius: 20,
  coneLength: 15,
  visibleToPlayers: true,
  dmNotesOnly: false,
};

// Drawing shape data structures
export interface Point {
  x: number;
  y: number;
}

export interface BaseDrawing {
  id: string;
  type: DrawingTool;
  style: DrawingStyle;
  layer: 'background' | 'tokens' | 'effects' | 'dm-only' | 'overlay';
  createdAt: number;
  updatedAt: number;
  createdBy: string; // User ID who created this drawing
}

export interface LineDrawing extends BaseDrawing {
  type: 'line';
  start: Point;
  end: Point;
}

export interface RectangleDrawing extends BaseDrawing {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleDrawing extends BaseDrawing {
  type: 'circle';
  center: Point;
  radius: number;
}

export interface PolygonDrawing extends BaseDrawing {
  type: 'polygon';
  points: Point[];
}

export interface PencilDrawing extends BaseDrawing {
  type: 'pencil';
  points: Point[];
}

export interface TextDrawing extends BaseDrawing {
  type: 'text';
  position: Point;
  text: string;
  fontSize: number;
  fontFamily: string;
}

// D&D 5e specific shapes
export interface ConeDrawing extends BaseDrawing {
  type: 'cone';
  origin: Point; // Point of origin for the cone
  direction: number; // Angle in degrees (0 = right, 90 = down, etc.)
  length: number; // Length in feet (converted to pixels based on grid)
  angle: number; // Cone angle in degrees (typically 90° for most spells)
}

export interface SphereAoEDrawing extends BaseDrawing {
  type: 'aoe-sphere';
  center: Point;
  radius: number; // Radius in feet
}

export interface CubeAoEDrawing extends BaseDrawing {
  type: 'aoe-cube';
  origin: Point; // Corner of the cube
  size: number; // Side length in feet
}

export interface CylinderAoEDrawing extends BaseDrawing {
  type: 'aoe-cylinder';
  center: Point;
  radius: number; // Radius in feet
  height: number; // Height in feet (for display purposes)
}

export interface LineAoEDrawing extends BaseDrawing {
  type: 'aoe-line';
  start: Point;
  end: Point;
  width: number; // Width in feet
}

// DM-only drawing types
export interface FogOfWarDrawing extends BaseDrawing {
  type: 'fog-of-war';
  area: Point[]; // Polygon defining the fog area
  density: number; // 0-1, how opaque the fog is
  revealed: boolean; // Whether this area is currently revealed
}

export interface DynamicLightDrawing extends BaseDrawing {
  type: 'dynamic-lighting';
  center: Point;
  brightRadius: number; // Bright light radius in feet
  dimRadius: number; // Dim light radius in feet
  color: string; // Light color
  flickering: boolean; // Whether the light flickers
}

export interface VisionBlockDrawing extends BaseDrawing {
  type: 'vision-blocking';
  points: Point[]; // Wall/barrier points
  height: number; // Height in feet (affects flying creatures)
  transparent: boolean; // Can see through but not move through
}

export interface DMNotesDrawing extends BaseDrawing {
  type: 'dm-notes';
  position: Point;
  text: string;
  private: boolean; // If true, only DM can see
}

export interface PingDrawing extends BaseDrawing {
  type: 'ping';
  position: Point;
  playerId: string; // Who created the ping
  playerName: string; // Display name
  timestamp: number; // When created (for auto-fade)
  duration: number; // How long to show in ms (default 3000)
}

// Union type for all drawing types
export type Drawing =
  | LineDrawing
  | RectangleDrawing
  | CircleDrawing
  | PolygonDrawing
  | PencilDrawing
  | TextDrawing
  | ConeDrawing
  | SphereAoEDrawing
  | CubeAoEDrawing
  | CylinderAoEDrawing
  | LineAoEDrawing
  | FogOfWarDrawing
  | DynamicLightDrawing
  | VisionBlockDrawing
  | DMNotesDrawing
  | PingDrawing;

// Measurement data
export interface Measurement {
  id: string;
  start: Point;
  end: Point;
  distance: number; // Distance in feet
  gridDistance: number; // Distance in grid units
  createdAt: number;
  createdBy: string;
  temporary: boolean; // If true, disappears after a short time
}

// D&D 5e spell effect presets
export const dndSpellPresets = {
  // Cantrips
  'acid-splash': { type: 'aoe-sphere' as const, radius: 5, level: 0 },
  'sacred-flame': {
    type: 'aoe-cylinder' as const,
    radius: 2.5,
    height: 40,
    level: 0,
  },

  // 1st Level
  'burning-hands': { type: 'cone' as const, length: 15, angle: 90, level: 1 },
  thunderwave: { type: 'aoe-cube' as const, size: 15, level: 1 },

  // 2nd Level
  shatter: { type: 'aoe-sphere' as const, radius: 10, level: 2 },

  // 3rd Level
  fireball: { type: 'aoe-sphere' as const, radius: 20, level: 3 },
  'lightning-bolt': {
    type: 'aoe-line' as const,
    length: 100,
    width: 5,
    level: 3,
  },
  'cone-of-cold': { type: 'cone' as const, length: 60, angle: 90, level: 5 },

  // Higher levels
  'meteor-swarm': { type: 'aoe-sphere' as const, radius: 40, level: 9 },
};

/**
 * @deprecated Use mathUtils from @/utils/mathUtils instead
 * These utilities have been moved to provide better organization and testability.
 * This export is kept for backwards compatibility but will be removed in a future version.
 */
export const dndUtils = {
  feetToPixels: (feet: number, gridSize: number): number => {
    console.warn(
      'dndUtils.feetToPixels is deprecated. Import from @/utils/mathUtils instead.',
    );
    return (feet / 5) * gridSize;
  },

  pixelsToFeet: (pixels: number, gridSize: number): number => {
    console.warn(
      'dndUtils.pixelsToFeet is deprecated. Import from @/utils/mathUtils instead.',
    );
    return (pixels / gridSize) * 5;
  },

  calculateDiagonalDistance: (
    deltaX: number,
    deltaY: number,
    gridSize: number,
  ): number => {
    console.warn(
      'dndUtils.calculateDiagonalDistance is deprecated. Import from @/utils/mathUtils instead.',
    );
    const xSquares = Math.abs(deltaX / gridSize);
    const ySquares = Math.abs(deltaY / gridSize);
    const minSquares = Math.min(xSquares, ySquares);
    const maxSquares = Math.max(xSquares, ySquares);

    const diagonalCost = Math.floor(minSquares / 2) * 15 + (minSquares % 2) * 5;
    const straightCost = (maxSquares - minSquares) * 5;

    return diagonalCost + straightCost;
  },

  getSpellDimensions: (
    spellType: string,
    _level: number,
  ): Partial<DrawingStyle> => {
    console.warn(
      'dndUtils.getSpellDimensions is deprecated. Use dndSpellPresets directly or import from @/utils/mathUtils.',
    );
    const preset = dndSpellPresets[spellType as keyof typeof dndSpellPresets];
    if (preset) {
      return {
        dndSpellLevel: preset.level,
        aoeRadius: 'radius' in preset ? preset.radius : undefined,
        coneLength: 'length' in preset ? preset.length : undefined,
      };
    }
    return {};
  },
};
