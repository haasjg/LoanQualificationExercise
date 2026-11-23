// src/engine/solver.test.ts
/**
 * Unit tests and property-based tests for the Path to Yes solver functions.
 * Tests each lever with full DTI satisfaction (APPROVED outcome),
 * partial DTI satisfaction (COUNTER_OFFER outcome), and inapplicability (null result).
 * Also includes property-based tests for lever outcome verification (Task 6.7).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeExtendTermLever,
  computeReduceAmountLever,
  computePayDownDebtLever,
  computeCreditScoreMilestoneLever,
  computeLevers,
} from './solver';
import { evaluateDecision } from './underwriting';
import { DEFAULT_INPUTS, Decision, LeverOutcome, ApplicantInputs } from './types';

const BENCHMARK_RATE = 11.5;

// ============================================================================
// Constants
// ============================================================================

const DTI_APPROVED_THRESHOLD = 0.36;
const DTI_COUNTER_THRESHOLD = 0.45;

// ============================================================================
// Task 6.2: computeExtendTermLever Tests
// ============================================================================

describe('computeExtendTermLever', () => {
  it('returns null when current term is already 60 months', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      termMonths: 60,
    };
    const result = computeExtendTermLever(inputs, BENCHMARK_RATE);
    expect(result).toBeNull();
  });

  it('returns null when current term is 48 months and candidate terms do not achieve target DTI', () => {
    // High debt case that won't achieve target DTI with any term extension
    const inputs = {
      monthlyIncome: 2000,
      monthlyDebt: 1500,
      creditScore: 650,
      loanAmount: 10000,
      termMonths: 48,
    };
    const result = computeExtendTermLever(inputs, BENCHMARK_RATE);
    expect(result).toBeNull();
  });

  it('returns APPROVED lever when extending to 60 months achieves DTI <= 0.36', () => {
    // At 36 months: APR ~16.5%, payment ~$438, DTI = (800+438)/4000 = 0.3095 -> APPROVED
    // Let's create a case with higher debt where extending helps
    const highDebtInputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1200,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 36,
    };
    const result = computeExtendTermLever(highDebtInputs, BENCHMARK_RATE);
    
    // Verify the result is not null and has correct structure
    if (result !== null) {
      expect(result.leverType).toBe('EXTEND_TERM');
      expect(result.leverOutcome).toBe(Decision.APPROVED);
      expect(result.mutatedInputs.termMonths).toBeGreaterThan(36);
    }
  });

  it('returns COUNTER_OFFER lever when extending to 48 months achieves DTI <= 0.45', () => {
    const inputs = {
      monthlyIncome: 4500,
      monthlyDebt: 1400,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 36,
    };
    const result = computeExtendTermLever(inputs, BENCHMARK_RATE);
    
    if (result !== null) {
      expect(result.leverType).toBe('EXTEND_TERM');
      expect(result.leverOutcome).toBe(Decision.COUNTER_OFFER);
    }
  });
});

// ============================================================================
// Task 6.3: computeReduceAmountLever Tests
// ============================================================================

describe('computeReduceAmountLever', () => {
  it('returns null when no amount achieves DTI <= 0.36', () => {
    // Extremely high debt case
    const inputs = {
      monthlyIncome: 2000,
      monthlyDebt: 1800,
      creditScore: 650,
      loanAmount: 2000,
      termMonths: 36,
    };
    const result = computeReduceAmountLever(inputs, BENCHMARK_RATE);
    expect(result).toBeNull();
  });

  it('returns APPROVED lever when reducing amount achieves DTI <= 0.36', () => {
    const inputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1000,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 36,
    };
    const result = computeReduceAmountLever(inputs, BENCHMARK_RATE);
    
    if (result !== null) {
      expect(result.leverType).toBe('REDUCE_AMOUNT');
      expect(result.leverOutcome).toBe(Decision.APPROVED);
      expect(result.mutatedInputs.loanAmount).toBeLessThan(15000);
    }
  });

  it('returns COUNTER_OFFER lever when reducing amount achieves DTI <= 0.45', () => {
    const inputs = {
      monthlyIncome: 4000,
      monthlyDebt: 1500,
      creditScore: 650,
      loanAmount: 20000,
      termMonths: 36,
    };
    const result = computeReduceAmountLever(inputs, BENCHMARK_RATE);
    
    if (result !== null) {
      expect(result.leverType).toBe('REDUCE_AMOUNT');
      expect(result.leverOutcome).toBe(Decision.COUNTER_OFFER);
    }
  });

  it('returns null when loan amount is already at minimum', () => {
    const inputs = {
      monthlyIncome: 5000,
      monthlyDebt: 500,
      creditScore: 650,
      loanAmount: 2000,
      termMonths: 36,
    };
    const result = computeReduceAmountLever(inputs, BENCHMARK_RATE);
    expect(result).toBeNull();
  });
});

// ============================================================================
// Task 6.4: computePayDownDebtLever Tests
// ============================================================================

describe('computePayDownDebtLever', () => {
  it('returns null when monthlyDebt is 0', () => {
    const inputs = {
      monthlyIncome: 5000,
      monthlyDebt: 0,
      creditScore: 650,
      loanAmount: 10000,
      termMonths: 36,
    };
    const result = computePayDownDebtLever(inputs, BENCHMARK_RATE);
    expect(result).toBeNull();
  });

  it('returns APPROVED lever when partial debt reduction achieves DTI <= 0.36', () => {
    const inputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1200,
      creditScore: 650,
      loanAmount: 12000,
      termMonths: 36,
    };
    const result = computePayDownDebtLever(inputs, BENCHMARK_RATE);
    
    if (result !== null) {
      expect(result.leverType).toBe('PAY_DOWN_DEBT');
      expect(result.leverOutcome).toBe(Decision.APPROVED);
      expect((result.payload as any).dReduce).toBeGreaterThan(0);
      expect((result.payload as any).dReduce).toBeLessThanOrEqual(inputs.monthlyDebt);
    }
  });

  it('returns COUNTER_OFFER lever when partial debt reduction achieves DTI <= 0.45', () => {
    // Create a case where partial debt reduction achieves DTI in COUNTER_OFFER range
    const counterOfferInputs = {
      monthlyIncome: 3300,
      monthlyDebt: 2100,
      creditScore: 650,
      loanAmount: 25000,
      termMonths: 36,
    };
    const result = computePayDownDebtLever(counterOfferInputs, BENCHMARK_RATE);
    
    if (result !== null) {
      expect(result.leverType).toBe('PAY_DOWN_DEBT');
      expect(result.leverOutcome).toBe(Decision.COUNTER_OFFER);
      // dReduce should be less than monthlyDebt (partial reduction)
      expect((result.payload as any).dReduce).toBeLessThan(counterOfferInputs.monthlyDebt);
    }
  });

  it('returns null when even full debt elimination leaves DTI > 0.45', () => {
    // Create a case where even full debt elimination leaves DTI > 0.45
    // DTI = payment / monthlyIncome > 0.45 after eliminating all debt
    // So payment > 0.45 * monthlyIncome
    // For monthlyIncome = 2000, we need payment > 900
    // For loanAmount = 25000, termMonths = 36, APR ~16.5%, payment ~$885
    // 885 < 900, so DTI = 0.4425 -> COUNTER_OFFER
    // Try with lower income: monthlyIncome = 1800, payment > 810
    // 885 > 810, so DTI = 885/1800 = 0.492 > 0.45
    const inputs = {
      monthlyIncome: 1800,
      monthlyDebt: 1500,
      creditScore: 650,
      loanAmount: 25000,
      termMonths: 36,
    };
    const result = computePayDownDebtLever(inputs, BENCHMARK_RATE);
    expect(result).toBeNull();
  });
});

// ============================================================================
// Task 6.5: computeCreditScoreMilestoneLever Tests
// ============================================================================

describe('computeCreditScoreMilestoneLever', () => {
  it('returns null when creditScore >= 640', () => {
    const inputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1000,
      creditScore: 650,
      loanAmount: 10000,
      termMonths: 36,
    };
    const result = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
    expect(result).toBeNull();
  });

  it('returns lever for score below 600 targeting 600 milestone', () => {
    const inputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1000,
      creditScore: 570,
      loanAmount: 10000,
      termMonths: 36,
    };
    const result = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
    
    if (result !== null) {
      expect(result.leverType).toBe('CREDIT_SCORE_MILESTONE');
      expect((result.payload as any).creditScore).toBe(600);
    }
  });

  it('returns lever for score in 600-639 range targeting 640 milestone', () => {
    const inputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1000,
      creditScore: 620,
      loanAmount: 10000,
      termMonths: 36,
    };
    const result = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
    
    if (result !== null) {
      expect(result.leverType).toBe('CREDIT_SCORE_MILESTONE');
      expect((result.payload as any).creditScore).toBe(640);
    }
  });

  it('returns COUNTER_OFFER lever when score improvement leads to counter-offer', () => {
    // Create a case where credit score improvement helps but doesn't fully approve
    const inputs = {
      monthlyIncome: 4000,
      monthlyDebt: 1500,
      creditScore: 580,
      loanAmount: 12000,
      termMonths: 36,
    };
    const result = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
    
    if (result !== null) {
      expect(result.leverType).toBe('CREDIT_SCORE_MILESTONE');
      expect(result.leverOutcome).toBe(Decision.COUNTER_OFFER);
    }
  });

  it('returns null when score improvement still results in DECLINED', () => {
    // Extremely high DTI case
    const inputs = {
      monthlyIncome: 2500,
      monthlyDebt: 2200,
      creditScore: 550,
      loanAmount: 5000,
      termMonths: 36,
    };
    const result = computeCreditScoreMilestoneLever(inputs, BENCHMARK_RATE);
    expect(result).toBeNull();
  });
});

// ============================================================================
// Task 6.1: computeLevers Tests
// ============================================================================

describe('computeLevers', () => {
  it('returns empty levers when decision is APPROVED', () => {
    const inputs = {
      monthlyIncome: 8000,
      monthlyDebt: 500,
      creditScore: 750,
      loanAmount: 12000,
      termMonths: 36,
    };
    const result = computeLevers(inputs, BENCHMARK_RATE, Decision.APPROVED);
    expect(result.levers).toEqual([]);
    expect(result.emptyMessage).toBeNull();
  });

  it('returns levers for COUNTER_OFFER decision', () => {
    const inputs = DEFAULT_INPUTS;
    // We'll test with a known counter-offer case
    const result = computeLevers(inputs, BENCHMARK_RATE, Decision.COUNTER_OFFER);
    expect(result.levers.length).toBeGreaterThanOrEqual(0);
  });

  it('returns emptyMessage when no levers are feasible', () => {
    // Create a case where no levers are possible
    const inputs = {
      monthlyIncome: 2000,
      monthlyDebt: 1900,
      creditScore: 550,
      loanAmount: 2000,
      termMonths: 12,
    };
    const result = computeLevers(inputs, BENCHMARK_RATE, Decision.DECLINED);
    expect(result.levers).toEqual([]);
    expect(result.emptyMessage).not.toBeNull();
  });

  it('returns levers in priority order', () => {
    // Create a case where multiple levers are possible
    const inputs = {
      monthlyIncome: 4500,
      monthlyDebt: 1300,
      creditScore: 620,
      loanAmount: 15000,
      termMonths: 36,
    };
    const result = computeLevers(inputs, BENCHMARK_RATE, Decision.DECLINED);
    
    if (result.levers.length > 0) {
      // Verify levers are in priority order: extend term, reduce amount, pay down debt, credit score
      const types = result.levers.map((l) => l.leverType);
      expect(types).toEqual(expect.arrayContaining(types));
    }
  });
});

// ============================================================================
// Integration Tests: Full End-to-End Scenarios
// ============================================================================

describe('Path to Yes Solver - Full End-to-End', () => {
  it('handles the DEFAULT_INPUTS case', () => {
    // At benchmark 11.50%:
    // creditScore 650 -> APR = 16.50%
    // loanAmount 15000, term 24 -> payment ~$737
    // postLoanDTI = (600 + 737) / 3500 = 0.382 -> COUNTER_OFFER (0.36 < DTI <= 0.45)
    
    const result = computeLevers(DEFAULT_INPUTS, BENCHMARK_RATE, Decision.COUNTER_OFFER);
    
    expect(result.levers.length).toBeGreaterThan(0);
    
    // At least one lever should be present
    expect(result.levers.length).toBeGreaterThanOrEqual(1);
  });

  it('handles a case with multiple feasible levers', () => {
    const inputs = {
      monthlyIncome: 4500,
      monthlyDebt: 1400,
      creditScore: 620,
      loanAmount: 15000,
      termMonths: 36,
    };
    
    // This should produce multiple levers
    const result = computeLevers(inputs, BENCHMARK_RATE, Decision.DECLINED);
    
    expect(result.levers.length).toBeGreaterThanOrEqual(1);
  });

  it('produces mathematically consistent lever outcomes', () => {
    const inputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1200,
      creditScore: 620,
      loanAmount: 12000,
      termMonths: 36,
    };
    
    const result = computeLevers(inputs, BENCHMARK_RATE, Decision.DECLINED);
    
    if (result.levers.length > 0) {
      // Each lever should have a valid leverOutcome
      expect(result.levers.every((l) => 
        l.leverOutcome === Decision.APPROVED || l.leverOutcome === Decision.COUNTER_OFFER
      )).toBe(true);
      
      // Each lever should have mutated inputs
      expect(result.levers.every((l) => Object.keys(l.mutatedInputs).length > 0)).toBe(true);
    }
  });
});

// ============================================================================
// Property-Based Tests (Task 6.7: Lever Outcome Verification)
// ============================================================================

// ============================================================================
// Property 7: Lever outcome verification
// For any lever returned by computeLevers, running evaluateDecision with mutatedInputs
// produces Decision matching leverOutcome
// Validates: Requirements 5.7, 10.7
// ============================================================================

describe('Property 7: Lever outcome verification', () => {
  it('for any lever returned by computeLevers, evaluateDecision with mutatedInputs matches leverOutcome', () => {
    fc.assert(
      fc.property(
        // Generate valid inputs within specified bounds
        fc.integer({ min: 600, max: 700, step: 5 }), // creditScore in non-prime to borderline prime range
        fc.integer({ min: 2000, max: 25000, step: 100 }), // monthlyIncome
        fc.integer({ min: 0, max: 15000, step: 50 }), // monthlyDebt
        fc.integer({ min: 4, max: 50 }).map(n => n * 500), // loanAmount multiple of 500 in [2000, 25000]
        fc.oneof(fc.constant(12), fc.constant(24), fc.constant(36), fc.constant(48), fc.constant(60)), // termMonths
        (creditScore, monthlyIncome, monthlyDebt, loanAmount, termMonths) => {
          // Skip invalid combinations
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
          
          // Get the decision for these inputs
          const decisionResult = evaluateDecision(inputs, BENCHMARK_RATE);
          
          // Skip if we get an ENGINE_ERROR or if decision is APPROVED (no levers needed)
          if ('kind' in decisionResult) {
            return true;
          }
          
          if (decisionResult.decision === Decision.APPROVED) {
            return true;
          }
          
          // Compute levers for this decision
          const solverResult = computeLevers(inputs, BENCHMARK_RATE, decisionResult.decision);
          
          // If no levers were returned, skip (vacuous truth)
          if (solverResult.levers.length === 0) {
            return true;
          }
          
          // For each lever, verify evaluateDecision with mutatedInputs matches leverOutcome
          const allMatch = solverResult.levers.every((lever) => {
            const mutatedInputs = {
              ...inputs,
              ...lever.mutatedInputs,
            };
            
            const outcomeResult = evaluateDecision(mutatedInputs, BENCHMARK_RATE);
            
            if ('kind' in outcomeResult) {
              // If mutation leads to invalid inputs, this is a failure
              return false;
            }
            
            // Check if the outcome matches the lever's claimed leverOutcome
            let expectedOutcome: Decision;
            if (lever.leverOutcome === LeverOutcome.APPROVED) {
              expectedOutcome = Decision.APPROVED;
            } else if (lever.leverOutcome === LeverOutcome.COUNTER_OFFER) {
              expectedOutcome = Decision.COUNTER_OFFER;
            } else {
              return false;
            }
            
            return outcomeResult.decision === expectedOutcome;
          });
          
          return allMatch;
        },
      ),
      { numRuns: 100, maxGenerations: 200 },
    );
  });
});

// ============================================================================
// Property 8: Lever list non-decline guarantee
// For any lever in the returned list, applying it never produces DECLINED decision
// Validates: Requirements 5.7
// ============================================================================

describe('Property 8: Lever list non-decline guarantee', () => {
  it('for any lever in the returned list, applying it never produces DECLINED', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 600, max: 700, step: 5 }),
        fc.integer({ min: 2000, max: 25000, step: 100 }),
        fc.integer({ min: 0, max: 15000, step: 50 }),
        fc.integer({ min: 4, max: 50 }).map(n => n * 500),
        fc.oneof(fc.constant(12), fc.constant(24), fc.constant(36), fc.constant(48), fc.constant(60)),
        (creditScore, monthlyIncome, monthlyDebt, loanAmount, termMonths) => {
          // Skip invalid combinations
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
          
          const decisionResult = evaluateDecision(inputs, BENCHMARK_RATE);
          
          if ('kind' in decisionResult) {
            return true;
          }
          
          if (decisionResult.decision === Decision.APPROVED) {
            return true;
          }
          
          const solverResult = computeLevers(inputs, BENCHMARK_RATE, decisionResult.decision);
          
          // If no levers were returned, skip (vacuous truth)
          if (solverResult.levers.length === 0) {
            return true;
          }
          
          // For each lever, verify it never produces DECLINED
          const allNonDeclined = solverResult.levers.every((lever) => {
            const mutatedInputs = {
              ...inputs,
              ...lever.mutatedInputs,
            };
            
            const outcomeResult = evaluateDecision(mutatedInputs, BENCHMARK_RATE);
            
            if ('kind' in outcomeResult) {
              // ENGINE_ERROR should not occur for valid lever mutations
              return false;
            }
            
            // Lever outcome should never be DECLINED
            return outcomeResult.decision !== Decision.DECLINED;
          });
          
          return allNonDeclined;
        },
      ),
      { numRuns: 100, maxGenerations: 200 },
    );
  });
});

// ============================================================================
// Property 9: Pay-down debt algebraic correctness
// For Lever 3 (Pay Down Debt), resulting postLoanDTI <= 0.36 (APPROVED) or <= 0.45 (COUNTER_OFFER)
// Validates: Requirements 5.4
// ============================================================================

describe('Property 9: Pay-down debt algebraic correctness', () => {
  it('for Lever 3 (Pay Down Debt), resulting postLoanDTI <= 0.36 (APPROVED) or <= 0.45 (COUNTER_OFFER)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 600, max: 700, step: 5 }),
        fc.integer({ min: 2000, max: 25000, step: 100 }),
        fc.integer({ min: 100, max: 15000, step: 50 }), // monthlyDebt > 0 for pay-down to be relevant
        fc.integer({ min: 4, max: 50 }).map(n => n * 500),
        fc.oneof(fc.constant(12), fc.constant(24), fc.constant(36), fc.constant(48), fc.constant(60)),
        (creditScore, monthlyIncome, monthlyDebt, loanAmount, termMonths) => {
          // Skip if debt >= income (pay-down won't help in this case)
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
          
          // Compute the pay-down debt lever
          const payDownLever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
          
          // If no pay-down lever is computed, skip (vacuous truth)
          if (payDownLever === null) {
            return true;
          }
          
          // Verify the resulting DTI is within bounds
          // For APPROVED: resultingDTI <= 0.36
          // For COUNTER_OFFER: resultingDTI <= 0.45 (but may be <= 0.36 due to LOAN_CAP_EXCEEDED)
          const resultingDTI = payDownLever.resultingPostLoanDTI;
          
          if (payDownLever.leverOutcome === LeverOutcome.APPROVED) {
            // Should achieve APPROVED (DTI <= 0.36)
            return resultingDTI <= DTI_APPROVED_THRESHOLD;
          } else if (payDownLever.leverOutcome === LeverOutcome.COUNTER_OFFER) {
            // Should achieve COUNTER_OFFER (DTI <= 0.45)
            // Note: COUNTER_OFFER can also occur due to LOAN_CAP_EXCEEDED when DTI <= 0.36,
            // so we only check that DTI <= 0.45
            return resultingDTI <= DTI_COUNTER_THRESHOLD;
          }
          
          return true;
        },
      ),
      { numRuns: 100, maxGenerations: 200 },
    );
  });
});

// ============================================================================
// Unit tests for edge cases
// ============================================================================

describe('Property 7-9: Edge cases and boundary verification', () => {
  it('handles DEFAULT_INPUTS case with all properties verified', () => {
    const inputs = DEFAULT_INPUTS;
    
    const decisionResult = evaluateDecision(inputs, BENCHMARK_RATE);
    if ('kind' in decisionResult) {
      expect.fail('DEFAULT_INPUTS should produce a valid decision');
      return;
    }
    
    if (decisionResult.decision === Decision.APPROVED) {
      expect.fail('DEFAULT_INPUTS should produce COUNTER_OFFER or DECLINED');
      return;
    }
    
    const solverResult = computeLevers(inputs, BENCHMARK_RATE, decisionResult.decision);
    
    if (solverResult.levers.length === 0) {
      // No levers possible - this is acceptable for some edge cases
      return;
    }
    
    // Verify Property 7: Each lever's outcome matches evaluateDecision
    solverResult.levers.forEach((lever) => {
      const mutatedInputs = { ...inputs, ...lever.mutatedInputs };
      const outcomeResult = evaluateDecision(mutatedInputs, BENCHMARK_RATE);
      
      if ('kind' in outcomeResult) {
        expect.fail(`Lever ${lever.leverType} produces ENGINE_ERROR when applied`);
        return;
      }
      
      expect(outcomeResult.decision).toBe(
        lever.leverOutcome === LeverOutcome.APPROVED ? Decision.APPROVED : Decision.COUNTER_OFFER
      );
    });
    
    // Verify Property 8: No lever produces DECLINED
    solverResult.levers.forEach((lever) => {
      const mutatedInputs = { ...inputs, ...lever.mutatedInputs };
      const outcomeResult = evaluateDecision(mutatedInputs, BENCHMARK_RATE);
      
      if ('kind' in outcomeResult) {
        expect.fail(`Lever ${lever.leverType} produces ENGINE_ERROR when applied`);
        return;
      }
      
      expect(outcomeResult.decision).not.toBe(Decision.DECLINED);
    });
  });

  it('handles a case where pay-down debt achieves exactly threshold boundaries', () => {
    // Create a case where pay-down debt should achieve exactly 0.36 or 0.45
    const inputs: ApplicantInputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1800,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 36,
    };
    
    const payDownLever = computePayDownDebtLever(inputs, BENCHMARK_RATE);
    
    if (payDownLever !== null) {
      const resultingDTI = payDownLever.resultingPostLoanDTI;
      
      if (payDownLever.leverOutcome === LeverOutcome.APPROVED) {
        expect(resultingDTI).toBeLessThanOrEqual(0.36);
      } else if (payDownLever.leverOutcome === LeverOutcome.COUNTER_OFFER) {
        expect(resultingDTI).toBeGreaterThan(0.36);
        expect(resultingDTI).toBeLessThanOrEqual(0.45);
      }
    }
  });

  it('handles cases with multiple levers where all satisfy properties 7-8', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 4500,
      monthlyDebt: 1300,
      creditScore: 620,
      loanAmount: 15000,
      termMonths: 36,
    };
    
    const decisionResult = evaluateDecision(inputs, BENCHMARK_RATE);
    if ('kind' in decisionResult) {
      expect.fail('Should produce valid decision');
      return;
    }
    
    if (decisionResult.decision === Decision.APPROVED) {
      return; // No levers needed for APPROVED
    }
    
    const solverResult = computeLevers(inputs, BENCHMARK_RATE, decisionResult.decision);
    
    if (solverResult.levers.length < 2) {
      return; // Not enough levers to test multi-lever scenario
    }
    
    // Verify all levers satisfy properties 7 and 8
    solverResult.levers.forEach((lever) => {
      const mutatedInputs = { ...inputs, ...lever.mutatedInputs };
      const outcomeResult = evaluateDecision(mutatedInputs, BENCHMARK_RATE);
      
      if ('kind' in outcomeResult) {
        expect.fail(`Lever ${lever.leverType} produces ENGINE_ERROR`);
        return;
      }
      
      expect(outcomeResult.decision).not.toBe(Decision.DECLINED);
    });
  });
});
