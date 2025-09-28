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
  userName: string,
  options: {
    isPrivate?: boolean;
    advantage?: boolean;
    disadvantage?: boolean;
  } = {}
): DiceRoll | null {
  const parsed = parseDiceExpression(expression);
  if (!parsed) return null;
  
  const results = rollDice(parsed.count, parsed.sides);
  let advResults: number[] | undefined = undefined;
  let total: number;

  const rollSum = (rolls: number[]) => rolls.reduce((sum, r) => sum + r, 0);

  if ((options.advantage || options.disadvantage) && parsed.count > 0) {
    advResults = rollDice(parsed.count, parsed.sides);
    const sum1 = rollSum(results);
    const sum2 = rollSum(advResults);

    if (options.advantage) {
      total = Math.max(sum1, sum2) + parsed.modifier;
    } else { // Disadvantage
      total = Math.min(sum1, sum2) + parsed.modifier;
    }
  } else {
    total = rollSum(results) + parsed.modifier;
  }
  
  let crit: 'success' | 'failure' | undefined = undefined;
  // Check for critical success/failure on a single d20 roll
  if (parsed.count === 1 && parsed.sides === 20) {
    if (results[0] === 20) crit = 'success';
    if (results[0] === 1) crit = 'failure';
  }
  
  return {
    id: uuidv4(),
    userId,
    userName,
    expression,
    results,
    advResults,
    total,
    crit,
    timestamp: Date.now(),
    isPrivate: options.isPrivate || false,
  };
}

export function formatDiceRoll(roll: DiceRoll): string {
  const { expression, results, total, advResults, crit } = roll;
  const parsed = parseDiceExpression(expression);
  
  if (!parsed) return `${expression} = ${total}`;
  
  let resultText = '';
  const critClass = crit === 'success' ? 'crit-success' : crit === 'failure' ? 'crit-failure' : '';

  if (advResults) {
    const sum1 = results.reduce((s, r) => s + r, 0);
    const sum2 = advResults.reduce((s, r) => s + r, 0);
    const isAdvantage = (sum1 + parsed.modifier) === roll.total || (sum2 + parsed.modifier) === roll.total ? Math.max(sum1, sum2) === roll.total - parsed.modifier : false;

    const firstRollKept = isAdvantage ? sum1 >= sum2 : sum1 <= sum2;

    const formatRollSet = (rolls: number[], kept: boolean) => 
      `<span class="${kept ? 'kept-roll' : 'discarded-roll'}">[${rolls.join(', ')}]</span>`;

    resultText = `${expression}: ${formatRollSet(results, firstRollKept)} | ${formatRollSet(advResults, !firstRollKept)}`;
  } else {
    resultText = `${expression}: <span class="${critClass}">[${results.join(', ')}]</span>`;
  }
  
  if (parsed.modifier !== 0) {
    resultText += ` ${parsed.modifier >= 0 ? '+' : ''}${parsed.modifier}`;
  }
  
  resultText += ` = <strong class="roll-total ${critClass}">${total}</strong>`;
  
  return resultText;
}

// Common dice expressions for quick access
export const COMMON_DICE = [
  'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100',
  '2d6', '3d6', '4d6'
];
