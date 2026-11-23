// src/components/PathToYesChecklist.test.tsx
/**
 * Unit tests for PathToYesChecklist component.
 * Tests rendering with levers, empty state, hidden state (APPROVED),
 * and LeverCard interactions.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import PathToYesChecklist from './PathToYesChecklist';
import { Lever, LeverType, LeverOutcome } from '../engine/types';

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

function createSolverResultWithLevers(levers: Lever[] = [createLever()]): {
  levers: Lever[];
  emptyMessage: string | null;
} {
  return {
    levers,
    emptyMessage: null,
  };
}

// ============================================================================
// Helper: Create SolverResult with empty levers and custom message
// ============================================================================

function createSolverResultEmpty(emptyMessage: string = 'No levers available'): {
  levers: Lever[];
  emptyMessage: string | null;
} {
  return {
    levers: [],
    emptyMessage,
  };
}

// ============================================================================
// Property 15: PathToYesChecklist renders without exception
// ============================================================================

describe('PathToYesChecklist', () => {
  it('Property 15: renders without exception for all valid states', () => {
    // This should not throw
    render(
      <PathToYesChecklist
        solverResult={createSolverResultWithLevers()}
        onApplyFix={vi.fn()}
      />,
    );
    cleanup();

    // Empty state
    render(
      <PathToYesChecklist
        solverResult={createSolverResultEmpty()}
        onApplyFix={vi.fn()}
      />,
    );
    cleanup();

    // Hidden state (null)
    render(
      <PathToYesChecklist solverResult={null} onApplyFix={vi.fn()} />,
    );
    cleanup();
  });

  // ============================================================================
  // Test 12.3.1: Rendering with levers
  // ============================================================================

  describe('Rendering with levers', () => {
    it('renders PATH TO YES header', () => {
      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers()}
          onApplyFix={vi.fn()}
        />,
      );

      expect(screen.getByText(/path to yes/i)).toBeInTheDocument();
    });

    it('renders subtext about improving approval chances', () => {
      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers()}
          onApplyFix={vi.fn()}
        />,
      );

      expect(screen.getByText(/improve your loan approval chances/i)).toBeInTheDocument();
    });

    it('renders each LeverCard with correct props', () => {
      const levers = [
        createLever({
          leverType: LeverType.EXTEND_TERM,
          displayLabel: 'Extend term to 36 months',
          resultingPostLoanDTI: 0.32,
          resultingEstimatedPayment: 450.50,
        }),
        createLever({
          leverType: LeverType.REDUCE_AMOUNT,
          displayLabel: 'Reduce loan amount to 12000',
          resultingPostLoanDTI: 0.30,
          resultingEstimatedPayment: 350.00,
        }),
      ];

      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers(levers)}
          onApplyFix={vi.fn()}
        />,
      );

      // Verify both lever cards render
      expect(screen.getByText(/extend term to 36 months/i)).toBeInTheDocument();
      expect(screen.getByText(/reduce loan amount to 12000/i)).toBeInTheDocument();

      // Verify DTI and payment displays
      // DTI is rendered in separate nodes: "New DTI: " + "32.0" + "%"
      // There are 2 levers, so we should find 2 "New DTI:" elements
      const dtiLabels = screen.getAllByText(/new dti:/i);
      expect(dtiLabels).toHaveLength(2);
      // Check that both DTI value nodes are present (32.0 and 30.0)
      expect(screen.getByText(/32\.0/i)).toBeInTheDocument();
      expect(screen.getByText(/30\.0/i)).toBeInTheDocument();
      // Check that % symbol is present (appears in DTI and button)
      const percentElements = screen.getAllByText(/%/i);
      expect(percentElements.length).toBeGreaterThan(0);
      // Payment format: "Estimated Payment: $451/mo" (rounded to nearest dollar)
      // There should be 2 payment displays
      const paymentLabels = screen.getAllByText(/estimated payment:/i);
      expect(paymentLabels).toHaveLength(2);
      // Check for payment values (350 and 451)
      expect(screen.getByText(/451/i)).toBeInTheDocument();
      expect(screen.getByText(/350/i)).toBeInTheDocument();
      // mo appears in payment displays
      const moElements = screen.getAllByText(/mo/i);
      expect(moElements.length).toBeGreaterThanOrEqual(2);
    });

    it('displays green icon and styling for APPROVED outcome', () => {
      const lever = createLever({
        leverOutcome: LeverOutcome.APPROVED,
        displayLabel: 'Green lever - Test',
      });

      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers([lever])}
          onApplyFix={vi.fn()}
        />,
      );

      // Find the card container by looking for the green border class
      const greenCards = document.querySelectorAll('div.border-green-200');
      expect(greenCards.length).toBeGreaterThan(0);
    });

    it('displays amber styling for COUNTER_OFFER outcome', () => {
      const lever = createLever({
        leverOutcome: LeverOutcome.COUNTER_OFFER,
        displayLabel: 'Amber lever - Test',
        resultingPostLoanDTI: 0.40,
      });

      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers([lever])}
          onApplyFix={vi.fn()}
        />,
      );

      // Find the card container by looking for the amber border class
      const amberCards = document.querySelectorAll('div.border-amber-200');
      expect(amberCards.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Test 12.3.2: Empty state rendering
  // ============================================================================

  describe('Empty state rendering', () => {
    it('renders empty message when levers array is empty', () => {
      const customMessage = 'No mathematically feasible path to approval exists.';
      render(
        <PathToYesChecklist
          solverResult={createSolverResultEmpty(customMessage)}
          onApplyFix={vi.fn()}
        />,
      );

      expect(screen.getByText(/path to yes/i)).toBeInTheDocument();
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('renders default "No levers available" when emptyMessage is null', () => {
      render(
        <PathToYesChecklist
          solverResult={createSolverResultEmpty(null)}
          onApplyFix={vi.fn()}
        />,
      );

      expect(screen.getByText(/path to yes/i)).toBeInTheDocument();
      expect(screen.getByText(/no levers available/i)).toBeInTheDocument();
    });

    it('renders information icon in empty state', () => {
      render(
        <PathToYesChecklist
          solverResult={createSolverResultEmpty()}
          onApplyFix={vi.fn()}
        />,
      );

      // Check for info icon (svg with circle path)
      const svgElements = Array.from(document.querySelectorAll('svg'));
      const hasInfoIcon = svgElements.some((svg) => {
        const paths = Array.from(svg.querySelectorAll('path'));
        return paths.some((path) => path.getAttribute('d')?.includes('M13 16'));
      });
      expect(hasInfoIcon).toBe(true);
    });
  });

  // ============================================================================
  // Test 12.3.3: Hidden state for APPROVED
  // ============================================================================

  describe('Hidden state for APPROVED', () => {
    it('returns null when solverResult is null', () => {
      const { container } = render(
        <PathToYesChecklist solverResult={null} onApplyFix={vi.fn()} />,
      );

      // When component returns null, container should be empty
      expect(container.firstChild).toBeNull();
    });

    it('renders empty state when solverResult.levers is empty array', () => {
      const { container } = render(
        <PathToYesChecklist
          solverResult={createSolverResultEmpty()}
          onApplyFix={vi.fn()}
        />,
      );

      // Component renders empty state UI (div), not null
      expect(container.firstChild).not.toBeNull();
      expect(screen.getByText(/path to yes/i)).toBeInTheDocument();
      expect(screen.getByText(/no levers available/i)).toBeInTheDocument();
    });

    it('does not render PATH TO YES header when hidden', () => {
      render(
        <PathToYesChecklist solverResult={null} onApplyFix={vi.fn()} />,
      );

      expect(screen.queryByText(/path to yes/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Test 12.3.4: LeverCard interaction
  // ============================================================================

  describe('LeverCard interaction', () => {
    it('triggers onApplyFix callback with correct lever when "Apply This Fix" is clicked', () => {
      const mockOnApplyFix = vi.fn();

      const lever1 = createLever({
        leverType: LeverType.EXTEND_TERM,
        payload: { termMonths: 36 },
        displayLabel: 'Lever 1 - Extend term to 36 months',
      });

      const lever2 = createLever({
        leverType: LeverType.REDUCE_AMOUNT,
        payload: { loanAmount: 12000 },
        displayLabel: 'Lever 2 - Reduce loan amount to 12000',
      });

      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers([lever1, lever2])}
          onApplyFix={mockOnApplyFix}
        />,
      );

      // Find all "Apply This Fix" buttons
      const buttons = screen.getAllByRole('button', { name: /apply this fix/i });

      // Click first button (apply lever1)
      fireEvent.click(buttons[0]);

      expect(mockOnApplyFix).toHaveBeenCalledTimes(1);
      expect(mockOnApplyFix).toHaveBeenCalledWith(lever1);

      // Click second button (apply lever2)
      fireEvent.click(buttons[1]);

      expect(mockOnApplyFix).toHaveBeenCalledTimes(2);
      expect(mockOnApplyFix).toHaveBeenCalledWith(lever2);
    });

    it('displays lever outcome badge (Leads to Approval / Leads to Counter-Offer)', () => {
      const approvedLever = createLever({
        leverOutcome: LeverOutcome.APPROVED,
        displayLabel: 'Test approved outcome',
      });

      const counterLever = createLever({
        leverOutcome: LeverOutcome.COUNTER_OFFER,
        displayLabel: 'Test counter-offer outcome',
      });

      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers([approvedLever, counterLever])}
          onApplyFix={vi.fn()}
        />,
      );

      expect(screen.getByText(/test approved outcome/i)).toBeInTheDocument();
      expect(screen.getByText(/test counter-offer outcome/i)).toBeInTheDocument();
      expect(screen.getByText(/leads to approval/i)).toBeInTheDocument();
      expect(screen.getByText(/leads to counter-offer/i)).toBeInTheDocument();
    });

    it('shows new DTI percentage for each lever', () => {
      const lever = createLever({
        resultingPostLoanDTI: 0.2856, // Should display as 28.6%
      });

      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers([lever])}
          onApplyFix={vi.fn()}
        />,
      );

      const dtiLabel = screen.getByText(/new dti:/i);
      expect(dtiLabel).toBeInTheDocument();
      expect(screen.getByText(/28\.6/i)).toBeInTheDocument();
      expect(screen.getByText(/estimated payment:/i)).toBeInTheDocument();
      expect(screen.getByText(/451/i)).toBeInTheDocument();
    });

    it('shows estimated payment in monthly format', () => {
      const lever = createLever({
        resultingEstimatedPayment: 1234.567,
      });

      render(
        <PathToYesChecklist
          solverResult={createSolverResultWithLevers([lever])}
          onApplyFix={vi.fn()}
        />,
      );

      expect(screen.getByText(/estimated payment:/i)).toBeInTheDocument();
      expect(screen.getByText(/1,235/i)).toBeInTheDocument();
      expect(screen.getAllByText(/mo/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  // Property 16: PathToYesChecklist renders all lever types correctly
  it('Property 16: renders all LeverType values without exception', () => {
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
            <PathToYesChecklist
              solverResult={createSolverResultWithLevers([lever])}
              onApplyFix={vi.fn()}
            />,
          );

          // Verify lever renders without exception
          expect(screen.getByText(/test lever:/i)).toBeInTheDocument();
          cleanup();
        },
      ),
      { numRuns: 10 },
    );
  });

  // Property 17: PathToYesChecklist handles various DTI values
  it('Property 17: renders correct DTI percentages for various values', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }), // DTI in [10%, 50%]
        (dti: number) => {
          const lever = createLever({
            resultingPostLoanDTI: dti,
          });

          render(
            <PathToYesChecklist
              solverResult={createSolverResultWithLevers([lever])}
              onApplyFix={vi.fn()}
            />,
          );

          // DTI is rendered in separate nodes
          expect(screen.getByText(/new dti:/i)).toBeInTheDocument();
          expect(screen.getByText(/%$/i)).toBeInTheDocument();
          cleanup();
        },
      ),
      { numRuns: 50 },
    );
  });

  // Property 18: PathToYesChecklist displays all lever outcomes
  it('Property 18: renders appropriate outcome text for all LeverOutcome values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(LeverOutcome.APPROVED),
          fc.constant(LeverOutcome.COUNTER_OFFER),
        ),
        (outcome: LeverOutcome) => {
          const lever = createLever({
            leverOutcome: outcome,
            displayLabel: `Test outcome: ${outcome}`,
          });

          render(
            <PathToYesChecklist
              solverResult={createSolverResultWithLevers([lever])}
              onApplyFix={vi.fn()}
            />,
          );

          // Both outcomes should render in the UI
          expect(screen.getByText(/test outcome:/i)).toBeInTheDocument();

          if (outcome === LeverOutcome.APPROVED) {
            expect(screen.getByText(/leads to approval/i)).toBeInTheDocument();
          } else {
            expect(screen.getByText(/leads to counter-offer/i)).toBeInTheDocument();
          }

          cleanup();
        },
      ),
      { numRuns: 2 },
    );
  });

  // Property 19: Multiple levers render in correct order
  it('Property 19: renders multiple levers in the order provided', () => {
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
      <PathToYesChecklist
        solverResult={createSolverResultWithLevers(testLevers)}
        onApplyFix={vi.fn()}
      />,
    );

    // Verify all levers rendered in order
    expect(screen.getByText('Extend loan term to 60 months')).toBeInTheDocument();
    expect(screen.getByText('Reduce loan amount to 15000')).toBeInTheDocument();
    expect(screen.getByText('Reduce monthly debt by 500')).toBeInTheDocument();

    // Verify they appear in correct order (by checking the DOM order)
    const elements = screen.getAllByText(/Extend loan term to|Reduce loan amount to|Reduce monthly debt by/);
    expect(elements[0]).toHaveTextContent('Extend loan term to 60 months');
    expect(elements[1]).toHaveTextContent('Reduce loan amount to 15000');
    expect(elements[2]).toHaveTextContent('Reduce monthly debt by 500');

    cleanup();
  });
});
