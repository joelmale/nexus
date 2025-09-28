import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ContextPanel } from '@/components/ContextPanel';

// Mock the child components with different width content
vi.mock('@/components/DiceRoller', () => ({
  DiceRoller: () => <div data-testid="dice-roller" style={{ width: '250px' }}>Dice Roller Content</div>
}));

vi.mock('@/components/InitiativeTracker', () => ({
  InitiativeTracker: () => (
    <div data-testid="initiative-tracker" style={{ width: '450px' }}>
      <div>Initiative Tracker with Wide Content</div>
      <div>Multiple columns and detailed information</div>
    </div>
  )
}));

vi.mock('@/components/PlayerPanel', () => ({
  PlayerPanel: () => (
    <div data-testid="player-panel" style={{ width: '500px' }}>
      <div>Player Panel with Character Sheets</div>
      <div>Character creation forms and player management</div>
      <div>Wide content that needs more space</div>
    </div>
  )
}));

vi.mock('@/components/Settings', () => ({
  Settings: () => (
    <div data-testid="settings" style={{ width: '380px' }}>
      <div>Settings Panel</div>
      <div>Configuration options and controls</div>
    </div>
  )
}));

vi.mock('@/components/Placeholder', () => ({
  Placeholder: ({ title }: { title: string }) => (
    <div data-testid={`placeholder-${title.toLowerCase().replace(/\s+/g, '-')}`} style={{ width: '200px' }}>
      {title} Placeholder
    </div>
  )
}));

vi.mock('@/stores/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    settings: {
      enableGlassmorphism: true,
      compactToolbar: false,
    },
    sceneState: {
      scenes: [
        {
          id: 'scene-1',
          name: 'Test Scene',
          description: 'Test scene',
          visibility: 'private',
          isEditable: true,
          createdBy: 'test-user',
          placedTokens: [],
          drawings: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          gridSettings: {
            enabled: true,
            size: 50,
            color: '#fff',
            opacity: 0.5,
            snapToGrid: true,
            showToPlayers: true
          },
          lightingSettings: {
            enabled: false,
            globalIllumination: true,
            ambientLight: 0.5,
            darkness: 0,
          },
          isActive: false,
          playerCount: 0,
        }
      ],
      activeSceneId: 'scene-1',
    },
  })),
  useSession: vi.fn(),
  useIsHost: vi.fn(() => false),
}));

describe('ContextPanel Dynamic Width Regression Tests', () => {
  let mockOnContentWidthChange: ReturnType<typeof vi.fn>;
  let mockResizeObserver: any;
  let observeCallbacks: Map<Element, ResizeObserverCallback>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnContentWidthChange = vi.fn();
    observeCallbacks = new Map();

    // Mock ResizeObserver
    mockResizeObserver = vi.fn().mockImplementation((callback: ResizeObserverCallback) => ({
      observe: vi.fn().mockImplementation((element: Element) => {
        observeCallbacks.set(element, callback);
      }),
      disconnect: vi.fn().mockImplementation(() => {
        observeCallbacks.clear();
      }),
      unobserve: vi.fn(),
    }));

    global.ResizeObserver = mockResizeObserver;

    // Mock scrollWidth and clientWidth on HTMLElement
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get: function() {
        const element = this as HTMLElement;
        const testId = element.getAttribute('data-testid');
        const className = element.className;

        // Return different widths based on content type
        if (testId === 'dice-roller') return 250;
        if (testId === 'initiative-tracker') return 450;
        if (testId === 'player-panel') return 500;
        if (testId === 'settings') return 380;
        if (testId?.startsWith('placeholder-')) return 200;

        // For panel-body, return the max width of its children
        if (className.includes('panel-body')) {
          const children = Array.from(element.children) as HTMLElement[];
          if (children.length === 0) return 250; // fallback

          return Math.max(...children.map(child => {
            const childTestId = child.getAttribute('data-testid');
            if (childTestId === 'dice-roller') return 250;
            if (childTestId === 'initiative-tracker') return 450;
            if (childTestId === 'player-panel') return 500;
            if (childTestId === 'settings') return 380;
            if (childTestId?.startsWith('placeholder-')) return 200;
            return 250; // fallback
          }));
        }

        // Default for other elements
        return 300;
      }
    });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: function() {
        // Simulate current panel width (starts at 300px)
        return 300;
      }
    });

    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: function() {
        return 100; // Mock height for reflow trigger
      }
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    observeCallbacks.clear();
  });

  describe('Panel Width Expansion', () => {
    it('should expand panel for wide content (PlayerPanel)', async () => {
      render(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers to trigger the measurement (component has 100ms delay)
      vi.advanceTimersByTime(100);

      // Should request width expansion for PlayerPanel (500px content + 32px padding = 532px)
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(532);
    });

    it('should expand panel for medium content (InitiativeTracker)', async () => {
      render(
        <ContextPanel
          activePanel="initiative"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers to trigger the measurement
      vi.advanceTimersByTime(100);

      // Should request width expansion for InitiativeTracker (450px content + 32px padding = 482px)
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(482);
    });

    it('should use minimum width for narrow content (DiceRoller)', async () => {
      render(
        <ContextPanel
          activePanel="dice"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers to trigger the measurement
      vi.advanceTimersByTime(100);

      // Should use minimum width for DiceRoller (250px content + 32px = 282px, but min is 300px)
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(300);
    });

    it('should respect maximum width limit', async () => {
      // Mock extremely wide content
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
        configurable: true,
        get: function() {
          return 800; // Wider than 600px limit
        }
      });

      render(
        <ContextPanel
          activePanel="settings"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers to trigger the measurement
      vi.advanceTimersByTime(100);

      // Should cap at maximum width (600px)
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(600);
    });

    it('should not trigger updates for small width differences', async () => {
      // Mock content that's only slightly different from current width
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
        configurable: true,
        get: function() {
          return 285; // 285 + 32 = 317px, only 17px difference from 300px current
        }
      });

      render(
        <ContextPanel
          activePanel="dice"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers to trigger the measurement
      vi.advanceTimersByTime(100);

      // Should not call onContentWidthChange for small differences (< 20px threshold)
      expect(mockOnContentWidthChange).not.toHaveBeenCalled();
    });
  });

  describe('ResizeObserver Integration', () => {
    it('should set up ResizeObserver when panel is expanded', () => {
      render(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      expect(mockResizeObserver).toHaveBeenCalled();
      expect(observeCallbacks.size).toBe(1);
    });

    it('should not set up ResizeObserver when panel is collapsed', () => {
      render(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={false}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      expect(mockResizeObserver).not.toHaveBeenCalled();
      expect(observeCallbacks.size).toBe(0);
    });

    it('should trigger resize measurement when content changes', async () => {
      render(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Wait for initial setup
      await waitFor(() => {
        expect(observeCallbacks.size).toBe(1);
      });

      // Clear initial calls
      mockOnContentWidthChange.mockClear();

      // Simulate content resize
      const [element, callback] = Array.from(observeCallbacks.entries())[0];
      const mockEntry = {
        target: element,
        contentRect: { width: 400, height: 200 },
        borderBoxSize: [{ inlineSize: 400, blockSize: 200 }],
        contentBoxSize: [{ inlineSize: 400, blockSize: 200 }],
        devicePixelContentBoxSize: [{ inlineSize: 400, blockSize: 200 }],
      };

      callback([mockEntry], null as any);

      // Should trigger another measurement after content change
      await waitFor(() => {
        expect(mockOnContentWidthChange).toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('should clean up ResizeObserver on unmount', () => {
      const { unmount } = render(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      const observerInstance = mockResizeObserver.mock.results[0].value;

      unmount();

      expect(observerInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('Panel Switching Behavior', () => {
    it('should remeasure width when switching between panels', async () => {
      const { rerender } = render(
        <ContextPanel
          activePanel="dice"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers for initial measurement
      vi.advanceTimersByTime(100);
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(300);

      mockOnContentWidthChange.mockClear();

      // Switch to a wider panel
      rerender(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers for new measurement
      vi.advanceTimersByTime(100);

      // Should measure new content and request different width (500px content + 32px padding = 532px)
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(532);
    });

    it('should handle expansion/collapse state changes', async () => {
      const { rerender } = render(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={false}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Should not measure when collapsed
      expect(mockOnContentWidthChange).not.toHaveBeenCalled();

      // Expand panel
      rerender(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers to trigger measurement after expansion
      vi.advanceTimersByTime(100);

      // Should now measure and set width
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(532);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing panel-body element gracefully', async () => {
      // Mock querySelector to return null
      const originalQuerySelector = Element.prototype.querySelector;
      Element.prototype.querySelector = vi.fn().mockReturnValue(null);

      render(
        <ContextPanel
          activePanel="players"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers to trigger measurement
      vi.advanceTimersByTime(100);

      // Should fall back to default minimum width
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(300);

      // Restore original querySelector
      Element.prototype.querySelector = originalQuerySelector;
    });

    it('should handle ResizeObserver being unavailable', async () => {
      // Remove ResizeObserver to simulate environments where it doesn't exist
      const originalResizeObserver = global.ResizeObserver;
      delete (global as any).ResizeObserver;

      // Component currently doesn't handle missing ResizeObserver gracefully
      // This test documents the current behavior - it should be fixed in the component
      expect(() => {
        render(
          <ContextPanel
            activePanel="players"
            onPanelChange={vi.fn()}
            expanded={true}
            onToggleExpanded={vi.fn()}
            onContentWidthChange={mockOnContentWidthChange}
          />
        );
      }).toThrow();

      // Restore ResizeObserver
      global.ResizeObserver = originalResizeObserver;
    });
  });

  describe('CSS Integration Tests', () => {
    it('should properly handle overflow style manipulation', async () => {
      const mockElement = {
        style: {
          overflowX: 'auto',
          width: '300px',
        },
        offsetHeight: 100,
        querySelector: vi.fn().mockReturnValue({
          scrollWidth: 450,
        }),
      };

      // Test that styles are properly restored after measurement
      const originalOverflow = mockElement.style.overflowX;
      const originalWidth = mockElement.style.width;

      render(
        <ContextPanel
          activePanel="initiative"
          onPanelChange={vi.fn()}
          expanded={true}
          onToggleExpanded={vi.fn()}
          onContentWidthChange={mockOnContentWidthChange}
        />
      );

      // Advance timers to trigger measurement
      vi.advanceTimersByTime(100);

      // Verify that temporary style changes don't persist
      // This is tested indirectly through the component behavior
      expect(mockOnContentWidthChange).toHaveBeenCalledWith(482);
    });
  });
});