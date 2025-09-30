import React, { useRef, useEffect } from 'react';
import { DiceRoller } from './DiceRoller';
import { InitiativeTracker } from './InitiativeTracker';
import { PlayerPanel } from './PlayerPanel';
import { ScenePanel } from './Scene/ScenePanel';
import { useGameStore } from '@/stores/gameStore';
import { Settings } from './Settings';
import { Placeholder } from './Placeholder';

interface ContextPanelProps {
  activePanel:
    | 'tokens'
    | 'scene'
    | 'props'
    | 'initiative'
    | 'dice'
    | 'players'
    | 'settings'
    | 'chat'
    | 'sounds';
  onPanelChange: (
    panel:
      | 'tokens'
      | 'scene'
      | 'props'
      | 'initiative'
      | 'dice'
      | 'players'
      | 'settings'
      | 'chat'
      | 'sounds',
  ) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onContentWidthChange: (width: number) => void;
}

/**
 * Renders the content for the active sidebar panel.
 * This component acts as a container that displays the correct panel UI
 * based on the `activePanel` prop provided by its parent layout component (e.g., GameLayout).
 * It does not manage its own state for which panel is active.
 */
export const ContextPanel: React.FC<ContextPanelProps> = ({
  activePanel,
  onPanelChange: _onPanelChange,
  expanded,
  onToggleExpanded: _onToggleExpanded,
  onContentWidthChange,
}) => {
  const panelContentRef = useRef<HTMLDivElement>(null);
  const { sceneState } = useGameStore();

  // Get current active scene
  const currentScene = sceneState.scenes.find(
    (scene) => scene.id === sceneState.activeSceneId,
  );

  const panels = [
    { id: 'tokens' as const, icon: '👤', label: 'Tokens' },
    { id: 'scene' as const, icon: '🖼', label: 'Scene' },
    { id: 'props' as const, icon: '📦', label: 'Props' },
    { id: 'initiative' as const, icon: '⏱', label: 'Initiative' },
    { id: 'dice' as const, icon: '🎲', label: 'Dice' },
    { id: 'sounds' as const, icon: '🔊', label: 'Sounds' },
    { id: 'chat' as const, icon: '💬', label: 'Chat' },
    { id: 'players' as const, icon: '👥', label: 'Players' },
    { id: 'settings' as const, icon: '⚙️', label: 'Settings' },
  ];

  // Track the last reported width to prevent infinite loops
  const lastReportedWidthRef = useRef<number>(0);

  // Simple approach: Set fixed widths per panel type
  useEffect(() => {
    if (!expanded) return;

    // Define optimal widths for each panel type
    const panelWidths = {
      tokens: 320,
      scene: 400,
      props: 350,
      initiative: 450, // Increased for complex combat interface
      dice: 380, // Increased for dice controls and history
      sounds: 320,
      chat: 350,
      players: 320,
      settings: 400,
    };

    const targetWidth = panelWidths[activePanel] || 320;
    const lastReported = lastReportedWidthRef.current;

    // Only update if this is a different width than we last reported
    if (targetWidth !== lastReported) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Panel width set: ${activePanel} -> ${targetWidth}px`);
      }
      lastReportedWidthRef.current = targetWidth;
      onContentWidthChange(targetWidth);
    }
  }, [expanded, activePanel, onContentWidthChange]);

  return (
    <div className="context-panel" data-expanded={expanded}>
      {/* Panel Content */}
      {expanded && (
        <div className="panel-content" role="tabpanel" ref={panelContentRef}>
          <div
            className="panel-body"
            data-testid="panel-body"
            style={{ overflowY: 'auto' }}
          >
            {activePanel === 'tokens' && <Placeholder title="Tokens" />}
            {activePanel === 'scene' && <ScenePanel scene={currentScene} />}
            {activePanel === 'props' && <Placeholder title="Props" />}
            {activePanel === 'initiative' && <InitiativeTracker />}
            {activePanel === 'dice' && <DiceRoller />}
            {activePanel === 'sounds' && <Placeholder title="Sound Effects" />}
            {activePanel === 'chat' && <Placeholder title="Chat" />}
            {activePanel === 'players' && <PlayerPanel />}
            {activePanel === 'settings' && <Settings />}
          </div>
        </div>
      )}

      {/* Collapsed state content - show icon when collapsed */}
      {!expanded && (
        <div className="collapsed-content">
          <div className="collapsed-icon">
            {panels.find((p) => p.id === activePanel)?.icon}
          </div>
        </div>
      )}
    </div>
  );
};
