// src/components/AdverseActionModal.test.tsx
/**
 * Unit tests for AdverseActionModal component.
 * Tests modal rendering with all reason codes, lever display, close behavior,
 * and closed state.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import AdverseActionModal from './AdverseActionModal';
import { Decision, ReasonCode, type EngineResult, type Lever, type SolverResult, LeverType, LeverOutcome } from '../engine/types';

// ============================================================================
// Helper: Create EngineResult for testing
// ============================================================================

function createEngineResult(
  overrides: Partial<EngineResult> = {},
): EngineResult {
  return {
    decision: Decision.DECLINED,
    reasonCode: ReasonCode.HIGH_RISK_SCORE,
    apr: 18.5,
    estimatedPayment: 550.25,
    postLoanDTI: 0.48,
    benchmarkRate: 11.5,
    ...overrides,
  };
}

// ============================================================================
// Helper: Create Lever for testing
// ============================================================================

function createLever(
  overrides: Partial<Lever> = {},
): Lever {
  return {
    leverType: LeverType.EXTEND_TERM,
    payload: { termMonths: 36 },
    mutatedInputs: { termMonths: 36 },
    resultingPostLoanDTI: 0.32,
    resultingEstimatedPayment: 450.50,
    leverOutcome: LeverOutcome.APPROVED,
    displayLabel: 'Extend term to 36 months to reduce monthly payment',
    ...overrides,
  };
}

// ============================================================================
// Helper: Create SolverResult with levers
// ============================================================================

function createSolverResultWithLevers(levers: Lever[] = [createLever()]): SolverResult {
  return {
    levers,
    emptyMessage: null,
  };
}

// ============================================================================
// Helper: Create SolverResult with empty levers
// ============================================================================

function createSolverResultEmpty(emptyMessage: string = 'No levers available'): SolverResult {
  return {
    levers: [],
    emptyMessage,
  };
}

// ============================================================================
// Helper: Get reason code descriptions map for testing
// ============================================================================

const reasonCodeDescriptions: Record<string, string> = {
  HIGH_RISK_SCORE: 'Your credit score is below the minimum required for this loan',
  INSUFFICIENT_INCOME: 'Your income does not meet the minimum threshold',
  EXCESSIVE_DEBT: 'Your existing debt obligations exceed your monthly income',
  HIGH_DTI: 'Adding this loan would bring your total debt payments above 45% of your income',
  LOAN_CAP_EXCEEDED: 'The requested amount exceeds the $15,000 limit for your credit tier',
};

// ============================================================================
// Property 20: AdverseActionModal renders without exception
// ============================================================================

describe('AdverseActionModal', () => {
  it('Property 20: renders without exception for all valid states', () => {
    // Open state with engineResult and solverResult
    render(
      <AdverseActionModal
        open={true}
        engineResult={createEngineResult()}
        solverResult={createSolverResultWithLevers()}
        onClose={vi.fn()}
      />,
    );
    cleanup();

    // Closed state
    render(
      <AdverseActionModal
        open={false}
        engineResult={createEngineResult()}
        solverResult={createSolverResultWithLevers()}
        onClose={vi.fn()}
      />,
    );
    cleanup();

    // Open state with null solverResult
    render(
      <AdverseActionModal
        open={true}
        engineResult={createEngineResult()}
        solverResult={null}
        onClose={vi.fn()}
      />,
    );
    cleanup();
  });

  // ============================================================================
  // Test 14.3.1: Modal rendering with all reason codes
  // ============================================================================

  describe('Modal rendering with all reason codes', () => {
    const reasonCodes: ReasonCode[] = [
      ReasonCode.HIGH_RISK_SCORE,
      ReasonCode.INSUFFICIENT_INCOME,
      ReasonCode.EXCESSIVE_DEBT,
      ReasonCode.HIGH_DTI,
      ReasonCode.LOAN_CAP_EXCEEDED,
    ];

    reasonCodes.forEach((reasonCode) => {
      it(`displays plain-English reason text for ${reasonCode}`, () => {
        const engineResult = createEngineResult({ reasonCode });
        render(
          <AdverseActionModal
            open={true}
            engineResult={engineResult}
            solverResult={createSolverResultWithLevers()}
            onClose={vi.fn()}
          />,
        );

        // Verify modal title renders
        expect(screen.getByText(/why your application was declined/i)).toBeInTheDocument();

        // Verify modal overlay renders
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Get expected description
        const expectedDescription = reasonCodeDescriptions[reasonCode] || 
          'Your application could not be approved based on the information provided.';

        // Verify reason text displays
        expect(screen.getByText(expectedDescription)).toBeInTheDocument();
      });
    });

    it('renders title "WHY YOUR APPLICATION WAS DECLINED"', () => {
      render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/why your application was declined/i)).toBeInTheDocument();
    });

    it('renders modal overlay when open={true}', () => {
      const { container } = render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers()}
          onClose={vi.fn()}
        />,
      );

      // Find the overlay div
      const overlay = container.querySelector('div.bg-gray-900\\/50');
      expect(overlay).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Test 14.3.2: Lever display in modal
  // ============================================================================

  describe('Lever display in modal', () => {
    it('displays levers in a numbered list', () => {
      const levers = [
        createLever({ displayLabel: 'Lever 1' }),
        createLever({ displayLabel: 'Lever 2' }),
      ];
      
      render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers(levers)}
          onClose={vi.fn()}
        />,
      );

      // Verify lever cards render
      expect(screen.getByText(/lever 1/i)).toBeInTheDocument();
      expect(screen.getByText(/lever 2/i)).toBeInTheDocument();

      // Verify numbered indicators (should see "1" and "2")
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays lever description, projected DTI, new monthly payment, and outcome badge', () => {
      const lever = createLever({
        displayLabel: 'Extend term to 36 months',
        resultingPostLoanDTI: 0.32,
        resultingEstimatedPayment: 450.50,
        leverOutcome: LeverOutcome.APPROVED,
      });

      render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers([lever])}
          onClose={vi.fn()}
        />,
      );

      // Verify lever description
      expect(screen.getByText(/extend term to 36 months/i)).toBeInTheDocument();

      // Verify projected DTI (32.0% - DTI is displayed with 1 decimal place)
      expect(screen.getByText(/projected dti after fix:/i)).toBeInTheDocument();
      expect(screen.getByText('32.0%')).toBeInTheDocument();

      // Verify new monthly payment ($451 rounded from 450.50)
      expect(screen.getByText(/new monthly payment:/i)).toBeInTheDocument();
      expect(screen.getByText('\$451/mo')).toBeInTheDocument();

      // Verify outcome badge (Approval)
      expect(screen.getByText(/approval/i)).toBeInTheDocument();
    });

    it('displays "No levers available" message when solverResult.levers is empty', () => {
      render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultEmpty()}
          onClose={vi.fn()}
        />,
      );

      // Verify "Path to Yes" section header
      expect(screen.getByText(/path to yes/i)).toBeInTheDocument();

      // Verify "No levers available" message
      expect(screen.getByText(/no levers available/i)).toBeInTheDocument();
    });

    it('displays custom empty message when solverResult.emptyMessage is provided', () => {
      const customMessage = 'No mathematically feasible path to approval exists.';
      render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultEmpty(customMessage)}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/path to yes/i)).toBeInTheDocument();
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('displays levers in a numbered list', () => {
      const levers = [
        createLever({ displayLabel: 'First lever' }),
        createLever({ displayLabel: 'Second lever' }),
        createLever({ displayLabel: 'Third lever' }),
      ];

      render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers(levers)}
          onClose={vi.fn()}
        />,
      );

      // Verify numbered indicators
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Test 14.3.3: Close button behavior
  // ============================================================================

  describe('Close button behavior', () => {
    it('calls onClose when close button (X icon) is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers()}
          onClose={onClose}
        />,
      );

      // Find close button by X icon
      const closeButtons = screen.getAllByRole('button', { name: /close modal/i });
      expect(closeButtons.length).toBeGreaterThan(0);

      // Click close button
      await user.click(closeButtons[0]);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking on overlay (outside modal content)', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      const { container } = render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers()}
          onClose={onClose}
        />,
      );

      // Find the overlay element (the outer div with bg-gray-900/50)
      const overlay = container.querySelector('div.bg-gray-900\\/50');
      expect(overlay).toBeInTheDocument();

      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onClose when Escape key is pressed', async () => {
      const onClose = vi.fn();

      const { container } = render(
        <AdverseActionModal
          open={true}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers()}
          onClose={onClose}
        />,
      );

      // Get the modal container (the element with onKeyDown handler)
      const modalContainer = container.querySelector('div.bg-gray-900\\/50');
      expect(modalContainer).toBeInTheDocument();

      if (modalContainer) {
        // Create and dispatch a KeyboardEvent directly
        const escapeEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          which: 27,
          keyCode: 27,
          bubbles: true,
        });
        modalContainer.dispatchEvent(escapeEvent);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  // ============================================================================
  // Test 14.3.4: Closed state
  // ============================================================================

  describe('Closed state', () => {
    it('does not render modal content when open={false}', () => {
      const { container } = render(
        <AdverseActionModal
          open={false}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers()}
          onClose={vi.fn()}
        />,
      );

      // When open is false, component returns null
      expect(container.firstChild).toBeNull();
    });

    it('does not display modal title when closed', () => {
      render(
        <AdverseActionModal
          open={false}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText(/why your application was declined/i)).not.toBeInTheDocument();
    });

    it('does not display reason codes when closed', () => {
      render(
        <AdverseActionModal
          open={false}
          engineResult={createEngineResult()}
          solverResult={createSolverResultWithLevers()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText(/your credit score is below/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  // Property 21: AdverseActionModal renders all reason codes without exception
  it('Property 21: renders all ReasonCode values without exception', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(ReasonCode.HIGH_RISK_SCORE),
          fc.constant(ReasonCode.INSUFFICIENT_INCOME),
          fc.constant(ReasonCode.EXCESSIVE_DEBT),
          fc.constant(ReasonCode.HIGH_DTI),
          fc.constant(ReasonCode.LOAN_CAP_EXCEEDED),
        ),
        (reasonCode: ReasonCode) => {
          const engineResult = createEngineResult({ reasonCode });

          render(
            <AdverseActionModal
              open={true}
              engineResult={engineResult}
              solverResult={createSolverResultWithLevers()}
              onClose={vi.fn()}
            />,
          );

          // Verify modal renders without exception
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          cleanup();
        },
      ),
      { numRuns: 5 },
    );
  });

  // Property 22: AdverseActionModal handles various DTI values
  it('Property 22: renders correct DTI percentages for various lever outcomes', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }), // DTI in [10%, 50%]
        fc.boolean(),
        (dti: number, isApproved: boolean) => {
          const outcome = isApproved ? LeverOutcome.APPROVED : LeverOutcome.COUNTER_OFFER;
          const lever = createLever({
            resultingPostLoanDTI: dti,
            leverOutcome: outcome,
          });

          render(
            <AdverseActionModal
              open={true}
              engineResult={createEngineResult()}
              solverResult={createSolverResultWithLevers([lever])}
              onClose={vi.fn()}
            />,
          );

          // DTI should be displayed (rounded to 1 decimal place)
          const expectedDTIPercent = (dti * 100).toFixed(1);
          expect(screen.getByText(/projected dti after fix:/i)).toBeInTheDocument();
          expect(screen.getByText(new RegExp(`${expectedDTIPercent}%`))).toBeInTheDocument();

          cleanup();
        },
      ),
      { numRuns: 20 },
    );
  });

  // Property 23: AdverseActionModal renders all lever types
  it('Property 23: renders all LeverType values without exception', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(LeverType.EXTEND_TERM),
          fc.constant(LeverType.REDUCE_AMOUNT),
          fc.constant(LeverType.PAY_DOWN_DEBT),
          fc.constant(LeverType.CREDIT_SCORE_MILESTONE),
        ),
        (leverType: LeverType) => {
          const lever = createLever({
            leverType,
            displayLabel: `Test lever: ${leverType}`,
          });

          render(
            <AdverseActionModal
              open={true}
              engineResult={createEngineResult()}
              solverResult={createSolverResultWithLevers([lever])}
              onClose={vi.fn()}
            />,
          );

          // Verify lever renders without exception
          expect(screen.getByText(/test lever:/i)).toBeInTheDocument();
          cleanup();
        },
      ),
      { numRuns: 4 },
    );
  });

  // Property 24: AdverseActionModal handles multiple levers correctly
  it('Property 24: renders multiple levers in correct order', () => {
    // Generate a set of test levers with known text
    const testLevers = [
      createLever({
        leverType: LeverType.EXTEND_TERM,
        displayLabel: 'Extend loan term to 60 months',
      }),
      createLever({
        leverType: LeverType.REDUCE_AMOUNT,
        displayLabel: 'Reduce loan amount to 15000',
      }),
      createLever({
        leverType: LeverType.PAY_DOWN_DEBT,
        displayLabel: 'Reduce monthly debt by 500',
      }),
    ];

    render(
      <AdverseActionModal
        open={true}
        engineResult={createEngineResult()}
        solverResult={createSolverResultWithLevers(testLevers)}
        onClose={vi.fn()}
      />,
    );

    // Verify all levers rendered in order
    expect(screen.getByText('Extend loan term to 60 months')).toBeInTheDocument();
    expect(screen.getByText('Reduce loan amount to 15000')).toBeInTheDocument();
    expect(screen.getByText('Reduce monthly debt by 500')).toBeInTheDocument();

    // Verify they appear in correct order
    const elements = screen.getAllByText(/Extend loan term to|Reduce loan amount to|Reduce monthly debt by/);
    expect(elements[0]).toHaveTextContent('Extend loan term to 60 months');
    expect(elements[1]).toHaveTextContent('Reduce loan amount to 15000');
    expect(elements[2]).toHaveTextContent('Reduce monthly debt by 500');

    cleanup();
  });
});
