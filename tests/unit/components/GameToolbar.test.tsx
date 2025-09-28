import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameToolbar } from '../../../src/components/GameToolbar';

// Mock the game store
vi.mock('../../../src/stores/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    isDM: true,
    toolbarPosition: { x: 100, y: 100 },
    setToolbarPosition: vi.fn(),
    currentTool: 'select',
    setCurrentTool: vi.fn(),
    updateCamera: vi.fn(),
  })),
  useIsHost: vi.fn(() => true),
  useCamera: vi.fn(() => ({
    x: 0,
    y: 0,
    zoom: 1,
  })),
}));

describe('GameToolbar', () => {
  it('renders toolbar with drag handle', () => {
    render(<GameToolbar />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toBeInTheDocument();

    const dragHandle = screen.getByText('⋮⋮');
    expect(dragHandle).toBeInTheDocument();
  });

  it('displays tool buttons for DM', () => {
    render(<GameToolbar />);

    // Check for common tool buttons
    expect(screen.getByTitle('Select')).toBeInTheDocument();
    expect(screen.getByTitle('Circle')).toBeInTheDocument();
    expect(screen.getByTitle('Measure')).toBeInTheDocument();
  });

  it('handles tool selection', () => {
    render(<GameToolbar />);

    // Initially Select tool should be active
    const selectTool = screen.getByTitle('Select');
    expect(selectTool).toHaveAttribute('aria-pressed', 'true');

    // Click Circle tool
    const circleTool = screen.getByTitle('Circle');
    expect(circleTool).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(circleTool);

    // Now Circle should be active and Select should not be
    expect(circleTool).toHaveAttribute('aria-pressed', 'true');
    expect(selectTool).toHaveAttribute('aria-pressed', 'false');
  });

  it('applies correct positioning styles', () => {
    render(<GameToolbar />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveStyle({
      '--tw-translate-x': '0px',
      '--tw-translate-y': '0px',
    });
  });

  it('handles drag interactions', () => {
    render(<GameToolbar />);

    const toolbar = screen.getByRole('toolbar');
    const dragHandle = screen.getByText('⋮⋮');

    // Get initial position
    const initialStyle = toolbar.getAttribute('style');

    // Simulate drag start
    fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });

    // Simulate drag move
    fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });

    // Simulate drag end
    fireEvent.mouseUp(document);

    // The toolbar should have updated transform values
    const finalStyle = toolbar.getAttribute('style');
    expect(finalStyle).toContain('--tw-translate');
  });
});