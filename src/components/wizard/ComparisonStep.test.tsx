import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComparisonStep } from './ComparisonStep';
import { evaluateDecision } from '../../engine/underwriting';
import { ApplicantInputs, Decision, EngineResult, Lever, LeverType } from '../../engine/types';

describe('ComparisonStep', () => {
  const mockOriginalInputs: ApplicantInputs = {
    loanAmount: 15000,
    termMonths: 24,
    monthlyIncome: 3500,
    monthlyDebt: 600,
    creditScore: 650,
  };

  const mockOriginalEstimate: EngineResult = {
    decision: Decision.COUNTER_OFFER,
    reasonCode: null,
    apr: 16.50,
    estimatedPayment: 737,
    postLoanDTI: 0.3820,
    benchmarkRate: 11.50,
  };

  const mockAlternativeInputs: ApplicantInputs = {
    ...mockOriginalInputs,
    termMonths: 36,
  };

  const mockAlternativeEstimate: EngineResult = {
    decision: Decision.APPROVED,
    reasonCode: null,
    apr: 16.50,
    estimatedPayment: 528,
    postLoanDTI: 0.3223,
    benchmarkRate: 11.50,
  };

  it('shows lever displayLabel heading and lever-aware button label', () => {
    const lever: Lever = {
      leverType: LeverType.REDUCE_AMOUNT,
      payload: { loanAmount: 12000 },
      mutatedInputs: { loanAmount: 12000 },
      resultingPostLoanDTI: 0.3,
      resultingEstimatedPayment: 500,
      leverOutcome: Decision.APPROVED,
      displayLabel: 'Reduce loan amount to $12000 to achieve approval',
    } as Lever;

    render(
      <ComparisonStep
        originalInputs={mockOriginalInputs}
        originalEstimate={mockOriginalEstimate}
        alternativeInputs={mockAlternativeInputs}
        alternativeEstimate={mockAlternativeEstimate}
        selectedLever={lever}
        onSelectAlternative={vi.fn()}
        onKeepOriginal={vi.fn()}
        onEditDetails={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Reduce loan amount to $12000 to achieve approval')).toBeInTheDocument();
    expect(screen.queryByText('Suggested alternative')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borrow $12,000 instead' })).toBeInTheDocument();
  });

  it('renders side-by-side comparison with original and alternative columns', () => {
    const mockHandlers = {
      onSelectAlternative: vi.fn(),
      onKeepOriginal: vi.fn(),
      onEditDetails: vi.fn(),
      onBack: vi.fn(),
    };

    render(
      <ComparisonStep
        originalInputs={mockOriginalInputs}
        originalEstimate={mockOriginalEstimate}
        alternativeInputs={mockAlternativeInputs}
        alternativeEstimate={mockAlternativeEstimate}
        {...mockHandlers}
      />
    );

    // Check header
    expect(screen.getByText('Compare your options')).toBeInTheDocument();
    expect(screen.getByText('Choose the option that works best for your budget')).toBeInTheDocument();

    // Check original column
    expect(screen.getByText('Your original estimate')).toBeInTheDocument();
    expect(screen.getByText('24 months')).toBeInTheDocument();
    expect(screen.getByText('$737')).toBeInTheDocument(); // monthly payment
    expect(screen.getAllByText('16.50%')).toHaveLength(2); // APR appears in both columns
    
    // Check alternative column
    expect(screen.getByText('Suggested alternative')).toBeInTheDocument();
    expect(screen.getByText('36 months')).toBeInTheDocument();
    expect(screen.getByText('$528')).toBeInTheDocument(); // monthly payment

    // Check buttons
    expect(screen.getByRole('button', { name: /Keep original/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use 36 months/i })).toBeInTheDocument();
  });

  it('displays loan amount when different between original and alternative', () => {
    const alternativeWithDifferentAmount: ApplicantInputs = {
      ...mockOriginalInputs,
      loanAmount: 12000,
      termMonths: 36,
    };

    const mockHandlers = {
      onSelectAlternative: vi.fn(),
      onKeepOriginal: vi.fn(),
      onEditDetails: vi.fn(),
      onBack: vi.fn(),
    };

    render(
      <ComparisonStep
        originalInputs={mockOriginalInputs}
        originalEstimate={mockOriginalEstimate}
        alternativeInputs={alternativeWithDifferentAmount}
        alternativeEstimate={mockAlternativeEstimate}
        {...mockHandlers}
      />
    );

    // Should show both amounts
    expect(screen.getByText('$15,000')).toBeInTheDocument();
    expect(screen.getByText('$12,000')).toBeInTheDocument();
  });

  it('displays trade-off summary with monthly savings and total cost difference', () => {
    const mockHandlers = {
      onSelectAlternative: vi.fn(),
      onKeepOriginal: vi.fn(),
      onEditDetails: vi.fn(),
      onBack: vi.fn(),
    };

    render(
      <ComparisonStep
        originalInputs={mockOriginalInputs}
        originalEstimate={mockOriginalEstimate}
        alternativeInputs={mockAlternativeInputs}
        alternativeEstimate={mockAlternativeEstimate}
        {...mockHandlers}
      />
    );

    // Monthly savings: 737 - 528 = 209
    expect(screen.getByText(/Monthly savings:/)).toBeInTheDocument();
    expect(screen.getByText(/\$209/)).toBeInTheDocument();

    // Total difference: (528 * 36) - (737 * 24) = 19,008 - 17,688 = 1,320 more
    expect(screen.getByText(/Total cost difference:/)).toBeInTheDocument();
    expect(screen.getByText(/\$1,320/)).toBeInTheDocument();
  });

  it('renders mobile-first responsive layout', () => {
    const mockHandlers = {
      onSelectAlternative: vi.fn(),
      onKeepOriginal: vi.fn(),
      onEditDetails: vi.fn(),
      onBack: vi.fn(),
    };

    const { container } = render(
      <ComparisonStep
        originalInputs={mockOriginalInputs}
        originalEstimate={mockOriginalEstimate}
        alternativeInputs={mockAlternativeInputs}
        alternativeEstimate={mockAlternativeEstimate}
        {...mockHandlers}
      />
    );

    // Check for grid layout classes (single column on mobile, two columns on sm+)
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
  });

  it('shows step progress indicator', () => {
    const mockHandlers = {
      onSelectAlternative: vi.fn(),
      onKeepOriginal: vi.fn(),
      onEditDetails: vi.fn(),
      onBack: vi.fn(),
    };

    render(
      <ComparisonStep
        originalInputs={mockOriginalInputs}
        originalEstimate={mockOriginalEstimate}
        alternativeInputs={mockAlternativeInputs}
        alternativeEstimate={mockAlternativeEstimate}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
  });

  it('highlights alternative column with indigo border', () => {
    const mockHandlers = {
      onSelectAlternative: vi.fn(),
      onKeepOriginal: vi.fn(),
      onEditDetails: vi.fn(),
      onBack: vi.fn(),
    };

    const { container } = render(
      <ComparisonStep
        originalInputs={mockOriginalInputs}
        originalEstimate={mockOriginalEstimate}
        alternativeInputs={mockAlternativeInputs}
        alternativeEstimate={mockAlternativeEstimate}
        {...mockHandlers}
      />
    );

    // Find the card with indigo border (alternative column)
    const alternativeCard = container.querySelector('.border-indigo-300');
    expect(alternativeCard).toBeInTheDocument();
    expect(alternativeCard).toHaveTextContent('Suggested alternative');
  });

  it('calls correct handlers when navigation controls are clicked', async () => {
    const mockHandlers = {
      onSelectAlternative: vi.fn(),
      onKeepOriginal: vi.fn(),
      onEditDetails: vi.fn(),
      onBack: vi.fn(),
    };

    const user = userEvent.setup();
    
    render(
      <ComparisonStep
        originalInputs={mockOriginalInputs}
        originalEstimate={mockOriginalEstimate}
        alternativeInputs={mockAlternativeInputs}
        alternativeEstimate={mockAlternativeEstimate}
        {...mockHandlers}
      />
    );

    // Test Keep Original button
    const keepButton = screen.getByRole('button', { name: /Keep original/i });
    await user.click(keepButton);
    expect(mockHandlers.onKeepOriginal).toHaveBeenCalledTimes(1);

    // Test Use Alternative button
    const useAltButton = screen.getByRole('button', { name: /Use 36 months/i });
    await user.click(useAltButton);
    expect(mockHandlers.onSelectAlternative).toHaveBeenCalledTimes(1);

    // Test Edit Details link
    const editLink = screen.getByRole('button', { name: /Edit details/i });
    await user.click(editLink);
    expect(mockHandlers.onEditDetails).toHaveBeenCalledTimes(1);

    // Test Back button
    const backButton = screen.getByRole('button', { name: /Back/i });
    await user.click(backButton);
    expect(mockHandlers.onBack).toHaveBeenCalledTimes(1);
  });
});

describe('ComparisonStep lever-driven alternative', () => {
  const inputs: ApplicantInputs = {
    loanAmount: 15000,
    termMonths: 24,
    monthlyIncome: 3500,
    monthlyDebt: 600,
    creditScore: 650,
  };
  const original = evaluateDecision(inputs, 11.5) as EngineResult;
  const fallback: EngineResult = { ...original, estimatedPayment: 1, apr: 1 };

  const makeLever = (
    leverType: LeverType,
    payload: Lever['payload'],
    mutatedInputs: Partial<ApplicantInputs>
  ): Lever =>
    ({
      leverType,
      payload,
      mutatedInputs,
      resultingPostLoanDTI: 0.3,
      resultingEstimatedPayment: 0,
      leverOutcome: Decision.APPROVED,
      displayLabel: 'Test lever',
    }) as Lever;

  const renderWith = (lever: Lever) =>
    render(
      <ComparisonStep
        originalInputs={inputs}
        originalEstimate={original}
        alternativeInputs={inputs}
        alternativeEstimate={fallback}
        selectedLever={lever}
        onSelectAlternative={vi.fn()}
        onKeepOriginal={vi.fn()}
        onEditDetails={vi.fn()}
        onBack={vi.fn()}
      />
    );

  it('EXTEND_TERM: lower payment, higher total cost, computed from engine', () => {
    renderWith(makeLever(LeverType.EXTEND_TERM, { termMonths: 36 }, { termMonths: 36 }));
    expect(screen.getByText('36 months')).toBeInTheDocument();
    expect(screen.getByText(/Monthly savings:/)).toBeInTheDocument();
    expect(screen.getByText(/more total interest/)).toBeInTheDocument();
  });

  it('REDUCE_AMOUNT: lower payment and lower total cost', () => {
    renderWith(makeLever(LeverType.REDUCE_AMOUNT, { loanAmount: 10000 }, { loanAmount: 10000 }));
    expect(screen.getByText(/Monthly savings:/)).toBeInTheDocument();
    expect(screen.getByText(/\$[\d,]+ less/)).toBeInTheDocument();
  });

  it('PAY_DOWN_DEBT: payment unchanged, shows debt paydown amount and DTI', () => {
    renderWith(
      makeLever(LeverType.PAY_DOWN_DEBT, { monthlyDebt: 300, dReduce: 300 }, { monthlyDebt: 300 })
    );
    expect(screen.getByText(/Pay down monthly debt by:/)).toBeInTheDocument();
    expect(screen.getByText(/\$300 per month/)).toBeInTheDocument();
    expect(screen.getByText(/Resulting debt-to-income:/)).toBeInTheDocument();
    expect(screen.queryByText(/Monthly savings:/)).not.toBeInTheDocument();
  });
});
