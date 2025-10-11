/**
 * Linear Game Layout Component
 *
 * Clean game interface without routing logic for use in linear flow
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  useActiveScene,
  useScenes,
  useSettings,
  useColorScheme,
  useGameStore,
  useServerRoomCode,
  useIsConnected,
} from '@/stores/gameStore';
import { SceneCanvas } from './Scene/SceneCanvas';
import { SceneTabs } from './Scene/SceneTabs';
import { GameToolbar } from './GameToolbar';
import { PlayerBar } from './PlayerBar';
import { ContextPanel } from './ContextPanel';
import { GeneratorPanel } from './Generator/GeneratorPanel';
import { DiceBox3D } from './DiceBox3D';
import { applyColorScheme } from '@/utils/colorSchemes';

export const LinearGameLayout: React.FC = () => {
  const activeScene = useActiveScene();
  const scenes = useScenes();
  const settings = useSettings();
  const colorScheme = useColorScheme();
  const { user, leaveRoom } = useGameStore();
  const roomCode = useServerRoomCode();
  const isConnectedToRoom = useIsConnected();

  // Add debugging for game layout mounting and auto-reconnect WebSocket
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎮 LinearGameLayout mounted with:', {
        user,
        roomCode,
        activeScene: activeScene?.id || 'none',
        scenesCount: scenes.length,
      });
    }

    // Auto-reconnect WebSocket if we have a room code AND we're supposed to be connected
    // Skip auto-reconnect for offline mode (when isConnectedToRoom is false)
    let isCancelled = false; // Guard against React Strict Mode double-mount

    const reconnectIfNeeded = async () => {
      if (isCancelled || !roomCode || !user.type) return; // Early exit if cancelled

      // IMPORTANT: Skip auto-reconnect if we're in offline mode
      // dev_quickDM and dev_quickPlayer set isConnectedToRoom to false
      if (!isConnectedToRoom) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '⚡ Offline mode detected - skipping WebSocket auto-reconnect',
          );
        }
        return;
      }

      const { webSocketService: wsService } = await import('@/utils/websocket');

      // Check again after async import (component might have unmounted)
      if (isCancelled) return;

      if (!wsService.isConnected()) {
        console.log('🔌 Auto-reconnecting to room:', roomCode, 'as', user.type);
        try {
          const userType = user.type;
          await wsService.connect(roomCode, userType);
          if (!isCancelled) {
            console.log('✅ Auto-reconnection successful');
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('❌ Auto-reconnection failed:', error);
          }
        }
      }

      // Listen for WebSocket messages to handle "Room not found" error
      const handleWebSocketMessage = (event: Event) => {
        const customEvent = event as CustomEvent;
        const message = customEvent.detail;

        if (
          message.type === 'error' &&
          message.data?.message === 'Room not found'
        ) {
          console.log('🔄 Room expired - navigating back to welcome screen');
          // Navigate back to welcome screen
          const { resetToWelcome } = useGameStore.getState();
          resetToWelcome();
        }
      };

      wsService.addEventListener('message', handleWebSocketMessage);

      return () => {
        wsService.removeEventListener('message', handleWebSocketMessage);
      };
    };

    reconnectIfNeeded();

    return () => {
      isCancelled = true; // Cancel any pending async operations
      if (process.env.NODE_ENV === 'development') {
        console.log('🎮 LinearGameLayout unmounting');
      }
    };
  }, [roomCode, user.type, isConnectedToRoom]);

  // Use appFlowStore for host detection instead of old gameStore
  const isHost = user.type === 'host';

  // Debug logging for host status
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('👑 Host status check:', {
        userType: user.type,
        isHost,
        userName: user.name,
        roomCode,
      });

      // Safety check: If we have no user but we're in game view, something is wrong
      if (!user.name || !user.type) {
        console.warn(
          '⚠️ LinearGameLayout rendered with invalid user state - should be on welcome screen',
        );
      }
    }
  }, [user.type, isHost, user.name, roomCode]);

  const [panelExpanded, setPanelExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState<
    | 'tokens'
    | 'scene'
    | 'props'
    | 'generator'
    | 'initiative'
    | 'dice'
    | 'chat'
    | 'sounds'
    | 'lobby'
    | 'settings'
  >(isHost ? 'scene' : 'lobby');
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

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
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
      document.body.style.pointerEvents = 'none';

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;

        requestAnimationFrame(() => {
          const deltaX = startMouseX.current - e.clientX;
          const newWidth = startWidth.current + deltaX;

          const minWidth = panelExpanded ? 250 : 60;
          const maxWidth = 500;

          const constrainedWidth = Math.max(
            minWidth,
            Math.min(maxWidth, newWidth),
          );
          setSidebarWidth(constrainedWidth);
        });
      };

      const handleMouseUp = () => {
        if (!isResizing.current) return;

        isResizing.current = false;

        handle.classList.remove('dragging');

        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseUp);

        document.removeEventListener('pointermove', handleMouseMove);
        document.removeEventListener('pointerup', handleMouseUp);
        document.removeEventListener('pointercancel', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove, {
        passive: false,
      });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.addEventListener('mouseleave', handleMouseUp, {
        passive: false,
      });

      document.addEventListener('pointermove', handleMouseMove, {
        passive: false,
      });
      document.addEventListener('pointerup', handleMouseUp, {
        passive: false,
      });
      document.addEventListener('pointercancel', handleMouseUp, {
        passive: false,
      });
    },
    [sidebarWidth, panelExpanded],
  );

  const handleContentWidthChange = useCallback((width: number) => {
    if (width > 0) {
      setSidebarWidth(width);
    }
  }, []);

  const panels = [
    { id: 'tokens' as const, icon: '👤', label: 'Tokens' },
    { id: 'scene' as const, icon: '🖼', label: 'Scene' },
    ...(isHost ? [{ id: 'props' as const, icon: '📦', label: 'Props' }] : []),
    ...(isHost
      ? [{ id: 'generator' as const, icon: '🗺️', label: 'Generator' }]
      : []),
    { id: 'initiative' as const, icon: '⏱', label: 'Initiative' },
    { id: 'dice' as const, icon: '🎲', label: 'Dice' },
    { id: 'chat' as const, icon: '💬', label: 'Chat' },
    ...(isHost ? [{ id: 'sounds' as const, icon: '🔊', label: 'Sounds' }] : []),
    { id: 'lobby' as const, icon: '🏠', label: 'Lobby' },
    { id: 'settings' as const, icon: '⚙️', label: 'Settings' },
  ];

  // Show waiting screen only for players when no scene exists
  if (!activeScene && !isHost) {
    return (
      <div className="linear-game-layout">
        <div className="game-header">
          <div className="header-left">
            <div className="room-info">
              <h2>🎲 Game Room: {roomCode}</h2>
              <p>
                Welcome, <strong>{user.name}</strong>!
              </p>
            </div>
          </div>
          <div className="header-right">
            <button onClick={leaveRoom} className="glass-button secondary">
              <span>🚪</span>
              Leave Room
            </button>
          </div>
        </div>

        <div className="game-setup-content">
          <div className="setup-panel glass-panel">
            <div className="player-waiting">
              <h2>⏳ Waiting for DM</h2>
              <p>The Dungeon Master is setting up the game...</p>
              <div className="waiting-animation">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where DM has no scenes yet - show full interface but with empty scene
  if (!activeScene && isHost) {
    // DM sees full interface even without scenes - they can create scenes via the scene panel
  }

  return (
    <div
      className="game-layout"
      data-panel-expanded={panelExpanded}
      style={
        {
          '--sidebar-width': `${panelExpanded ? sidebarWidth : 60}px`,
        } as React.CSSProperties
      }
    >
      {/* Game Header */}
      <div className="layout-header">
        <div className="header-left">
          <PlayerBar />
        </div>

        <div className="header-right">
          {/* Horizontal Panel Tabs */}
          <ul className="horizontal-panel-tabs" role="tablist">
            {panels.map((panel) => (
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
                <span className="toggle-icon">{panelExpanded ? '«' : '»'}</span>
              </button>
            </li>

            {/* Leave Room Button */}
            <li className="header-action">
              <button
                onClick={leaveRoom}
                className="glass-button secondary small"
                title="Leave Room"
              >
                🚪
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Game Canvas with Scene Tabs */}
      <div className="layout-scene">
        {/* Browser-Style Scene Tab Bar */}
        <div className="scene-tab-bar">
          <SceneTabs scenes={scenes} activeSceneId={activeScene?.id || ''} />
        </div>

        {/* Scene Content */}
        <div className="scene-content" style={{ position: 'relative' }}>
          {activeScene ? (
            <SceneCanvas scene={activeScene} />
          ) : (
            <div className="empty-scene-state">
              <div className="empty-scene-content">
                <h3>🎲 Ready to Create Your First Scene</h3>
                <p>
                  Use the Scene panel on the right to create and configure your
                  first scene.
                </p>
              </div>
            </div>
          )}

          {/* 3D Dice Box - positioned top-right of scene */}
          <DiceBox3D />
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

      {/* Floating Generator Overlay */}
      {activePanel === 'generator' && (
        <div
          style={{
            position: 'fixed',
            top: '75px', // 15px from header (60 + 15)
            left: '25px',
            right: '25px',
            bottom: '25px',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            padding: '40px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, minHeight: 0 }}>
            <GeneratorPanel onSwitchToScenes={() => setActivePanel('scene')} />
          </div>
        </div>
      )}
    </div>
  );
};
