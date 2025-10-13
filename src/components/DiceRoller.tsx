import React, { useState, useRef, useEffect, useTransition } from 'react';
import { useDiceRolls, useIsHost, useGameStore } from '@/stores/gameStore';
import { formatDiceRoll, createDiceRoll } from '@/utils/dice';
import { webSocketService } from '@/utils/websocket';
import { diceSounds } from '@/utils/diceSounds';

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
  const diceRolls = useDiceRolls();
  const isHost = useIsHost();
  const { user, sendChatMessage } = useGameStore();
  // Local state for the dice expression input field.
  const [expression, setExpression] = useState('');
  // Local state for displaying validation errors.
  const [error, setError] = useState('');
  // Local state for the private roll toggle.
  const [isPrivate, setIsPrivate] = useState(false);
  // Use a single state for roll mode to ensure mutual exclusivity.
  const [rollMode, setRollMode] = useState<
    'none' | 'advantage' | 'disadvantage'
  >('none');
  const rollsListRef = useRef<HTMLDivElement>(null);
  const prevRollsCount = useRef(diceRolls.length);
  const [isConnected, setIsConnected] = useState(false);

  // Use transition for non-urgent dice roll operations
  const [, startRollTransition] = useTransition();

  // Check WebSocket connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(webSocketService.isConnected());
    };

    // Check immediately
    checkConnection();

    // Check periodically
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  // State for sound mute
  const [isSoundMuted, setIsSoundMuted] = useState(diceSounds.isSoundMuted());
  // State for dice theme (load from localStorage or default)
  const [diceTheme, setDiceTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('nexus_dice_theme') || 'default';
    } catch {
      return 'default';
    }
  });

  // Available dice themes
  const DICE_THEMES = [
    { id: 'default', name: 'Default' },
    { id: 'diceOfRolling', name: 'Dice of Rolling' },
    { id: 'smooth', name: 'Smooth' },
    { id: 'gemstone', name: 'Gemstone' },
    { id: 'gemstoneMarble', name: 'Gemstone Marble' },
    { id: 'rock', name: 'Rock' },
    { id: 'blueGreenMetal', name: 'Blue Metal' },
    { id: 'rust', name: 'Rust' },
    { id: 'wooden', name: 'Wooden' },
  ];

  // Effect to scroll to the top when a new roll is added.
  useEffect(() => {
    if (diceRolls.length > prevRollsCount.current && rollsListRef.current) {
      rollsListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevRollsCount.current = diceRolls.length;
  }, [diceRolls]);

  /**
   * Handles the primary roll action triggered by the "Roll" button or Enter key.
   * Generates the roll on the client and broadcasts to other players.
   */
  const handleRoll = () => {
    if (!expression.trim()) {
      setError('Please enter a dice expression');
      return;
    }

    // Clear any previous errors
    setError('');

    // Generate the roll on the client
    const roll = createDiceRoll(
      expression.trim(),
      user.id || 'unknown',
      user.name || 'Player',
      {
        isPrivate: isHost && isPrivate,
        advantage: rollMode === 'advantage',
        disadvantage: rollMode === 'disadvantage',
      },
    );

    if (!roll) {
      setError('Invalid dice expression');
      return;
    }

    // Add to local state immediately for instant UI feedback
    useGameStore.getState().addDiceRoll(roll);

    // Clear expression immediately for better UX
    setExpression('');

    // Non-urgent operations: chat messages and broadcasting
    startRollTransition(() => {
      // Send chat message about the roll
      const rollMessage = `🎲 ${user.name} rolled ${formatDiceRoll(roll)}`;
      sendChatMessage(rollMessage, 'system');

      // Broadcast to other players (if connected)
      if (webSocketService.isConnected()) {
        webSocketService.sendEvent({
          type: 'dice/roll-result',
          data: { roll },
        });
      }
    });
  };

  /**
   * Add a die to the roll queue (expression input)
   * If the same die type exists, increment its count (e.g., 1d20 -> 2d20)
   * Otherwise, add it to the expression
   */
  const addDieToQueue = (dieType: string) => {
    setError('');

    const currentExpr = expression.trim();

    if (!currentExpr) {
      // First die
      setExpression(`1${dieType}`);

      return;
    }

    // Parse the expression to find if this die type already exists
    // Match pattern like "3d20" or "1d6"
    const diePattern = new RegExp(
      `(\\d+)(${dieType.replace('+', '\\+')})`,
      'gi',
    );
    const match = currentExpr.match(diePattern);

    if (match) {
      // Die type already exists, increment its count
      const newExpr = currentExpr.replace(diePattern, (fullMatch, count) => {
        const newCount = parseInt(count) + 1;
        return `${newCount}${dieType}`;
      });
      setExpression(newExpr);
    } else {
      // Die type doesn't exist, add it
      // Check if we need a separator
      const lastChar = currentExpr[currentExpr.length - 1];
      if (/[0-9)]/.test(lastChar)) {
        setExpression(`${currentExpr}+1${dieType}`);
      } else {
        setExpression(`${currentExpr}1${dieType}`);
      }
    }
  };

  /**
   * Clear the roll queue
   */
  const clearQueue = () => {
    setExpression('');
    setError('');
  };

  /**
   * Add a modifier to the expression
   */
  const addModifier = (amount: number) => {
    setError('');

    const currentExpr = expression.trim();

    if (!currentExpr) {
      // No dice yet, just add the modifier
      if (amount >= 0) {
        setExpression(`+${amount}`);
      } else {
        setExpression(`${amount}`);
      }
      return;
    }

    // Check if there's already a modifier at the end
    const modifierPattern = /([+-]\d+)$/;
    const match = currentExpr.match(modifierPattern);

    if (match) {
      // Update existing modifier
      const currentModifier = parseInt(match[1]);
      const newModifier = currentModifier + amount;

      if (newModifier === 0) {
        // Remove modifier if it's zero
        setExpression(currentExpr.replace(modifierPattern, ''));
      } else {
        const sign = newModifier >= 0 ? '+' : '';
        setExpression(
          currentExpr.replace(modifierPattern, `${sign}${newModifier}`),
        );
      }
    } else {
      // Add new modifier
      const sign = amount >= 0 ? '+' : '';
      setExpression(`${currentExpr}${sign}${amount}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRoll();
    }
  };

  const toggleSound = () => {
    const newMutedState = diceSounds.toggleMute();
    setIsSoundMuted(newMutedState);
  };

  const cycleDiceTheme = () => {
    const currentIndex = DICE_THEMES.findIndex((t) => t.id === diceTheme);
    const nextIndex = (currentIndex + 1) % DICE_THEMES.length;
    const newTheme = DICE_THEMES[nextIndex].id;
    setDiceTheme(newTheme);

    // Persist to localStorage
    try {
      localStorage.setItem('nexus_dice_theme', newTheme);
    } catch (e) {
      console.warn('Failed to save dice theme to localStorage:', e);
    }
  };

  // Filter rolls for display. Hosts see all rolls, players only see public ones.
  const visibleRolls = isHost
    ? diceRolls
    : diceRolls.filter((roll) => !roll.isPrivate);

  return (
    <div className="dice-roller">
      {/* Section for user input and quick roll buttons */}
      <div className="dice-input">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ margin: 0 }}>Dice Roller</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!isConnected && (
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
                title="Rolls work offline, but won't sync to other players"
              >
                Offline
              </span>
            )}
            <button
              onClick={cycleDiceTheme}
              className="theme-toggle-btn"
              title={`Dice Theme: ${DICE_THEMES.find((t) => t.id === diceTheme)?.name || 'Default'}`}
            >
              🎲
            </button>
            <button
              onClick={toggleSound}
              className="sound-toggle-btn"
              title={isSoundMuted ? 'Unmute dice sounds' : 'Mute dice sounds'}
            >
              {isSoundMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        <div className="roll-controls">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Click dice below to build your roll..."
            className="dice-expression"
          />
          <button onClick={handleRoll} className="roll-btn">
            Roll
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="roll-options">
          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={rollMode === 'advantage'}
              onChange={(e) =>
                setRollMode(e.target.checked ? 'advantage' : 'none')
              }
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Advantage</span>
          </label>
          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={rollMode === 'disadvantage'}
              onChange={(e) =>
                setRollMode(e.target.checked ? 'disadvantage' : 'none')
              }
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Disadvantage</span>
          </label>

          {isHost && (
            <label className="setting-toggle">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Private Roll (DM only)</span>
            </label>
          )}
        </div>

        <div className="dice-builder">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0 }}>Build Your Roll</h3>
            <button
              onClick={clearQueue}
              className="clear-queue-btn"
              title="Clear roll queue"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '6px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                color: '#ef4444',
                transition: 'all 0.2s ease',
              }}
            >
              Clear
            </button>
          </div>
          <div className="dice-roller__die-selection">
            {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((die) => (
              <button
                key={die}
                onClick={() => addDieToQueue(die)}
                className="dice-roller__die-btn"
                title={`Add ${die} to roll`}
              >
                <span className="dice-roller__die-icon">
                  {die.toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          <div className="modifiers-section">
            <h4>Modifiers</h4>
            <div className="modifier-controls">
              <button
                onClick={() => addModifier(-5)}
                className="modifier-btn"
                title="Add -5 modifier"
              >
                -5
              </button>
              <button
                onClick={() => addModifier(-1)}
                className="modifier-btn"
                title="Add -1 modifier"
              >
                -1
              </button>
              <button
                onClick={() => addModifier(1)}
                className="modifier-btn"
                title="Add +1 modifier"
              >
                +1
              </button>
              <button
                onClick={() => addModifier(5)}
                className="modifier-btn"
                title="Add +5 modifier"
              >
                +5
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: '0.75rem',
              fontSize: '0.85rem',
              color: 'var(--glass-text-muted)',
            }}
          >
            Click dice to add/increment • Click modifiers to adjust total
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
              <div
                key={roll.id}
                className={`dice-roll ${index === 0 ? 'new-roll' : ''} ${roll.isPrivate ? 'private' : ''}`}
              >
                <div className="roll-header">
                  <span className="roller-name">{roll.userName}</span>
                  <div className="roll-meta">
                    {roll.isPrivate && (
                      <span className="private-tag">Private</span>
                    )}
                    <span className="roll-time">
                      {new Date(roll.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      className="reroll-btn"
                      title={`Re-roll ${roll.expression}`}
                      onClick={() => setExpression(roll.expression)}
                    >
                      ⟳
                    </button>
                  </div>
                </div>
                <div className="roll-result">
                  <span
                    dangerouslySetInnerHTML={{ __html: formatDiceRoll(roll) }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
