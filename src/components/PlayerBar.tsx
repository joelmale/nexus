import React from 'react';
import { useGameStore } from '@/stores/gameStore';

export const PlayerBar: React.FC = () => {
  const { session } = useGameStore();
  
  if (!session) return null;
  
  return (
    <div className="player-bar">
      <div className="connected-players">
        {session.players.map(player => (
          <div key={player.id} className="player-indicator">
            <span className="player-avatar">{player.name[0].toUpperCase()}</span>
            <span className="player-name">{player.name}</span>
            {player.type === 'host' && <span className="host-badge">DM</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
