import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameToolbar } from '../../../src/components/GameToolbar';

// Mock the gameStore hooks
vi.mock('@/stores/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    updateCamera: vi.fn(),
  })),
  useIsHost: vi.fn(() => true),
  useCamera: vi.fn(() => ({
    x: 0,
    y: 0,
    zoom: 1.0,
  })),
}));

describe('GameToolbar', () => {
  it('should render without crashing', () => {
    const { getByRole } = render(<GameToolbar />);
    expect(getByRole('toolbar')).toBeInTheDocument();
  });

  it('should move the toolbar when dragged', () => {
    const { container } = render(<GameToolbar />);
    const toolbar = container.querySelector('.game-toolbar') as HTMLElement;
    const dragHandle = container.querySelector('.toolbar-drag-handle') as HTMLElement;

    // Initial position
    expect(toolbar.style.getPropertyValue('--tw-translate-x')).toBe('0px');
    expect(toolbar.style.getPropertyValue('--tw-translate-y')).toBe('0px');

    // Simulate drag
    fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 150, clientY: 120 });
    fireEvent.mouseUp(document);

    // Check new position
    expect(toolbar.style.getPropertyValue('--tw-translate-x')).not.toBe('0px');
    expect(toolbar.style.getPropertyValue('--tw-translate-y')).not.toBe('0px');
  });

  it('should reset the position on double-click', () => {
    const { container } = render(<GameToolbar />);
    const toolbar = container.querySelector('.game-toolbar') as HTMLElement;
    const dragHandle = container.querySelector('.toolbar-drag-handle') as HTMLElement;

    // Move the toolbar first
    fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
    fireEvent.mouseUp(document);

    // Ensure it moved
    expect(toolbar.style.getPropertyValue('--tw-translate-x')).not.toBe('0px');
    expect(toolbar.style.getPropertyValue('--tw-translate-y')).not.toBe('0px');

    // Reset position
    fireEvent.doubleClick(dragHandle);

    // Check if it's back to the original position
    expect(toolbar.style.getPropertyValue('--tw-translate-x')).toBe('0px');
    expect(toolbar.style.getPropertyValue('--tw-translate-y')).toBe('0px');
  });
});
