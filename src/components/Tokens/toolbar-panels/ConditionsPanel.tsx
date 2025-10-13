import React from 'react';
import { useTokenStore } from '@/stores/tokenStore';

interface ConditionsPanelProps {
  tokenId: string;
}

const CONDITION_ICONS: Record<string, string> = {
  Blinded: '👁️‍🗨️',
  Charmed: '😍',
  Deafened: '🙉',
  Frightened: '😱',
  Grappled: '🤝',
  Incapacitated: '😴',
  Invisible: '👻',
  Paralyzed: '🧊',
  Petrified: '🗿',
  Poisoned: '🤢',
  Prone: '⬇️',
  Restrained: '🔒',
  Stunned: '💫',
  Unconscious: '😵',
};

const CONDITIONS = Object.keys(CONDITION_ICONS);

export const ConditionsPanel: React.FC<ConditionsPanelProps> = ({
  tokenId,
}) => {
  const { toggleTokenCondition } = useTokenStore();
  const token = useTokenStore.getState().tokens.find((t) => t.id === tokenId);

  if (!token) return null;

  return (
    <div className="token-toolbar-panel conditions-panel">
      <div className="token-panel-header">
        <span className="token-panel-title">Status Conditions</span>
      </div>
      <div className="token-panel-content">
        <div className="conditions-grid">
          {CONDITIONS.map((condition) => {
            const isActive = token.conditions.includes(condition);
            return (
              <button
                key={condition}
                className={`condition-btn ${isActive ? 'active' : ''}`}
                onClick={() => toggleTokenCondition(tokenId, condition)}
                title={`${condition} ${isActive ? '(Active)' : ''}`}
              >
                <span className="condition-icon">
                  {CONDITION_ICONS[condition]}
                </span>
                <span className="condition-name">{condition}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
