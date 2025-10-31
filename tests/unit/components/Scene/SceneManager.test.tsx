
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneManager } from '@/components/Scene/SceneManager';
import { useGameStore, useScenes, useActiveScene, useIsHost, useUser } from '@/stores/gameStore';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@/stores/gameStore', () => ({
  useGameStore: vi.fn(),
  useScenes: vi.fn(),
  useActiveScene: vi.fn(),
  useIsHost: vi.fn(),
  useUser: vi.fn(),
}));

vi.mock('@/components/Scene/SceneCanvas', () => ({ SceneCanvas: () => <div>Scene Canvas</div> }));
vi.mock('@/components/Scene/SceneEditor', () => ({ SceneEditor: () => <div>Scene Editor</div> }));

describe('SceneManager', () => {
  const createScene = vi.fn();
  const setActiveScene = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as any).mockReturnValue({ createScene, setActiveScene });
    (useUser as any).mockReturnValue({ id: 'user-1', name: 'Test User' });
    // Default mock for SceneList
    vi.doMock('@/components/Scene/SceneList', () => ({
      SceneList: ({ scenes, onSceneSelect }) => (
        <div>
          {scenes.map(s => (
            <button key={s.id} onClick={() => onSceneSelect(s.id)}>{s.name}</button>
          ))}
        </div>
      ),
    }));
  });

  describe('when no scenes exist', () => {
    beforeEach(() => {
      (useScenes as any).mockReturnValue([]);
      (useActiveScene as any).mockReturnValue(null);
    });

    it('should show "Create First Scene" button for host', () => {
      (useIsHost as any).mockReturnValue(true);
      render(<SceneManager />);
      expect(screen.getByText('Create First Scene')).toBeInTheDocument();
    });

    it('should show "Waiting for DM" message for non-host', () => {
      (useIsHost as any).mockReturnValue(false);
      render(<SceneManager />);
      expect(screen.getByText('Waiting for the DM to create scenes...')).toBeInTheDocument();
    });

    it('should call createScene when host clicks "Create First Scene"', () => {
      (useIsHost as any).mockReturnValue(true);
      render(<SceneManager />);
      fireEvent.click(screen.getByText('Create First Scene'));
      expect(createScene).toHaveBeenCalled();
    });
  });

  describe('when scenes exist', () => {
    const scenes = [{ id: 'scene-1', name: 'Test Scene', drawings: [], tokens: [] }];

    beforeEach(() => {
      (useScenes as any).mockReturnValue(scenes);
    });

    it('should render the scene list and canvas', () => {
      (useIsHost as any).mockReturnValue(true);
      (useActiveScene as any).mockReturnValue(scenes[0]);
      render(<SceneManager />);
      expect(screen.getByText('Test Scene')).toBeInTheDocument();
      expect(screen.getByText('Scene Canvas')).toBeInTheDocument();
    });

    it('should show "+ New Scene" button for host', () => {
      (useIsHost as any).mockReturnValue(true);
      (useActiveScene as any).mockReturnValue(scenes[0]);
      render(<SceneManager />);
      expect(screen.getByText('+ New Scene')).toBeInTheDocument();
    });

    it('should call createScene when host clicks \'+ New Scene\'', () => {
      (useIsHost as any).mockReturnValue(true);
      (useActiveScene as any).mockReturnValue(scenes[0]);
      render(<SceneManager />);
      fireEvent.click(screen.getByText('+ New Scene'));
      expect(createScene).toHaveBeenCalled();
    });

    it('should call setActiveScene when a scene is selected', () => {
      (useIsHost as any).mockReturnValue(true);
      (useActiveScene as any).mockReturnValue(scenes[0]);
      render(<SceneManager />);
      fireEvent.click(screen.getByText('Test Scene'));
      expect(setActiveScene).toHaveBeenCalledWith('scene-1');
    });

    it('should open the scene editor when editing a scene', () => {
      (useIsHost as any).mockReturnValue(true);
      (useActiveScene as any).mockReturnValue(scenes[0]);
      render(<SceneManager />);
      fireEvent.click(screen.getByTitle('Edit Scene'));
      expect(screen.getByText('Scene Editor')).toBeInTheDocument();
    });
  });
});
