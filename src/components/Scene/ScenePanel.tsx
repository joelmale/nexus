import React, { useState } from 'react';
import { useGameStore, useIsHost } from '@/stores/gameStore';
import type { Scene } from '@/types/game';

interface ScenePanelProps {
  scene?: Scene;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({ scene }) => {
  const { updateScene, createScene, deleteScene } = useGameStore();
  const isHost = useIsHost();
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  // Add debugging for host detection
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎪 ScenePanel host check:', { isHost, scene: scene?.id || 'none' });
    }
  }, [isHost, scene?.id]);

  // If not DM, don't render anything
  if (!isHost) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ ScenePanel: Not host, returning null');
    }
    return null;
  }

  // Provide default values for missing properties
  const safeScene = scene ? {
    ...scene,
    description: scene.description || '',
    visibility: scene.visibility || 'private' as const,
    isEditable: scene.isEditable ?? true,
    gridSettings: {
      ...{
        enabled: true,
        size: 50,
        color: '#ffffff',
        opacity: 0.3,
        snapToGrid: true,
        showToPlayers: true,
      },
      ...(scene.gridSettings || {}),
    },
    lightingSettings: {
      ...{
        enabled: false,
        globalIllumination: true,
        ambientLight: 0.5,
        darkness: 0,
      },
      ...(scene.lightingSettings || {}),
    },
  } : null;

  // If no scene selected, show creation prompt
  if (!safeScene) {
    return (
      <div className="scene-panel">
        <div className="scene-panel-header">
          <h3>Scene Management</h3>
        </div>
        <div className="scene-panel-content">
          <div className="no-scene">
            <p>No scene selected. Create or select a scene to manage its settings.</p>
            <button
              onClick={() => {
                const defaultScene = {
                  name: `Scene 1`,
                  description: `A new scene for the adventure`,
                  visibility: 'private' as const,
                  isEditable: true,
                  createdBy: 'host',
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
                createScene(defaultScene);
              }}
              className="create-scene-button"
            >
              Create New Scene
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFieldUpdate = (field: keyof Scene, value: any) => {
    updateScene(safeScene.id, { [field]: value });
  };

  const handleNameSubmit = (name: string) => {
    if (name.trim()) {
      handleFieldUpdate('name', name.trim());
    }
    setEditingName(false);
  };

  const handleDescriptionSubmit = (description: string) => {
    handleFieldUpdate('description', description);
    setEditingDescription(false);
  };

  const handleVisibilityChange = (visibility: Scene['visibility']) => {
    handleFieldUpdate('visibility', visibility);
  };

  const handleGridSettingChange = (setting: keyof Scene['gridSettings'], value: any) => {
    handleFieldUpdate('gridSettings', {
      ...safeScene.gridSettings,
      [setting]: value,
    });
  };

  const handleLightingSettingChange = (setting: keyof Scene['lightingSettings'], value: any) => {
    handleFieldUpdate('lightingSettings', {
      ...safeScene.lightingSettings,
      [setting]: value,
    });
  };

  return (
    <div className="scene-panel">
      <div className="scene-panel-header">
        <h3>Scene Settings</h3>
        <div className="scene-meta">
          <span className="scene-id">ID: {safeScene.id.slice(0, 8)}</span>
          <span className="scene-updated">
            Updated: {new Date(safeScene.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="scene-panel-content">
        {/* Basic Info Section */}
        <section className="scene-section">
          <h4>Basic Information</h4>

          {/* Scene Name */}
          <div className="scene-field">
            <label>Scene Name</label>
            {editingName ? (
              <input
                type="text"
                defaultValue={safeScene.name}
                autoFocus
                onBlur={(e) => handleNameSubmit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSubmit(e.currentTarget.value);
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="scene-name-input"
              />
            ) : (
              <div
                className="scene-name-display"
                onClick={() => setEditingName(true)}
                title="Click to edit"
              >
                {safeScene.name}
              </div>
            )}
          </div>

          {/* Scene Description */}
          <div className="scene-field">
            <label>Description</label>
            {editingDescription ? (
              <textarea
                defaultValue={safeScene.description}
                autoFocus
                onBlur={(e) => handleDescriptionSubmit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingDescription(false);
                }}
                className="scene-description-input"
                rows={3}
                placeholder="Describe this safeScene..."
              />
            ) : (
              <div
                className="scene-description-display"
                onClick={() => setEditingDescription(true)}
                title="Click to edit"
              >
                {safeScene.description || 'No description'}
              </div>
            )}
          </div>
        </section>

        {/* Visibility Section */}
        <section className="scene-section">
          <h4>Visibility & Sharing</h4>

          <div className="scene-field">
            <label>Who can see this scene</label>
            <div className="visibility-options">
              <label className="visibility-option">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={safeScene.visibility === 'private'}
                  onChange={() => handleVisibilityChange('private')}
                />
                <span className="visibility-icon">🔒</span>
                <div className="visibility-details">
                  <strong>Private</strong>
                  <small>Only you can see this scene</small>
                </div>
              </label>

              <label className="visibility-option">
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={safeScene.visibility === 'shared'}
                  onChange={() => handleVisibilityChange('shared')}
                />
                <span className="visibility-icon">👥</span>
                <div className="visibility-details">
                  <strong>Shared</strong>
                  <small>Players can view when you share it</small>
                </div>
              </label>

              <label className="visibility-option">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={safeScene.visibility === 'public'}
                  onChange={() => handleVisibilityChange('public')}
                />
                <span className="visibility-icon">🌐</span>
                <div className="visibility-details">
                  <strong>Public</strong>
                  <small>All players can always see this scene</small>
                </div>
              </label>
            </div>
          </div>

          <div className="scene-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={safeScene.isEditable}
                onChange={(e) => handleFieldUpdate('isEditable', e.target.checked)}
              />
              Allow editing (tokens, drawings, etc.)
            </label>
          </div>
        </section>

        {/* Grid Settings Section */}
        <section className="scene-section">
          <h4>Grid Settings</h4>

          <div className="scene-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={safeScene.gridSettings.enabled}
                onChange={(e) => handleGridSettingChange('enabled', e.target.checked)}
              />
              Enable grid
            </label>
          </div>

          {safeScene.gridSettings.enabled && (
            <>
              <div className="scene-field">
                <label>Grid size: {safeScene.gridSettings.size}px</label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={safeScene.gridSettings.size}
                  onChange={(e) => handleGridSettingChange('size', parseInt(e.target.value))}
                  className="range-input"
                />
              </div>

              <div className="scene-field">
                <label>Grid opacity: {Math.round(safeScene.gridSettings.opacity * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={safeScene.gridSettings.opacity}
                  onChange={(e) => handleGridSettingChange('opacity', parseFloat(e.target.value))}
                  className="range-input"
                />
              </div>

              <div className="scene-field">
                <label>Grid color</label>
                <input
                  type="color"
                  value={safeScene.gridSettings.color}
                  onChange={(e) => handleGridSettingChange('color', e.target.value)}
                  className="color-input"
                />
              </div>

              <div className="scene-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={safeScene.gridSettings.snapToGrid}
                    onChange={(e) => handleGridSettingChange('snapToGrid', e.target.checked)}
                  />
                  Snap objects to grid
                </label>
              </div>

              <div className="scene-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={safeScene.gridSettings.showToPlayers}
                    onChange={(e) => handleGridSettingChange('showToPlayers', e.target.checked)}
                  />
                  Show grid to players
                </label>
              </div>
            </>
          )}
        </section>

        {/* Lighting Settings Section */}
        <section className="scene-section">
          <h4>Lighting & Vision</h4>

          <div className="scene-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={safeScene.lightingSettings.enabled}
                onChange={(e) => handleLightingSettingChange('enabled', e.target.checked)}
              />
              Enable dynamic lighting
            </label>
          </div>

          {safeScene.lightingSettings.enabled && (
            <>
              <div className="scene-field">
                <label>Ambient light: {Math.round(safeScene.lightingSettings.ambientLight * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={safeScene.lightingSettings.ambientLight}
                  onChange={(e) => handleLightingSettingChange('ambientLight', parseFloat(e.target.value))}
                  className="range-input"
                />
              </div>

              <div className="scene-field">
                <label>Darkness: {Math.round(safeScene.lightingSettings.darkness * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={safeScene.lightingSettings.darkness}
                  onChange={(e) => handleLightingSettingChange('darkness', parseFloat(e.target.value))}
                  className="range-input"
                />
              </div>

              <div className="scene-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={safeScene.lightingSettings.globalIllumination}
                    onChange={(e) => handleLightingSettingChange('globalIllumination', e.target.checked)}
                  />
                  Global illumination
                </label>
              </div>
            </>
          )}
        </section>

        {/* Danger Zone */}
        <section className="scene-section danger-zone">
          <h4>Danger Zone</h4>
          <button
            onClick={() => {
              if (window.confirm('Delete this scene? This cannot be undone.')) {
                deleteScene(safeScene.id);
              }
            }}
            className="delete-scene-button"
          >
            Delete Scene
          </button>
        </section>
      </div>
    </div>
  );
};