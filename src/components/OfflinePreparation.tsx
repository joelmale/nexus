/**
 * Offline Preparation Component
 *
 * Allows the host to prepare game content offline before going live.
 * Provides scene creation, character management, and settings configuration
 * without requiring server connection.
 */

import React, { useState } from 'react';
import {
  useGameStore,
  useScenes,
  useActiveScene,
  useGamePhase,
  useCanGoLive,
} from '@/stores/gameStore';
import type { LiveGameConfig } from '@/types/gameLifecycle';

export const OfflinePreparation: React.FC = () => {
  const {
    createScene,
    setActiveScene,
    setUser,
    markReadyToStart,
    startGoingLive,
  } = useGameStore();
  const phase = useGamePhase();
  const canGoLive = useCanGoLive();
  const scenes = useScenes();
  const activeScene = useActiveScene();

  const [isGoingLive, setIsGoingLive] = useState(false);
  const [gameConfig, setGameConfig] = useState<LiveGameConfig>({
    allowPlayerJoining: true,
    syncFrequency: 1000,
    maxPlayers: 6,
    gameTitle: '',
    gameDescription: '',
  });

  const handleCreateScene = () => {
    // This will create a scene using the sceneUtils.createDefaultScene
    // The createScene action in gameStore should handle this properly
    const sceneData = {
      name: `Scene ${scenes.length + 1}`,
      description: 'A new scene for the adventure',
      visibility: 'public' as const,
      isEditable: true,
      createdBy: 'host', // Will be replaced with actual user ID
      backgroundImage: undefined,
      gridSettings: {
        enabled: true,
        size: 50,
        color: '#ffffff',
        opacity: 0.3,
        snapToGrid: true,
        showToPlayers: true,
      },
      lightingSettings: {
        enabled: false,
        globalIllumination: true,
        ambientLight: 0.5,
        darkness: 0,
      },
      drawings: [],
      placedTokens: [],
      isActive: false,
      playerCount: 0,
    };

    createScene(sceneData);
  };

  const handleMarkReady = () => {
    markReadyToStart();
  };

  const handleGoLive = async () => {
    if (!canGoLive) {
      console.warn('Cannot go live - game not ready');
      return;
    }

    setIsGoingLive(true);
    try {
      const roomCode = await startGoingLive(gameConfig);
      console.log(`🚀 Game is now live with room code: ${roomCode}`);
      // The lifecycle store will handle the transition to live mode
    } catch (error) {
      console.error('Failed to go live:', error);
      // TODO: Show error to user
    } finally {
      setIsGoingLive(false);
    }
  };

  const handleBackToWelcome = () => {
    // Reset user to go back to welcome page
    setUser({ name: '', type: 'host' });
  };

  const handleConfigChange = (updates: Partial<LiveGameConfig>) => {
    setGameConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="offline-preparation">
      <div className="preparation-header">
        <div className="header-with-back">
          <button
            onClick={handleBackToWelcome}
            className="back-button glass-button"
            title="Back to Welcome"
          >
            ←
          </button>
          <div className="header-content">
            <h1>🎲 Prepare Your Game</h1>
            <p>Build your adventure offline, then go live when you're ready!</p>
          </div>
        </div>

        <div className="phase-indicator">
          <span className={`phase-badge ${phase}`}>
            {phase === 'preparation' && '📝 Preparing'}
            {phase === 'ready' && '✅ Ready to Start'}
            {phase === 'starting' && '🚀 Going Live...'}
          </span>
        </div>
      </div>

      <div className="preparation-content">
        {/* Scene Management */}
        <div className="content-section">
          <h2>📍 Scenes</h2>
          <div className="scene-management">
            {scenes.length === 0 ? (
              <div className="empty-state">
                <p>
                  No scenes created yet. Start by creating your first scene!
                </p>
                <button className="btn btn-primary" onClick={handleCreateScene}>
                  Create First Scene
                </button>
              </div>
            ) : (
              <div className="scene-grid">
                {scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className={`scene-card ${activeScene?.id === scene.id ? 'active' : ''}`}
                    onClick={() => setActiveScene(scene.id)}
                  >
                    <h3>{scene.name}</h3>
                    <p>{scene.description || 'No description'}</p>
                    <div className="scene-stats">
                      <span>🎨 {scene.drawings.length} drawings</span>
                      <span>🎭 {scene.placedTokens.length} tokens</span>
                    </div>
                  </div>
                ))}

                <div
                  className="scene-card add-scene"
                  onClick={handleCreateScene}
                >
                  <div className="add-scene-content">
                    <span className="add-icon">+</span>
                    <span>Add Scene</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Settings */}
        <div className="content-section">
          <h2>⚙️ Game Settings</h2>
          <div className="settings-grid">
            <div className="setting-group">
              <label htmlFor="gameTitle">Game Title</label>
              <input
                id="gameTitle"
                type="text"
                value={gameConfig.gameTitle || ''}
                onChange={(e) =>
                  handleConfigChange({ gameTitle: e.target.value })
                }
                placeholder="Enter your campaign title..."
              />
            </div>

            <div className="setting-group">
              <label htmlFor="gameDescription">Description</label>
              <textarea
                id="gameDescription"
                value={gameConfig.gameDescription || ''}
                onChange={(e) =>
                  handleConfigChange({ gameDescription: e.target.value })
                }
                placeholder="Brief description of your game..."
                rows={3}
              />
            </div>

            <div className="setting-group">
              <label htmlFor="maxPlayers">Max Players</label>
              <input
                id="maxPlayers"
                type="number"
                min="1"
                max="12"
                value={gameConfig.maxPlayers}
                onChange={(e) =>
                  handleConfigChange({ maxPlayers: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="setting-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={gameConfig.allowPlayerJoining}
                  onChange={(e) =>
                    handleConfigChange({ allowPlayerJoining: e.target.checked })
                  }
                />
                Allow players to join during game
              </label>
            </div>
          </div>
        </div>

        {/* Ready to Start */}
        <div className="content-section">
          <h2>🚀 Go Live</h2>
          <div className="go-live-section">
            {phase === 'preparation' && (
              <div className="ready-checklist">
                <h3>Ready to start?</h3>
                <ul>
                  <li className={scenes.length > 0 ? 'complete' : 'incomplete'}>
                    ✓ At least one scene created ({scenes.length} scenes)
                  </li>
                  <li
                    className={gameConfig.gameTitle ? 'complete' : 'incomplete'}
                  >
                    {gameConfig.gameTitle ? '✓' : '○'} Game title set
                  </li>
                  <li className="complete">✓ Settings configured</li>
                </ul>

                <button
                  className="btn btn-secondary"
                  onClick={handleMarkReady}
                  disabled={scenes.length === 0}
                >
                  Mark Ready to Start
                </button>
              </div>
            )}

            {phase === 'ready' && (
              <div className="ready-to-go">
                <h3>✅ Ready to Go Live!</h3>
                <p>
                  Your game is prepared and ready. Click below to start hosting
                  online.
                </p>

                <div className="live-game-preview">
                  <h4>Game Summary:</h4>
                  <ul>
                    <li>
                      <strong>
                        {gameConfig.gameTitle || 'Untitled Campaign'}
                      </strong>
                    </li>
                    <li>{scenes.length} scenes prepared</li>
                    <li>Up to {gameConfig.maxPlayers} players</li>
                    <li>
                      Players {gameConfig.allowPlayerJoining ? 'can' : 'cannot'}{' '}
                      join during game
                    </li>
                  </ul>
                </div>

                <button
                  className="btn btn-primary btn-large"
                  onClick={handleGoLive}
                  disabled={isGoingLive}
                >
                  {isGoingLive
                    ? '🚀 Starting Live Game...'
                    : '🚀 Start Live Game'}
                </button>
              </div>
            )}

            {phase === 'starting' && (
              <div className="starting-live">
                <h3>🚀 Going Live...</h3>
                <p>Setting up your live game session...</p>
                <div className="loading-indicator">
                  <div className="spinner"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
