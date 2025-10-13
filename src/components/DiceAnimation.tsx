import React, { useEffect, useState, useRef } from 'react';
import '@/styles/dice.css';
import { diceSounds } from '@/utils/diceSounds';
import { useSettings } from '@/stores/gameStore';

export interface DiceAnimationProps {
  dice: Array<{
    type: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
    result: number;
  }>;
  onComplete?: () => void;
  onStart?: () => void;
}

interface DiceInstance {
  id: string;
  type: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
  result: number;
  startX: number;
  startY: number;
  rotation: { x: number; y: number; z: number };
  delay: number;
}

/**
 * DiceAnimation component - Renders 3D animated dice that tumble and roll
 */
export const DiceAnimation: React.FC<DiceAnimationProps> = ({
  dice,
  onComplete,
  onStart,
}) => {
  const [diceInstances, setDiceInstances] = useState<DiceInstance[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = useSettings();

  useEffect(() => {
    if (dice.length === 0) return;

    // Generate random starting positions and rotations for each die
    const instances: DiceInstance[] = dice.map((die, index) => ({
      id: `${die.type}-${Date.now()}-${index}`,
      type: die.type,
      result: die.result,
      startX: Math.random() * 60 - 30, // Random X between -30% and +30%
      startY: -100, // Start above viewport
      rotation: {
        x: Math.random() * 720 + 360, // 1-3 full rotations
        y: Math.random() * 720 + 360,
        z: Math.random() * 720 + 360,
      },
      delay: index * 0.1, // Stagger the dice
    }));

    setTimeout(() => {
      setDiceInstances(instances);
      setIsAnimating(true);
      onStart?.();
    }, 0);

    // Play dice rolling sound
    diceSounds.playRollSound(dice.length);

    // Check for critical rolls
    const hasCritSuccess = dice.some(
      (d) => d.type === 'd20' && d.result === 20,
    );
    const hasCritFailure = dice.some((d) => d.type === 'd20' && d.result === 1);

    // Play crit sound at landing time (1.8s)
    if (hasCritSuccess) {
      setTimeout(() => diceSounds.playCritSuccessSound(), 1800);
    } else if (hasCritFailure) {
      setTimeout(() => diceSounds.playCritFailureSound(), 1800);
    }

    // Animation duration: 2 seconds + stagger delay
    const animationDuration = 2000 + dice.length * 100;
    // Total time = animation + configured disappear delay
    const totalDuration = animationDuration + settings.diceDisappearTime;

    const timeout = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, totalDuration);

    return () => clearTimeout(timeout);
  }, [dice, onComplete, onStart, settings.diceDisappearTime]);

  if (!isAnimating || diceInstances.length === 0) {
    return null;
  }

  return (
    <div className="dice-animation-overlay" ref={containerRef}>
      <div className="dice-animation-container">
        {diceInstances.map((instance) => (
          <AnimatedDie key={instance.id} instance={instance} />
        ))}
      </div>
    </div>
  );
};

interface AnimatedDieProps {
  instance: DiceInstance;
}

const AnimatedDie: React.FC<AnimatedDieProps> = ({ instance }) => {
  const [hasLanded, setHasLanded] = useState(false);

  useEffect(() => {
    // Mark as landed after animation completes
    const timeout = setTimeout(() => {
      setHasLanded(true);
    }, 1800); // Animation is 2s, land slightly before

    return () => clearTimeout(timeout);
  }, []);

  const style: React.CSSProperties = {
    '--start-x': `${instance.startX}%`,
    '--start-y': `${instance.startY}%`,
    '--rotate-x': `${instance.rotation.x}deg`,
    '--rotate-y': `${instance.rotation.y}deg`,
    '--rotate-z': `${instance.rotation.z}deg`,
    '--delay': `${instance.delay}s`,
  } as React.CSSProperties;

  // Check for crits to add special class
  const isCritSuccess = instance.type === 'd20' && instance.result === 20;
  const isCritFailure = instance.type === 'd20' && instance.result === 1;
  const critClass = isCritSuccess
    ? 'crit-success'
    : isCritFailure
      ? 'crit-failure'
      : '';

  return (
    <div
      className={`animated-die ${instance.type} ${hasLanded ? 'landed' : ''} ${critClass}`}
      style={style}
    >
      <div className="die-inner">
        {renderDie(instance.type, instance.result, hasLanded)}
      </div>
    </div>
  );
};

/**
 * Render different die types with proper faces
 */
function renderDie(
  type: string,
  result: number,
  hasLanded: boolean,
): React.ReactNode {
  const dieColor = getDieColor(type);

  if (type === 'd6') {
    return renderD6(result, dieColor, hasLanded);
  } else if (type === 'd20') {
    return renderD20(result, dieColor, hasLanded);
  } else if (type === 'd4') {
    return renderD4(result, dieColor, hasLanded);
  } else if (type === 'd8') {
    return renderD8(result, dieColor, hasLanded);
  } else if (type === 'd10' || type === 'd100') {
    return renderD10(result, dieColor, hasLanded);
  } else if (type === 'd12') {
    return renderD12(result, dieColor, hasLanded);
  }

  return null;
}

function getDieColor(type: string): string {
  const colors: Record<string, string> = {
    d4: '#8b5cf6', // Purple
    d6: '#ef4444', // Red
    d8: '#10b981', // Green
    d10: '#3b82f6', // Blue
    d12: '#f59e0b', // Amber
    d20: '#ec4899', // Pink
    d100: '#06b6d4', // Cyan
  };
  return colors[type] || '#6366f1';
}

/**
 * Render a 6-sided die (cube)
 */
function renderD6(
  result: number,
  color: string,
  hasLanded: boolean,
): React.ReactNode {
  // Map result to which face should be on top
  // We'll rotate the cube so the result face is on top when landed
  const topFace = result;

  return (
    <div className={`cube ${hasLanded ? `show-face-${topFace}` : ''}`}>
      <div className="cube-face front" style={{ background: color }}>
        {renderDots(1)}
      </div>
      <div className="cube-face back" style={{ background: color }}>
        {renderDots(6)}
      </div>
      <div className="cube-face right" style={{ background: color }}>
        {renderDots(3)}
      </div>
      <div className="cube-face left" style={{ background: color }}>
        {renderDots(4)}
      </div>
      <div className="cube-face top" style={{ background: color }}>
        {renderDots(2)}
      </div>
      <div className="cube-face bottom" style={{ background: color }}>
        {renderDots(5)}
      </div>
    </div>
  );
}

/**
 * Render dice dots for d6
 */
function renderDots(count: number): React.ReactNode {
  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: [
      'top-left',
      'top-right',
      'middle-left',
      'middle-right',
      'bottom-left',
      'bottom-right',
    ],
  };

  return (
    <div className="dots">
      {dotPositions[count]?.map((pos, i) => (
        <div key={i} className={`dot ${pos}`} />
      ))}
    </div>
  );
}

/**
 * Render other dice types with numbers
 */
function renderD20(
  result: number,
  color: string,
  hasLanded: boolean,
): React.ReactNode {
  return (
    <div className="polyhedron d20-shape" style={{ background: color }}>
      {hasLanded && <div className="die-result">{result}</div>}
    </div>
  );
}

function renderD4(
  result: number,
  color: string,
  hasLanded: boolean,
): React.ReactNode {
  return (
    <div className="polyhedron d4-shape" style={{ background: color }}>
      {hasLanded && <div className="die-result">{result}</div>}
    </div>
  );
}

function renderD8(
  result: number,
  color: string,
  hasLanded: boolean,
): React.ReactNode {
  return (
    <div className="polyhedron d8-shape" style={{ background: color }}>
      {hasLanded && <div className="die-result">{result}</div>}
    </div>
  );
}

function renderD10(
  result: number,
  color: string,
  hasLanded: boolean,
): React.ReactNode {
  return (
    <div className="polyhedron d10-shape" style={{ background: color }}>
      {hasLanded && <div className="die-result">{result}</div>}
    </div>
  );
}

function renderD12(
  result: number,
  color: string,
  hasLanded: boolean,
): React.ReactNode {
  return (
    <div className="polyhedron d12-shape" style={{ background: color }}>
      {hasLanded && <div className="die-result">{result}</div>}
    </div>
  );
}
