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

  it('should render with proper CSS classes', () => {
    const { container } = renderWithDnd(<GameToolbar />);
    const toolbar = container.querySelector('.game-toolbar') as HTMLElement;

    expect(toolbar).toBeInTheDocument();
    expect(toolbar.classList.contains('game-toolbar')).toBe(true);

    // Check that toolbar rows are present
    const rows = container.querySelectorAll('.toolbar-row');
    expect(rows.length).toBeGreaterThan(0);

    // Check that toolbar buttons are present
    const buttons = container.querySelectorAll('.toolbar-btn');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render toolbar sections correctly', () => {
    const { container } = renderWithDnd(<GameToolbar />);

    // Check for toolbar rows
    const toolbarRows = container.querySelectorAll('.toolbar-row');
    expect(toolbarRows.length).toBeGreaterThan(0);

    // Check for toolbar buttons with proper structure
    const toolbarButtons = container.querySelectorAll('.toolbar-btn');
    expect(toolbarButtons.length).toBeGreaterThan(0);

    // Check that buttons have tool icons (some buttons have icons, some just have labels)
    const toolIcons = container.querySelectorAll('.tool-icon');
    expect(toolIcons.length).toBeGreaterThan(0);
  });
});
