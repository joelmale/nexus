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
    const toolbar = container.querySelector(
      '.scene-canvas-toolbar',
    ) as HTMLElement;

    expect(toolbar).toBeInTheDocument();
    expect(toolbar.classList.contains('scene-canvas-toolbar')).toBe(true);

    // Check that toolbar sections are present
    const sections = container.querySelectorAll('.toolbar-section');
    expect(sections.length).toBeGreaterThan(0);

    // Check that toolbar buttons are present
    const buttons = container.querySelectorAll('.toolbar-btn');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render toolbar sections correctly', () => {
    const { container } = renderWithDnd(<GameToolbar />);

    // Check for basic tools section
    const basicSection = container.querySelector('.toolbar-section');
    expect(basicSection).toBeInTheDocument();

    // Check for section labels
    const sectionLabels = container.querySelectorAll('.toolbar-section-label');
    expect(sectionLabels.length).toBeGreaterThan(0);

    // Check for toolbar buttons with proper structure
    const toolbarButtons = container.querySelectorAll('.toolbar-btn');
    toolbarButtons.forEach((button) => {
      expect(button.querySelector('.tool-icon')).toBeInTheDocument();
      expect(button.querySelector('.tool-label')).toBeInTheDocument();
    });
  });
});
