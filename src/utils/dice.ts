import type { DiceRoll } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

// Parse dice expressions like "2d6+3", "1d20", "d4"
export function parseDiceExpression(expression: string): {
  count: number;
  sides: number;
  modifier: number;
} | null {
  const cleaned = expression.toLowerCase().replace(/\s/g, '');
  
  // Match patterns like "2d6+3", "d20", "1d4-1"
  const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  
  if (!match) return null;
  
  const count = match[1] ? parseInt(match[1]) : 1;
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
    return null;
  }
  
  return { count, sides, modifier };
}

export function rollDice(count: number, sides: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }
  return results;
}

export function createDiceRoll(
  expression: string,
  userId: string,
  userName: string
): DiceRoll | null {
  const parsed = parseDiceExpression(expression);
  if (!parsed) return null;
  
  const results = rollDice(parsed.count, parsed.sides);
  const total = results.reduce((sum, roll) => sum + roll, 0) + parsed.modifier;
  
  return {
    id: uuidv4(),
    userId,
    userName,
    expression,
    results,
    total,
    timestamp: Date.now(),
  };
}

export function formatDiceRoll(roll: DiceRoll): string {
  const { expression, results, total } = roll;
  const parsed = parseDiceExpression(expression);
  
  if (!parsed) return `${expression} = ${total}`;
  
  let result = `${expression}: [${results.join(', ')}]`;
  
  if (parsed.modifier !== 0) {
    const rollSum = results.reduce((sum, r) => sum + r, 0);
    result += ` ${parsed.modifier >= 0 ? '+' : ''}${parsed.modifier}`;
    result += ` = ${total}`;
  } else {
    result += ` = ${total}`;
  }
  
  return result;
}

// Common dice expressions for quick access
export const COMMON_DICE = [
  'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100',
  '2d6', '3d6', '4d6',
  '1d20+5', '1d20-2'
];
