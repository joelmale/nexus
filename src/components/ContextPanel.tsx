import React, { useRef, useEffect } from 'react';
import { DiceRoller } from './DiceRoller';
import { InitiativeTracker } from './InitiativeTracker';
import { LobbyPanel } from './LobbyPanel';
import { ScenePanel } from './Scene/ScenePanel';
import { useGameStore } from '@/stores/gameStore';
import { Settings } from './Settings';
import { Placeholder } from './Placeholder';
import { TokenPanel } from './Tokens/TokenPanel';
import { ChatPanel } from './ChatPanel';
import { DocumentsPanel } from './DocumentsPanel';

interface ContextPanelProps {
  activePanel:
    | 'tokens'
    | 'scene'
    | 'props'
    | 'generator'
    | 'initiative'
    | 'dice'
    | 'lobby'
    | 'settings'
    | 'chat'
    | 'sounds'
    | 'documents';
  onPanelChange: (
    panel:
      | 'tokens'
      | 'scene'
      | 'props'
      | 'generator'
      | 'initiative'
      | 'dice'
      | 'lobby'
      | 'settings'
      | 'chat'
      | 'sounds'
      | 'documents',
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
    { id: 'documents' as const, icon: '📚', label: 'Documents' },
    { id: 'sounds' as const, icon: '🔊', label: 'Sounds' },
    { id: 'chat' as const, icon: '💬', label: 'Chat' },
    { id: 'lobby' as const, icon: '🏠', label: 'Lobby' },
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
      generator: 500, // Wide panel for dungeon generator
      initiative: 450, // Increased for complex combat interface
      dice: 300, // Optimized for dice controls
      documents: 380, // Document library and search
      sounds: 320,
      chat: 350,
      lobby: 320, // Player management panel
      settings: 400,
    };

    const targetWidth = panelWidths[activePanel] || 320;
    const lastReported = lastReportedWidthRef.current;

    // Only update if this is a different width than we last reported
    if (targetWidth !== lastReported) {
      lastReportedWidthRef.current = targetWidth;
      onContentWidthChange(targetWidth);
    }
  }, [expanded, activePanel, onContentWidthChange]);

  return (
    <div className="context-panel" data-expanded={expanded}>
      {/* Panel Content */}
      {expanded && (
        <div
          className="context-panel__content"
          role="tabpanel"
          ref={panelContentRef}
        >
          <div
            className="context-panel__body"
            data-testid="panel-body"
            style={{ overflowY: 'auto' }}
          >
            {activePanel === 'tokens' && <TokenPanel />}
            {activePanel === 'scene' && <ScenePanel scene={currentScene} />}
            {activePanel === 'props' && <Placeholder title="Props" />}
            {activePanel === 'generator' && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Generator is now full-screen →</p>
              </div>
            )}
            {activePanel === 'initiative' && <InitiativeTracker />}
            {activePanel === 'dice' && <DiceRoller />}
            {activePanel === 'documents' && <DocumentsPanel />}
            {activePanel === 'sounds' && <Placeholder title="Sound Effects" />}
            {activePanel === 'chat' && <ChatPanel />}
            {activePanel === 'lobby' && <LobbyPanel />}
            {activePanel === 'settings' && <Settings />}
          </div>
        </div>
      )}

      {/* Collapsed state content - show icon when collapsed */}
      {!expanded && (
        <div className="context-panel__collapsed-content">
          <div className="context-panel__collapsed-icon">
            {panels.find((p) => p.id === activePanel)?.icon}
          </div>
        </div>
      )}
    </div>
  );
};
