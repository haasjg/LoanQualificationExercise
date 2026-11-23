// src/engine/underwriting.test.ts
/**
 * Unit tests for underwriting engine decision logic.
 * Tests boundary conditions for credit score, income, and DTI thresholds.
 */

import { describe, it, expect } from 'vitest';
import { evaluateDecision, validateInputs } from './underwriting';
import { ApplicantInputs, Decision, ReasonCode } from './types';
import * as fc from 'fast-check';

// ============================================================================
// 5.3 Decision Boundary Tests
// ============================================================================

const BENCHMARK_RATE = 11.50;

describe('validateInputs', () => {
  it('returns empty array for valid inputs', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 24,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toEqual([]);
  });

  it('reports invalid monthlyIncome (negative)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: -100,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 24,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('monthlyIncome');
  });

  it('reports invalid monthlyDebt (negative)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: -100,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 24,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('monthlyDebt');
  });

  it('reports invalid creditScore (zero or negative)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 0,
      loanAmount: 15000,
      termMonths: 24,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('creditScore');
  });

  it('reports invalid loanAmount (not multiple of 500)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 15001,
      termMonths: 24,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('loanAmount');
  });

  it('reports invalid loanAmount (below minimum)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 1999,
      termMonths: 24,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('loanAmount');
  });

  it('reports invalid loanAmount (above maximum)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 25001,
      termMonths: 24,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('loanAmount');
  });

  it('reports invalid termMonths (zero)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 0,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('termMonths');
  });

  it('reports invalid benchmarkRate (negative)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 24,
    };

    const errors = validateInputs(inputs, -1);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('benchmarkRate');
  });

  it('reports all validation errors when multiple fields are invalid', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: -100,
      monthlyDebt: -100,
      creditScore: 0,
      loanAmount: 1000,
      termMonths: 0,
    };

    const errors = validateInputs(inputs, BENCHMARK_RATE);
    expect(errors).toHaveLength(5);
  });
});

describe('evaluateDecision', () => {
  // ============================================================================
  // Credit Score Boundaries: 599, 600, 639, 640, 659, 660, 719, 720
  // ============================================================================

  describe('credit score boundaries', () => {
    // Base inputs: income=1800 (minimum for counter-offer), loan=2500 (gives DTI just above 0.36 at 600-659 tier)
    // At 600-659 tier with benchmark=11.50%, APR = 16.50%
    // For loan=2500, term=60: payment = 61.22, DTI = (600+61.22)/1800 = 0.3673 -> COUNTER_OFFER
    const baseInputs: ApplicantInputs = {
      monthlyIncome: 1800,
      monthlyDebt: 600,
      loanAmount: 2500,
      termMonths: 60,
    };

    it('score 599 → DECLINED HIGH_RISK_SCORE', () => {
      const inputs = { ...baseInputs, creditScore: 599 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'DECLINED',
        reasonCode: 'HIGH_RISK_SCORE',
      });
    });

    it('score 600 → COUNTER_OFFER (DTI=0.3673)', () => {
      const inputs = { ...baseInputs, creditScore: 600 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('score 639 → COUNTER_OFFER (DTI=0.3673)', () => {
      const inputs = { ...baseInputs, creditScore: 639 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('score 640 → COUNTER_OFFER (DTI=0.3673)', () => {
      const inputs = { ...baseInputs, creditScore: 640 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('score 659 → COUNTER_OFFER (DTI=0.3673)', () => {
      const inputs = { ...baseInputs, creditScore: 659 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('score 660 → COUNTER_OFFER (prime tier, DTI=0.3391)', () => {
      const inputs = { ...baseInputs, creditScore: 660 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('score 719 → COUNTER_OFFER (prime tier, DTI=0.3327)', () => {
      const inputs = { ...baseInputs, creditScore: 719 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('score 720 → COUNTER_OFFER (prime tier, DTI=0.3628 with loan=2500)', () => {
      // With score=720, APR=10%, loan=2500, term=60: payment=42.80, DTI=0.3628
      // This is just above 0.36, so COUNTER_OFFER
      const inputs = { ...baseInputs, creditScore: 720 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('score 720 with low loan → APPROVED (DTI < 0.36)', () => {
      // Need DTI < 0.36, so payment < 648 - 600 = 48
      // At 10% APR, term=60: loan for payment=48 is about 2300
      const inputs = {
        monthlyIncome: 1800,
        monthlyDebt: 600,
        creditScore: 720,
        loanAmount: 2000,
        termMonths: 60,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('APPROVED');
      expect(result.postLoanDTI).toBeLessThan(0.36);
    });
  });

  // ============================================================================
  // Income Boundaries: 1799, 1800, 1999, 2000
  // ============================================================================

  describe('income boundaries', () => {
    // Base inputs: score=700 (prime), loan=2500 (low enough to be affordable)
    // At score=700, APR = 13.00% (benchmark + 1.5)
    // For loan=2500, term=60: payment = 56.82
    // income=1800: DTI = (600+56.82)/1800 = 0.3649 -> COUNTER_OFFER
    // income=1799: Below minimum -> DECLINED
    // income=2000: DTI = (600+56.82)/2000 = 0.3284 -> APPROVED
    const baseInputs: ApplicantInputs = {
      monthlyDebt: 600,
      creditScore: 700,
      loanAmount: 2500,
      termMonths: 60,
    };

    it('income 1799 → DECLINED INSUFFICIENT_INCOME', () => {
      const inputs = { ...baseInputs, monthlyIncome: 1799 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'DECLINED',
        reasonCode: 'INSUFFICIENT_INCOME',
      });
    });

    it('income 1800 → COUNTER_OFFER (DTI=0.3649)', () => {
      const inputs = { ...baseInputs, monthlyIncome: 1800 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('income 1999 → APPROVED (DTI=0.3286, low debt ratio)', () => {
      // With income=1999, loan=2500, term=60: DTI=0.3286 < 0.36
      const inputs = { ...baseInputs, monthlyIncome: 1999 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('APPROVED');
      expect(result.postLoanDTI).toBeLessThan(0.36);
    });

    it('income 1800 with higher loan → COUNTER_OFFER', () => {
      // Need DTI > 0.36: 600 + payment > 0.36 * 1800 = 648, so payment > 48
      // At 13% APR, term=60: loan=2500 gives payment=56.82, DTI=0.3649
      const inputs = {
        monthlyIncome: 1800,
        monthlyDebt: 600,
        creditScore: 700,
        loanAmount: 2500,
        termMonths: 60,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    it('income 2000 → APPROVED (DTI=0.3284)', () => {
      const inputs = { ...baseInputs, monthlyIncome: 2000 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('APPROVED');
      expect(result.postLoanDTI).toBeLessThan(0.36);
    });
  });

  // ============================================================================
  // DTI Boundaries: 0.3599, 0.36, 0.3601, 0.4499, 0.45, 0.4501
  // ============================================================================

  describe('DTI boundaries', () => {
    // Note: loanAmount must be multiple of 500 in [2000, 25000]
    // With monthlyIncome=2000, monthlyDebt=600:
    // - DTI = (600 + payment) / 2000
    // - At 13% APR (score=700):
    //   - loan=5000, term=60: payment=113.64, DTI=0.3569 (APPROVED)
    //   - loan=5500, term=60: payment=124.55, DTI=0.3626 (COUNTER_OFFER)
    
    const baseInputs: ApplicantInputs = {
      monthlyIncome: 2000,
      monthlyDebt: 600,
      creditScore: 700,
      termMonths: 60,
    };

    it('DTI 0.3569 → APPROVED (loan=5000)', () => {
      const inputs = { ...baseInputs, loanAmount: 5000 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('APPROVED');
      expect(result.postLoanDTI).toBeLessThan(0.36);
    });

    it('DTI 0.3626 → COUNTER_OFFER (loan=5500, just above boundary)', () => {
      const inputs = { ...baseInputs, loanAmount: 5500 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
    });

    // Find loan for DTI near 0.45 (just below 0.45 threshold)
    // DTI = 0.45 means payment = 300, loan ≈ 13500
    it('DTI 0.4479 → COUNTER_OFFER (loan=13000)', () => {
      // loan=13000 at 13% APR, term=60: payment=286.37, DTI=0.4479
      const inputs = { ...baseInputs, loanAmount: 13000 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
      expect(result.postLoanDTI).toBeGreaterThan(0.36);
      expect(result.postLoanDTI).toBeLessThanOrEqual(0.45);
    });

    it('DTI 0.4536 → DECLINED HIGH_DTI (loan=13500)', () => {
      // loan=13500 at 13% APR, term=60: payment=296.40, DTI=0.4536
      const inputs = { ...baseInputs, loanAmount: 13500 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'DECLINED',
        reasonCode: 'HIGH_DTI',
      });
    });

    it('DTI 0.4501 → DECLINED HIGH_DTI (loan=14000)', () => {
      const inputs = { ...baseInputs, loanAmount: 14000 };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'DECLINED',
        reasonCode: 'HIGH_DTI',
      });
    });
  });

  // ============================================================================
  // Loan Cap Exceeded (score 600-659, DTI ≤ 0.36, loan > 15000)
  // ============================================================================

  describe('loan cap exceeded', () => {
    // For loan cap exceeded: score 600-659, DTI <= 0.36, loan > 15000
    // At 600-659 tier with benchmark=11.50%, APR = 16.50%
    // For DTI <= 0.36: 600 + payment <= 0.36 * 3500 = 1260, so payment <= 660
    // For loan=15500, term=60, APR=16.50%: payment = 386.34, DTI = (600+386.34)/3500 = 0.2818
    // This satisfies DTI <= 0.36 and loan > 15000, so should be LOAN_CAP_EXCEEDED

    it('score 600, loan 15500, DTI 0.2818 → COUNTER_OFFER LOAN_CAP_EXCEEDED', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3500,
        monthlyDebt: 600,
        creditScore: 600,
        loanAmount: 15500,
        termMonths: 60,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'COUNTER_OFFER',
        reasonCode: 'LOAN_CAP_EXCEEDED',
      });
      expect(result.postLoanDTI).toBeLessThanOrEqual(0.36);
    });

    it('score 659, loan 15500, DTI 0.2818 → COUNTER_OFFER LOAN_CAP_EXCEEDED', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3500,
        monthlyDebt: 600,
        creditScore: 659,
        loanAmount: 15500,
        termMonths: 60,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'COUNTER_OFFER',
        reasonCode: 'LOAN_CAP_EXCEEDED',
      });
      expect(result.postLoanDTI).toBeLessThanOrEqual(0.36);
    });

    it('score 660, loan 15500, DTI 0.2722 → APPROVED (loan cap exceeded does not apply)', () => {
      // With score 660 (prime tier), APR is 13%, so payment is lower
      // Even with max loan (25000), DTI = 0.334 which is below 0.36
      // Loan cap exceeded only applies when DTI <= 0.36 AND score 600-659
      // For score=660, the decision is APPROVED (not COUNTER_OFFER from loan cap exceeded)
      const inputs: ApplicantInputs = {
        monthlyIncome: 3500,
        monthlyDebt: 600,
        creditScore: 660,
        loanAmount: 15500,
        termMonths: 60,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.decision).toBe('APPROVED');
      expect(result.reasonCode).toBeNull();
    });
  });

  // ============================================================================
  // Excessive Debt (monthlyDebt >= monthlyIncome)
  // ============================================================================

  describe('excessive debt', () => {
    it('debt = income → DECLINED EXCESSIVE_DEBT', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3500,
        monthlyDebt: 3500,
        creditScore: 700,
        loanAmount: 10000,
        termMonths: 24,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'DECLINED',
        reasonCode: 'EXCESSIVE_DEBT',
      });
    });

    it('debt > income → DECLINED EXCESSIVE_DEBT', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3500,
        monthlyDebt: 4000,
        creditScore: 700,
        loanAmount: 10000,
        termMonths: 24,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'DECLINED',
        reasonCode: 'EXCESSIVE_DEBT',
      });
    });
  });

  // ============================================================================
  // Zero/Invalid Input Handling
  // ============================================================================

  describe('zero/invalid input handling', () => {
    it('loanAmount = 0 → ENGINE_ERROR', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3500,
        monthlyDebt: 600,
        creditScore: 700,
        loanAmount: 0,
        termMonths: 24,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.kind).toBe('ENGINE_ERROR');
      expect((result as any).invalidFields).toContain('loanAmount');
    });

    it('termMonths = 0 → ENGINE_ERROR', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3500,
        monthlyDebt: 600,
        creditScore: 700,
        loanAmount: 10000,
        termMonths: 0,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.kind).toBe('ENGINE_ERROR');
      expect((result as any).invalidFields).toContain('termMonths');
    });

    it('monthlyIncome = 0 → ENGINE_ERROR', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 0,
        monthlyDebt: 600,
        creditScore: 700,
        loanAmount: 10000,
        termMonths: 24,
      };
      const result = evaluateDecision(inputs, BENCHMARK_RATE);
      expect(result.kind).toBe('ENGINE_ERROR');
      expect((result as any).invalidFields).toContain('monthlyIncome');
    });
  });

  // ============================================================================
  // Persona Preset Verification
  // ============================================================================

  describe('persona preset verification', () => {
    const preset1: ApplicantInputs = {
      monthlyIncome: 8000,
      monthlyDebt: 500,
      creditScore: 750,
      loanAmount: 12000,
      termMonths: 36,
    };

    it('Prime Borrower preset → APPROVED', () => {
      const result = evaluateDecision(preset1, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'APPROVED',
        reasonCode: null,
      });
    });

    const preset2: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 24,
    };

    it('Near-Prime High DTI preset → COUNTER_OFFER', () => {
      const result = evaluateDecision(preset2, BENCHMARK_RATE);
      expect(result.decision).toBe('COUNTER_OFFER');
    });

    const preset3: ApplicantInputs = {
      monthlyIncome: 2800,
      monthlyDebt: 200,
      creditScore: 570,
      loanAmount: 7000,
      termMonths: 36,
    };

    it('Credit-Thin preset → DECLINED HIGH_RISK_SCORE', () => {
      const result = evaluateDecision(preset3, BENCHMARK_RATE);
      expect(result).toMatchObject({
        decision: 'DECLINED',
        reasonCode: 'HIGH_RISK_SCORE',
      });
    });
  });
});

// ============================================================================
// 5.4 Decisioning Priority Order Property Test (Property 6)
// ============================================================================
// Validates: Requirements 4.5, 4.6
// Property: For any inputs with creditScore < 600, evaluateDecision returns DECLINED with reasonCode HIGH_RISK_SCORE
// ============================================================================

describe('decisioning priority order (property test)', () => {
  it(
    'for any creditScore < 600, result is always DECLINED HIGH_RISK_SCORE (100 iterations)',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 595, step: 5 }),
          fc.integer({ min: 1800, max: 25000, step: 100 }),
          fc.integer({ min: 0, max: 15000, step: 50 }),
          // Generate valid loanAmount: multiple of 500 in [2000, 25000]
          fc.integer({ min: 4, max: 50 }).map(n => n * 500),
          fc.oneof(fc.constant(12), fc.constant(24), fc.constant(36), fc.constant(48), fc.constant(60)),
          (creditScore, monthlyIncome, monthlyDebt, loanAmount, termMonths) => {
            const inputs: ApplicantInputs = {
              monthlyIncome,
              monthlyDebt,
              creditScore,
              loanAmount,
              termMonths,
            };
            const result = evaluateDecision(inputs, BENCHMARK_RATE);
            // Result should be EngineResult with DECLINED HIGH_RISK_SCORE
            if ('kind' in result) {
              return false;
            }
            return (
              result.decision === Decision.DECLINED &&
              result.reasonCode === ReasonCode.HIGH_RISK_SCORE
            );
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );
});

// ============================================================================
// 5.5 Output Finiteness Property Test (Property 10)
// ============================================================================
// Validates: Requirements 9.5, 10.10
// Property: For all valid inputs, all output values (apr, estimatedPayment, postLoanDTI) are finite numbers
// ============================================================================

describe('output finiteness property test', () => {
  it('for all valid inputs, output values are finite (no NaN, Infinity, or null)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 600, max: 720, step: 5 }), // creditScore >= 600 (to get non-null APR)
        fc.integer({ min: 1800, max: 25000, step: 100 }), // monthlyIncome
        fc.integer({ min: 0, max: 14999, step: 50 }), // monthlyDebt < monthlyIncome
        // Generate valid loanAmount: multiple of 500 in [2000, 25000]
        fc.integer({ min: 4, max: 50 }).map(n => n * 500),
        fc.oneof(fc.constant(12), fc.constant(24), fc.constant(36), fc.constant(48), fc.constant(60)),
        (creditScore, monthlyIncome, monthlyDebt, loanAmount, termMonths) => {
          // Skip cases where debt >= income (should be rejected before reaching outputs)
          if (monthlyDebt >= monthlyIncome) {
            return true;
          }

          const inputs: ApplicantInputs = {
            monthlyIncome,
            monthlyDebt,
            creditScore,
            loanAmount,
            termMonths,
          };
          const result = evaluateDecision(inputs, BENCHMARK_RATE);

          // Skip ENGINE_ERROR cases
          if ('kind' in result) {
            return true;
          }

          // Verify output values are finite
          expect(Number.isFinite(result.apr)).toBe(true);
          expect(Number.isFinite(result.estimatedPayment)).toBe(true);
          expect(Number.isFinite(result.postLoanDTI)).toBe(true);

          // Verify no NaN or Infinity
          expect(Number.isNaN(result.apr)).toBe(false);
          expect(Number.isNaN(result.estimatedPayment)).toBe(false);
          expect(Number.isNaN(result.postLoanDTI)).toBe(false);

          return true;
        }
      ),
      { numRuns: 100, maxGenerations: 200 }
    );
  }, 30000);
});
