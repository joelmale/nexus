import React from 'react';
import { useTokenStore } from '@/stores/tokenStore';

interface OptionsPanelProps {
  tokenId: string;
}

const SIZE_OPTIONS: Array<{
  size: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
  display: string;
}> = [
  { size: 'Tiny', display: 'Tiny (2.5ft)' },
  { size: 'Small', display: 'Small (5ft)' },
  { size: 'Medium', display: 'Medium (5ft)' },
  { size: 'Large', display: 'Large (10ft)' },
  { size: 'Huge', display: 'Huge (15ft)' },
  { size: 'Gargantuan', display: 'Gargantuan (20ft+)' },
];

const AURA_OPTIONS: Array<
  'None' | 'Frightened' | 'Charmed' | 'Poisoned' | 'Custom'
> = ['None', 'Frightened', 'Charmed', 'Poisoned', 'Custom'];

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ tokenId }) => {
  const { updateTokenSize, updateTokenLight, updateTokenAura } =
    useTokenStore();
  const token = useTokenStore.getState().tokens.find((t) => t.id === tokenId);

  if (!token) return null;

  const handleSizeChange = (direction: 'prev' | 'next') => {
    const currentIndex = SIZE_OPTIONS.findIndex(
      (option) => option.size === token.size,
    );
    let newIndex;

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : SIZE_OPTIONS.length - 1;
    } else {
      newIndex = currentIndex < SIZE_OPTIONS.length - 1 ? currentIndex + 1 : 0;
    }

    updateTokenSize(tokenId, SIZE_OPTIONS[newIndex].size);
  };

  const handleLightChange = (direction: 'prev' | 'next') => {
    const currentRadius = token.lightRadius;
    let newRadius;

    if (direction === 'prev') {
      newRadius = Math.max(0, currentRadius - 5);
    } else {
      newRadius = Math.min(120, currentRadius + 5); // Max 120ft
    }

    updateTokenLight(tokenId, newRadius);
  };

  const handleAuraChange = (direction: 'prev' | 'next') => {
    const currentIndex = AURA_OPTIONS.indexOf(token.aura);
    let newIndex;

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : AURA_OPTIONS.length - 1;
    } else {
      newIndex = currentIndex < AURA_OPTIONS.length - 1 ? currentIndex + 1 : 0;
    }

    updateTokenAura(tokenId, AURA_OPTIONS[newIndex]);
  };

  const currentSizeOption = SIZE_OPTIONS.find(
    (option) => option.size === token.size,
  );

  return (
    <div className="token-toolbar-panel options-panel">
      <div className="token-panel-header">
        <span className="token-panel-title">Token Options</span>
      </div>
      <div className="token-panel-content">
        {/* Size Row */}
        <div className="token-option-row">
          <span className="token-option-label">Size:</span>
          <button
            className="token-option-btn"
            onClick={() => handleSizeChange('prev')}
            title="Previous size"
          >
            ‹
          </button>
          <span className="token-option-value">
            {currentSizeOption?.display || token.size}
          </span>
          <button
            className="token-option-btn"
            onClick={() => handleSizeChange('next')}
            title="Next size"
          >
            ›
          </button>
        </div>

        {/* Light Row */}
        <div className="token-option-row">
          <span className="token-option-label">Light:</span>
          <button
            className="token-option-btn"
            onClick={() => handleLightChange('prev')}
            title="Decrease light radius"
          >
            ‹
          </button>
          <span className="token-option-value">
            {token.lightRadius}ft. radius
          </span>
          <button
            className="token-option-btn"
            onClick={() => handleLightChange('next')}
            title="Increase light radius"
          >
            ›
          </button>
        </div>

        {/* Aura Row */}
        <div className="token-option-row">
          <span className="token-option-label">Aura:</span>
          <button
            className="token-option-btn"
            onClick={() => handleAuraChange('prev')}
            title="Previous aura"
          >
            ‹
          </button>
          <span className="token-option-value">{token.aura}</span>
          <button
            className="token-option-btn"
            onClick={() => handleAuraChange('next')}
            title="Next aura"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};
