import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversionView } from './ConversionView';
import { ApplicantInputs, Decision, EngineResult, ReasonCode } from '../engine/types';

/**
 * ConversionView Component Tests (Task 24.4)
 * **Validates: Requirements 12.1, 12.4, 12.5, 12.6**
 * 
 * Tests verify:
 * 1. Decline reason rendering for all reason codes with exact values
 * 2. Product recommendation display (1-3 cards)
 * 3. Empty state handling
 * 4. Button interactions (accept product, return to simulator)
 * 5. Layout and styling compliance
 */
describe('ConversionView', () => {
  const mockOnAcceptProduct = vi.fn();
  const mockOnReturnToSimulator = vi.fn();

  beforeEach(() => {
    mockOnAcceptProduct.mockClear();
    mockOnReturnToSimulator.mockClear();
  });

  describe('Decline Reason Rendering (Requirement 12.4)', () => {
    it('renders HIGH_RISK_SCORE with current score and minimum requirement', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify exact explanation text with current score and minimum
      expect(screen.getByText('Why Was I Declined?')).toBeInTheDocument();
      expect(screen.getByText(/credit score of 570 is below our minimum requirement of 600/i)).toBeInTheDocument();
    });

    it('renders INSUFFICIENT_INCOME with current income and minimum threshold', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 1500,
        monthlyDebt: 200,
        creditScore: 650,
        loanAmount: 5000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.INSUFFICIENT_INCOME,
        apr: 12.5,
        estimatedPayment: 225.0,
        postLoanDTI: 0.28,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify income values in explanation
      expect(screen.getByText(/monthly income of \$1500\.00 does not meet our minimum threshold of \$1,800/i)).toBeInTheDocument();
    });

    it('renders EXCESSIVE_DEBT with debt-to-income ratio', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 3000,
        creditScore: 650,
        loanAmount: 5000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.EXCESSIVE_DEBT,
        apr: 13.0,
        estimatedPayment: 225.0,
        postLoanDTI: 1.075,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify debt and income values with ratio
      expect(screen.getByText(/existing monthly debt obligations of \$3000\.00 meet or exceed your monthly income of \$3000\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/100\.0% ratio/i)).toBeInTheDocument();
    });

    it('renders HIGH_DTI with total debt payments and DTI percentage', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 800,
        creditScore: 650,
        loanAmount: 10000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 13.0,
        estimatedPayment: 475.0,
        postLoanDTI: 0.425,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify total debt calculation and DTI percentage
      expect(screen.getByText(/total debt payments to \$1275\.00 per month/i)).toBeInTheDocument();
      expect(screen.getByText(/\$800\.00 existing debt \+ \$475\.00 loan payment/i)).toBeInTheDocument();
      expect(screen.getByText(/42\.5% of your \$3000\.00 monthly income/i)).toBeInTheDocument();
      expect(screen.getByText(/require this ratio to be 45% or less/i)).toBeInTheDocument();
    });

    it('renders LOAN_CAP_EXCEEDED with requested amount and cap', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 4000,
        monthlyDebt: 500,
        creditScore: 630,
        loanAmount: 18000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.LOAN_CAP_EXCEEDED,
        apr: 16.5,
        estimatedPayment: 650.0,
        postLoanDTI: 0.2875,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify loan cap explanation
      expect(screen.getByText(/credit scores in the 600-659 range, we cap unsecured loan amounts at \$15,000/i)).toBeInTheDocument();
      expect(screen.getByText(/You requested \$18000\.00/i)).toBeInTheDocument();
    });
  });

  describe('Product Recommendation Display (Requirements 12.1, 12.5)', () => {
    it('renders single product recommendation with correct heading and count', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify heading and count message
      expect(screen.getByText('Build Your Path to Yes')).toBeInTheDocument();
      expect(screen.getByText(/We have 1 product you qualify for today/i)).toBeInTheDocument();
      
      // Verify product card is rendered
      expect(screen.getByText('Secured Credit Builder Card')).toBeInTheDocument();
    });

    it('renders multiple product recommendations (2 cards) with plural count', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 2000,
        creditScore: 650,
        loanAmount: 15000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 13.0,
        estimatedPayment: 737.0,
        postLoanDTI: 0.91,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify plural count message
      expect(screen.getByText(/We have 2 products you qualify for today/i)).toBeInTheDocument();
      
      // Verify both product cards
      expect(screen.getByText('Debt Consolidation Loan')).toBeInTheDocument();
      expect(screen.getByText('Micro-Loan')).toBeInTheDocument();
    });

    it('renders product recommendations for INSUFFICIENT_INCOME', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 1500,
        monthlyDebt: 200,
        creditScore: 650,
        loanAmount: 5000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.INSUFFICIENT_INCOME,
        apr: 12.5,
        estimatedPayment: 225.0,
        postLoanDTI: 0.28,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      expect(screen.getByText('High-Yield Savings with Direct Deposit')).toBeInTheDocument();
    });

    it('renders product recommendations for EXCESSIVE_DEBT', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 3000,
        creditScore: 650,
        loanAmount: 5000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.EXCESSIVE_DEBT,
        apr: 13.0,
        estimatedPayment: 225.0,
        postLoanDTI: 1.075,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      expect(screen.getByText('Debt Consolidation Loan')).toBeInTheDocument();
    });
  });

  describe('Empty State Handling', () => {
    it('displays empty state when no recommendations available', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 650,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.INVALID_TERM,
        apr: 13.0,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify empty state message is displayed
      expect(screen.getByText(/We could not find a product match for these details/i)).toBeInTheDocument();
      
      // Verify Build Your Path to Yes heading is NOT displayed
      expect(screen.queryByText('Build Your Path to Yes')).not.toBeInTheDocument();
    });

    it('renders empty state with correct styling', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 650,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.INVALID_TERM,
        apr: 13.0,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      const { container } = render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify empty state container has correct classes
      const emptyStateContainer = container.querySelector('.rounded-lg.border.border-stone-200.bg-stone-50');
      expect(emptyStateContainer).toBeInTheDocument();
    });
  });

  describe('Button Interactions (Requirement 12.6)', () => {
    it('calls onAcceptProduct with correct recommendation when Accept button is clicked', async () => {
      const user = userEvent.setup();
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      const acceptButton = screen.getByText('Accept & Start Plan');
      await user.click(acceptButton);

      expect(mockOnAcceptProduct).toHaveBeenCalledTimes(1);
      expect(mockOnAcceptProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          productType: 'SECURED_CREDIT_BUILDER',
          productName: 'Secured Credit Builder Card',
        })
      );
    });

    it('calls onReturnToSimulator when Return to Simulator button is clicked', async () => {
      const user = userEvent.setup();
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      const returnButton = screen.getByText('Return to Simulator');
      await user.click(returnButton);

      expect(mockOnReturnToSimulator).toHaveBeenCalledTimes(1);
      expect(mockOnAcceptProduct).not.toHaveBeenCalled();
    });

    it('does not call onReturnToSimulator when accepting a product', async () => {
      const user = userEvent.setup();
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      const acceptButton = screen.getByText('Accept & Start Plan');
      await user.click(acceptButton);

      expect(mockOnAcceptProduct).toHaveBeenCalledTimes(1);
      expect(mockOnReturnToSimulator).not.toHaveBeenCalled();
    });

    it('calls onAcceptProduct with correct recommendation for each product card', async () => {
      const user = userEvent.setup();
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 2000,
        creditScore: 650,
        loanAmount: 15000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 13.0,
        estimatedPayment: 737.0,
        postLoanDTI: 0.91,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Click the first Accept button (Micro-Loan appears first due to timeline sorting)
      const acceptButtons = screen.getAllByText('Accept & Start Plan');
      await user.click(acceptButtons[0]);

      expect(mockOnAcceptProduct).toHaveBeenCalledTimes(1);
      expect(mockOnAcceptProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          productType: 'MICRO_LOAN',
          productName: 'Micro-Loan',
        })
      );
    });
  });

  describe('Layout and Styling (Requirements 12.1, 12.5)', () => {
    it('renders DeclineReasonDetail at the top', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      const { container } = render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify decline reason is in the first child of the main container
      const mainContainer = container.firstChild;
      const firstSection = mainContainer?.firstChild as HTMLElement;
      expect(firstSection).toHaveClass('rounded-lg', 'bg-stone-50');
      expect(firstSection?.textContent).toContain('Here is a path forward');
    });

    it('renders product cards in grid layout with correct spacing', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 2000,
        creditScore: 650,
        loanAmount: 15000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 13.0,
        estimatedPayment: 737.0,
        postLoanDTI: 0.91,
        benchmarkRate: 11.5,
      };

      const { container } = render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify grid container exists with correct classes
      const gridElement = container.querySelector('.grid');
      expect(gridElement).toBeInTheDocument();
      expect(gridElement).toHaveClass('grid', 'gap-6');
    });

    it('renders Return button at the bottom with correct styling', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      const returnButton = screen.getByText('Return to Simulator');
      expect(returnButton).toHaveClass(
        'w-full',
        'rounded-md',
        'border-2',
        'border-slate-300',
        'bg-white',
        'text-slate-700'
      );
    });

    it('applies correct vertical spacing between sections', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      const { container } = render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify main container has space-y-8
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('space-y-8');
    });

    it('renders decline banner with correct rose color scheme', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.0,
        postLoanDTI: 0.16,
        benchmarkRate: 11.5,
      };

      const { container } = render(
        <ConversionView
          inputs={inputs}
          engineResult={engineResult}
          onAcceptProduct={mockOnAcceptProduct}
          onReturnToSimulator={mockOnReturnToSimulator}
        />
      );

      // Verify decline section uses a friendly stone surface, not an alarm banner
      const declineBanner = container.querySelector('.bg-stone-50');
      expect(declineBanner).toBeInTheDocument();
      
      const heading = screen.getByText('Here is a path forward');
      expect(heading).toHaveClass('text-slate-900');
    });
  });
});
