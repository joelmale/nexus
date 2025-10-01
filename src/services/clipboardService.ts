/**
 * Clipboard Service for Managing Copy/Cut/Paste of Drawings
 */

import type { Drawing } from '@/types/drawing';

class ClipboardService {
  private clipboard: Drawing[] = [];

  /**
   * Copy drawings to clipboard
   */
  copy(drawings: Drawing[]): void {
    // Deep clone the drawings to avoid reference issues
    this.clipboard = drawings.map((drawing) => ({
      ...drawing,
      // Generate new IDs when pasting
      id: drawing.id,
    }));
    console.log(`📋 Copied ${drawings.length} drawing(s) to clipboard`);
  }

  /**
   * Get drawings from clipboard
   */
  paste(): Drawing[] {
    if (this.clipboard.length === 0) {
      console.log('📋 Clipboard is empty');
      return [];
    }

    // Create new drawings with new IDs and slight offset
    const pastedDrawings = this.clipboard.map((drawing) => {
      const newDrawing = { ...drawing };

      // Generate new ID
      newDrawing.id = `${drawing.type}-${Date.now()}-${Math.random()}`;
      newDrawing.createdAt = Date.now();

      // Offset position by 20 pixels to make it visible
      const offset = 20;

      switch (drawing.type) {
        case 'line':
          newDrawing.start = {
            x: drawing.start.x + offset,
            y: drawing.start.y + offset,
          };
          newDrawing.end = {
            x: drawing.end.x + offset,
            y: drawing.end.y + offset,
          };
          break;
        case 'rectangle':
          newDrawing.x = drawing.x + offset;
          newDrawing.y = drawing.y + offset;
          break;
        case 'circle':
        case 'aoe-sphere':
          newDrawing.center = {
            x: drawing.center.x + offset,
            y: drawing.center.y + offset,
          };
          break;
        case 'polygon':
        case 'pencil':
          newDrawing.points = drawing.points.map((p) => ({
            x: p.x + offset,
            y: p.y + offset,
          }));
          break;
        case 'cone':
        case 'aoe-cube':
          newDrawing.origin = {
            x: drawing.origin.x + offset,
            y: drawing.origin.y + offset,
          };
          break;
        case 'text':
        case 'ping':
          newDrawing.position = {
            x: drawing.position.x + offset,
            y: drawing.position.y + offset,
          };
          break;
      }

      return newDrawing;
    });

    console.log(`📌 Pasted ${pastedDrawings.length} drawing(s) from clipboard`);
    return pastedDrawings;
  }

  /**
   * Check if clipboard has content
   */
  hasContent(): boolean {
    return this.clipboard.length > 0;
  }

  /**
   * Clear clipboard
   */
  clear(): void {
    this.clipboard = [];
    console.log('📋 Clipboard cleared');
  }

  /**
   * Get clipboard content count
   */
  getCount(): number {
    return this.clipboard.length;
  }
}

export const clipboardService = new ClipboardService();
