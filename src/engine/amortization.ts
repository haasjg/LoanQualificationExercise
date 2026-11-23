// src/engine/amortization.ts
/**
 * Helper functions for amortization calculations.
 * Provides rounding utilities and payment/DTI computations.
 */

/**
 * Round a number to specified decimal places using "round half up" strategy.
 * Handles floating-point precision edge cases by using a tolerance-based approach.
 *
 * @param value - The number to round
 * @param decimalPlaces - Number of decimal places (e.g., 2 for payments, 4 for DTI)
 * @returns Rounded number
 */
export function roundHalfUp(value: number, decimalPlaces: number): number {
  // Handle special cases
  if (!Number.isFinite(value)) {
    return value;
  }
  if (Number.isNaN(value)) {
    return value;
  }

  const factor = Math.pow(10, decimalPlaces);
  
  // For "round half up" behavior with floating-point precision:
  // We add a small tolerance that's proportional to the magnitude
  // This handles cases like 9.995 * 100 = 999.4999999999999
  const sign = value >= 0 ? 1 : -1;
  const absValue = Math.abs(value);
  const scaled = absValue * factor;
  
  // Use a tolerance that works for both small and large numbers
  // This is larger than Number.EPSILON to handle typical floating-point errors
  const tolerance = 1e-10;
  const rounded = Math.round(scaled + tolerance);
  
  return sign * rounded / factor;
}

/**
 * Compute the estimated monthly payment for a loan using standard amortization formula.
 * 
 * Formula: L * [r(1+r)^n] / [(1+r)^n - 1]
 * - L = loanAmount
 * - r = monthly interest rate (APR / 12 / 100)
 * - n = termMonths
 * 
 * Handles zero-APR case: payment = loanAmount / termMonths
 *
 * @param loanAmount - The principal loan amount (must be > 0)
 * @param apr - Annual Percentage Rate as a percentage (e.g., 7.5 for 7.5%)
 * @param termMonths - Loan term in months (must be > 0)
 * @returns Monthly payment rounded to 2 decimal places
 */
export function computeEstimatedPayment(loanAmount: number, apr: number, termMonths: number): number {
  const monthlyRate = apr / 100 / 12;

  // Handle zero-APR case
  if (apr === 0 || monthlyRate === 0) {
    return roundHalfUp(loanAmount / termMonths, 2);
  }

  // Standard amortization formula: L * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyRatePlusOne = 1 + monthlyRate;
  const powerTerm = Math.pow(monthlyRatePlusOne, termMonths);
  
  const payment = loanAmount * (monthlyRate * powerTerm) / (powerTerm - 1);

  return roundHalfUp(payment, 2);
}

/**
 * Compute post-loan Debt-to-Income ratio.
 * 
 * Formula: (monthlyDebt + estimatedPayment) / monthlyIncome
 * - monthlyDebt: Existing monthly debt obligations
 * - estimatedPayment: New loan's monthly payment
 * - monthlyIncome: Applicant's monthly income
 * 
 * Precondition: monthlyIncome > 0 (guaranteed by caller)
 * Result is rounded to 4 decimal places.
 *
 * @param monthlyDebt - Existing monthly debt obligations (must be >= 0)
 * @param estimatedPayment - New loan's estimated monthly payment (must be >= 0)
 * @param monthlyIncome - Applicant's monthly income (must be > 0)
 * @returns DTI ratio rounded to 4 decimal places
 */
export function computePostLoanDTI(monthlyDebt: number, estimatedPayment: number, monthlyIncome: number): number {
  const dti = (monthlyDebt + estimatedPayment) / monthlyIncome;
  return roundHalfUp(dti, 4);
}
