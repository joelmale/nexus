import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useIsConnected, useActiveScene, useScenes, useIsHost, useSettings, useColorScheme, useUser } from '@/stores/gameStore';
import { useGameLifecycleStore } from '@/stores/gameLifecycleStore';
import { SceneCanvas } from './Scene/SceneCanvas';
import { SceneTabs } from './Scene/SceneTabs';
import { GameToolbar } from './GameToolbar';
import { PlayerBar } from './PlayerBar';
import { ContextPanel } from './ContextPanel';
import { Lobby } from './Lobby';
import { WelcomePage } from './WelcomePage';
import { CharacterCreation } from './CharacterCreation';
import { OfflinePreparation } from './OfflinePreparation';
import { applyColorScheme } from '@/utils/colorSchemes';

/**
 * The main structural component for the application.
 * It orchestrates the overall layout, including the header, scene canvas, and the context panel sidebar.
 * 
 * Responsibilities:
 * - Renders the horizontal tabs for panel navigation in the header.
 * - Manages the state for the active panel (`activePanel`) and its expanded/collapsed state (`panelExpanded`).
 * - Manages the width and resizing of the sidebar.
 * - Passes the necessary state down to `ContextPanel`, which is responsible for rendering the actual content of the panels.
 */
export const GameLayout: React.FC = () => {
  const isConnected = useIsConnected();
  const activeScene = useActiveScene();
  const scenes = useScenes();
  const isHost = useIsHost();
  const settings = useSettings();
  const colorScheme = useColorScheme();
  const user = useUser();
  const { phase, mode } = useGameLifecycleStore();
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState<'tokens' | 'scene' | 'props' | 'initiative' | 'dice' | 'chat' | 'sounds' | 'players' | 'settings'>('players');
  const [sidebarWidth, setSidebarWidth] = useState(300);
  
  // Apply color scheme on mount and when it changes
  useEffect(() => {
    applyColorScheme(colorScheme);
  }, [colorScheme]);
  
  // Apply theme class to body element based on glassmorphism setting
  useEffect(() => {
    if (!settings.enableGlassmorphism) {
      document.body.classList.add('theme-solid');
    } else {
      document.body.classList.remove('theme-solid');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('theme-solid');
    };
  }, [settings.enableGlassmorphism]);
  
  // Resize functionality
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startMouseX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const handle = e.currentTarget as HTMLElement;

    isResizing.current = true;
    startMouseX.current = e.clientX;
    startWidth.current = sidebarWidth;

    // Add dragging class for visual feedback
    handle.classList.add('dragging');

    // Set cursor and prevent text selection globally
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none'; // Prevent interference from other elements

    // Define mouse move handler inside the start handler for proper closure
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;

      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        // Calculate the width change based on mouse movement
        const deltaX = startMouseX.current - e.clientX;
        const newWidth = startWidth.current + deltaX;

        // Apply constraints
        const minWidth = panelExpanded ? 250 : 60;
        const maxWidth = 500;

        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        setSidebarWidth(constrainedWidth);
      });
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;

      isResizing.current = false;

      // Remove dragging class
      handle.classList.remove('dragging');

      // Restore normal cursor and interactions
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';

      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);

      // Also remove pointer events for better compatibility
      document.removeEventListener('pointermove', handleMouseMove as any);
      document.removeEventListener('pointerup', handleMouseUp as any);
      document.removeEventListener('pointercancel', handleMouseUp as any);
    };

    // Add event listeners immediately
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
    document.addEventListener('mouseleave', handleMouseUp, { passive: false }); // Handle mouse leaving window

    // Also add pointer events for better touch/mouse support
    document.addEventListener('pointermove', handleMouseMove as any, { passive: false });
    document.addEventListener('pointerup', handleMouseUp as any, { passive: false });
    document.addEventListener('pointercancel', handleMouseUp as any, { passive: false });

  }, [sidebarWidth, panelExpanded]);

  const handleContentWidthChange = useCallback((width: number) => {
    if (width > 0) {
      setSidebarWidth(width);
    }
  }, []);

  const panels = [
    { id: 'tokens' as const, icon: '👤', label: 'Tokens' },
    { id: 'scene' as const, icon: '🖼', label: 'Scene' },
    ...(isHost ? [ { id: 'props' as const, icon: '📦', label: 'Props' }] : []),
    { id: 'initiative' as const, icon: '⏱', label: 'Initiative' },
    { id: 'dice' as const, icon: '🎲', label: 'Dice' },
    { id: 'chat' as const, icon: '💬', label: 'Chat' },
    ...(isHost ? [{ id: 'sounds' as const, icon: '🔊', label: 'Sounds' }] : []),
    { id: 'players' as const, icon: '👥', label: 'Players' },
    { id: 'settings' as const, icon: '⚙️', label: 'Settings' },
  ];

  // Handle initial welcome flow - no user name means they haven't started yet
  if (!user || !user.name.trim()) {
    return <WelcomePage />;
  }

  // Handle character creation for players who just selected their role
  if (user.type === 'player' && mode === 'offline' && phase === 'preparation') {
    return <CharacterCreation />;
  }

  // Handle DM preparation mode
  if (user.type === 'host' && mode === 'offline' && (phase === 'preparation' || phase === 'ready' || phase === 'starting')) {
    return <OfflinePreparation />;
  }

  // Handle multiplayer lobby/connection
  if (mode === 'joining' || (!isConnected && mode !== 'offline')) {
    return <Lobby />;
  }

  if (!activeScene) {
    // Show scene creation prompt for hosts, waiting message for players
    return (
      <div className="game-layout-empty">
        <div className="empty-state">
          {isHost ? (
            <>
              <h2>Ready to Begin</h2>
              <p>Create your first scene to start the adventure!</p>
              <button className="btn btn-primary">Create Scene</button>
            </>
          ) : (
            <>
              <h2>Waiting for DM</h2>
              <p>The Dungeon Master is setting up the game...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="game-layout" 
      data-panel-expanded={panelExpanded}
      style={{
        '--sidebar-width': `${panelExpanded ? sidebarWidth : 60}px`
      } as React.CSSProperties}
    >
      {/* Panel Tabs Header - No Scene Tabs */}
      <div className="layout-header">
        <div className="header-left">
          <PlayerBar />
        </div>

        <div className="header-right">
          {/* Horizontal Panel Tabs */}
          <ul className="horizontal-panel-tabs" role="tablist">
            {panels.map(panel => (
              <li key={panel.id} className="horizontal-panel-tab" role="tab">
                <label>
                  <input
                    type="radio"
                    name="panel"
                    value={panel.id}
                    checked={activePanel === panel.id}
                    onChange={() => setActivePanel(panel.id)}
                  />
                  <span className="panel-icon">{panel.icon}</span>
                  <span className="panel-label">{panel.label}</span>
                </label>
              </li>
            ))}

            {/* Collapse/Expand Toggle */}
            <li className="horizontal-panel-toggle" role="tab">
              <button
                type="button"
                onClick={() => setPanelExpanded(!panelExpanded)}
                title={panelExpanded ? 'Collapse panel' : 'Expand panel'}
              >
                <span className="toggle-icon">
                  {panelExpanded ? '«' : '»'}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Game Canvas with Scene Tabs */}
      <div className="layout-scene">
        {/* Browser-Style Scene Tab Bar */}
        <div className="scene-tab-bar">
          <SceneTabs
            scenes={scenes}
            activeSceneId={activeScene.id}
          />
        </div>

        {/* Scene Content */}
        <div className="scene-content">
          <SceneCanvas scene={activeScene} />
        </div>
        
        {/* Floating Toolbar */}
        <div className="layout-toolbar">
          <GameToolbar />
        </div>
      </div>

      {/* Resizable Context Panel */}
      <div 
        ref={sidebarRef}
        className={`layout-panel`}
        data-expanded={panelExpanded}
        style={{
          width: panelExpanded ? sidebarWidth : 60,
        }}
      >
        {/* Resize Handle */}
        <div 
          className="sidebar-resize-handle"
          onMouseDown={handleResizeStart}
        />
        
        <ContextPanel 
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          expanded={panelExpanded}
          onToggleExpanded={() => setPanelExpanded(!panelExpanded)}
          onContentWidthChange={handleContentWidthChange}
        />
      </div>
    </div>
  );
};