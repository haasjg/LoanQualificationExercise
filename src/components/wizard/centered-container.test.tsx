import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoanAmountStep } from './LoanAmountStep';
import { FinancialDetailsStep } from './FinancialDetailsStep';
import { EstimateStep } from './EstimateStep';
import { ComparisonStep } from './ComparisonStep';
import { SummaryStep } from './SummaryStep';
import { ExampleScenariosModal } from './ExampleScenariosModal';
import { Decision } from '../../engine/types';

/**
 * Task 9.3: Centered Max-Width Container Verification
 * Requirements: 14.9
 * 
 * Verifies all wizard step components use a centered max-width container on desktop:
 * - Centered using mx-auto
 * - Reasonable max-width (max-w-6xl or max-w-7xl)
 * - Appropriate padding on mobile (px-4)
 * - Scales up on larger screens (md:px-8, lg:px-12)
 */

describe('Task 9.3: Centered Max-Width Container', () => {
  describe('LoanAmountStep', () => {
    it('uses centered max-width container with responsive padding', () => {
      const { container } = render(
        <LoanAmountStep
          initialAmount={10000}
          initialTerm={36}
          onContinue={() => {}}
          onShowExamples={() => {}}
        />
      );

      // Verify outer container has responsive horizontal padding
      const outerContainer = container.querySelector('.px-4');
      expect(outerContainer).toBeTruthy();
      expect(outerContainer?.className).toContain('md:px-8');
      expect(outerContainer?.className).toContain('lg:px-12');

      // Verify wrapper has max-width and is centered
      const wrapper = container.querySelector('.max-w-6xl');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('mx-auto');

      // Verify inner card has max-width and is centered
      const card = container.querySelector('.max-w-2xl');
      expect(card).toBeTruthy();
      expect(card?.className).toContain('mx-auto');
    });
  });

  describe('FinancialDetailsStep', () => {
    it('uses centered max-width container with responsive padding', () => {
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

      // Verify outer container has responsive horizontal padding
      const outerContainer = container.querySelector('.px-4');
      expect(outerContainer).toBeTruthy();
      expect(outerContainer?.className).toContain('md:px-8');
      expect(outerContainer?.className).toContain('lg:px-12');

      // Verify wrapper has max-width and is centered
      const wrapper = container.querySelector('.max-w-6xl');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('mx-auto');

      // Verify inner card has max-width and is centered
      const card = container.querySelector('.max-w-2xl');
      expect(card).toBeTruthy();
      expect(card?.className).toContain('mx-auto');
    });
  });

  describe('EstimateStep', () => {
    it('uses centered max-width container with responsive padding', () => {
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
          bestAlternative={null}
          onCompareTerms={() => {}}
          onEditDetails={() => {}}
          onBack={() => {}}
          onStartOver={() => {}}
        />
      );

      // Verify outer container has responsive horizontal padding
      const outerContainer = container.querySelector('.px-4');
      expect(outerContainer).toBeTruthy();
      expect(outerContainer?.className).toContain('md:px-8');
      expect(outerContainer?.className).toContain('lg:px-12');

      // Verify wrapper has max-width and is centered
      const wrapper = container.querySelector('.max-w-6xl');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('mx-auto');

      // Verify inner card has max-width and is centered
      const card = container.querySelector('.max-w-2xl');
      expect(card).toBeTruthy();
      expect(card?.className).toContain('mx-auto');
    });
  });

  describe('ComparisonStep', () => {
    it('uses centered max-width container with responsive padding', () => {
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

      // Verify outer container has responsive horizontal padding
      const outerContainer = container.querySelector('.px-4');
      expect(outerContainer).toBeTruthy();
      expect(outerContainer?.className).toContain('md:px-8');
      expect(outerContainer?.className).toContain('lg:px-12');

      // Verify wrapper has max-width and is centered
      const wrapper = container.querySelector('.max-w-6xl');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('mx-auto');

      // Verify comparison grid has max-width and is centered
      const grid = container.querySelector('.grid.max-w-4xl');
      expect(grid).toBeTruthy();
      expect(grid?.className).toContain('mx-auto');
    });
  });

  describe('SummaryStep', () => {
    it('uses centered max-width container with responsive padding', () => {
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

      // Verify outer container has responsive horizontal padding
      const outerContainer = container.querySelector('.px-4');
      expect(outerContainer).toBeTruthy();
      expect(outerContainer?.className).toContain('md:px-8');
      expect(outerContainer?.className).toContain('lg:px-12');

      // Verify wrapper has max-width and is centered
      const wrapper = container.querySelector('.max-w-6xl');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('mx-auto');

      // Verify summary card has max-width and is centered
      const card = container.querySelector('.max-w-2xl');
      expect(card).toBeTruthy();
      expect(card?.className).toContain('mx-auto');
    });
  });

  describe('ExampleScenariosModal', () => {
    it('uses responsive horizontal padding on the overlay', () => {
      const { container } = render(
        <ExampleScenariosModal
          isOpen={true}
          onClose={() => {}}
          onSelectScenario={() => {}}
        />
      );

      // Verify modal overlay has responsive horizontal padding
      const overlay = container.querySelector('.fixed');
      expect(overlay).toBeTruthy();
      expect(overlay?.className).toContain('px-4');
      expect(overlay?.className).toContain('md:px-8');
      expect(overlay?.className).toContain('lg:px-12');
    });
  });

  describe('Cross-Component Standards', () => {
    it('all wizard steps use max-w-6xl mx-auto wrapper', () => {
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
        <ComparisonStep
          originalInputs={{
            monthlyIncome: 5000,
            monthlyDebt: 800,
            creditScore: 650,
            loanAmount: 10000,
            termMonths: 24,
          }}
          originalEstimate={{
            decision: Decision.COUNTER_OFFER,
            apr: 12.5,
            estimatedPayment: 475.0,
            postLoanDTI: 0.38,
            reasonCode: null,
          }}
          alternativeInputs={{
            monthlyIncome: 5000,
            monthlyDebt: 800,
            creditScore: 650,
            loanAmount: 10000,
            termMonths: 36,
          }}
          alternativeEstimate={{
            decision: Decision.APPROVED,
            apr: 12.5,
            estimatedPayment: 335.0,
            postLoanDTI: 0.34,
            reasonCode: null,
          }}
          onSelectAlternative={() => {}}
          onKeepOriginal={() => {}}
          onEditDetails={() => {}}
          onBack={() => {}}
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
        const wrapper = container.querySelector('.max-w-6xl.mx-auto');
        expect(wrapper).toBeTruthy();
      });
    });

    it('all wizard steps use responsive horizontal padding (px-4 md:px-8 lg:px-12)', () => {
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
        <ComparisonStep
          originalInputs={{
            monthlyIncome: 5000,
            monthlyDebt: 800,
            creditScore: 650,
            loanAmount: 10000,
            termMonths: 24,
          }}
          originalEstimate={{
            decision: Decision.COUNTER_OFFER,
            apr: 12.5,
            estimatedPayment: 475.0,
            postLoanDTI: 0.38,
            reasonCode: null,
          }}
          alternativeInputs={{
            monthlyIncome: 5000,
            monthlyDebt: 800,
            creditScore: 650,
            loanAmount: 10000,
            termMonths: 36,
          }}
          alternativeEstimate={{
            decision: Decision.APPROVED,
            apr: 12.5,
            estimatedPayment: 335.0,
            postLoanDTI: 0.34,
            reasonCode: null,
          }}
          onSelectAlternative={() => {}}
          onKeepOriginal={() => {}}
          onEditDetails={() => {}}
          onBack={() => {}}
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
        const outerContainer = container.querySelector('.px-4');
        expect(outerContainer).toBeTruthy();
        expect(outerContainer?.className).toContain('md:px-8');
        expect(outerContainer?.className).toContain('lg:px-12');
      });
    });
  });
});
