import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstimateStep, orderLeversForDisplay } from './EstimateStep';
import { Decision, ReasonCode, LeverType, LeverOutcome, Lever, ApplicantInputs } from '../../engine/types';

describe('EstimateStep - Giant Payment Display (Task 11.2)', () => {
  const mockEngineResult = {
    decision: Decision.APPROVED,
    apr: 11.50,
    estimatedPayment: 456.78,
    postLoanDTI: 0.30,
  };

  const mockLoanAmount = 10000;
  const mockTermMonths = 24;

  const mockHandlers = {
    onEditDetails: vi.fn(),
    onBack: vi.fn(),
    onStartOver: vi.fn(),
  };

  it('should render giant payment display with correct formatting', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    // Check for the payment amount
    expect(screen.getByText('$456.78')).toBeInTheDocument();
    // Check for the /mo suffix
    expect(screen.getByText('/mo')).toBeInTheDocument();
    // Check for the header text
    expect(screen.getByText('Your estimated monthly payment')).toBeInTheDocument();
  });

  it('should display loan details below the giant payment', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    // Check for loan details line
    expect(screen.getByText(/\$10,000.*24 months.*11\.50% APR/)).toBeInTheDocument();
  });

  it('should format payment with two decimal places', () => {
    const resultWithRoundPayment = {
      ...mockEngineResult,
      estimatedPayment: 500,
    };

    render(
      <EstimateStep
        engineResult={resultWithRoundPayment}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('$500.00')).toBeInTheDocument();
  });
});

describe('EstimateStep - QuietStatusBadge Integration (Task 11.2)', () => {
  const mockLoanAmount = 10000;
  const mockTermMonths = 24;

  const mockHandlers = {
    onEditDetails: vi.fn(),
    onBack: vi.fn(),
    onStartOver: vi.fn(),
  };

  it('should render QuietStatusBadge for approved decision', () => {
    const approvedResult = {
      decision: Decision.APPROVED,
      apr: 9.50,
      estimatedPayment: 400,
      postLoanDTI: 0.30,
    };

    render(
      <EstimateStep
        engineResult={approvedResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    // QuietStatusBadge should show approved status
    expect(screen.getByText(/meet our standard criteria/i)).toBeInTheDocument();
  });

  it('should render QuietStatusBadge for counter-offer decision', () => {
    const counterOfferResult = {
      decision: Decision.COUNTER_OFFER,
      apr: 11.50,
      estimatedPayment: 400,
      postLoanDTI: 0.40,
    };

    render(
      <EstimateStep
        engineResult={counterOfferResult}
        loanAmount={mockLoanAmount}
        termMonths={24}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    // QuietStatusBadge should show counter-offer context
    expect(screen.getByText(/36-month term.*monthly payment could be lower/i)).toBeInTheDocument();
  });

  it('should render QuietStatusBadge for declined decision', () => {
    const declinedResult = {
      decision: Decision.DECLINED,
      apr: 16.50,
      estimatedPayment: 500,
      postLoanDTI: 0.50,
    };

    render(
      <EstimateStep
        engineResult={declinedResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    // QuietStatusBadge should show declined status
    expect(screen.getByText(/monthly debt would exceed our criteria/i)).toBeInTheDocument();
  });

  it('should pass decision and reasonCode to QuietStatusBadge', () => {
    const resultWithReasonCode = {
      decision: Decision.DECLINED,
      apr: 16.50,
      estimatedPayment: 500,
      postLoanDTI: 0.50,
      reasonCode: 'DTI_EXCEEDED',
    };

    render(
      <EstimateStep
        engineResult={resultWithReasonCode}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    // The component should handle reasonCode properly
    expect(screen.getByText(/monthly debt would exceed our criteria/i)).toBeInTheDocument();
  });
});

describe('EstimateStep - Your options lever cards (Task 14.1)', () => {
  const mockEngineResult = {
    decision: Decision.COUNTER_OFFER,
    apr: 11.50,
    estimatedPayment: 400,
    postLoanDTI: 0.40,
  };

  const currentInputs: ApplicantInputs = {
    monthlyIncome: 4000,
    monthlyDebt: 800,
    creditScore: 680,
    loanAmount: 10000,
    termMonths: 24,
  };

  const extendTermLever: Lever = {
    leverType: LeverType.EXTEND_TERM,
    payload: { leverType: LeverType.EXTEND_TERM, newTermMonths: 36 },
    mutatedInputs: { termMonths: 36 },
    resultingPostLoanDTI: 0.35,
    resultingEstimatedPayment: 300,
    leverOutcome: LeverOutcome.APPROVED,
    displayLabel: 'Extend term to 36 months',
  };

  const reduceAmountLever: Lever = {
    leverType: LeverType.REDUCE_AMOUNT,
    payload: { leverType: LeverType.REDUCE_AMOUNT, newLoanAmount: 8000 },
    mutatedInputs: { loanAmount: 8000 },
    resultingPostLoanDTI: 0.34,
    resultingEstimatedPayment: 320,
    leverOutcome: LeverOutcome.APPROVED,
    displayLabel: 'Reduce loan to $8,000',
  };

  const mockHandlers = {
    onEditDetails: vi.fn(),
    onBack: vi.fn(),
    onStartOver: vi.fn(),
  };

  const renderStep = (levers: Lever[]) =>
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={10000}
        termMonths={24}
        allLevers={levers}
        currentInputs={currentInputs}
        onCompareLever={vi.fn()}
        {...mockHandlers}
      />
    );

  it('renders the "Your options" heading when levers exist', () => {
    renderStep([extendTermLever]);
    const heading = screen.getByText('Your options');
    expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-slate-900');
  });

  it('renders one LeverOptionCard per lever', () => {
    renderStep([extendTermLever, reduceAmountLever]);
    expect(screen.getAllByTestId('lever-option-card')).toHaveLength(2);
    expect(screen.getByText('Extend term to 36 months')).toBeInTheDocument();
    expect(screen.getByText('Reduce loan to $8,000')).toBeInTheDocument();
  });

  it('uses stacked mobile and two-column desktop layout', () => {
    renderStep([extendTermLever, reduceAmountLever]);
    const grid = screen.getAllByTestId('lever-option-card')[0].parentElement;
    expect(grid).toHaveClass('space-y-4', 'md:grid', 'md:grid-cols-2', 'md:gap-6', 'md:space-y-0');
  });

  it('marks no card as recommended when none is provided', () => {
    renderStep([extendTermLever, reduceAmountLever]);
    expect(screen.queryByTestId('lever-recommended-badge')).not.toBeInTheDocument();
  });
  it('places the recommended lever first and badges only it', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={10000}
        termMonths={24}
        allLevers={[extendTermLever, reduceAmountLever]}
        recommendedLever={reduceAmountLever}
        currentInputs={currentInputs}
        onCompareLever={vi.fn()}
        {...mockHandlers}
      />
    );
    const cards = screen.getAllByTestId('lever-option-card');
    expect(cards[0]).toHaveTextContent('Reduce loan to $8,000');
    expect(screen.getAllByTestId('lever-recommended-badge')).toHaveLength(1);
    expect(cards[0]).toContainElement(screen.getByTestId('lever-recommended-badge'));
  });
  it('orderLeversForDisplay caps at 4 and keeps solver order for the rest', () => {
    const mk = (t: LeverType): Lever => ({ ...extendTermLever, leverType: t });
    const levers = [
      mk('A' as LeverType), mk('B' as LeverType), mk('C' as LeverType),
      mk('D' as LeverType), mk('E' as LeverType),
    ];
    const out = orderLeversForDisplay(levers, levers[4]);
    expect(out.map((l) => l.leverType)).toEqual(['E', 'A', 'B', 'C']);
  });
  it('does not render the old single comparison CTA', () => {
    renderStep([extendTermLever]);
    expect(screen.queryByText('Compare a 36-month term')).not.toBeInTheDocument();
  });

  it('does not render the options section without levers', () => {
    renderStep([]);
    expect(screen.queryByText('Your options')).not.toBeInTheDocument();
  });

  describe('empty state (Task 14.3)', () => {
    it('shows the empty state for COUNTER_OFFER with no levers', () => {
      renderStep([]);
      expect(screen.getByTestId('no-levers-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No automatic adjustments available')).toBeInTheDocument();
      expect(
        screen.getByText(/Try changing your loan amount, term, or financial details/)
      ).toBeInTheDocument();
    });

    it('is hidden for APPROVED', () => {
      render(
        <EstimateStep
          engineResult={{ ...mockEngineResult, decision: Decision.APPROVED }}
          loanAmount={10000}
          termMonths={24}
          allLevers={[]}
          currentInputs={currentInputs}
          {...mockHandlers}
        />
      );
      expect(screen.queryByTestId('no-levers-empty-state')).not.toBeInTheDocument();
    });

    it('is hidden when levers exist', () => {
      renderStep([extendTermLever]);
      expect(screen.queryByTestId('no-levers-empty-state')).not.toBeInTheDocument();
    });

    it('Edit details button calls onEditDetails', async () => {
      const onEditDetails = vi.fn();
      render(
        <EstimateStep
          engineResult={mockEngineResult}
          loanAmount={10000}
          termMonths={24}
          allLevers={[]}
          currentInputs={currentInputs}
          onBack={vi.fn()}
          onStartOver={vi.fn()}
          onEditDetails={onEditDetails}
        />
      );
      const button = within(screen.getByTestId('no-levers-empty-state')).getByRole('button', {
        name: 'Edit details',
      });
      expect(button).toHaveClass('border-2', 'border-slate-300', 'min-h-11', 'focus:ring-2');
      await userEvent.setup().click(button);
      expect(onEditDetails).toHaveBeenCalledTimes(1);
    });
  });
});

describe('EstimateStep - Giant Payment Display (Task 11.2)', () => {
  const mockEngineResult = {
    decision: Decision.APPROVED,
    apr: 11.50,
    estimatedPayment: 456.78,
    postLoanDTI: 0.30,
  };

  const mockLoanAmount = 10000;
  const mockTermMonths = 24;

  const mockHandlers = {
    onEditDetails: vi.fn(),
    onBack: vi.fn(),
    onStartOver: vi.fn(),
  };

  it('should render giant payment display with correct formatting', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    // Check for the payment amount
    expect(screen.getByText('$456.78')).toBeInTheDocument();
    // Check for the /mo suffix
    expect(screen.getByText('/mo')).toBeInTheDocument();
    // Check for the header text
    expect(screen.getByText('Your estimated monthly payment')).toBeInTheDocument();
  });

  it('should display loan details below the giant payment', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    // Check for loan details line
    expect(screen.getByText(/\$10,000.*24 months.*11\.50% APR/)).toBeInTheDocument();
  });

  it('should format payment with two decimal places', () => {
    const resultWithRoundPayment = {
      ...mockEngineResult,
      estimatedPayment: 500,
    };

    render(
      <EstimateStep
        engineResult={resultWithRoundPayment}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('$500.00')).toBeInTheDocument();
  });
});

describe('EstimateStep - Secondary Actions and Footer (Task 5.4)', () => {
  const mockEngineResult = {
    decision: Decision.COUNTER_OFFER,
    apr: 11.50,
    estimatedPayment: 400,
    postLoanDTI: 0.40,
  };

  const mockLoanAmount = 10000;
  const mockTermMonths = 24;

  const mockHandlers = {
    onEditDetails: vi.fn(),
    onBack: vi.fn(),
    onStartOver: vi.fn(),
  };

  it('should display "Edit details" as a text link, not a button', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    const editLink = screen.getByText('Edit details');
    expect(editLink).toBeInTheDocument();
    // Should have text link styling (indigo-600, hover:underline)
    expect(editLink).toHaveClass('text-indigo-600');
    expect(editLink).toHaveClass('hover:underline');
    // Should NOT have button styling (border, full-width)
    expect(editLink).not.toHaveClass('w-full');
    expect(editLink).not.toHaveClass('border-2');
  });

  it('should display "Start over" as a text link', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    const startOverLink = screen.getByText('Start over');
    expect(startOverLink).toBeInTheDocument();
    // Should have text link styling
    expect(startOverLink).toHaveClass('text-indigo-600');
    expect(startOverLink).toHaveClass('hover:underline');
  });

  it('should call onEditDetails when "Edit details" link is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    const editLink = screen.getByText('Edit details');
    await user.click(editLink);

    expect(mockHandlers.onEditDetails).toHaveBeenCalledTimes(1);
  });

  it('should call onStartOver when "Start over" link is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    const startOverLink = screen.getByText('Start over');
    await user.click(startOverLink);

    expect(mockHandlers.onStartOver).toHaveBeenCalledTimes(1);
  });

  it('should display "Simulated estimate" disclaimer in text-xs slate-500', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    const disclaimer = screen.getByText('Simulated estimate');
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveClass('text-xs');
    expect(disclaimer).toHaveClass('text-slate-500');
  });

  it('should position secondary actions in a horizontal layout with gap', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    const editLink = screen.getByText('Edit details');
    const startOverLink = screen.getByText('Start over');
    
    // Both links should be in the same container
    const container = editLink.closest('div');
    expect(container).toContain(startOverLink);
    
    // Container should have flex layout with gap
    expect(container).toHaveClass('flex');
    expect(container).toHaveClass('gap-6');
  });
});

describe('EstimateStep - Undo Button Conditional Display (Task 11.2)', () => {
  const mockEngineResult = {
    decision: Decision.COUNTER_OFFER,
    apr: 11.50,
    estimatedPayment: 400,
    postLoanDTI: 0.40,
  };

  const mockLoanAmount = 10000;
  const mockTermMonths = 24;

  const mockHandlers = {
    onEditDetails: vi.fn(),
    onBack: vi.fn(),
    onStartOver: vi.fn(),
    onUndo: vi.fn(),
  };

  it('should not display undo button when showUndo is false', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        showUndo={false}
        {...mockHandlers}
      />
    );

    expect(screen.queryByText('Undo')).not.toBeInTheDocument();
  });

  it('should not display undo button when showUndo is undefined (default)', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        {...mockHandlers}
      />
    );

    expect(screen.queryByText('Undo')).not.toBeInTheDocument();
  });

  it('should display undo button when showUndo is true', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        showUndo={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('should call onUndo when undo button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        showUndo={true}
        {...mockHandlers}
      />
    );

    const undoButton = screen.getByText('Undo');
    await user.click(undoButton);

    expect(mockHandlers.onUndo).toHaveBeenCalledTimes(1);
  });

  it('should style undo button as text link with indigo-600', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        showUndo={true}
        {...mockHandlers}
      />
    );

    const undoButton = screen.getByText('Undo');
    expect(undoButton).toHaveClass('text-indigo-600');
    expect(undoButton).toHaveClass('hover:underline');
  });

  it('should position undo button between edit details and start over', () => {
    render(
      <EstimateStep
        engineResult={mockEngineResult}
        loanAmount={mockLoanAmount}
        termMonths={mockTermMonths}
        bestAlternative={null}
        showUndo={true}
        {...mockHandlers}
      />
    );

    const editLink = screen.getByText('Edit details');
    const undoButton = screen.getByText('Undo');
    const startOverLink = screen.getByText('Start over');
    
    // All three should be in the same container
    const container = editLink.closest('div');
    expect(container).toContain(undoButton);
    expect(container).toContain(startOverLink);
  });
});

describe('EstimateStep - ConversionView for declined (Task 16.1)', () => {
  const inputs: ApplicantInputs = {
    monthlyIncome: 4000,
    monthlyDebt: 800,
    creditScore: 550,
    loanAmount: 10000,
    termMonths: 24,
  };

  const handlers = {
    onEditDetails: vi.fn(),
    onBack: vi.fn(),
    onStartOver: vi.fn(),
  };

  it('renders ConversionView and not the giant payment when DECLINED', () => {
    render(
      <EstimateStep
        engineResult={{
          decision: Decision.DECLINED,
          reasonCode: ReasonCode.HIGH_RISK_SCORE,
          apr: 16.5,
          estimatedPayment: 500,
          postLoanDTI: 0.4,
        }}
        loanAmount={10000}
        termMonths={24}
        currentInputs={inputs}
        {...handlers}
      />
    );
    expect(screen.getByTestId('declined-conversion')).toBeInTheDocument();
    expect(screen.getByText('Secured Credit Builder Card')).toBeInTheDocument();
    expect(screen.queryByText('Your estimated monthly payment')).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-levers-empty-state')).not.toBeInTheDocument();
    expect(screen.getByText('Simulated estimate')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
  });

  it('does not render ConversionView for COUNTER_OFFER', () => {
    render(
      <EstimateStep
        engineResult={{
          decision: Decision.COUNTER_OFFER,
          apr: 11.5,
          estimatedPayment: 400,
          postLoanDTI: 0.4,
        }}
        loanAmount={10000}
        termMonths={24}
        currentInputs={{ ...inputs, creditScore: 680 }}
        {...handlers}
      />
    );
    expect(screen.queryByTestId('declined-conversion')).not.toBeInTheDocument();
    expect(screen.getByText('Your estimated monthly payment')).toBeInTheDocument();
  });
});
