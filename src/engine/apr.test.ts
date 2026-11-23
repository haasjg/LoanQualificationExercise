// src/engine/apr.test.ts
/**
 * Unit tests for computeAPR function.
 * Tests all tier boundaries, floor behavior, and precision.
 */

import { describe, it, expect } from 'vitest';
import { computeAPR } from './apr';

describe('computeAPR', () => {
  describe('tier boundaries', () => {
    // Tier 1: 720+ (Prime) - benchmark - 1.5%
    it('returns prime tier APR at score 720', () => {
      const apr = computeAPR(720, 10.0);
      expect(apr).toBe(8.5);
    });

    it('returns prime tier APR at score 719', () => {
      const apr = computeAPR(719, 10.0);
      expect(apr).toBe(11.5);
    });

    // Tier 2: 660-719 (Near-prime) - benchmark + 1.5%
    it('returns near-prime tier APR at score 660', () => {
      const apr = computeAPR(660, 10.0);
      expect(apr).toBe(11.5);
    });

    it('returns near-prime tier APR at score 659', () => {
      const apr = computeAPR(659, 10.0);
      expect(apr).toBe(15.0);
    });

    // Tier 3: 600-659 (Sub-prime) - benchmark + 5.0%
    it('returns sub-prime tier APR at score 600', () => {
      const apr = computeAPR(600, 10.0);
      expect(apr).toBe(15.0);
    });

    it('returns sub-prime tier APR at score 599', () => {
      const apr = computeAPR(599, 10.0);
      expect(apr).toBeNull();
    });
  });

  describe('APR floor behavior', () => {
    // The floor of 6.99% applies to all eligible tiers
    it('applies floor when benchmark is very low', () => {
      // Prime tier: 0.0 - 1.5 = -1.5 -> floor to 6.99
      const apr = computeAPR(720, 0.0);
      expect(apr).toBe(6.99);
    });

    it('applies floor at near-prime tier with low benchmark', () => {
      // Near-prime: 0.0 + 1.5 = 1.5 -> floor to 6.99
      const apr = computeAPR(660, 0.0);
      expect(apr).toBe(6.99);
    });

    it('applies floor at sub-prime tier with low benchmark', () => {
      // Sub-prime: 0.0 + 5.0 = 5.0 -> floor to 6.99
      const apr = computeAPR(600, 0.0);
      expect(apr).toBe(6.99);
    });

    it('does not apply floor when calculated APR exceeds floor', () => {
      const apr = computeAPR(720, 12.0);
      expect(apr).toBe(10.5); // 12.0 - 1.5 = 10.5 > 6.99
    });
  });

  describe('2-decimal precision', () => {
    it('rounds to 2 decimal places for prime tier', () => {
      // Benchmark 10.33 -> 10.33 - 1.5 = 8.83
      const apr = computeAPR(720, 10.33);
      expect(apr).toBe(8.83);
    });

    it('rounds to 2 decimal places for near-prime tier', () => {
      // Benchmark 11.56 -> 11.56 + 1.5 = 13.06
      const apr = computeAPR(660, 11.56);
      expect(apr).toBe(13.06);
    });

    it('rounds to 2 decimal places for sub-prime tier', () => {
      // Benchmark 9.99 -> 9.99 + 5.0 = 14.99
      const apr = computeAPR(600, 9.99);
      expect(apr).toBe(14.99);
    });

    it('handles floating point precision edge case', () => {
      // Benchmark 8.333... -> 8.333... + 5.0 = 13.333... -> rounds to 13.33
      const apr = computeAPR(600, 8.333333);
      expect(apr).toBe(13.33);
    });
  });

  describe('ineligible credit scores', () => {
    it('returns null for score 500', () => {
      const apr = computeAPR(500, 10.0);
      expect(apr).toBeNull();
    });

    it('returns null for score 599', () => {
      const apr = computeAPR(599, 10.0);
      expect(apr).toBeNull();
    });

    it('returns null for score 0', () => {
      const apr = computeAPR(0, 10.0);
      expect(apr).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles maximum credit score 850', () => {
      const apr = computeAPR(850, 10.0);
      expect(apr).toBe(8.5); // Prime tier
    });

    it('handles minimum eligible credit score 600', () => {
      const apr = computeAPR(600, 10.0);
      expect(apr).toBe(15.0); // Sub-prime tier
    });

    it('handles exact tier boundary 660', () => {
      const apr = computeAPR(660, 11.5);
      expect(apr).toBe(13.0); // 11.5 + 1.5 = 13.0
    });

    it('handles exact tier boundary 720', () => {
      const apr = computeAPR(720, 11.5);
      expect(apr).toBe(10.0); // 11.5 - 1.5 = 10.0
    });
  });

  describe('with offline benchmark rate (11.50%)', () => {
    // Used in default inputs verification
    it('prime tier at score 750', () => {
      const apr = computeAPR(750, 11.5);
      expect(apr).toBe(10.0); // 11.5 - 1.5 = 10.0
    });

    it('near-prime tier at score 650', () => {
      const apr = computeAPR(650, 11.5);
      expect(apr).toBe(16.5); // 11.5 + 5.0 = 16.5
    });

    it('sub-prime tier at score 570', () => {
      const apr = computeAPR(570, 11.5);
      expect(apr).toBeNull(); // Ineligible
    });
  });
});

// Property-Based Tests for APR Computation
import * as fc from 'fast-check';

// Feature: path-to-yes, Property 2: APR floor invariant
// For all benchmarkRate in [0, 30] and creditScore in [600, 850], APR >= 6.99
// Validates: Requirements 2.2, 2.4
it('Property 2: APR floor invariant - for all eligible inputs, APR >= 6.99', () => {
  fc.assert(
    fc.property(
      fc.nat(31), // benchmarkRate in [0, 30]
      fc.integer(600, 850), // creditScore in [600, 850]
      (benchmarkRate, creditScore) => {
        const apr = computeAPR(creditScore, benchmarkRate);
        // For creditScore >= 600, APR should be >= 6.99
        // For creditScore < 600, APR is null (ineligible)
        if (creditScore >= 600) {
          expect(apr).toBeGreaterThanOrEqual(6.99);
        } else {
          expect(apr).toBeNull();
        }
      },
    ),
    { numRuns: 100 },
  );
});

// Feature: path-to-yes, Property 3: APR round-trip precision
// For all eligible creditScore and benchmarkRate, computed APR equals Math.round(apr * 100) / 100
// Validates: Requirement 2.2
it('Property 3: APR round-trip precision - computed APR has exactly 2 decimal places', () => {
  fc.assert(
    fc.property(
      fc.nat(31), // benchmarkRate in [0, 30]
      fc.integer(600, 850), // creditScore in [600, 850]
      (benchmarkRate, creditScore) => {
        const apr = computeAPR(creditScore, benchmarkRate);
        
        if (apr !== null) {
          // APR should equal itself rounded to 2 decimal places
          const rounded = Math.round(apr * 100) / 100;
          expect(apr).toBe(rounded);
          
          // Additionally verify it's a valid 2-decimal number
          const decimals = apr.toString().split('.')[1];
          if (decimals) {
            expect(decimals.length).toBeLessThanOrEqual(2);
          }
        }
      },
    ),
    { numRuns: 100 },
  );
});
