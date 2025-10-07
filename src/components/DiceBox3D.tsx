import React, { useEffect, useRef } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { useGameStore } from '@/stores/gameStore';

interface IDiceBox {
  init: () => Promise<void>;
  roll: (notation: string) => void;
  // Add other methods as needed
}

export const DiceBox3D: React.FC = () => {
  const diceBoxRef = useRef<IDiceBox | null>(null);
  const diceBoxContainerRef = useRef<HTMLDivElement>(null);
  const lastRollIdRef = useRef<string | null>(null);

  const diceRolls = useGameStore((state) => state.diceRolls);

  useEffect(() => {
    if (diceBoxContainerRef.current && !diceBoxRef.current) {
      const diceBox = new DiceBox({
        container: '#dice-box',
        assetPath: '/assets/dice-box/',
        theme: 'diceOfRolling',
        offscreen: true,
      });

      diceBox.init().then(() => {
        diceBoxRef.current = diceBox;
        console.log('🎲 DiceBox3D initialized');
      });
    }

    return () => {
      if (diceBoxRef.current) {
        // diceBoxRef.current.clear();
      }
    };
  }, []);

  useEffect(() => {
    if (diceRolls.length > 0) {
      const latestRoll = diceRolls[0];
      if (latestRoll.id !== lastRollIdRef.current) {
        if (diceBoxRef.current) {
          console.log('🎲 Rolling dice:', latestRoll.expression);
          diceBoxRef.current.roll(latestRoll.expression);
        }
        lastRollIdRef.current = latestRoll.id;
      }
    }
  }, [diceRolls]);

  return <div id="dice-box" ref={diceBoxContainerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1000, pointerEvents: 'none' }} />;
};