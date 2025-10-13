import React, { useState, useEffect } from 'react';
import { useTokenStore } from '@/stores/tokenStore';
import { useRef } from 'react';

interface TextPanelProps {
  tokenId: string;
}

export const TextPanel: React.FC<TextPanelProps> = ({ tokenId }) => {
  const { updateTokenLabel } = useTokenStore();
  const [label, setLabel] = useState('');

  // Get current label when panel opens
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      const token = useTokenStore
        .getState()
        .tokens.find((t) => t.id === tokenId);
      if (token) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLabel(token.label);
        initializedRef.current = true;
      }
    }
  }, [tokenId]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    updateTokenLabel(tokenId, newLabel);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Close panel on Enter
      useTokenStore.getState().setActiveToolbarTool(null);
    } else if (e.key === 'Escape') {
      // Reset to original value on Escape
      const token = useTokenStore
        .getState()
        .tokens.find((t) => t.id === tokenId);
      if (token) {
        setLabel(token.label);
      }
      useTokenStore.getState().setActiveToolbarTool(null);
    }
  };

  return (
    <div className="token-toolbar-panel text-panel">
      <div className="token-panel-header">
        <span className="token-panel-title">Token Label</span>
      </div>
      <div className="token-panel-content">
        <input
          type="text"
          value={label}
          onChange={handleLabelChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter token name..."
          className="token-text-input"
          autoFocus
        />
        <div className="token-panel-hint">
          Press Enter to confirm, Escape to cancel
        </div>
      </div>
    </div>
  );
};
