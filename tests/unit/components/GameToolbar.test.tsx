import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GameToolbar } from '../../../src/components/GameToolbar';

// Mock the gameStore hooks
vi.mock('@/stores/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    updateCamera: vi.fn(),
    setActiveTool: vi.fn(),
    settings: {
      floatingToolbar: false,
    },
  })),
  useIsHost: vi.fn(() => true),
  useCamera: vi.fn(() => ({
    x: 0,
    y: 0,
    zoom: 1.0,
  })),
  useActiveTool: vi.fn(() => null),
}));

const renderWithDnd = (component: React.ReactElement) => {
  return render(<DndProvider backend={HTML5Backend}>{component}</DndProvider>);
};

describe('GameToolbar', () => {
  it('should render without crashing', () => {
    const { getByRole } = renderWithDnd(<GameToolbar />);
    expect(getByRole('toolbar')).toBeInTheDocument();
  });

  it('should render in docked mode when floatingToolbar is false', () => {
    const { container } = renderWithDnd(<GameToolbar />);
    const toolbar = container.querySelector('.game-toolbar') as HTMLElement;

    expect(toolbar).toBeInTheDocument();
    expect(toolbar.classList.contains('docked')).toBe(true);
    expect(toolbar.classList.contains('floating')).toBe(false);

    // Drag handle should not exist in docked mode
    const dragHandle = container.querySelector('.toolbar-drag-handle');
    expect(dragHandle).toBeNull();
  });

  it('should have correct initial position in docked mode', () => {
    const { container } = renderWithDnd(<GameToolbar />);
    const toolbar = container.querySelector('.game-toolbar') as HTMLElement;

    // Initial position should be '0' (no unit) in docked mode
    expect(toolbar.style.getPropertyValue('--tw-translate-x')).toBe('0');
    expect(toolbar.style.getPropertyValue('--tw-translate-y')).toBe('0');
  });
});
