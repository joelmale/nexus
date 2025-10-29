import React, { useEffect, useRef, useState } from 'react';
import { useGameStore, useSelectedPlacedToken, useActiveScene } from '@/stores/gameStore';
import { TextPanel } from './toolbar-panels/TextPanel';
import { OptionsPanel } from './toolbar-panels/OptionsPanel';
import { ConditionsPanel } from './toolbar-panels/ConditionsPanel';
import './TokenToolbar.css';

interface TokenToolbarProps {
  position: { x: number; y: number };
}

export const TokenToolbar: React.FC<TokenToolbarProps> = ({ position }) => {
  const [activeToolbarTool, setActiveToolbarTool] = useState<string | null>(null);
  const selectedPlacedToken = useSelectedPlacedToken();
  const activeScene = useActiveScene();
  const { updateToken, deleteToken, clearSelection } = useGameStore();

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close toolbar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node)
      ) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSelection]);

  if (!selectedPlacedToken || !activeScene) {
    return null;
  }

  const handleToolClick = (tool: string) => {
    setActiveToolbarTool(activeToolbarTool === tool ? null : tool);
  };

  const handleRemoveToken = () => {
    if (window.confirm('Are you sure you want to remove this token?')) {
      deleteToken(activeScene.id, selectedPlacedToken.id);
    }
  };

  const handleClosePanel = () => {
    setActiveToolbarTool(null);
  };

  const renderSubPanel = () => {
    switch (activeToolbarTool) {
      case 'text':
        return <TextPanel tokenId={selectedPlacedToken.id} onClose={handleClosePanel} />;
      case 'options':
        return <OptionsPanel tokenId={selectedPlacedToken.id} />;
      case 'conditions':
        return <ConditionsPanel tokenId={selectedPlacedToken.id} />;
      case 'players':
        // TODO: Refactor PlayerPanel to work with PlacedTokens
        return null;
      default:
        return null;
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="token-toolbar"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Main Toolbar */}
      <div className="token-toolbar-main">
        {/* Primary Tools */}
        <div className="token-toolbar-primary">
          <button
            className={`token-toolbar-btn ${activeToolbarTool === 'text' ? 'active' : ''}`}
            onClick={() => handleToolClick('text')}
            title="Edit Label"
          >
            <span className="token-toolbar-icon">T</span>
          </button>

          <button
            className={`token-toolbar-btn ${activeToolbarTool === 'options' ? 'active' : ''}`}
            onClick={() => handleToolClick('options')}
            title="Token Options"
          >
            <span className="token-toolbar-icon">⚙️</span>
          </button>

          <button
            className={`token-toolbar-btn ${activeToolbarTool === 'conditions' ? 'active' : ''}`}
            onClick={() => handleToolClick('conditions')}
            title="Status Conditions"
          >
            <span className="token-toolbar-icon">❤️</span>
          </button>

          <button
            className={`token-toolbar-btn ${selectedPlacedToken.isInInitiative ? 'active' : ''}`}
            onClick={() => updateToken(activeScene.id, selectedPlacedToken.id, {
              isInInitiative: !selectedPlacedToken.isInInitiative
            })}
            title="Toggle Initiative"
          >
            <span className="token-toolbar-icon">⏳</span>
          </button>

          <button
            className={`token-toolbar-btn ${activeToolbarTool === 'players' ? 'active' : ''}`}
            onClick={() => handleToolClick('players')}
            title="Player Control"
          >
            <span className="token-toolbar-icon">👥</span>
          </button>

          <button
            className={`token-toolbar-btn ${selectedPlacedToken.isDead ? 'active' : ''}`}
            onClick={() => updateToken(activeScene.id, selectedPlacedToken.id, {
              isDead: !selectedPlacedToken.isDead
            })}
            title="Toggle Dead"
          >
            <span className="token-toolbar-icon">💀</span>
          </button>
        </div>

        {/* Separator */}
        <div className="token-toolbar-separator" />

        {/* Secondary Tools */}
        <div className="token-toolbar-secondary">
          <button
            className={`token-toolbar-btn ${selectedPlacedToken.dmNotesOnly ? 'active' : ''}`}
            onClick={() => updateToken(activeScene.id, selectedPlacedToken.id, {
              dmNotesOnly: !selectedPlacedToken.dmNotesOnly
            })}
            title={selectedPlacedToken.dmNotesOnly ? 'Show to Players' : 'Hide from Players'}
          >
            <span className="token-toolbar-icon">
              {selectedPlacedToken.dmNotesOnly ? '🙈' : '👁️'}
            </span>
          </button>

          <button
            className="token-toolbar-btn danger"
            onClick={handleRemoveToken}
            title="Remove Token"
          >
            <span className="token-toolbar-icon">🗑️</span>
          </button>
        </div>
      </div>

      {/* Sub Panel */}
      {renderSubPanel()}
    </div>
  );
};
