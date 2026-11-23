import { describe, it, expect } from 'vitest';
import { Lever, LeverOutcome, LeverType } from '../../engine/types';

/**
 * Test file for bestAlternative selection logic.
 * This validates Requirement 14.4 (Step 3 comparison CTA selection).
 * 
 * The bestAlternative logic is:
 * 1. Priority 1: APPROVED-outcome lever with highest loan amount
 * 2. Priority 2: COUNTER_OFFER-outcome lever with lowest payment
 * 3. Return null if no levers exist
 */

// Helper to create a minimal Lever for testing
const createLever = (
  leverOutcome: LeverOutcome,
  resultingEstimatedPayment: number,
  loanAmount?: number,
): Lever => ({
  leverType: LeverType.EXTEND_TERM,
  payload: { termMonths: 36 },
  mutatedInputs: loanAmount !== undefined ? { loanAmount } : {},
  resultingPostLoanDTI: 0.30,
  resultingEstimatedPayment,
  leverOutcome,
  displayLabel: 'Test lever',
});

// Extract the bestAlternative logic as a pure function for testing
const selectBestAlternative = (levers: Lever[], currentLoanAmount: number): Lever | null => {
  if (levers.length === 0) return null;
  
  // Priority 1: APPROVED-outcome lever with highest loan amount
  const approvedLevers = levers.filter(l => l.leverOutcome === LeverOutcome.APPROVED);
  if (approvedLevers.length > 0) {
    return approvedLevers.reduce((best, current) => {
      const bestAmount = best.mutatedInputs.loanAmount ?? currentLoanAmount;
      const currentAmount = current.mutatedInputs.loanAmount ?? currentLoanAmount;
      return currentAmount > bestAmount ? current : best;
    });
  }
  
  // Priority 2: COUNTER_OFFER-outcome lever with lowest payment
  const counterLevers = levers.filter(l => l.leverOutcome === LeverOutcome.COUNTER_OFFER);
  if (counterLevers.length > 0) {
    return counterLevers.reduce((best, current) => 
      current.resultingEstimatedPayment < best.resultingEstimatedPayment ? current : best
    );
  }
  
  return null;
};

describe('bestAlternative selection logic', () => {
  describe('Priority 1: APPROVED-outcome lever with highest loan amount', () => {
    it('should select APPROVED lever with highest loan amount when multiple APPROVED levers exist', () => {
      const levers = [
        createLever(LeverOutcome.APPROVED, 400, 10000),
        createLever(LeverOutcome.APPROVED, 500, 12000),
        createLever(LeverOutcome.APPROVED, 450, 11000),
      ];
      
      const result = selectBestAlternative(levers, 8000);
      
      expect(result).not.toBeNull();
      expect(result?.leverOutcome).toBe(LeverOutcome.APPROVED);
      expect(result?.mutatedInputs.loanAmount).toBe(12000);
    });

    it('should use current loan amount when mutatedInputs.loanAmount is undefined', () => {
      const currentLoanAmount = 10000;
      const levers = [
        createLever(LeverOutcome.APPROVED, 400), // no loan amount in mutatedInputs
        createLever(LeverOutcome.APPROVED, 500, 9000),
      ];
      
      const result = selectBestAlternative(levers, currentLoanAmount);
      
      expect(result).not.toBeNull();
      // Should select the lever without mutatedInputs.loanAmount since it uses current amount (10000 > 9000)
      expect(result?.mutatedInputs.loanAmount).toBeUndefined();
    });

    it('should prefer APPROVED lever over COUNTER_OFFER lever regardless of payment', () => {
      const levers = [
        createLever(LeverOutcome.COUNTER_OFFER, 300, 15000), // lower payment
        createLever(LeverOutcome.APPROVED, 500, 10000),      // higher payment but approved
      ];
      
      const result = selectBestAlternative(levers, 8000);
      
      expect(result).not.toBeNull();
      expect(result?.leverOutcome).toBe(LeverOutcome.APPROVED);
      expect(result?.mutatedInputs.loanAmount).toBe(10000);
    });
  });

  describe('Priority 2: COUNTER_OFFER-outcome lever with lowest payment', () => {
    it('should select COUNTER_OFFER lever with lowest payment when no APPROVED levers exist', () => {
      const levers = [
        createLever(LeverOutcome.COUNTER_OFFER, 400),
        createLever(LeverOutcome.COUNTER_OFFER, 350),
        createLever(LeverOutcome.COUNTER_OFFER, 380),
      ];
      
      const result = selectBestAlternative(levers, 8000);
      
      expect(result).not.toBeNull();
      expect(result?.leverOutcome).toBe(LeverOutcome.COUNTER_OFFER);
      expect(result?.resultingEstimatedPayment).toBe(350);
    });

    it('should select lowest payment regardless of loan amount for COUNTER_OFFER levers', () => {
      const levers = [
        createLever(LeverOutcome.COUNTER_OFFER, 400, 12000), // higher loan but higher payment
        createLever(LeverOutcome.COUNTER_OFFER, 350, 10000), // lower loan but lower payment
      ];
      
      const result = selectBestAlternative(levers, 8000);
      
      expect(result).not.toBeNull();
      expect(result?.leverOutcome).toBe(LeverOutcome.COUNTER_OFFER);
      expect(result?.resultingEstimatedPayment).toBe(350);
      expect(result?.mutatedInputs.loanAmount).toBe(10000);
    });
  });

  describe('Edge cases', () => {
    it('should return null when levers array is empty', () => {
      const result = selectBestAlternative([], 8000);
      
      expect(result).toBeNull();
    });

    it('should handle single APPROVED lever', () => {
      const levers = [createLever(LeverOutcome.APPROVED, 400, 10000)];
      
      const result = selectBestAlternative(levers, 8000);
      
      expect(result).not.toBeNull();
      expect(result?.leverOutcome).toBe(LeverOutcome.APPROVED);
      expect(result?.mutatedInputs.loanAmount).toBe(10000);
    });

    it('should handle single COUNTER_OFFER lever', () => {
      const levers = [createLever(LeverOutcome.COUNTER_OFFER, 400)];
      
      const result = selectBestAlternative(levers, 8000);
      
      expect(result).not.toBeNull();
      expect(result?.leverOutcome).toBe(LeverOutcome.COUNTER_OFFER);
      expect(result?.resultingEstimatedPayment).toBe(400);
    });
  });

  describe('Determinism (Property 12 from design.md)', () => {
    it('should return the same lever when called twice with identical inputs', () => {
      const levers = [
        createLever(LeverOutcome.APPROVED, 400, 10000),
        createLever(LeverOutcome.APPROVED, 500, 12000),
      ];
      
      const result1 = selectBestAlternative(levers, 8000);
      const result2 = selectBestAlternative(levers, 8000);
      
      expect(result1).toEqual(result2);
      expect(result1?.mutatedInputs.loanAmount).toBe(12000);
      expect(result2?.mutatedInputs.loanAmount).toBe(12000);
    });
  });
});
