import React, { useEffect, useRef, useState, useCallback } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { useGameStore, useSettings } from '@/stores/gameStore';
import { diceSounds } from '@/utils/diceSounds';

export const DiceBox3D: React.FC = () => {
  const diceBoxRef = useRef<DiceBox | null>(null);
  const diceBoxContainerRef = useRef<HTMLDivElement>(null);
  const lastRollIdRef = useRef<string | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const diceRolls = useGameStore((state) => state.diceRolls);
  const settings = useSettings();

  // Get dice theme from localStorage (synced with DiceRoller component)
  const getDiceTheme = useCallback(() => {
    try {
      return localStorage.getItem('nexus_dice_theme') || 'smooth';
    } catch {
      return 'smooth';
    }
  }, []);

  // Initialize DiceBox
  useEffect(() => {
    const initializeDiceBox = async () => {
      if (diceBoxContainerRef.current && !diceBoxRef.current) {
        try {
          const config = {
            id: 'dice-canvas',
            container: '#dice-box',
            assetPath: '/assets/dice-box/',
            theme: 'default',
            offscreen: false,
            scale: 8,
            gravity: 1,
            mass: 1,
            friction: 0.8,
            restitution: 0,
            linearDamping: 0.4,
            angularDamping: 0.4,
            spinForce: 4,
            throwForce: 5,
            startingHeight: 8,
            settleTimeout: 5000,
            delay: 10,
            enableShadows: true,
            lightIntensity: 1,
          };

          const diceBox = new DiceBox(config);

          diceBox.onRollComplete = (_results: unknown) => {
            // Roll animation complete
          };

          await diceBox.init();

          diceBoxRef.current = diceBox;
          setIsInitialized(true);
          setInitError(null);

          // Debug checks
          setTimeout(() => {
            if (diceBoxContainerRef.current) {
              const canvas =
                diceBoxContainerRef.current.querySelector('canvas');
              if (canvas) {
                // Canvas found
              } else {
                console.error('🎲 ERROR: No canvas element found!');
              }
            }
          }, 500);
        } catch (error) {
          console.error('🎲 Failed to initialize DiceBox3D:', error);
          setInitError(
            error instanceof Error
              ? error.message
              : 'Failed to initialize or create DiceBox',
          );
          setIsInitialized(false);
        }
      }
    };

    initializeDiceBox();

    return () => {
      if (diceBoxRef.current) {
        try {
          diceBoxRef.current.clear();
        } catch (error) {
          console.warn('🎲 Error clearing dice box:', error);
        }
      }
      // Clear any pending timeout
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
    };
  }, [getDiceTheme]);

  // Update theme when it changes
  useEffect(() => {
    if (diceBoxRef.current && isInitialized) {
      const theme = getDiceTheme();
      try {
        diceBoxRef.current.updateConfig({ theme });
      } catch (error) {
        console.warn('🎲 Failed to update theme:', error);
      }
    }
  }, [getDiceTheme, isInitialized]);

  // Handle new dice rolls
  useEffect(() => {
    if (!isInitialized || !diceBoxRef.current || diceRolls.length === 0) {
      return;
    }

    const latestRoll = diceRolls[0];

    // Skip if we've already animated this roll
    if (latestRoll.id === lastRollIdRef.current) {
      return;
    }

    // Convert server roll results to dice notation with predetermined values
    const rollNotations: string[] = [];
    const rollValues: number[] = [];

    for (const pool of latestRoll.pools) {
      // For advantage/disadvantage rolls, we have two sets of results
      const resultsToUse =
        latestRoll.advResults && latestRoll.advResults.length > 0
          ? [...pool.results, ...(pool.advResults || [])]
          : pool.results;

      // Add each die individually with its predetermined value
      for (const value of resultsToUse) {
        rollNotations.push(`1d${pool.sides}`);
        rollValues.push(value);
      }
    }

    // Roll the dice with predetermined values from the server
    if (rollNotations.length > 0) {
      // Clear any existing timeout
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

      // Play sound immediately when dice start rolling
      diceSounds.playRollSound(rollValues.length);

      // Use the documented API pattern from DICE_BOX_IMPLEMENTATION.md
      // Pass array of notation strings and values array separately
      diceBoxRef.current
        .roll(rollNotations, { values: rollValues })
        .then((_results) => {
          // Schedule dice clear after settle time + configured disappear time
          // settleTimeout is 5000ms, so dice settle after 5 seconds
          const totalTime = 5000 + settings.diceDisappearTime;
          clearTimeoutRef.current = setTimeout(() => {
            if (diceBoxRef.current) {
              diceBoxRef.current.clear();
            }
          }, totalTime);
        })
        .catch((error) => {
          console.error('🎲 Error rolling dice:', error);
        });

      lastRollIdRef.current = latestRoll.id;
    }
  }, [diceRolls, isInitialized, settings.diceDisappearTime]);

  return (
    <>
      <div
        id="dice-box"
        ref={diceBoxContainerRef}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '500px',
          height: '400px',
          zIndex: 10000,
          pointerEvents: 'none', // Allow clicks to pass through to canvas below
        }}
      />
      {initError && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            maxWidth: '300px',
            zIndex: 1001,
            fontSize: '0.9rem',
          }}
        >
          <strong>3D Dice Error:</strong> {initError}
        </div>
      )}
    </>
  );
};
