import React, { useState } from 'react';
import { useGameStore, useDiceRolls, useUser } from '@/stores/gameStore';
import { createDiceRoll, formatDiceRoll, COMMON_DICE } from '@/utils/dice';
import { webSocketService } from '@/utils/websocket';

export const DiceRoller: React.FC = () => {
  const { addDiceRoll } = useGameStore();
  const diceRolls = useDiceRolls();
  const user = useUser();
  const [expression, setExpression] = useState('');
  const [error, setError] = useState('');

  const handleRoll = () => {
    if (!expression.trim()) {
      setError('Please enter a dice expression');
      return;
    }

    const roll = createDiceRoll(expression.trim(), user.id, user.name);
    if (!roll) {
      setError('Invalid dice expression. Use format like "2d6+3"');
      return;
    }

    setError('');
    addDiceRoll(roll);
    
    // Send to other players
    webSocketService.sendDiceRoll(roll);
    
    // Clear expression after rolling
    setExpression('');
  };

  const handleQuickRoll = (expr: string) => {
    setExpression(expr);
    setError('');
    
    const roll = createDiceRoll(expr, user.id, user.name);
    if (roll) {
      addDiceRoll(roll);
      webSocketService.sendDiceRoll(roll);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRoll();
    }
  };

  return (
    <div className="dice-roller">
      <div className="dice-input">
        <h2>Dice Roller</h2>
        
        <div className="roll-controls">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter dice expression (e.g., 2d6+3)"
            className="dice-expression"
          />
          <button onClick={handleRoll} className="roll-btn">
            Roll
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="quick-dice">
          <h3>Quick Roll</h3>
          <div className="dice-buttons">
            {COMMON_DICE.map(dice => (
              <button
                key={dice}
                onClick={() => handleQuickRoll(dice)}
                className="dice-btn"
              >
                {dice}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dice-history">
        <h3>Roll History</h3>
        <div className="rolls-list">
          {diceRolls.length === 0 ? (
            <p className="no-rolls">No dice rolls yet</p>
          ) : (
            diceRolls.map(roll => (
              <div key={roll.id} className="dice-roll">
                <div className="roll-header">
                  <span className="roller-name">{roll.userName}</span>
                  <span className="roll-time">
                    {new Date(roll.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="roll-result">
                  {formatDiceRoll(roll)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
