// src/engine/solver.ts
/**
 * Path to Yes Solver - computes actionable levers for non-approved decisions.
 * Pure TypeScript implementation with zero React imports.
 */

import type {
  ApplicantInputs,
  EngineResult,
  Lever,
  SolverResult,
} from './types';
import { Decision, LeverType, LeverOutcome } from './types';
import { computeAPR } from './apr';
import { computeEstimatedPayment, computePostLoanDTI } from './amortization';
import { evaluateDecision } from './underwriting';

// ============================================================================
// Constants
// ============================================================================

const CANDIDATE_TERMS = [36, 48, 60] as const;
const CREDIT_MILESTONES = [600, 640, 660, 720] as const;
const LOAN_AMOUNT_MIN = 2000;
const LOAN_AMOUNT_INCREMENT = 500;
const DTI_APPROVED_THRESHOLD = 0.36;
const DTI_COUNTER_THRESHOLD = 0.45;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mutated ApplicantInputs object with the specified changes.
 */
function mutateInputs(
  inputs: ApplicantInputs,
  changes: Partial<ApplicantInputs>,
): ApplicantInputs {
  return {
    ...inputs,
    ...changes,
  };
}

/**
 * Compute lever outcome by running evaluateDecision with mutated inputs.
 * Returns the resulting decision and DTI, or null if evaluation fails.
 */
function computeLeverOutcome(
  inputs: ApplicantInputs,
  benchmarkRate: number,
  mutatedInputs: Partial<ApplicantInputs>,
  targetApr?: number,
): {
  outcome: LeverOutcome | null;
  resultingDTI: number;
  resultingPayment: number;
} {
  // If targetApr is provided, use it directly; otherwise compute from mutated credit score
  const effectiveInputs = mutateInputs(inputs, mutatedInputs);
  const apr = targetApr ?? computeAPR(effectiveInputs.creditScore, benchmarkRate);

  if (apr === null) {
    return { outcome: null, resultingDTI: 0, resultingPayment: 0 };
  }

  const payment = computeEstimatedPayment(
    effectiveInputs.loanAmount,
    apr,
    effectiveInputs.termMonths,
  );
  const dti = computePostLoanDTI(
    effectiveInputs.monthlyDebt,
    payment,
    effectiveInputs.monthlyIncome,
  );

  const result = evaluateDecision(
    effectiveInputs,
    benchmarkRate,
  ) as EngineResult;

  if (result.decision === Decision.APPROVED) {
    return { outcome: LeverOutcome.APPROVED, resultingDTI: dti, resultingPayment: payment };
  }

  if (result.decision === Decision.COUNTER_OFFER) {
    return { outcome: LeverOutcome.COUNTER_OFFER, resultingDTI: dti, resultingPayment: payment };
  }

  return { outcome: null, resultingDTI: dti, resultingPayment: payment };
}

// ============================================================================
// Task 6.2: Extend Term Lever
// ============================================================================

/**
 * Compute the Extend Term lever.
 * Tests candidate terms {36, 48, 60} > current term to find shortest term
 * achieving DTI <= 0.36 (APPROVED) or <= 0.45 (COUNTER_OFFER).
 * Returns null if no viable term found or current term >= 60.
 */
export function computeExtendTermLever(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): Lever | null {
  const { termMonths, loanAmount, monthlyDebt, monthlyIncome, creditScore } = inputs;

  // Check if current term is already at max
  if (termMonths >= 60) {
    return null;
  }

  // Compute current payment and DTI
  const currentApr = computeAPR(creditScore, benchmarkRate);
  if (currentApr === null) {
    return null;
  }

  // Get candidate terms that are greater than current term
  const candidateTerms = CANDIDATE_TERMS.filter((term) => term > termMonths);

  // First pass: find shortest term achieving DTI <= 0.36 (APPROVED)
  for (const term of candidateTerms) {
    const payment = computeEstimatedPayment(loanAmount, currentApr, term);
    const dti = computePostLoanDTI(monthlyDebt, payment, monthlyIncome);

    if (dti <= DTI_APPROVED_THRESHOLD) {
      const outcome = computeLeverOutcome(inputs, benchmarkRate, { termMonths: term });
      if (outcome.outcome === LeverOutcome.APPROVED) {
        return {
          leverType: LeverType.EXTEND_TERM,
          payload: { termMonths: term },
          mutatedInputs: { termMonths: term },
          resultingPostLoanDTI: outcome.resultingDTI,
          resultingEstimatedPayment: outcome.resultingPayment,
          leverOutcome: outcome.outcome,
          displayLabel: `Extend term to ${term} months to reduce monthly payment`,
        };
      }
    }
  }

  // Second pass: find shortest term achieving DTI <= 0.45 (COUNTER_OFFER)
  for (const term of candidateTerms) {
    const payment = computeEstimatedPayment(loanAmount, currentApr, term);
    const dti = computePostLoanDTI(monthlyDebt, payment, monthlyIncome);

    if (dti <= DTI_COUNTER_THRESHOLD) {
      const outcome = computeLeverOutcome(inputs, benchmarkRate, { termMonths: term });
      if (outcome.outcome === LeverOutcome.COUNTER_OFFER) {
        return {
          leverType: LeverType.EXTEND_TERM,
          payload: { termMonths: term },
          mutatedInputs: { termMonths: term },
          resultingPostLoanDTI: outcome.resultingDTI,
          resultingEstimatedPayment: outcome.resultingPayment,
          leverOutcome: outcome.outcome,
          displayLabel: `Extend term to ${term} months to reach counter-offer threshold`,
        };
      }
    }
  }

  // No viable term found
  return null;
}

// ============================================================================
// Task 6.3: Reduce Loan Amount Lever
// ============================================================================

/**
 * Compute the Reduce Loan Amount lever.
 * Finds the maximum loan amount (rounded down to nearest $100) that achieves
 * DTI <= 0.36 (APPROVED) or DTI <= 0.45 (COUNTER_OFFER).
 * 
 * First pass: searches downward from (loanAmount - 100) in $100 increments
 * to find max amount with DTI <= 0.36 (APPROVED outcome), requiring amount >= 2000.
 * 
 * Second pass: if first pass finds nothing, searches for max amount with
 * DTI <= 0.45 (COUNTER_OFFER outcome), also requiring amount >= 2000.
 * 
 * Returns null if no viable amount is found or if verification with
 * evaluateDecision returns DECLINED.
 */
export function computeReduceAmountLever(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): Lever | null {
  const { loanAmount, termMonths, monthlyDebt, monthlyIncome, creditScore } = inputs;

  // If loan amount is already at minimum, no reduction possible
  if (loanAmount <= LOAN_AMOUNT_MIN) {
    return null;
  }

  // Compute APR for current inputs
  const apr = computeAPR(creditScore, benchmarkRate);
  if (apr === null) {
    return null;
  }

  // Helper: compute DTI for a given loan amount
  const computeDTIForAmount = (amount: number): number => {
    const payment = computeEstimatedPayment(amount, apr, termMonths);
    return computePostLoanDTI(monthlyDebt, payment, monthlyIncome);
  };

  /**
   * Binary search helper to find max amount <= threshold with DTI <= targetDTI.
   * Searches in $100 increments from LOAN_AMOUNT_MIN to searchUpperBound.
   * Returns the maximum amount that achieves the target DTI, or null if none found.
   */
  function findMaxAmountWithDTI(
    searchUpperBound: number,
    targetDTI: number,
  ): number | null {
    // If the minimum amount already achieves target DTI, binary search
    const minDTI = computeDTIForAmount(LOAN_AMOUNT_MIN);
    if (minDTI > targetDTI) {
      return null; // Even minimum amount exceeds target DTI
    }

    // If the upper bound achieves target DTI, return it (it's the max)
    const upperDTI = computeDTIForAmount(searchUpperBound);
    if (upperDTI <= targetDTI) {
      return searchUpperBound;
    }

    // Binary search for the maximum amount where DTI <= targetDTI
    let low = LOAN_AMOUNT_MIN;
    let high = searchUpperBound;
    let result = LOAN_AMOUNT_MIN;

    while (low <= high) {
      // Find midpoint and round down to nearest LOAN_AMOUNT_INCREMENT
      const mid = Math.floor((low + high) / 2);
      const amount = Math.floor(mid / LOAN_AMOUNT_INCREMENT) * LOAN_AMOUNT_INCREMENT;
      
      const dti = computeDTIForAmount(amount);

      if (dti <= targetDTI) {
        result = amount;
        low = amount + LOAN_AMOUNT_INCREMENT;
      } else {
        high = amount - LOAN_AMOUNT_INCREMENT;
      }

      // Prevent infinite loop if amount stops changing
      if (low > high || (low === high && computeDTIForAmount(low) > targetDTI)) {
        break;
      }
    }

    return result;
  }

  // First pass: find max amount with DTI <= 0.36 (APPROVED)
  const searchUpperBoundApproved = Math.max(
    LOAN_AMOUNT_MIN,
    Math.min(loanAmount - LOAN_AMOUNT_INCREMENT, 25000),
  );
  
  const bestAmountApproved = findMaxAmountWithDTI(searchUpperBoundApproved, DTI_APPROVED_THRESHOLD);

  if (bestAmountApproved !== null) {
    const outcome = computeLeverOutcome(inputs, benchmarkRate, { loanAmount: bestAmountApproved });
    if (outcome.outcome === LeverOutcome.APPROVED) {
      return {
        leverType: LeverType.REDUCE_AMOUNT,
        payload: { loanAmount: bestAmountApproved },
        mutatedInputs: { loanAmount: bestAmountApproved },
        resultingPostLoanDTI: outcome.resultingDTI,
        resultingEstimatedPayment: outcome.resultingPayment,
        leverOutcome: outcome.outcome,
        displayLabel: `Reduce loan amount to $${bestAmountApproved} to achieve approval`,
      };
    }
  }

  // Second pass: find max amount with DTI <= 0.45 (COUNTER_OFFER)
  const searchUpperBoundCounter = Math.max(
    LOAN_AMOUNT_MIN,
    Math.min(loanAmount - LOAN_AMOUNT_INCREMENT, 25000),
  );
  
  const bestAmountCounter = findMaxAmountWithDTI(searchUpperBoundCounter, DTI_COUNTER_THRESHOLD);

  if (bestAmountCounter !== null) {
    const outcome = computeLeverOutcome(inputs, benchmarkRate, { loanAmount: bestAmountCounter });
    if (outcome.outcome === LeverOutcome.COUNTER_OFFER) {
      return {
        leverType: LeverType.REDUCE_AMOUNT,
        payload: { loanAmount: bestAmountCounter },
        mutatedInputs: { loanAmount: bestAmountCounter },
        resultingPostLoanDTI: outcome.resultingDTI,
        resultingEstimatedPayment: outcome.resultingPayment,
        leverOutcome: outcome.outcome,
        displayLabel: `Reduce loan amount to $${bestAmountCounter} to reach counter-offer`,
      };
    }
  }

  // No viable amount found
  return null;
}

// ============================================================================
// Task 6.4: Pay Down Debt Lever
// ============================================================================

/**
 * Compute the Pay Down Debt lever.
 * Solves algebraically for D_reduce such that (monthlyDebt - D_reduce + payment) / income <= 0.36.
 * Returns lever with APPROVED outcome if partial reduction suffices.
 * Returns lever with COUNTER_OFFER outcome if full debt elimination gives DTI <= 0.45.
 * Returns null if even full elimination leaves DTI > 0.45.
 * 
 * Requirements 5.4, 9.4
 */
export function computePayDownDebtLever(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): Lever | null {
  const { monthlyDebt, loanAmount, termMonths, monthlyIncome, creditScore } = inputs;

  // Requirement: Return null if monthlyDebt === 0
  if (monthlyDebt === 0) {
    return null;
  }

  // Compute current APR and payment
  const apr = computeAPR(creditScore, benchmarkRate);
  if (apr === null) {
    return null;
  }

  const payment = computeEstimatedPayment(loanAmount, apr, termMonths);

  // Solve algebraically: D_reduce = monthlyDebt + payment - 0.36 * monthlyIncome
  // This is the exact reduction needed to achieve DTI = 0.36
  const requiredReductionToApprove = monthlyDebt + payment - DTI_APPROVED_THRESHOLD * monthlyIncome;

  // If required reduction is <= 0, DTI is already at or below threshold
  // (shouldn't reach solver if approved, but handle defensively)
  if (requiredReductionToApprove <= 0) {
    return null;
  }

  // First check: can partial reduction (D_reduce <= monthlyDebt) achieve DTI <= 0.36?
  // This happens when requiredReductionToApprove <= monthlyDebt
  if (requiredReductionToApprove <= monthlyDebt) {
    // Partial reduction suffices for APPROVED outcome
    const cappedReduction = requiredReductionToApprove;
    const newMonthlyDebt = monthlyDebt - cappedReduction;
    
    // Compute lever outcome for verification
    const verifyOutcome = computeLeverOutcome(inputs, benchmarkRate, { monthlyDebt: newMonthlyDebt });
    
    // If verification fails (returns null), omit this lever
    if (verifyOutcome.outcome === null) {
      return null;
    }

    return {
      leverType: LeverType.PAY_DOWN_DEBT,
      payload: { monthlyDebt: newMonthlyDebt, dReduce: cappedReduction },
      mutatedInputs: { monthlyDebt: newMonthlyDebt },
      resultingPostLoanDTI: verifyOutcome.resultingDTI,
      resultingEstimatedPayment: payment,
      leverOutcome: verifyOutcome.outcome,
      displayLabel: `Reduce monthly debt by $${cappedReduction.toFixed(0)} to achieve approval`,
    };
  }

  // Second check: if full elimination gives DTI <= 0.45, return COUNTER_OFFER
  // Full elimination means D_reduce = monthlyDebt, so newMonthlyDebt = 0
  const newMonthlyDebt = 0;
  const resultingDTI = computePostLoanDTI(newMonthlyDebt, payment, monthlyIncome);

  // If even full debt elimination leaves DTI > 0.45, omit this lever
  if (resultingDTI > DTI_COUNTER_THRESHOLD) {
    return null;
  }

  // Full elimination gives DTI <= 0.45 but > 0.36 (COUNTER_OFFER outcome)
  // Per Requirement 9.4: cap D_reduce at monthlyDebt for COUNTER_OFFER
  const cappedReduction = monthlyDebt;

  // Compute lever outcome for verification
  const verifyOutcome = computeLeverOutcome(inputs, benchmarkRate, { monthlyDebt: newMonthlyDebt });

  // If verification fails (returns null), omit this lever
  if (verifyOutcome.outcome === null) {
    return null;
  }

  return {
    leverType: LeverType.PAY_DOWN_DEBT,
    payload: { monthlyDebt: newMonthlyDebt, dReduce: cappedReduction },
    mutatedInputs: { monthlyDebt: newMonthlyDebt },
    resultingPostLoanDTI: verifyOutcome.resultingDTI,
    resultingEstimatedPayment: payment,
    leverOutcome: verifyOutcome.outcome,
    displayLabel: `Reduce monthly debt by $${cappedReduction.toFixed(0)} to reach counter-offer`,
  };
}

// ============================================================================
// Task 6.5: Credit Score Milestone Lever
// ============================================================================

/**
 * Compute the Credit Score Milestone lever.
 * Identifies lowest milestone above creditScore from {600, 640, 660, 720}
 * and calculates the payment reduction achievable at that tier.
 */
export function computeCreditScoreMilestoneLever(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): Lever | null {
  const { creditScore, loanAmount, termMonths } = inputs;

  // Check if creditScore >= 640 (already at or beyond approval threshold)
  if (creditScore >= 640) {
    return null;
  }

  // Find lowest milestone above creditScore
  let targetScore = null;
  for (const milestone of CREDIT_MILESTONES) {
    if (milestone > creditScore) {
      targetScore = milestone;
      break;
    }
  }

  if (targetScore === null) {
    return null;
  }

  // Compute APR for current and target scores
  const currentApr = computeAPR(creditScore, benchmarkRate);
  const targetApr = computeAPR(targetScore, benchmarkRate);

  if (targetApr === null) {
    // Target score is also ineligible (shouldn't happen with current milestones)
    return null;
  }

  // For HIGH_RISK current score (<600), we can't compute current payment
  // But we can still compute the target payment and payment reduction
  let currentPayment: number;
  let newPayment: number;
  let monthlyPaymentReduction: number;

  if (currentApr === null) {
    // Current applicant is HIGH_RISK, use a placeholder payment for comparison
    // The actual payment doesn't matter since the applicant is declined anyway
    // We just need to show the payment reduction achievable by improving credit score
    currentPayment = 0; // Placeholder - won't be used in outcome computation
    newPayment = computeEstimatedPayment(loanAmount, targetApr, termMonths);
    monthlyPaymentReduction = newPayment;
  } else {
    currentPayment = computeEstimatedPayment(loanAmount, currentApr, termMonths);
    newPayment = computeEstimatedPayment(loanAmount, targetApr, termMonths);
    monthlyPaymentReduction = currentPayment - newPayment;
  }

  // Compute lever outcome
  const outcome = computeLeverOutcome(inputs, benchmarkRate, { creditScore: targetScore }, targetApr);

  // If the resulting decision is DECLINED, omit this lever
  if (outcome.outcome === null) {
    return null;
  }

  // Ensure lever outcome is valid (APPROVED or COUNTER_OFFER)
  if (outcome.outcome !== LeverOutcome.APPROVED && outcome.outcome !== LeverOutcome.COUNTER_OFFER) {
    return null;
  }

  // Determine the APR reduction to display
  let aprChangeLabel: string;
  if (currentApr !== null) {
    aprChangeLabel = `${(targetApr - currentApr).toFixed(2)}%`;
  } else {
    // For HIGH_RISK applicants, currentApr is null
    // targetApr for creditScore >= 600 is benchmarkRate + 5.0
    // So there's no APR improvement from the milestone (both are in Subprime tier)
    aprChangeLabel = 'to Subprime tier';
  }

  return {
    leverType: LeverType.CREDIT_SCORE_MILESTONE,
    payload: {
      creditScore: targetScore,
      targetApr,
      monthlyPaymentReduction,
    },
    mutatedInputs: { creditScore: targetScore },
    resultingPostLoanDTI: outcome.resultingDTI,
    resultingEstimatedPayment: newPayment,
    leverOutcome: outcome.outcome,
    displayLabel: `Improve credit score to ${targetScore} for better APR (${aprChangeLabel})`,
  };
}

// ============================================================================
// Task 6.1: Orchestrator - computeLevers
// ============================================================================

/**
 * Main solver orchestrator.
 * Calls each lever-computation function, filters out null results,
 * and returns an ordered list of levers or an empty message.
 */
export function computeLevers(
  inputs: ApplicantInputs,
  benchmarkRate: number,
  decision: Decision,
): SolverResult {
  const levers: Lever[] = [];

  // Only compute levers for COUNTER_OFFER or DECLINED decisions
  if (decision === Decision.APPROVED) {
    return { levers: [], emptyMessage: null };
  }

  // Compute each lever
  const extendTermLever = computeExtendTermLever(inputs, benchmarkRate);
  const reduceAmountLever = computeReduceAmountLever(inputs, benchmarkRate);
  const payDownDebtLever = computePayDownDebtLever(inputs, benchmarkRate);
  const creditScoreMilestoneLever = computeCreditScoreMilestoneLever(inputs, benchmarkRate);

  // Add non-null levers in priority order (lowest out-of-pocket cash required first)
  if (extendTermLever !== null) {
    levers.push(extendTermLever);
  }

  if (reduceAmountLever !== null) {
    levers.push(reduceAmountLever);
  }

  if (payDownDebtLever !== null) {
    levers.push(payDownDebtLever);
  }

  if (creditScoreMilestoneLever !== null) {
    levers.push(creditScoreMilestoneLever);
  }

  // If no levers remain, return empty message
  if (levers.length === 0) {
    return {
      levers: [],
      emptyMessage: 'No mathematically feasible path to approval exists at your current income and debt levels. Consider increasing your income or reducing your debt obligations.',
    };
  }

  return { levers, emptyMessage: null };
}
