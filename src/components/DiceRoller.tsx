import React, { useState, useRef, useEffect } from 'react';
import { useGameStore, useDiceRolls, useUser, useIsHost } from '@/stores/gameStore';
import { createDiceRoll, formatDiceRoll, COMMON_DICE } from '@/utils/dice';
import { webSocketService } from '@/utils/websocket';

/**
 * @file DiceRoller.tsx
 * @description A component that allows users to roll dice with standard notation (e.g., "2d6+3"),
 * provides quick-roll buttons for common dice, and displays a history of all rolls in the session.
 */

/**
 * The main dice roller component. It handles user input, calculates dice rolls,
 * updates the global state, and broadcasts the roll to other players via WebSocket.
 */
export const DiceRoller: React.FC = () => {
  const { addDiceRoll } = useGameStore();
  const diceRolls = useDiceRolls();
  const isHost = useIsHost();
  const user = useUser();
  // Local state for the dice expression input field.
  const [expression, setExpression] = useState('');
  // Local state for displaying validation errors.
  const [error, setError] = useState('');
  // Local state for the private roll toggle.
  const [isPrivate, setIsPrivate] = useState(false);
  const rollsListRef = useRef<HTMLDivElement>(null);
  const prevRollsCount = useRef(diceRolls.length);

  // Effect to scroll to the top when a new roll is added.
  useEffect(() => {
    if (diceRolls.length > prevRollsCount.current && rollsListRef.current) {
      rollsListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevRollsCount.current = diceRolls.length;
  }, [diceRolls]);

  /**
   * Handles the primary roll action triggered by the "Roll" button or Enter key.
   * It validates the expression, creates a roll object, updates the local state for
   * instant feedback, and sends the roll to the server to be broadcasted.
   */
  const handleRoll = () => {
    if (!expression.trim()) {
      setError('Please enter a dice expression');
      return;
    }

    const roll = createDiceRoll(expression.trim(), user.id, user.name, isHost && isPrivate);
    if (!roll) {
      setError('Invalid dice expression. Use format like "2d6+3"');
      return;
    }

    // Clear any previous errors.
    setError('');
    // Add the roll to the local state immediately for a responsive UI.
    // The server will broadcast it back to us, but adding it here makes it feel instant.
    if (!diceRolls.some(r => r.id === roll.id)) {
      addDiceRoll(roll);
    }
    
    // Broadcast the roll to all other players in the session.
    webSocketService.sendEvent({ type: 'dice/roll', data: { roll } });
    
    // Clear the input field for the next roll.
    setExpression('');
  };

  /**
   * Handles rolls from the "Quick Roll" buttons (e.g., d20, d6).
   * This function bypasses the input field for a faster user experience.
   */
  const handleQuickRoll = (expr: string) => {
    setError('');
    
    const roll = createDiceRoll(expr, user.id, user.name, isHost && isPrivate);
    if (roll) {
      if (!diceRolls.some(r => r.id === roll.id)) {
        addDiceRoll(roll);
      }
      webSocketService.sendEvent({ type: 'dice/roll', data: { roll } });
      // Do not clear the main expression input, as the user might be building a complex roll.
      // Or, uncomment the line below if you prefer the quick roll to populate the input.
      // setExpression(expr);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRoll();
    }
  };

  // Filter rolls for display. Hosts see all rolls, players only see public ones.
  const visibleRolls = isHost ? diceRolls : diceRolls.filter(roll => !roll.isPrivate);

  return (
    <div className="dice-roller">
      {/* Section for user input and quick roll buttons */}
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

        {isHost && (
          <div className="private-roll-toggle">
            <label>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span>
                Private Roll (DM only)
              </span>
            </label>
          </div>
        )}

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

      {/* Section for displaying the history of all dice rolls */}
      <div className="dice-history">
        <h3>Roll History</h3>
        <div className="rolls-list" ref={rollsListRef}>
          {visibleRolls.length === 0 ? (
            <p className="no-rolls">No dice rolls yet</p>
          ) : (
            visibleRolls.map((roll, index) => (
              <div key={roll.id} className={`dice-roll ${index === 0 ? 'new-roll' : ''} ${roll.isPrivate ? 'private' : ''}`}>
                <div className="roll-header">
                  <span className="roller-name">{roll.userName}</span>
                  <span className="roll-time">
                    {roll.isPrivate && <span className="private-tag">Private</span>}
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
