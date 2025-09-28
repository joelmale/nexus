
import { describe, it, expect } from 'vitest';
import {
  parseDiceExpression,
  rollDice,
  createDiceRoll,
  formatDiceRoll,
} from '@/utils/dice';

describe('dice utils', () => {
  describe('parseDiceExpression', () => {
    it('should parse a standard dice expression', () => {
      expect(parseDiceExpression('2d6+3')).toEqual({
        count: 2,
        sides: 6,
        modifier: 3,
      });
    });

    it('should parse a simple dice expression', () => {
      expect(parseDiceExpression('d20')).toEqual({
        count: 1,
        sides: 20,
        modifier: 0,
      });
    });

    it('should parse a dice expression with a negative modifier', () => {
      expect(parseDiceExpression('1d4-1')).toEqual({
        count: 1,
        sides: 4,
        modifier: -1,
      });
    });

    it('should handle whitespace', () => {
      expect(parseDiceExpression(' 2 d 8 + 4 ')).toEqual({
        count: 2,
        sides: 8,
        modifier: 4,
      });
    });

    it('should return null for an invalid expression', () => {
      expect(parseDiceExpression('d')).toBeNull();
      expect(parseDiceExpression('2d')).toBeNull();
      expect(parseDiceExpression('abc')).toBeNull();
      expect(parseDiceExpression('2d6+')).toBeNull();
    });

    it('should return null for out-of-range values', () => {
      expect(parseDiceExpression('101d6')).toBeNull();
      expect(parseDiceExpression('0d6')).toBeNull();
      expect(parseDiceExpression('1d1001')).toBeNull();
      expect(parseDiceExpression('1d1')).toBeNull();
    });
  });

  describe('rollDice', () => {
    it('should return the correct number of dice', () => {
      const results = rollDice(3, 6);
      expect(results).toHaveLength(3);
    });

    it('should return values within the expected range', () => {
      const results = rollDice(10, 20);
      results.forEach((result) => {
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('createDiceRoll', () => {
    it('should create a basic dice roll', () => {
      const roll = createDiceRoll('2d6+3', 'user1', 'User One');
      expect(roll).not.toBeNull();
      if (!roll) return;

      expect(roll.expression).toBe('2d6+3');
      expect(roll.userId).toBe('user1');
      expect(roll.userName).toBe('User One');
      expect(roll.results).toHaveLength(2);
      expect(roll.total).toBe(roll.results.reduce((s, r) => s + r, 0) + 3);
    });

    it('should handle advantage rolls', () => {
      const roll = createDiceRoll('1d20+5', 'user2', 'User Two', { advantage: true });
      expect(roll).not.toBeNull();
      if (!roll) return;

      expect(roll.results).toHaveLength(1);
      expect(roll.advResults).toHaveLength(1);
      const sum1 = roll.results.reduce((s, r) => s + r, 0);
      const sum2 = roll.advResults.reduce((s, r) => s + r, 0);
      expect(roll.total).toBe(Math.max(sum1, sum2) + 5);
    });

    it('should handle disadvantage rolls', () => {
      const roll = createDiceRoll('1d20+5', 'user3', 'User Three', { disadvantage: true });
      expect(roll).not.toBeNull();
      if (!roll) return;

      expect(roll.results).toHaveLength(1);
      expect(roll.advResults).toHaveLength(1);
      const sum1 = roll.results.reduce((s, r) => s + r, 0);
      const sum2 = roll.advResults.reduce((s, r) => s + r, 0);
      expect(roll.total).toBe(Math.min(sum1, sum2) + 5);
    });

    it('should identify a critical success', () => {
      // This is tricky to test without mocking Math.random,
      // so we'll just check if it *can* be a success.
      // A more robust test would involve mocking.
      const roll = createDiceRoll('1d20', 'user4', 'User Four');
      if (roll?.results[0] === 20) {
        expect(roll.crit).toBe('success');
      } else {
        expect(roll?.crit).not.toBe('success');
      }
    });

    it('should identify a critical failure', () => {
      const roll = createDiceRoll('1d20', 'user5', 'User Five');
      if (roll?.results[0] === 1) {
        expect(roll.crit).toBe('failure');
      } else {
        expect(roll?.crit).not.toBe('failure');
      }
    });
  });

  describe('formatDiceRoll', () => {
    it('should format a simple roll', () => {
      const roll = {
        id: '1',
        userId: 'user1',
        userName: 'User One',
        expression: '1d6+2',
        results: [4],
        total: 6,
        timestamp: Date.now(),
        isPrivate: false,
      };
      const formatted = formatDiceRoll(roll);
      expect(formatted).toBe('1d6+2: <span class="">[4]</span> +2 = <strong class="roll-total ">6</strong>');
    });

    it('should format a critical success', () => {
      const roll = {
        id: '2',
        userId: 'user2',
        userName: 'User Two',
        expression: '1d20',
        results: [20],
        total: 20,
        crit: 'success' as const,
        timestamp: Date.now(),
        isPrivate: false,
      };
      const formatted = formatDiceRoll(roll);
      expect(formatted).toContain('crit-success');
    });
  });
});
