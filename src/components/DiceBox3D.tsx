import React, { useEffect, useRef, useState, useCallback } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { useGameStore } from '@/stores/gameStore';
import { diceSounds } from '@/utils/diceSounds';

export const DiceBox3D: React.FC = () => {
  const diceBoxRef = useRef<DiceBox | null>(null);
  const diceBoxContainerRef = useRef<HTMLDivElement>(null);
  const lastRollIdRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const diceRolls = useGameStore((state) => state.diceRolls);

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
    if (diceBoxContainerRef.current && !diceBoxRef.current) {
      try {
        const config = {
          id: 'dice-canvas',
          container: '#dice-box', // Selector for target DOM element
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

        console.log('🎲 Initializing DiceBox with config:', config);

        // v1.1.x API: single config object argument
        const diceBox = new DiceBox(config);

        // Set up roll complete callback
        diceBox.onRollComplete = (results: unknown) => {
          console.log('🎲 Roll animation complete:', results);
          // Play completion sound
          setTimeout(() => {
            try {
              let diceCount = 1;
              if (Array.isArray(results)) {
                diceCount = results.length;
              } else if (results?.rolls && Array.isArray(results.rolls)) {
                diceCount = results.rolls.length;
              }
              diceSounds.playRollSound(diceCount);
            } catch (error) {
              console.warn('🎲 Error playing dice sound:', error);
            }
          }, 100);
        };

        // Initialize the dice box
        diceBox
          .init()
          .then(() => {
            diceBoxRef.current = diceBox;
            setIsInitialized(true);
            setInitError(null);
            console.log('🎲 DiceBox3D initialized successfully with config:', diceBox.config);

            // Debug: Check if canvas was created
            setTimeout(() => {
              if (diceBoxContainerRef.current) {
                const canvas = diceBoxContainerRef.current.querySelector('canvas');
                const allCanvases = document.querySelectorAll('canvas');

                console.log('🎲 All canvas elements in document:', allCanvases.length);
                console.log('🎲 Canvas in dice-box container:', canvas);
                console.log('🎲 Container dimensions:', {
                  width: diceBoxContainerRef.current.offsetWidth,
                  height: diceBoxContainerRef.current.offsetHeight,
                  position: diceBoxContainerRef.current.getBoundingClientRect(),
                });

                if (canvas) {
                  console.log('🎲 Canvas found! Details:', {
                    width: canvas.width,
                    height: canvas.height,
                    styleWidth: canvas.style.width,
                    styleHeight: canvas.style.height,
                    cssText: canvas.style.cssText,
                    display: getComputedStyle(canvas).display,
                    visibility: getComputedStyle(canvas).visibility,
                    opacity: getComputedStyle(canvas).opacity,
                    zIndex: getComputedStyle(canvas).zIndex,
                  });
                } else {
                  console.error('🎲 ERROR: No canvas element found in dice-box container!');
                  console.log('🎲 Container HTML:', diceBoxContainerRef.current.innerHTML);
                }
              }
            }, 500);
          })
          .catch((error) => {
            console.error('🎲 Failed to initialize DiceBox3D:', error);
            setInitError(error.message || 'Failed to initialize 3D dice');
            setIsInitialized(false);
          });
      } catch (error) {
        console.error('🎲 Error creating DiceBox instance:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to create DiceBox');
      }
    }

    return () => {
      if (diceBoxRef.current) {
        try {
          diceBoxRef.current.clear();
        } catch (error) {
          console.warn('🎲 Error clearing dice box:', error);
        }
      }
    };
  }, [getDiceTheme]);

  // Update theme when it changes
  useEffect(() => {
    if (diceBoxRef.current && isInitialized) {
      const theme = getDiceTheme();
      try {
        diceBoxRef.current.updateConfig({ theme });
        console.log('🎲 Updated dice theme:', theme);
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
      const resultsToUse = latestRoll.advResults && latestRoll.advResults.length > 0
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
      console.log('🎲 Rolling dice with server results:', {
        notation: rollNotations.join('+'),
        values: rollValues,
        expression: latestRoll.expression,
      });

      diceBoxRef.current
        .roll(rollNotations, { values: rollValues })
        .then((results) => {
          console.log('🎲 Dice roll animation started:', results);
        })
        .catch((error) => {
          console.error('🎲 Error rolling dice:', error);
        });

      lastRollIdRef.current = latestRoll.id;
    }
  }, [diceRolls, isInitialized]);

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
          pointerEvents: 'auto',
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