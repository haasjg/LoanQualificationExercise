// src/engine/underwriting.ts
/**
 * Underwriting engine for loan decisions.
 * Evaluates applicants based on credit score, income, debt, and DTI ratios.
 */

import type { ApplicantInputs, EngineOutput, EngineResult, ValidationError } from './types';
import { Decision, ReasonCode } from './types';
import { computeAPR } from './apr';
import { computeEstimatedPayment, computePostLoanDTI } from './amortization';

// ============================================================================
// Thresholds and Constants
// ============================================================================

export const INCOME_MINIMUM_APPROVAL = 2000;
export const INCOME_MINIMUM_COUNTER = 1800;
export const DTI_APPROVED_THRESHOLD = 0.36;
export const DTI_COUNTER_THRESHOLD = 0.45;
export const LOAN_CAP_SUBPRIME = 15000;

/**
 * Validate all input fields and benchmarkRate.
 * Returns array of all validation errors found.
 */
export function validateInputs(inputs: ApplicantInputs, benchmarkRate: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate monthlyIncome: finite non-negative
  if (!Number.isFinite(inputs.monthlyIncome) || inputs.monthlyIncome < 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'monthlyIncome', message: 'monthlyIncome must be a non-negative finite number' });
  }

  // Validate monthlyDebt: finite non-negative
  if (!Number.isFinite(inputs.monthlyDebt) || inputs.monthlyDebt < 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'monthlyDebt', message: 'monthlyDebt must be a non-negative finite number' });
  }

  // Validate creditScore: finite positive
  if (!Number.isFinite(inputs.creditScore) || inputs.creditScore <= 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'creditScore', message: 'creditScore must be a positive finite number' });
  }

  // Validate loanAmount: finite positive multiple of 500 in [2000, 25000]
  if (!Number.isFinite(inputs.loanAmount) || inputs.loanAmount <= 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'loanAmount', message: 'loanAmount must be a positive finite number' });
  } else {
    const loanAmountValid = inputs.loanAmount >= 2000 && inputs.loanAmount <= 25000 && (inputs.loanAmount - 2000) % 500 === 0;
    if (!loanAmountValid) {
      errors.push({ kind: 'VALIDATION_ERROR', field: 'loanAmount', message: 'loanAmount must be a multiple of $500 in [2000, 25000]' });
    }
  }

  // Validate termMonths: finite positive
  if (!Number.isFinite(inputs.termMonths) || inputs.termMonths <= 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'termMonths', message: 'termMonths must be a positive finite number' });
  }

  // Validate benchmarkRate: finite non-negative
  if (!Number.isFinite(benchmarkRate) || benchmarkRate < 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'benchmarkRate', message: 'benchmarkRate must be a non-negative finite number' });
  }

  return errors;
}

/**
 * Primary entry point for the underwriting engine.
 * Evaluates decision in priority order:
 * 1. creditScore < 600 -> DECLINED HIGH_RISK_SCORE (APR is null)
 * 2. monthlyIncome === 0 -> DECLINED INSUFFICIENT_INCOME (return EngineError INVALID_INPUT)
 * 3. termMonths === 0 -> DECLINED INSUFFICIENT_INCOME (return EngineError INVALID_INPUT)
 * 4. monthlyIncome < 1800 -> DECLINED INSUFFICIENT_INCOME
 * 5. monthlyDebt >= monthlyIncome -> DECLINED EXCESSIVE_DEBT
 * 6. postLoanDTI > 0.45 -> DECLINED HIGH_DTI
 * 7. score 600-659, DTI <= 0.36, loan > 15000 -> COUNTER_OFFER LOAN_CAP_EXCEEDED
 * 8. DTI in (0.36, 0.45] -> COUNTER_OFFER
 * 9. remaining cases -> APPROVED
 * 
 * Returns EngineResult or EngineError; never throws.
 */
export function evaluateDecision(inputs: ApplicantInputs, benchmarkRate: number): EngineOutput {
  // Priority 2 & 3: Check loanAmount === 0 or termMonths === 0 -> EngineError INVALID_INPUT
  if (inputs.loanAmount === 0 || inputs.termMonths === 0) {
    const invalidFields = [];
    if (inputs.loanAmount === 0) invalidFields.push('loanAmount');
    if (inputs.termMonths === 0) invalidFields.push('termMonths');
    return {
      kind: 'ENGINE_ERROR',
      invalidFields,
      message: 'loanAmount and termMonths must be greater than 0',
    };
  }

  // Priority 2: monthlyIncome === 0 -> EngineError INVALID_INPUT
  if (inputs.monthlyIncome === 0) {
    return {
      kind: 'ENGINE_ERROR',
      invalidFields: ['monthlyIncome'],
      message: 'monthlyIncome must be greater than 0',
    };
  }

  // Validate inputs
  const validationErrors = validateInputs(inputs, benchmarkRate);
  if (validationErrors.length > 0) {
    return {
      kind: 'ENGINE_ERROR',
      invalidFields: validationErrors.map(e => e.field),
      message: validationErrors[0].message,
    };
  }

  // Compute APR
  const apr = computeAPR(inputs.creditScore, benchmarkRate);

  // Priority 1: creditScore < 600 -> DECLINED HIGH_RISK_SCORE (APR is null)
  if (apr === null) {
    return makeDeclined(Decision.DECLINED, ReasonCode.HIGH_RISK_SCORE, 0, 0, 0, benchmarkRate);
  }

  // Compute estimated payment and DTI
  const estimatedPayment = computeEstimatedPayment(inputs.loanAmount, apr, inputs.termMonths);
  const postLoanDTI = computePostLoanDTI(inputs.monthlyDebt, estimatedPayment, inputs.monthlyIncome);

  // Priority 4: monthlyIncome < 1800 -> DECLINED INSUFFICIENT_INCOME
  if (inputs.monthlyIncome < INCOME_MINIMUM_COUNTER) {
    return makeDeclined(Decision.DECLINED, ReasonCode.INSUFFICIENT_INCOME, apr, estimatedPayment, postLoanDTI, benchmarkRate);
  }

  // Priority 5: monthlyDebt >= monthlyIncome -> DECLINED EXCESSIVE_DEBT
  if (inputs.monthlyDebt >= inputs.monthlyIncome) {
    return makeDeclined(Decision.DECLINED, ReasonCode.EXCESSIVE_DEBT, apr, estimatedPayment, postLoanDTI, benchmarkRate);
  }

  // Priority 6: postLoanDTI > 0.45 -> DECLINED HIGH_DTI
  if (postLoanDTI > DTI_COUNTER_THRESHOLD) {
    return makeDeclined(Decision.DECLINED, ReasonCode.HIGH_DTI, apr, estimatedPayment, postLoanDTI, benchmarkRate);
  }

  // Priority 7: score 600-659, DTI <= 0.36, loan > 15000 -> COUNTER_OFFER LOAN_CAP_EXCEEDED
  if (
    inputs.creditScore >= 600 &&
    inputs.creditScore <= 659 &&
    postLoanDTI <= DTI_APPROVED_THRESHOLD &&
    inputs.loanAmount > LOAN_CAP_SUBPRIME
  ) {
    return {
      decision: Decision.COUNTER_OFFER,
      reasonCode: ReasonCode.LOAN_CAP_EXCEEDED,
      apr,
      estimatedPayment,
      postLoanDTI,
      benchmarkRate,
    };
  }

  // Priority 8: DTI in (0.36, 0.45] -> COUNTER_OFFER
  if (postLoanDTI > DTI_APPROVED_THRESHOLD) {
    return {
      decision: Decision.COUNTER_OFFER,
      reasonCode: null,
      apr,
      estimatedPayment,
      postLoanDTI,
      benchmarkRate,
    };
  }

  // Priority 9: remaining cases -> APPROVED
  return {
    decision: Decision.APPROVED,
    reasonCode: null,
    apr,
    estimatedPayment,
    postLoanDTI,
    benchmarkRate,
  };
}

/**
 * Helper function to create a DECLINED result with the given reason code.
 */
function makeDeclined(
  decision: Decision.DECLINED,
  reasonCode: ReasonCode,
  apr: number,
  estimatedPayment: number,
  postLoanDTI: number,
  benchmarkRate: number,
): EngineResult {
  return {
    decision,
    reasonCode,
    apr,
    estimatedPayment,
    postLoanDTI,
    benchmarkRate,
  };
}
