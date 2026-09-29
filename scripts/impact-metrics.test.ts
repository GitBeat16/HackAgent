import { describe, it, expect } from 'vitest';
import { computeMedian, computeSuccessRate, computeScaleUpRate } from '../lib/server/impact-metrics';

describe('Impact Metrics - Pure Functions', () => {
  describe('computeMedian', () => {
    it('returns null for empty array', () => {
      expect(computeMedian([])).toBeNull();
    });

    it('returns the element for single-element array', () => {
      expect(computeMedian([42])).toBe(42);
    });

    it('computes correctly for odd length', () => {
      expect(computeMedian([3, 1, 5])).toBe(3); // sorted: 1, 3, 5 -> mid is 3
    });

    it('computes correctly for even length (average of middle two)', () => {
      expect(computeMedian([1, 4, 10, 5])).toBe(4.5); // sorted: 1, 4, 5, 10 -> mid is (4+5)/2
    });
  });

  describe('computeSuccessRate', () => {
    it('returns null for empty array', () => {
      expect(computeSuccessRate([])).toBeNull();
    });

    it('computes correctly for all successes', () => {
      expect(computeSuccessRate(['scale', 'extend', 'SCALE'])).toBe(100);
    });

    it('computes correctly for all failures', () => {
      expect(computeSuccessRate(['terminate', 'TERMINATE'])).toBe(0);
    });

    it('computes correctly for mixed', () => {
      expect(computeSuccessRate(['scale', 'terminate', 'extend', 'terminate'])).toBe(50);
    });
  });

  describe('computeScaleUpRate', () => {
    it('returns null for empty', () => {
      expect(computeScaleUpRate([])).toBeNull();
    });

    it('distinguishes scale from extend and terminate', () => {
      expect(computeScaleUpRate(['scale', 'extend', 'terminate', 'scale'])).toBe(50);
    });
  });
});
