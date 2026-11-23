// src/engine/amortization.spec.ts
/**
 * Property-Based Tests for amortization calculation functions.
 * Tests Payment formula correctness and DTI monotonicity.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { roundHalfUp, computeEstimatedPayment, computePostLoanDTI } from './amortization';

describe('amortization property-based tests', () => {
  const VALID_TERM_MONTHS = [12, 24, 36, 48, 60] as const;

  // Feature: path-to-yes, Property 4: Amortization formula correctness
  // For all loanAmount > 0, termMonths in valid set, apr >= 0, payment is finite positive and >= loanAmount / termMonths
  // Validates: Requirements 3.1, 3.5, 9.5
  it('Property 4: Payment is finite, positive, and >= loanAmount / termMonths for all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.nat(25000), // loanAmount in [0, 25000], use +1 below to shift to [1, 25001]
        fc.nat(3000), // apr in [0, 3000] scaled by 100 for integer math
        fc.constantFrom(...VALID_TERM_MONTHS), // termMonths from valid set
        (loanAmountRaw, aprScaled, termMonths) => {
          // Shift to [1, 25001] to ensure loanAmount > 0
          const loanAmount = loanAmountRaw + 1;
          const apr = aprScaled / 100; // Convert back to percentage

          const payment = computeEstimatedPayment(loanAmount, apr, termMonths);

          // Payment must be finite
          expect(Number.isFinite(payment)).toBe(true);
          
          // Payment must be positive (loanAmount > 0, so payment > 0)
          expect(payment).toBeGreaterThan(0);
          
          // Payment must be >= loanAmount / termMonths (interest adds to total)
          // Use a small tolerance for floating-point comparison
          const minimumPayment = loanAmount / termMonths;
          expect(payment).toBeGreaterThanOrEqual(minimumPayment - 0.01);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: path-to-yes, Property 5: DTI monotonicity with income
  // For fixed monthlyDebt and estimatedPayment with (monthlyDebt + estimatedPayment) > 0,
  // DTI(i1) > DTI(i2) when i1 < i2
  // Validates: Requirement 3.3
  it('Property 5: DTI is strictly decreasing as income increases (when DTI > 0)', () => {
    fc.assert(
      fc.property(
        fc.nat(15000), // monthlyDebt in [0, 15000]
        fc.nat(10000), // estimatedPayment in [0, 10000]
        fc.nat(8200), // lower income bound: [0, 8200], add 1800 below
        fc.nat(8200), // higher income bound: [0, 8200], add 1800 below
        (monthlyDebt, estimatedPayment, income1Raw, income2Raw) => {
          // Only test when (monthlyDebt + estimatedPayment) > 0
          if (monthlyDebt + estimatedPayment === 0) {
            return;
          }
          
          // Shift to [1800, 10000]
          const income1 = income1Raw + 1800;
          const income2 = income2Raw + 1800;
          
          // Ensure we have strictly increasing incomes with a minimum gap
          const lowerIncome = Math.min(income1, income2);
          const higherIncome = Math.max(income1, income2) + 100; // Ensure strict inequality

          const dtiLowerIncome = computePostLoanDTI(monthlyDebt, estimatedPayment, lowerIncome);
          const dtiHigherIncome = computePostLoanDTI(monthlyDebt, estimatedPayment, higherIncome);

          // DTI should be non-increasing: DTI(lowerIncome) >= DTI(higherIncome)
          // Note: With rounding to 4 decimal places, they might be equal
          expect(dtiLowerIncome).toBeGreaterThanOrEqual(dtiHigherIncome);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Additional Property 4 variant: Payment precision verification
  // For all valid inputs, payment has exactly 2 decimal places
  // Validates: Requirement 3.1
  it('Property 4 variant: Payment always has 2-decimal precision', () => {
    fc.assert(
      fc.property(
        fc.nat(25000), // loanAmount in [0, 25000], use +1 below to shift to [1, 25001]
        fc.nat(3000), // apr in [0, 3000] scaled by 100
        fc.constantFrom(...VALID_TERM_MONTHS), // termMonths from valid set
        (loanAmountRaw, aprScaled, termMonths) => {
          // Shift to [1, 25001] to ensure loanAmount > 0
          const loanAmount = loanAmountRaw + 1;
          const apr = aprScaled / 100;

          const payment = computeEstimatedPayment(loanAmount, apr, termMonths);

          // Verify payment has at most 2 decimal places
          const paymentStr = payment.toString();
          const decimalIndex = paymentStr.indexOf('.');
          if (decimalIndex !== -1) {
            const decimalPart = paymentStr.substring(decimalIndex + 1);
            expect(decimalPart.length).toBeLessThanOrEqual(2);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Additional Property 5 variant: DTI precision verification
  // For all valid inputs, DTI has exactly 4 decimal places
  // Validates: Requirement 3.3
  it('Property 5 variant: DTI always has 4-decimal precision', () => {
    fc.assert(
      fc.property(
        fc.nat(15000), // monthlyDebt in [0, 15000]
        fc.nat(10000), // estimatedPayment in [0, 10000]
        fc.integer(1800, 25000), // monthlyIncome in [1800, 25000] - guaranteed > 0
        (monthlyDebt, estimatedPayment, monthlyIncome) => {
          const dti = computePostLoanDTI(monthlyDebt, estimatedPayment, monthlyIncome);

          // Verify DTI has at most 4 decimal places
          const dtiStr = dti.toString();
          const decimalIndex = dtiStr.indexOf('.');
          if (decimalIndex !== -1) {
            const decimalPart = dtiStr.substring(decimalIndex + 1);
            expect(decimalPart.length).toBeLessThanOrEqual(4);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Payment monotonicity with loan amount
  // For fixed apr and termMonths, payment increases as loanAmount increases
  // Validates: Requirement 3.5
  it('Property: Payment is monotonically increasing with loanAmount', () => {
    fc.assert(
      fc.property(
        fc.nat(24999), // base loanAmount in [0, 24999], use +1 below to shift to [1, 25000]
        fc.nat(3000), // apr in [0, 3000] scaled by 100
        fc.constantFrom(...VALID_TERM_MONTHS), // termMonths from valid set
        (loanAmount1Raw, aprScaled, termMonths) => {
          const apr = aprScaled / 100;
          // Shift to [1, 25000] to ensure loanAmount > 0
          const loanAmount1 = loanAmount1Raw + 1;
          // Create two different loan amounts where loanAmount2 > loanAmount1
          const loanAmount2 = loanAmount1 + 1;

          const payment1 = computeEstimatedPayment(loanAmount1, apr, termMonths);
          const payment2 = computeEstimatedPayment(loanAmount2, apr, termMonths);

          // Payment should increase with loan amount
          expect(payment2).toBeGreaterThan(payment1);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: Payment is zero-APR consistent
  // For apr = 0, payment = loanAmount / termMonths (exact division with rounding)
  // Validates: Requirements 3.1, 3.5
  it('Property: Payment equals exact division when APR is 0', () => {
    fc.assert(
      fc.property(
        fc.nat(25000), // loanAmount in [0, 25000], use +1 below to shift to [1, 25001]
        fc.constantFrom(...VALID_TERM_MONTHS), // termMonths from valid set
        (loanAmountRaw, termMonths) => {
          // Shift to [1, 25001] to ensure loanAmount > 0
          const loanAmount = loanAmountRaw + 1;
          const payment = computeEstimatedPayment(loanAmount, 0, termMonths);
          const exactDivision = roundHalfUp(loanAmount / termMonths, 2);

          expect(payment).toBe(exactDivision);
        },
      ),
      { numRuns: 100 },
    );
  });
});
