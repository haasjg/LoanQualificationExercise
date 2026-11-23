import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoanAmountStep } from './LoanAmountStep';
import { FinancialDetailsStep } from './FinancialDetailsStep';
import { EstimateStep } from './EstimateStep';
import { ComparisonStep } from './ComparisonStep';
import { SummaryStep } from './SummaryStep';
import { ExampleScenariosModal } from './ExampleScenariosModal';
import { Decision, LeverOutcome, LeverType } from '../../engine/types';

/**
 * Task 9.1: Mobile-First Responsive Utilities Verification
 * Requirements: 14.9
 * 
 * Verifies all wizard step components use mobile-first responsive utilities:
 * - Single-column layouts below 640px (using sm: prefix for >= 640px)
 * - Full-width buttons on mobile (w-full without responsive prefixes)
 * - Proper spacing and padding for mobile viewports (p-4 base, md:p-12 for desktop)
 * - Responsive grids that stack vertically on mobile
 */

describe('Task 9.1: Mobile-First Responsive Utilities', () => {
  describe('LoanAmountStep', () => {
    it('renders with mobile-first responsive utilities', () => {
      const { container } = render(
        <LoanAmountStep
          initialAmount={10000}
          initialTerm={36}
          onContinue={() => {}}
          onShowExamples={() => {}}
        />
      );

      // Verify mobile-first container padding (px-4 md:px-8 lg:px-12)
      const mobileContainer = container.querySelector('.px-4');
      expect(mobileContainer).toBeTruthy();

      // Verify full-width button (w-full)
      const continueButton = screen.getByText('Continue');
      expect(continueButton.className).toContain('w-full');
      
      // Verify minimum touch target height (min-h-12 = 48px)
      expect(continueButton.className).toContain('min-h-12');

      // Verify responsive card padding (p-8 md:p-12)
      const cardElement = container.querySelector('.p-8');
      expect(cardElement).toBeTruthy();
    });

    it('has proper mobile spacing for button groups', () => {
      const { container } = render(
        <LoanAmountStep
          initialAmount={10000}
          initialTerm={36}
          onContinue={() => {}}
          onShowExamples={() => {}}
        />
      );

      // Verify preset buttons use flex-wrap for mobile stacking
      const presetContainer = container.querySelector('.flex-wrap');
      expect(presetContainer).toBeTruthy();
    });
  });

  describe('FinancialDetailsStep', () => {
    it('renders with mobile-first responsive utilities', () => {
      const { container } = render(
        <FinancialDetailsStep
          loanAmount={10000}
          termMonths={36}
          initialIncome={5000}
          initialDebt={800}
          initialCreditScore={650}
          onContinue={() => {}}
          onBack={() => {}}
        />
      );

      // Verify mobile-first container padding
      const mobileContainer = container.querySelector('.px-4');
      expect(mobileContainer).toBeTruthy();

      // Verify full-width submit button
      const submitButton = screen.getByText('See my estimate');
      expect(submitButton.className).toContain('w-full');

      // Verify responsive card padding
      const cardElement = container.querySelector('.p-8');
      expect(cardElement).toBeTruthy();
    });

    it('has proper input field sizing for mobile', () => {
      const { container } = render(
        <FinancialDetailsStep
          loanAmount={10000}
          termMonths={36}
          initialIncome={5000}
          initialDebt={800}
          initialCreditScore={650}
          onContinue={() => {}}
          onBack={() => {}}
        />
      );

      // Verify inputs are full-width
      const inputs = container.querySelectorAll('input[type="text"]');
      inputs.forEach((input) => {
        expect(input.className).toContain('w-full');
      });
    });
  });

  describe('EstimateStep', () => {
    it('renders with mobile-first responsive utilities', () => {
      const mockEngineResult = {
        decision: Decision.APPROVED,
        apr: 10.5,
        estimatedPayment: 320.5,
        postLoanDTI: 0.32,
        reasonCode: null,
      };


      const { container } = render(
        <EstimateStep
          engineResult={mockEngineResult}
          loanAmount={10000}
          termMonths={36}
          allLevers={[{
            leverType: LeverType.EXTEND_TERM,
            payload: { termMonths: 48 },
            mutatedInputs: { termMonths: 48 },
            resultingPostLoanDTI: 0.30,
            resultingEstimatedPayment: 280.0,
            leverOutcome: LeverOutcome.APPROVED,
            displayLabel: 'Extend term to 48 months',
          }]}
          currentInputs={{ loanAmount: 10000, termMonths: 36, monthlyIncome: 4000, monthlyDebt: 500, creditScore: 700 }}
          onCompareLever={() => {}}
          onEditDetails={() => {}}
          onBack={() => {}}
          onStartOver={() => {}}
        />
      );

      // Verify mobile-first container padding
      const mobileContainer = container.querySelector('.px-4');
      expect(mobileContainer).toBeTruthy();

      // Verify full-width lever CTA
      const ctaButton = screen.getByRole('button', { name: /compare this option/i });
      expect(ctaButton?.className).toContain('w-full');

      // Verify responsive card padding
      const cardElement = container.querySelector('.p-8');
      expect(cardElement).toBeTruthy();
    });
  });

  describe('ComparisonStep', () => {
    it('renders with mobile-first responsive grid that stacks on mobile', () => {
      const mockOriginalInputs = {
        monthlyIncome: 5000,
        monthlyDebt: 800,
        creditScore: 650,
        loanAmount: 10000,
        termMonths: 24,
      };

      const mockOriginalEstimate = {
        decision: Decision.COUNTER_OFFER,
        apr: 12.5,
        estimatedPayment: 475.0,
        postLoanDTI: 0.38,
        reasonCode: null,
      };

      const mockAlternativeInputs = {
        ...mockOriginalInputs,
        termMonths: 36,
      };

      const mockAlternativeEstimate = {
        decision: Decision.APPROVED,
        apr: 12.5,
        estimatedPayment: 335.0,
        postLoanDTI: 0.34,
        reasonCode: null,
      };

      const { container } = render(
        <ComparisonStep
          originalInputs={mockOriginalInputs}
          originalEstimate={mockOriginalEstimate}
          alternativeInputs={mockAlternativeInputs}
          alternativeEstimate={mockAlternativeEstimate}
          onSelectAlternative={() => {}}
          onKeepOriginal={() => {}}
          onEditDetails={() => {}}
          onBack={() => {}}
        />
      );

      // Verify mobile-first container padding
      const mobileContainer = container.querySelector('.px-4');
      expect(mobileContainer).toBeTruthy();

      // Verify grid uses mobile-first approach: grid-cols-1 sm:grid-cols-2
      // This means single column on mobile (<640px), two columns on sm and above
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeTruthy();
      expect(gridContainer?.className).toContain('grid-cols-1');
      expect(gridContainer?.className).toContain('sm:grid-cols-2');

      // Verify full-width buttons on both columns
      const buttons = screen.getAllByRole('button');
      const keepButton = buttons.find(btn => btn.textContent === 'Keep original');
      const useButton = buttons.find(btn => btn.textContent?.includes('Use'));
      
      expect(keepButton?.className).toContain('w-full');
      expect(useButton?.className).toContain('w-full');
    });

    it('has proper spacing between stacked cards on mobile', () => {
      const mockOriginalInputs = {
        monthlyIncome: 5000,
        monthlyDebt: 800,
        creditScore: 650,
        loanAmount: 10000,
        termMonths: 24,
      };

      const mockOriginalEstimate = {
        decision: Decision.COUNTER_OFFER,
        apr: 12.5,
        estimatedPayment: 475.0,
        postLoanDTI: 0.38,
        reasonCode: null,
      };

      const mockAlternativeInputs = {
        ...mockOriginalInputs,
        termMonths: 36,
      };

      const mockAlternativeEstimate = {
        decision: Decision.APPROVED,
        apr: 12.5,
        estimatedPayment: 335.0,
        postLoanDTI: 0.34,
        reasonCode: null,
      };

      const { container } = render(
        <ComparisonStep
          originalInputs={mockOriginalInputs}
          originalEstimate={mockOriginalEstimate}
          alternativeInputs={mockAlternativeInputs}
          alternativeEstimate={mockAlternativeEstimate}
          onSelectAlternative={() => {}}
          onKeepOriginal={() => {}}
          onEditDetails={() => {}}
          onBack={() => {}}
        />
      );

      // Verify grid gap for proper spacing
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer?.className).toContain('gap-6');
    });
  });

  describe('SummaryStep', () => {
    it('renders with mobile-first responsive utilities', () => {
      const mockEngineResult = {
        decision: Decision.APPROVED,
        apr: 10.5,
        estimatedPayment: 320.5,
        postLoanDTI: 0.32,
        reasonCode: null,
      };

      const { container } = render(
        <SummaryStep
          engineResult={mockEngineResult}
          loanAmount={10000}
          termMonths={36}
          onStartOver={() => {}}
          onExploreAnother={() => {}}
        />
      );

      // Verify mobile-first container padding
      const mobileContainer = container.querySelector('.px-4');
      expect(mobileContainer).toBeTruthy();

      // Verify full-width lever CTA
      const ctaButton = screen.getByText(/application|options/);
      expect(ctaButton.className).toContain('w-full');
    });
  });

  describe('ExampleScenariosModal', () => {
    it('renders with mobile-first responsive grid', () => {
      const { container } = render(
        <ExampleScenariosModal
          isOpen={true}
          onClose={() => {}}
          onSelectScenario={() => {}}
        />
      );

      // Verify modal has mobile padding (px-4)
      const modal = container.querySelector('.px-4');
      expect(modal).toBeTruthy();

      // Verify scenario details use responsive grid: grid-cols-2 md:grid-cols-3
      const gridElements = container.querySelectorAll('.grid-cols-2');
      expect(gridElements.length).toBeGreaterThan(0);
      
      gridElements.forEach((grid) => {
        expect(grid.className).toContain('md:grid-cols-3');
      });
    });

    it('has proper button sizing for scenario cards', () => {
      const { container } = render(
        <ExampleScenariosModal
          isOpen={true}
          onClose={() => {}}
          onSelectScenario={() => {}}
        />
      );

      // Verify scenario buttons are full-width
      const scenarioButtons = container.querySelectorAll('button[class*="w-full"]');
      expect(scenarioButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Component Mobile Standards', () => {
    it('all wizard steps use consistent mobile container padding (px-4)', () => {
      const steps = [
        <LoanAmountStep
          initialAmount={10000}
          initialTerm={36}
          onContinue={() => {}}
          onShowExamples={() => {}}
        />,
        <FinancialDetailsStep
          loanAmount={10000}
          termMonths={36}
          initialIncome={5000}
          initialDebt={800}
          initialCreditScore={650}
          onContinue={() => {}}
          onBack={() => {}}
        />,
        <EstimateStep
          engineResult={{
            decision: Decision.APPROVED,
            apr: 10.5,
            estimatedPayment: 320.5,
            postLoanDTI: 0.32,
            reasonCode: null,
          }}
          loanAmount={10000}
          termMonths={36}
          bestAlternative={null}
          onCompareTerms={() => {}}
          onEditDetails={() => {}}
          onBack={() => {}}
          onStartOver={() => {}}
        />,
        <SummaryStep
          engineResult={{
            decision: Decision.APPROVED,
            apr: 10.5,
            estimatedPayment: 320.5,
            postLoanDTI: 0.32,
            reasonCode: null,
          }}
          loanAmount={10000}
          termMonths={36}
          onStartOver={() => {}}
          onExploreAnother={() => {}}
        />,
      ];

      steps.forEach((step) => {
        const { container } = render(step);
        const mobileContainer = container.querySelector('.px-4');
        expect(mobileContainer).toBeTruthy();
      });
    });

    it('all wizard steps use full-width primary CTAs', () => {
      const steps = [
        { component: <LoanAmountStep initialAmount={10000} initialTerm={36} onContinue={() => {}} onShowExamples={() => {}} />, buttonText: 'Continue' },
        { component: <FinancialDetailsStep loanAmount={10000} termMonths={36} initialIncome={5000} initialDebt={800} initialCreditScore={650} onContinue={() => {}} onBack={() => {}} />, buttonText: 'See my estimate' },
        { component: <SummaryStep engineResult={{ decision: Decision.APPROVED, apr: 10.5, estimatedPayment: 320.5, postLoanDTI: 0.32, reasonCode: null }} loanAmount={10000} termMonths={36} onStartOver={() => {}} onExploreAnother={() => {}} />, buttonText: 'Start your application' },
      ];

      steps.forEach(({ component, buttonText }) => {
        render(component);
        const button = screen.getByText(buttonText);
        expect(button.className).toContain('w-full');
      });
    });

    it('all primary CTAs meet minimum touch target height (48px)', () => {
      const { container: container1 } = render(
        <LoanAmountStep
          initialAmount={10000}
          initialTerm={36}
          onContinue={() => {}}
          onShowExamples={() => {}}
        />
      );

      const continueButton = screen.getByText('Continue');
      // min-h-12 = 48px in Tailwind
      expect(continueButton.className).toContain('min-h-12');
    });
  });
});
