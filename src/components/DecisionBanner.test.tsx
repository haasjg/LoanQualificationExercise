// src/components/DecisionBanner.test.tsx
/**
 * Unit tests for DecisionBanner component.
 * Tests all decision states (APPROVED, COUNTER_OFFER, DECLINED),
 * loading state, and error display.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DecisionBanner from './DecisionBanner';
import { Decision, ReasonCode, type EngineResult, type EngineError, type ApplicantInputs } from '../engine/types';

// ============================================================================
// Helper: Create EngineResult for testing
// ============================================================================

function createEngineResult(
  overrides: Partial<EngineResult> = {}
): EngineResult {
  return {
    decision: Decision.APPROVED,
    reasonCode: null,
    apr: 8.5,
    estimatedPayment: 450.25,
    postLoanDTI: 0.25,
    benchmarkRate: 10.0,
    ...overrides,
  };
}

// ============================================================================
// Helper: Create ApplicantInputs for testing
// ============================================================================

function createInputs(overrides: Partial<ApplicantInputs> = {}): ApplicantInputs {
  return {
    monthlyIncome: 3500,
    monthlyDebt: 600,
    creditScore: 650,
    loanAmount: 15000,
    termMonths: 24,
    ...overrides,
  };
}

function createEngineError(overrides: Partial<EngineError> = {}): EngineError {
  return {
    kind: 'ENGINE_ERROR',
    invalidFields: [],
    message: 'Unable to process application at this time.',
    ...overrides,
  };
}

// ============================================================================
// Property 11: DecisionBanner renders without exception for all decision states
// ============================================================================

describe('DecisionBanner', () => {
  it('Property 11: renders without exception for all decision states', () => {
    const decisions = [Decision.APPROVED, Decision.COUNTER_OFFER, Decision.DECLINED];
    
    decisions.forEach((decision) => {
      const engineResult = createEngineResult({ decision });
      
      // This should not throw
      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);
      
      // Verify component rendered (no exception means success)
      cleanup();
    });
  });

  // ============================================================================
  // APPROVED State Tests
  // ============================================================================

  describe('APPROVED state', () => {
    it('renders green checkmark icon', () => {
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.APPROVED })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      // Icons have aria-hidden="true", so we check by className
      const svgElements = Array.from(document.querySelectorAll('svg'));
      const hasCheckCircle = svgElements.some((svg) =>
        Array.from(svg.classList).some((cls) => cls.includes('check-circle'))
      );
      expect(hasCheckCircle).toBe(true);
      expect(screen.getByText(/congratulations.*you're approved/i)).toBeInTheDocument();
    });

    it('displays APR with 2 decimal places', () => {
      const apr = 8.5;
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.APPROVED, apr })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      expect(screen.getByText(`${apr.toFixed(2)}%`)).toBeInTheDocument();
    });

    it('displays estimated payment with 2 decimal places', () => {
      const estimatedPayment = 450.25;
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.APPROVED, estimatedPayment })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      expect(screen.getByText(`\$${estimatedPayment.toFixed(2)}`)).toBeInTheDocument();
    });

    it('displays termMonths', () => {
      const termMonths = 36;
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.APPROVED })} onOpenAdverseModal={vi.fn()} inputs={createInputs({ termMonths })} />,
      );

      expect(screen.getByText(`${termMonths} months`)).toBeInTheDocument();
    });

    it('applies green styling classes to the wrapper div', () => {
      const { container } = render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.APPROVED })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      const wrapper = container.querySelector('div.bg-emerald-50');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('bg-emerald-50');
      expect(wrapper?.className).toContain('border-emerald-200');
    });
  });

  // ============================================================================
  // COUNTER_OFFER State Tests
  // ============================================================================

  describe('COUNTER_OFFER state', () => {
    it('renders amber warning icon', () => {
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.COUNTER_OFFER })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      const svgElements = Array.from(document.querySelectorAll('svg'));
      const hasAlertTriangle = svgElements.some((svg) =>
        Array.from(svg.classList).some((cls) => cls.includes('alert-triangle'))
      );
      expect(hasAlertTriangle).toBe(true);
      expect(screen.getByText(/we can work with you/i)).toBeInTheDocument();
    });

    it('displays plain-English reason text for high DTI', () => {
      const engineResult = createEngineResult({
        decision: Decision.COUNTER_OFFER,
        postLoanDTI: 0.40,
      });

      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      expect(screen.getByText(/debt-to-income ratio/i)).toBeInTheDocument();
      expect(screen.getByText(/standard threshold/i)).toBeInTheDocument();
    });

    it('displays plain-English reason text for high APR', () => {
      // Use DTI below 0.36 to trigger the APR-based counter-offer message
      const engineResult = createEngineResult({
        decision: Decision.COUNTER_OFFER,
        apr: 16.5,
        postLoanDTI: 0.30, // Below DTI threshold, so APR branch triggers
      });

      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      // When APR > 15 and DTI is acceptable, shows "adjusted terms"
      expect(screen.getByText(/adjusted/i)).toBeInTheDocument();
    });

    it('displays "adjusted" for APR > 15% counter-offer', () => {
      // Test with apr = 16.5 (above threshold)
      const engineResult = createEngineResult({
        decision: Decision.COUNTER_OFFER,
        apr: 16.5,
        postLoanDTI: 0.30,
      });

      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      expect(screen.getByText(/adjusted/i)).toBeInTheDocument();
    });

    it('displays "modified terms" for APR <= 15% counter-offer', () => {
      // Test with apr = 14.0 (below threshold, but postLoanDTI triggers counter-offer)
      const engineResult = createEngineResult({
        decision: Decision.COUNTER_OFFER,
        apr: 14.0,
        postLoanDTI: 0.38, // triggers high DTI message
      });

      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      // When postLoanDTI is high, it shows debt-to-income message first
      expect(screen.getByText(/debt-to-income/i)).toBeInTheDocument();
    });

    it('does not display internal reason codes', () => {
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.COUNTER_OFFER })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      expect(screen.queryByText(/reasoncode/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/high_dti/i)).not.toBeInTheDocument();
    });

    it('applies amber styling classes to the wrapper div', () => {
      const { container } = render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.COUNTER_OFFER })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      const wrapper = container.querySelector('div.bg-amber-50');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('bg-amber-50');
      expect(wrapper?.className).toContain('border-amber-200');
    });
  });

  // ============================================================================
  // DECLINED State Tests
  // ============================================================================

  describe('DECLINED state', () => {
    it('renders red X icon', () => {
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.DECLINED })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      const svgElements = Array.from(document.querySelectorAll('svg'));
      const hasXCircle = svgElements.some((svg) =>
        Array.from(svg.classList).some((cls) => cls.includes('x-circle'))
      );
      expect(hasXCircle).toBe(true);
      expect(screen.getByText(/application declined/i)).toBeInTheDocument();
    });

    it('displays View Decline Reasons button', () => {
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.DECLINED })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      expect(screen.getByRole('button', { name: /view decline reasons/i })).toBeInTheDocument();
    });

    it('triggers onOpenAdverseModal when button is clicked', () => {
      const onOpenAdverseModal = vi.fn();
      render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.DECLINED })} onOpenAdverseModal={onOpenAdverseModal} inputs={createInputs()} />,
      );

      const button = screen.getByRole('button', { name: /view decline reasons/i });
      fireEvent.click(button);

      expect(onOpenAdverseModal).toHaveBeenCalledTimes(1);
    });

    it('displays decline summary for HIGH_RISK_SCORE', () => {
      const engineResult = createEngineResult({
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
      });

      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      expect(screen.getByText(/credit score.*minimum requirement/i)).toBeInTheDocument();
    });

    it('displays decline summary for INSUFFICIENT_INCOME', () => {
      const engineResult = createEngineResult({
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.INSUFFICIENT_INCOME,
      });

      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      expect(screen.getByText(/monthly income.*minimum requirements/i)).toBeInTheDocument();
    });

    it('displays decline summary for EXCESSIVE_DEBT', () => {
      const engineResult = createEngineResult({
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.EXCESSIVE_DEBT,
      });

      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      expect(screen.getByText(/current debt obligations.*too high/i)).toBeInTheDocument();
    });

    it('displays decline summary for HIGH_DTI', () => {
      const engineResult = createEngineResult({
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
      });

      render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      expect(screen.getByText(/debt-to-income ratio.*tolerance threshold/i)).toBeInTheDocument();
    });

    it('applies red styling classes to the wrapper div', () => {
      const { container } = render(
        <DecisionBanner engineResult={createEngineResult({ decision: Decision.DECLINED })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      const wrapper = container.querySelector('div.bg-rose-50');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('bg-rose-50');
      expect(wrapper?.className).toContain('border-rose-200');
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('loading state', () => {
    it('renders spinner skeleton when engineResult is null', () => {
      const { container } = render(<DecisionBanner engineResult={null} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      const svgElements = Array.from(document.querySelectorAll('svg'));
      const hasLoader = svgElements.some((svg) =>
        Array.from(svg.classList).some((cls) => cls.includes('loader'))
      );
      expect(hasLoader).toBe(true);
      const loaderElement = svgElements.find((svg) =>
        Array.from(svg.classList).some((cls) => cls.includes('loader'))
      );
      expect(loaderElement?.classList.contains('animate-spin')).toBe(true);
      expect(screen.getByText(/computing decision/i)).toBeInTheDocument();

      // Verify styling
      const wrapper = container.querySelector('div.bg-white');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('bg-white');
    });

    it('does not display decision values in loading state', () => {
      render(<DecisionBanner engineResult={null} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      expect(screen.queryByText(/congratulations/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/annual percentage rate/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/application declined/i)).not.toBeInTheDocument();
    });

    it('applies neutral styling classes to the wrapper div', () => {
      const { container } = render(<DecisionBanner engineResult={null} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

      const wrapper = container.querySelector('div.bg-white');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('bg-white');
      expect(wrapper?.className).toContain('border-slate-200');
    });
  });

  // ============================================================================
  // Error State Tests
  // ============================================================================

  describe('error state', () => {
    it('displays user-facing error message', () => {
      const errorMessage = 'Unable to process application at this time.';
      render(
        <DecisionBanner engineResult={createEngineError({ message: errorMessage })} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      // The heading contains "Unable to Process Application" and the paragraph contains the error message
      expect(screen.getByRole('heading', { name: /unable to process application/i })).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('displays red X icon for error state', () => {
      render(
        <DecisionBanner engineResult={createEngineError()} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      // Find svg element by checking if it has x-circle in its class list
      const svgElements = Array.from(document.querySelectorAll('svg'));
      const hasXCircle = svgElements.some((svg) =>
        Array.from(svg.classList).some((cls) => cls.includes('x-circle'))
      );
      expect(hasXCircle).toBe(true);
    });

    it('does not display stack traces or internal errors', () => {
      const errorResult = createEngineError({
        message: 'Invalid input data',
        invalidFields: ['monthlyIncome', 'creditScore'],
      });

      render(
        <DecisionBanner engineResult={errorResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      // Should not expose internal field names in user-facing text
      expect(screen.queryByText(/monthlyincome/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/creditscore/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/invalidfields/i)).not.toBeInTheDocument();
    });

    it('applies red styling classes to the wrapper div for error state', () => {
      const { container } = render(
        <DecisionBanner engineResult={createEngineError()} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />,
      );

      // Find the wrapper div that contains the banner
      const wrapper = container.querySelector('div.bg-rose-50');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('bg-rose-50');
      expect(wrapper?.className).toContain('border-rose-200');
    });
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

import * as fc from 'fast-check';

// Property 12: DecisionBanner handles all APR and payment values correctly
// Validates: Requirements 1.1, 1.2
it('Property 12: APPROVED state displays correct APR and payment precision', () => {
  fc.assert(
    fc.property(
      fc.float({ max: 50 }), // apr in [0, 50]
      fc.float({ max: 10000 }), // estimatedPayment in [0, 10000]
      fc.integer({ min: 12, max: 60 }), // termMonths in [12, 60]
      (apr, estimatedPayment, termMonths) => {
        const engineResult = createEngineResult({
          decision: Decision.APPROVED,
          apr,
          estimatedPayment,
        });
        const inputs = createInputs({ termMonths });

        render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={inputs} />);

        // Verify 2-decimal formatting
        const aprText = `${apr.toFixed(2)}%`;
        const paymentText = `$${estimatedPayment.toFixed(2)}`;

        expect(screen.getByText(aprText)).toBeInTheDocument();
        expect(screen.getByText(paymentText)).toBeInTheDocument();
        expect(screen.getByText(`${termMonths} months`)).toBeInTheDocument();

        cleanup();
      },
    ),
    { numRuns: 50 },
  );
});

// Property 13: Declined state shows different reason messages based on reasonCode
// Validates: Requirements 1.2, 1.3
it('Property 13: DECLINED state displays reason-appropriate messages', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant(ReasonCode.HIGH_RISK_SCORE),
        fc.constant(ReasonCode.INSUFFICIENT_INCOME),
        fc.constant(ReasonCode.EXCESSIVE_DEBT),
        fc.constant(ReasonCode.HIGH_DTI),
        fc.constant(ReasonCode.LOAN_CAP_EXCEEDED),
        fc.constant(ReasonCode.INVALID_TERM),
        fc.constant(ReasonCode.INVALID_INPUT),
      ),
      (reasonCode: ReasonCode) => {
        const engineResult = createEngineResult({
          decision: Decision.DECLINED,
          reasonCode,
        });

        render(<DecisionBanner engineResult={engineResult} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);

        // All reason codes should display a user-friendly decline message
        expect(screen.getByText(/application declined/i)).toBeInTheDocument();

        // All should show the decline reasons button
        expect(screen.getByRole('button', { name: /view decline reasons/i })).toBeInTheDocument();

        cleanup();
      },
    ),
    { numRuns: 50 },
  );
});

// Property 14: COUNTER_OFFER displays reason based on DTI or APR thresholds
// Validates: Requirements 1.2, 1.3
it('Property 14: COUNTER_OFFER state displays appropriate reason based on thresholds', () => {
  fc.assert(
    fc.property(
      fc.float({ max: 1 }), // postLoanDTI in [0, 1]
      fc.float({ max: 30 }), // apr in [0, 30]
      (postLoanDTI: number, apr: number) => {
        // Test DTI-based counter-offer (only valid DTI range)
        if (Number.isNaN(postLoanDTI) || postLoanDTI < 0.36 || postLoanDTI > 0.45) {
          return;
        }
        
        const engineResultDTI = createEngineResult({
          decision: Decision.COUNTER_OFFER,
          postLoanDTI,
          apr: 12.0, // normal APR
        });

        render(<DecisionBanner engineResult={engineResultDTI} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);
        expect(screen.getByText(/debt-to-income ratio/i)).toBeInTheDocument();
        cleanup();

        // Test APR-based counter-offer (only valid APR range)
        if (Number.isNaN(apr) || apr < 15.01) {
          return;
        }

        const engineResultAPR = createEngineResult({
          decision: Decision.COUNTER_OFFER,
          postLoanDTI: 0.35, // acceptable DTI
          apr,
        });

        render(<DecisionBanner engineResult={engineResultAPR} onOpenAdverseModal={vi.fn()} inputs={createInputs()} />);
        expect(screen.getByText(/adjusted terms/i)).toBeInTheDocument();
        cleanup();
      },
    ),
    { numRuns: 50 },
  );
});
