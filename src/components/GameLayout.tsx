import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore, useIsConnected, useActiveScene, useScenes, useIsHost, useSettings, useColorScheme } from '@/stores/gameStore';
import { SceneCanvas } from './Scene/SceneCanvas';
import { SceneTabs } from './Scene/SceneTabs';
import { GameToolbar } from './GameToolbar';
import { PlayerBar } from './PlayerBar';
import { ContextPanel } from './ContextPanel';
import { Lobby } from './Lobby';
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
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState<'tokens' | 'scene' | 'props' | 'initiative' | 'dice' | 'chat' | 'sounds' | 'lobby' | 'settings'>('lobby');
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
  
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const rect = document.querySelector('.game-layout')?.getBoundingClientRect();
      if (!rect) return;
      
      const newWidth = rect.right - e.clientX;
      const minWidth = panelExpanded ? 250 : 60;
      const maxWidth = Math.min(500, rect.width * 0.4);
      
      setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };
    
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelExpanded]);

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
    { id: 'lobby' as const, icon: '👥', label: 'Lobby' },
    { id: 'settings' as const, icon: '⚙️', label: 'Settings' },
  ];

  if (!isConnected) {
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
      {/* Combined Scene Tabs and Panel Tabs */}
      <div className="layout-header">
        <div className="header-left">
          <SceneTabs 
            scenes={scenes}
            activeSceneId={activeScene.id}
            isHost={isHost}
          />
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

      {/* Main Game Canvas */}
      <div className="layout-scene">
        <SceneCanvas scene={activeScene} />
        
        {/* Floating Player Bar */}
        <div className="layout-players">
          <PlayerBar />
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