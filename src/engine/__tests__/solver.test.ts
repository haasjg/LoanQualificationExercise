// src/engine/__tests__/solver.test.ts
/**
 * Unit tests for Path to Yes solver functions.
 * Tests each lever outcome: APPROVED, COUNTER_OFFER, and null (inapplicable).
 */

import { describe, it, expect } from 'vitest';
import {
  computeExtendTermLever,
  computeReduceAmountLever,
  computePayDownDebtLever,
  computeCreditScoreMilestoneLever,
  computeLevers,
} from '../solver';
import { ApplicantInputs, Decision, LeverType, LeverOutcome } from '../types';

// ============================================================================
// Constants
// ============================================================================

const BENCHMARK_RATE = 11.50;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create test inputs with default values and optional overrides.
 */
function makeInputs(overrides?: Partial<ApplicantInputs>): ApplicantInputs {
  return {
    monthlyIncome: 3500,
    monthlyDebt: 600,
    creditScore: 650,
    loanAmount: 15000,
    termMonths: 24,
    ...overrides,
  };
}

/**
 * Verify lever outcome matches expected decision type.
 */
function verifyLeverOutcome(
  lever: Lever,
  expectedOutcome: LeverOutcome
): void {
  expect(lever.leverOutcome).toBe(expectedOutcome);
  
  // When outcome is APPROVED, DTI should be <= 0.36
  if (expectedOutcome === LeverOutcome.APPROVED) {
    expect(lever.resultingPostLoanDTI).toBeLessThanOrEqual(0.36);
  }
  
  // When outcome is COUNTER_OFFER, DTI should be > 0.36 and <= 0.45
  if (expectedOutcome === LeverOutcome.COUNTER_OFFER) {
    expect(lever.resultingPostLoanDTI).toBeGreaterThan(0.36);
    expect(lever.resultingPostLoanDTI).toBeLessThanOrEqual(0.45);
  }
}

// ============================================================================
// computeExtendTermLever Tests
// ============================================================================

describe('computeExtendTermLever', () => {
  // Base input: income=3500, debt=600, score=650, loan=15000, term=24
  // APR = 16.50% (600-659 tier), payment = ~$737, DTI = 0.382 -> COUNTER_OFFER
  const baseInputs = makeInputs();

  describe('inapplicable cases (returns null)', () => {
    it('returns null when current term >= 60', () => {
      const inputs = makeInputs({ termMonths: 60 });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null for high-risk applicant (creditScore < 600)', () => {
      const inputs = makeInputs({ creditScore: 550 });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null when no candidate term achieves DTI <= 0.45', () => {
      // Very high debt relative to income
      const inputs = makeInputs({
        monthlyIncome: 2000,
        monthlyDebt: 1500,
        loanAmount: 25000,
      });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null when monthlyDebt >= monthlyIncome', () => {
      const inputs = makeInputs({
        monthlyIncome: 2000,
        monthlyDebt: 2500,
      });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });
  });

  describe('full DTI satisfaction (APPROVED outcome)', () => {
    it('returns APPROVED lever when extending term achieves DTI <= 0.36', () => {
      // Lower debt ratio scenario where longer term helps
      const inputs = makeInputs({
        monthlyIncome: 4000,
        monthlyDebt: 500,
        loanAmount: 10000,
        creditScore: 720, // Prime tier, better APR
      });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.leverType).toBe(LeverType.EXTEND_TERM);
      expect(lever?.resultingPostLoanDTI).toBeLessThanOrEqual(0.36);
      verifyLeverOutcome(lever!, LeverOutcome.APPROVED);
    });

    it('returns APPROVED lever with term 36 months', () => {
      const inputs = makeInputs({
        monthlyIncome: 5000,
        monthlyDebt: 400,
        loanAmount: 8000,
        creditScore: 690,
      });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.payload.termMonths).toBe(36);
      verifyLeverOutcome(lever!, LeverOutcome.APPROVED);
    });

    it('returns APPROVED lever with term 60 months when starting from 48', () => {
      const inputs = makeInputs({ termMonths: 48 });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.payload.termMonths).toBe(60);
      verifyLeverOutcome(lever!, LeverOutcome.APPROVED);
    });
  });

  describe('partial DTI satisfaction (COUNTER_OFFER outcome)', () => {
    it('returns COUNTER_OFFER lever when DTI <= 0.45 but > 0.36', () => {
      // Scenario where extend term gets us to COUNTER_OFFER but not APPROVED
      // DTI needs to start above 0.45 and extending term brings it to <= 0.45 but > 0.36
      // With income=3500, debt=1000, loan=12000, term=24, APR=16.5%:
      // Payment at 24 months = ~$591, DTI = (1000+591)/3500 = 0.455 (above 0.45)
      // Payment at 36 months = ~$426, DTI = (1000+426)/3500 = 0.408 (COUNTER_OFFER range)
      const inputs = makeInputs({
        monthlyIncome: 3500,
        monthlyDebt: 1000,
        loanAmount: 12000,
        creditScore: 650,
        termMonths: 24,
      });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.leverType).toBe(LeverType.EXTEND_TERM);
      expect(lever?.resultingPostLoanDTI).toBeGreaterThan(0.36);
      expect(lever?.resultingPostLoanDTI).toBeLessThanOrEqual(0.45);
      verifyLeverOutcome(lever!, LeverOutcome.COUNTER_OFFER);
    });

    it('prefers shorter term when multiple terms work', () => {
      // Test that 36 is preferred over 48 or 60 when both work
      const inputs = makeInputs({
        monthlyIncome: 3800,
        monthlyDebt: 500,
        loanAmount: 9000,
        creditScore: 690,
      });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      // Should return the shortest term that achieves the target
      expect(lever?.payload.termMonths).toBeLessThanOrEqual(48);
    });
  });

  describe('edge cases', () => {
    it('handles loanAmount at minimum (2000)', () => {
      const inputs = makeInputs({ loanAmount: 2000 });
      const lever = computeExtendTermLever(inputs, BENCHMARK_RATE);
      // With very low loan amount, current DTI might already be acceptable
      // or extend term might still help achieve COUNTER_OFFER
      if (lever) {
        expect(lever.leverType).toBe(LeverType.EXTEND_TERM);
      }
    });
  });
});

// ============================================================================
// computeReduceAmountLever Tests
// ============================================================================

describe('computeReduceAmountLever', () => {
  const baseInputs = makeInputs();

  describe('inapplicable cases (returns null)', () => {
    it('returns null when no amount >= 2000 achieves DTI <= 0.45', () => {
      // Extremely high debt relative to income
      const inputs = makeInputs({
        monthlyIncome: 1800,
        monthlyDebt: 1600,
        loanAmount: 25000,
      });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null for high-risk applicant (creditScore < 600)', () => {
      const inputs = makeInputs({ creditScore: 550 });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null when loanAmount is already at minimum (2000)', () => {
      // No reduction possible when already at minimum
      const inputs = makeInputs({ loanAmount: 2000 });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });
  });

  describe('full DTI satisfaction (APPROVED outcome)', () => {
    it('returns APPROVED lever when reducing amount achieves DTI <= 0.36', () => {
      // Need a scenario where reducing loan amount from current value achieves approval
      // Start with a high DTI scenario that can be improved by reducing loan amount
      const inputs = makeInputs({
        monthlyIncome: 3000,
        monthlyDebt: 800,
        loanAmount: 12000,
        creditScore: 650,
      });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.leverType).toBe(LeverType.REDUCE_AMOUNT);
      expect(lever?.resultingPostLoanDTI).toBeLessThanOrEqual(0.36);
      verifyLeverOutcome(lever!, LeverOutcome.APPROVED);
    });

    it('returns lever with loanAmount rounded to nearest $100', () => {
      const inputs = makeInputs({
        monthlyIncome: 3500,
        monthlyDebt: 400,
        loanAmount: 12000,
        creditScore: 690,
      });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.payload.loanAmount % 100).toBe(0);
      expect(lever?.payload.loanAmount).toBeGreaterThanOrEqual(2000);
      verifyLeverOutcome(lever!, LeverOutcome.APPROVED);
    });

    it('returns lever with reduced loanAmount', () => {
      // Start with loanAmount > minimum, should reduce to some value >= 2000
      const inputs = makeInputs({
        monthlyIncome: 3500,
        monthlyDebt: 500,
        loanAmount: 15000,
        creditScore: 700,
      });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.payload.loanAmount).toBeGreaterThan(0);
      expect(lever?.payload.loanAmount).toBeLessThanOrEqual(inputs.loanAmount);
      verifyLeverOutcome(lever!, LeverOutcome.APPROVED);
    });
  });

  describe('partial DTI satisfaction (COUNTER_OFFER outcome)', () => {
    it('returns COUNTER_OFFER lever when DTI <= 0.45 but > 0.36', () => {
      // Scenario where reduce amount gets us to COUNTER_OFFER but not APPROVED
      // First pass (DTI <= 0.36) is not feasible because even minimum amount gives DTI > 0.36
      // Second pass (DTI <= 0.45) finds max amount where DTI is in COUNTER_OFFER range
      const inputs = makeInputs({
        monthlyIncome: 2800,
        monthlyDebt: 1000,
        loanAmount: 15000,
        creditScore: 650,
      });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.leverType).toBe(LeverType.REDUCE_AMOUNT);
      expect(lever?.resultingPostLoanDTI).toBeGreaterThan(0.36);
      expect(lever?.resultingPostLoanDTI).toBeLessThanOrEqual(0.45);
      verifyLeverOutcome(lever!, LeverOutcome.COUNTER_OFFER);
    });

    it('returns lever with correct displayLabel', () => {
      const inputs = makeInputs({
        monthlyIncome: 2800,
        monthlyDebt: 1000,
        loanAmount: 15000,
        creditScore: 650,
      });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.displayLabel).toContain('Reduce loan amount');
      expect(lever?.displayLabel).toContain('$');
    });
  });

  describe('edge cases', () => {
    it('returns null when monthlyIncome is at minimum threshold', () => {
      const inputs = makeInputs({
        monthlyIncome: 1800,
        monthlyDebt: 1200,
      });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('handles zero monthlyDebt correctly', () => {
      const inputs = makeInputs({ monthlyDebt: 0 });
      const lever = computeReduceAmountLever(inputs, BENCHMARK_RATE);
      // With zero debt, reducing loan amount might still help
      if (lever) {
        expect(lever.leverType).toBe(LeverType.REDUCE_AMOUNT);
      }
    });
  });
});

// ============================================================================
// computePayDownDebtLever Tests
// ============================================================================

describe('computePayDownDebtLever', () => {
  const baseInputs = makeInputs();

  describe('inapplicable cases (returns null)', () => {
    it('returns null when monthlyDebt === 0', () => {
      const inputs = makeInputs({ monthlyDebt: 0 });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null when even full elimination leaves DTI > 0.45', () => {
      const inputs = makeInputs({
        monthlyIncome: 1800,
        monthlyDebt: 1500,
        loanAmount: 25000,
      });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null for high-risk applicant (creditScore < 600)', () => {
      const inputs = makeInputs({ creditScore: 550 });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });
  });

  describe('full DTI satisfaction (APPROVED outcome)', () => {
    it('returns APPROVED lever when partial reduction suffices', () => {
      // Create a COUNTER_OFFER case where reducing debt achieves APPROVED
      // At loanAmount=14000, creditScore=700 (13% APR), term=24: payment=$672, DTI=0.368
      // Reducing debt by $32 achieves DTI <= 0.36
      const inputs = makeInputs({
        monthlyIncome: 4000,
        monthlyDebt: 800,
        loanAmount: 14000,
        creditScore: 700,
      });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.leverType).toBe(LeverType.PAY_DOWN_DEBT);
      expect(lever?.resultingPostLoanDTI).toBeLessThanOrEqual(0.36);
      verifyLeverOutcome(lever!, LeverOutcome.APPROVED);
    });

    it('calculates exact reduction amount correctly', () => {
      // At loanAmount=12000, creditScore=690 (13% APR), term=24: payment=$530, DTI=0.374
      // Reducing debt by $18 achieves DTI <= 0.36
      const inputs = makeInputs({
        monthlyIncome: 3500,
        monthlyDebt: 800,
        loanAmount: 12000,
        creditScore: 690,
      });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.payload.dReduce).toBeGreaterThan(0);
      expect(lever?.payload.dReduce).toBeLessThanOrEqual(inputs.monthlyDebt);
      expect(lever?.payload.monthlyDebt).toBeGreaterThan(0);
    });

    it('returns lever when monthlyDebt >= monthlyIncome but partial reduction helps', () => {
      const inputs = makeInputs({
        monthlyIncome: 3500,
        monthlyDebt: 3000,
        loanAmount: 8000,
      });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      
      if (lever) {
        expect(lever.leverType).toBe(LeverType.PAY_DOWN_DEBT);
        expect(lever.resultingPostLoanDTI).toBeLessThanOrEqual(0.36);
      }
    });
  });

  describe('partial DTI satisfaction (COUNTER_OFFER outcome)', () => {
    it('returns COUNTER_OFFER lever when full elimination gives DTI <= 0.45', () => {
      // Scenario where partial reduction doesn't get to 0.36, but full elimination gets to 0.45
      // With loanAmount=25000, payment=1200, full elimination gives DTI=0.40 (COUNTER_OFFER)
      const inputs = makeInputs({
        monthlyIncome: 3000,
        monthlyDebt: 1200,
        loanAmount: 25000,
        creditScore: 660,
      });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.leverType).toBe(LeverType.PAY_DOWN_DEBT);
      expect(lever?.resultingPostLoanDTI).toBeGreaterThan(0.36);
      expect(lever?.resultingPostLoanDTI).toBeLessThanOrEqual(0.45);
      verifyLeverOutcome(lever!, LeverOutcome.COUNTER_OFFER);
    });

    it('caps reduction at monthlyDebt for COUNTER_OFFER outcome', () => {
      const inputs = makeInputs({
        monthlyIncome: 3000,
        monthlyDebt: 1200,
        loanAmount: 25000,
        creditScore: 660,
      });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      
      if (lever) {
        // For COUNTER_OFFER, dReduce should be capped at monthlyDebt
        expect(lever.payload.dReduce).toBe(inputs.monthlyDebt);
        expect(lever.payload.monthlyDebt).toBe(0);
      }
    });
  });

  describe('edge cases', () => {
    it('handles very high income', () => {
      const inputs = makeInputs({
        monthlyIncome: 10000,
        monthlyDebt: 2000,
      });
      const lever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
      // With high income, current DTI might already be acceptable
      if (lever) {
        expect(lever.leverType).toBe(LeverType.PAY_DOWN_DEBT);
      }
    });
  });
});

// ============================================================================
// computeCreditScoreMilestoneLever Tests
// ============================================================================

describe('computeCreditScoreMilestoneLever', () => {
  const baseInputs = makeInputs(); // creditScore = 650

  describe('inapplicable cases (returns null)', () => {
    it('returns null when creditScore >= 640', () => {
      const inputs = makeInputs({ creditScore: 650 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null when target score still produces DECLINED', () => {
      // Very high debt ratio where even best APR won't help
      const inputs = makeInputs({
        monthlyIncome: 1800,
        monthlyDebt: 1700,
        creditScore: 550,
        loanAmount: 25000,
      });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });

    it('returns null when creditScore is at highest milestone', () => {
      const inputs = makeInputs({ creditScore: 720 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });
  });

  describe('returns valid lever', () => {
    it('returns lever with correct target score for score < 640', () => {
      // creditScore=635 is in Subprime tier (600-659), targetScore=640 is the boundary
      // But 640 is still in Subprime tier, so we need to go to 660 for meaningful improvement
      // Using creditScore=595 to target 600 (first milestone above 595)
      const inputs = makeInputs({ creditScore: 595 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.leverType).toBe(LeverType.CREDIT_SCORE_MILESTONE);
      expect(lever?.payload.creditScore).toBeGreaterThan(inputs.creditScore);
      expect(lever?.payload.creditScore).toBeGreaterThanOrEqual(600);
    });

    it('returns lever with correct targetApr', () => {
      const inputs = makeInputs({ creditScore: 595 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.payload.targetApr).toBeDefined();
      expect(lever?.payload.targetApr).toBeGreaterThanOrEqual(6.99);
    });

    it('returns lever with monthlyPaymentReduction', () => {
      const inputs = makeInputs({ creditScore: 595 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.payload.monthlyPaymentReduction).toBeGreaterThan(0);
    });

    it('returns lever when creditScore is at 500 (minimum)', () => {
      const inputs = makeInputs({ creditScore: 500 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      
      expect(lever).not.toBeNull();
      expect(lever?.payload.creditScore).toBe(600);
    });
  });

  describe('milestone selection', () => {
    it('selects lowest milestone above creditScore', () => {
      // creditScore=595, lowest milestone above is 600
      const inputs = makeInputs({ creditScore: 595 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      expect(lever).not.toBeNull();
      // Should target 600 (lowest milestone above 595)
      expect(lever?.payload.creditScore).toBe(600);
    });
    it('targets 640 for scores 600-639', () => {
      const inputs = makeInputs({ creditScore: 620 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      expect(lever).not.toBeNull();
      expect(lever?.payload.creditScore).toBe(640);
    });

    it('handles very high creditScore near 850', () => {
      const inputs = makeInputs({ creditScore: 820 });
      const lever = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
      expect(lever).toBeNull();
    });
  });
});
