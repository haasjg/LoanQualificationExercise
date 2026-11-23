import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstimateStep } from './EstimateStep';
import { Decision, LeverType, LeverOutcome } from '../../engine/types';

describe('EstimateStep - Undo Functionality (Task 8.3)', () => {
  const mockEngineResult = {
    decision: Decision.APPROVED,
    apr: 12.50,
    estimatedPayment: 300.45,
    postLoanDTI: 0.30,
  };

  const mockBestAlternative = {
    leverType: LeverType.EXTEND_TERM,
    mutatedInputs: { termMonths: 48 },
    resultingEstimatedPayment: 250.00,
    resultingPostLoanDTI: 0.28,
    leverOutcome: LeverOutcome.APPROVED,
  };

  it('should not show Undo button when showUndo is false', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={10000}
        termMonths={36}
        bestAlternative={mockBestAlternative}
        showUndo={false}
        onCompareTerms={vi.fn()}
        onEditDetails={vi.fn()}
        onBack={vi.fn()}
        onStartOver={vi.fn()}
        onUndo={vi.fn()}
      />
    );

    expect(screen.queryByText(/undo/i)).not.toBeInTheDocument();
  });

  it('should show Undo button when showUndo is true', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={10000}
        termMonths={36}
        bestAlternative={mockBestAlternative}
        showUndo={true}
        onCompareTerms={vi.fn()}
        onEditDetails={vi.fn()}
        onBack={vi.fn()}
        onStartOver={vi.fn()}
        onUndo={vi.fn()}
      />
    );

    expect(screen.getByText(/undo/i)).toBeInTheDocument();
  });

  it('should call onUndo when Undo button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnUndo = vi.fn();

    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={10000}
        termMonths={36}
        bestAlternative={mockBestAlternative}
        showUndo={true}
        onCompareTerms={vi.fn()}
        onEditDetails={vi.fn()}
        onBack={vi.fn()}
        onStartOver={vi.fn()}
        onUndo={mockOnUndo}
      />
    );

    const undoButton = screen.getByText(/undo/i);
    await user.click(undoButton);

    expect(mockOnUndo).toHaveBeenCalledTimes(1);
  });

  it('should render Undo button with correct styling', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={10000}
        termMonths={36}
        bestAlternative={mockBestAlternative}
        showUndo={true}
        onCompareTerms={vi.fn()}
        onEditDetails={vi.fn()}
        onBack={vi.fn()}
        onStartOver={vi.fn()}
        onUndo={vi.fn()}
      />
    );

    const undoButton = screen.getByText(/undo/i);
    expect(undoButton).toHaveClass('text-indigo-600');
  });
});
