import { render, screen, fireEvent } from '@testing-library/react';
import { GameToolbar } from '@/components/GameToolbar';
import { useGameStore, useIsHost, useCamera, useActiveTool } from '@/stores/gameStore';
import { vi } from 'vitest';

// Mock the gameStore
vi.mock('@/stores/gameStore', () => ({
  useGameStore: vi.fn(),
  useIsHost: vi.fn(),
  useCamera: vi.fn(),
  useActiveTool: vi.fn(),
}));

describe('GameToolbar', () => {
  const setActiveTool = vi.fn();
  const updateCamera = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as vi.Mock).mockReturnValue({
      setActiveTool,
      updateCamera,
    });
    (useCamera as vi.Mock).mockReturnValue({ x: 0, y: 0, zoom: 1.0 });
  });

  it('should render the toolbar with default tool selected', () => {
    (useActiveTool as vi.Mock).mockReturnValue('select');
    (useIsHost as vi.Mock).mockReturnValue(false);
    render(<GameToolbar />);

    const selectButton = screen.getByRole('button', { name: '👆' });
    expect(selectButton).toHaveClass('active');
  });

  it('should call setActiveTool when a tool button is clicked', () => {
    (useActiveTool as vi.Mock).mockReturnValue('select');
    (useIsHost as vi.Mock).mockReturnValue(false);
    render(<GameToolbar />);

    const panButton = screen.getByRole('button', { name: '✋' });
    fireEvent.click(panButton);

    expect(setActiveTool).toHaveBeenCalledWith('pan');
  });

  it('should show DM tools for the host', () => {
    (useActiveTool as vi.Mock).mockReturnValue('select');
    (useIsHost as vi.Mock).mockReturnValue(true);
    render(<GameToolbar />);

    const createMaskButton = screen.getByRole('button', { name: '🌟' });
    expect(createMaskButton).toBeInTheDocument();
  });

  it('should not show DM tools for non-host players', () => {
    (useActiveTool as vi.Mock).mockReturnValue('select');
    (useIsHost as vi.Mock).mockReturnValue(false);
    render(<GameToolbar />);

    const createMaskButton = screen.queryByRole('button', { name: '🌟' });
    expect(createMaskButton).not.toBeInTheDocument();
  });

  it('should call updateCamera when zoom buttons are clicked', () => {
    (useActiveTool as vi.Mock).mockReturnValue('select');
    (useIsHost as vi.Mock).mockReturnValue(false);
    render(<GameToolbar />);

    const zoomInButton = screen.getByRole('button', { name: '➕' });
    fireEvent.click(zoomInButton);
    expect(updateCamera).toHaveBeenCalledWith({ zoom: 1.2 });

    const zoomOutButton = screen.getAllByRole('button', { name: '➖' }).find(button => button.getAttribute('data-id') === 'zoom-out');
    fireEvent.click(zoomOutButton);
    expect(updateCamera).toHaveBeenCalledWith({ zoom: 0.8333333333333334 });

    const zoomResetButton = screen.getByRole('button', { name: '100%' });
    fireEvent.click(zoomResetButton);
    expect(updateCamera).toHaveBeenCalledWith({ x: 0, y: 0, zoom: 1.0 });
  });

  it('should render the toolbar with all the basic tools', () => {
    (useActiveTool as vi.Mock).mockReturnValue('select');
    (useIsHost as vi.Mock).mockReturnValue(false);
    render(<GameToolbar />);

    expect(screen.getByRole('button', { name: '👆' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '✋' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📋' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '✂️' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📄' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📏' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📝' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📍' })).toBeInTheDocument();
  });

  it('should render the toolbar with all the drawing tools', () => {
    (useActiveTool as vi.Mock).mockReturnValue('select');
    (useIsHost as vi.Mock).mockReturnValue(false);
    render(<GameToolbar />);

    expect(screen.getByRole('button', { name: '⭕' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '⬜' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🔺' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '⬟' })).toBeInTheDocument();
    const lineButton = screen.getAllByRole('button', { name: '➖' }).find(button => button.getAttribute('data-id') === 'line');
    expect(lineButton).toBeInTheDocument();
  });
});