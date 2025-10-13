import React, { useEffect, useRef } from 'react';
import {
  useTokenStore,
  useSelectedToken,
  useTokenToolbar,
} from '@/stores/tokenStore';
import { TextPanel } from './toolbar-panels/TextPanel';
import { OptionsPanel } from './toolbar-panels/OptionsPanel';
import { ConditionsPanel } from './toolbar-panels/ConditionsPanel';
import { PlayerPanel } from './toolbar-panels/PlayerPanel';
import './TokenToolbar.css';

interface TokenToolbarProps {
  position: { x: number; y: number };
}

export const TokenToolbar: React.FC<TokenToolbarProps> = ({ position }) => {
  const { selectedTokenId, activeToolbarTool, setActiveToolbarTool } =
    useTokenToolbar();
  const selectedToken = useSelectedToken();
  const {
    toggleTokenDead,
    toggleTokenHidden,
    removeToken,
    toggleTokenInitiative,
  } = useTokenStore();

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close toolbar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node)
      ) {
        useTokenStore.getState().clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedTokenId || !selectedToken) {
    return null;
  }

  const handleToolClick = (tool: string) => {
    setActiveToolbarTool(activeToolbarTool === tool ? null : tool);
  };

  const handleRemoveToken = () => {
    if (window.confirm('Are you sure you want to remove this token?')) {
      removeToken(selectedTokenId);
    }
  };

  const renderSubPanel = () => {
    switch (activeToolbarTool) {
      case 'text':
        return <TextPanel tokenId={selectedTokenId} />;
      case 'options':
        return <OptionsPanel tokenId={selectedTokenId} />;
      case 'conditions':
        return <ConditionsPanel tokenId={selectedTokenId} />;
      case 'players':
        return <PlayerPanel tokenId={selectedTokenId} />;
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
            className={`token-toolbar-btn ${selectedToken.isInInitiative ? 'active' : ''}`}
            onClick={() => toggleTokenInitiative(selectedTokenId)}
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
            className={`token-toolbar-btn ${selectedToken.isDead ? 'active' : ''}`}
            onClick={() => toggleTokenDead(selectedTokenId)}
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
            className={`token-toolbar-btn ${selectedToken.isHidden ? 'active' : ''}`}
            onClick={() => toggleTokenHidden(selectedTokenId)}
            title={selectedToken.isHidden ? 'Reveal Token' : 'Hide Token'}
          >
            <span className="token-toolbar-icon">
              {selectedToken.isHidden ? '🙈' : '👁️'}
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
