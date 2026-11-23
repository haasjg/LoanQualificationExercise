import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductOfferCard } from './ProductOfferCard';
import { ProductRecommendation, RetentionProductType } from '../engine/types';

/**
 * ProductOfferCard Component Tests
 * **Validates: Requirements 12.2**
 */
describe('ProductOfferCard', () => {
  const mockRecommendation: ProductRecommendation = {
    productType: RetentionProductType.SECURED_CREDIT_BUILDER,
    productName: 'Secured Credit Builder Card',
    productIcon: 'ShieldCheck',
    qualificationGap: 'Credit score below 600',
    timelineMonths: 8,
    timelineLabel: '6-9 months',
    keyTerms: [
      'Start with a $500 secured deposit',
      'Build credit with on-time payments',
      'Graduate to unsecured after 12 months',
    ],
    gapMetrics: {
      current: 570,
      target: 640,
      label: 'Credit Score Progress',
    },
  };

  describe('Product Details Rendering', () => {
    it('renders product name correctly', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('Secured Credit Builder Card')).toBeInTheDocument();
    });

    it('renders qualification gap text correctly', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('Credit score below 600')).toBeInTheDocument();
    });

    it('renders timeline label correctly', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('Estimated Timeline')).toBeInTheDocument();
      expect(screen.getByText('6-9 months')).toBeInTheDocument();
    });
  });

  describe('Key Terms List', () => {
    it('renders all key terms as bullet points', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('Key Terms')).toBeInTheDocument();
      expect(screen.getByText(/Start with a \$500 secured deposit/)).toBeInTheDocument();
      expect(screen.getByText(/Build credit with on-time payments/)).toBeInTheDocument();
      expect(screen.getByText(/Graduate to unsecured after 12 months/)).toBeInTheDocument();
    });

    it('renders key terms in correct order', () => {
      const mockOnAccept = vi.fn();
      const { container } = render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      const listItems = container.querySelectorAll('ul li span:last-child');
      expect(listItems[0].textContent).toBe('Start with a $500 secured deposit');
      expect(listItems[1].textContent).toBe('Build credit with on-time payments');
      expect(listItems[2].textContent).toBe('Graduate to unsecured after 12 months');
    });
  });

  describe('Gap Metrics', () => {
    it('displays metric label correctly', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('Credit Score Progress')).toBeInTheDocument();
    });

    it('displays current value correctly', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText(/Current:/)).toBeInTheDocument();
      expect(screen.getByText(/Current: 570/)).toBeInTheDocument();
    });

    it('displays target value correctly', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText(/Target:/)).toBeInTheDocument();
      expect(screen.getByText(/Target: 640/)).toBeInTheDocument();
    });

    it('renders arrow separator between current and target', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      // ArrowRight icon should be present in the gap metrics section
      const currentEl = screen.getByText(/Current: 570/);
      expect(currentEl.parentElement?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Accept Button', () => {
    it('renders "Accept & Start Plan" button', () => {
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      const button = screen.getByRole('button', { name: /Accept & Start Plan/i });
      expect(button).toBeInTheDocument();
    });

    it('triggers onAccept handler when button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      const button = screen.getByRole('button', { name: /Accept & Start Plan/i });
      await user.click(button);

      expect(mockOnAccept).toHaveBeenCalledOnce();
    });

    it('passes full recommendation object to handler', async () => {
      const user = userEvent.setup();
      const mockOnAccept = vi.fn();
      render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      const button = screen.getByRole('button', { name: /Accept & Start Plan/i });
      await user.click(button);

      expect(mockOnAccept).toHaveBeenCalledWith(mockRecommendation);
    });
  });

  describe('Icon Rendering', () => {
    it('renders ShieldCheck icon correctly for valid icon name', () => {
      const mockOnAccept = vi.fn();
      const { container } = render(<ProductOfferCard recommendation={mockRecommendation} onAccept={mockOnAccept} />);

      // Icon should be rendered in the indigo background container
      const iconContainer = container.querySelector('.bg-indigo-100.text-indigo-600');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it('renders PiggyBank icon correctly for valid icon name', () => {
      const mockOnAccept = vi.fn();
      const savingsRecommendation: ProductRecommendation = {
        ...mockRecommendation,
        productIcon: 'PiggyBank',
      };
      const { container } = render(<ProductOfferCard recommendation={savingsRecommendation} onAccept={mockOnAccept} />);

      const iconContainer = container.querySelector('.bg-indigo-100.text-indigo-600');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it('renders Coins icon correctly for valid icon name', () => {
      const mockOnAccept = vi.fn();
      const microLoanRecommendation: ProductRecommendation = {
        ...mockRecommendation,
        productIcon: 'Coins',
      };
      const { container } = render(<ProductOfferCard recommendation={microLoanRecommendation} onAccept={mockOnAccept} />);

      const iconContainer = container.querySelector('.bg-indigo-100.text-indigo-600');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it('renders Scale icon correctly for valid icon name', () => {
      const mockOnAccept = vi.fn();
      const debtConsolidationRecommendation: ProductRecommendation = {
        ...mockRecommendation,
        productIcon: 'Scale',
      };
      const { container } = render(<ProductOfferCard recommendation={debtConsolidationRecommendation} onAccept={mockOnAccept} />);

      const iconContainer = container.querySelector('.bg-indigo-100.text-indigo-600');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it('falls back to HelpCircle icon for invalid icon name', () => {
      const mockOnAccept = vi.fn();
      const recommendationWithInvalidIcon: ProductRecommendation = {
        ...mockRecommendation,
        productIcon: 'NonExistentIcon',
      };
      
      const { container } = render(
        <ProductOfferCard recommendation={recommendationWithInvalidIcon} onAccept={mockOnAccept} />
      );

      // Should render without crashing and show fallback icon
      const iconContainer = container.querySelector('.bg-indigo-100.text-indigo-600');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('All Product Types', () => {
    it('renders SECURED_CREDIT_BUILDER product correctly', () => {
      const mockOnAccept = vi.fn();
      const creditBuilderRecommendation: ProductRecommendation = {
        productType: RetentionProductType.SECURED_CREDIT_BUILDER,
        productName: 'Secured Credit Builder Card',
        productIcon: 'ShieldCheck',
        qualificationGap: 'Credit score below 600',
        timelineMonths: 8,
        timelineLabel: '6-9 months',
        keyTerms: ['$500 secured deposit', 'Build credit history'],
        gapMetrics: { current: 570, target: 640, label: 'Credit Score Progress' },
      };

      render(<ProductOfferCard recommendation={creditBuilderRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('Secured Credit Builder Card')).toBeInTheDocument();
      expect(screen.getByText('Credit score below 600')).toBeInTheDocument();
    });

    it('renders HIGH_YIELD_SAVINGS product correctly', () => {
      const mockOnAccept = vi.fn();
      const savingsRecommendation: ProductRecommendation = {
        productType: RetentionProductType.HIGH_YIELD_SAVINGS,
        productName: 'High-Yield Savings Account',
        productIcon: 'PiggyBank',
        qualificationGap: 'Insufficient income for loan amount',
        timelineMonths: 12,
        timelineLabel: '10-14 months',
        keyTerms: ['5.0% APY', 'No monthly fees', 'Build emergency fund'],
        gapMetrics: { current: 2000, target: 10000, label: 'Savings Goal' },
      };

      render(<ProductOfferCard recommendation={savingsRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('High-Yield Savings Account')).toBeInTheDocument();
      expect(screen.getByText('Insufficient income for loan amount')).toBeInTheDocument();
      expect(screen.getByText('5.0% APY')).toBeInTheDocument();
    });

    it('renders MICRO_LOAN product correctly', () => {
      const mockOnAccept = vi.fn();
      const microLoanRecommendation: ProductRecommendation = {
        productType: RetentionProductType.MICRO_LOAN,
        productName: 'Micro Loan ($500-$2000)',
        productIcon: 'Coins',
        qualificationGap: 'Requested amount exceeds qualification',
        timelineMonths: 6,
        timelineLabel: '4-6 months',
        keyTerms: ['Start with smaller amount', 'Build payment history', 'Qualify for larger loans'],
        gapMetrics: { current: 5000, target: 2000, label: 'Qualified Loan Amount' },
      };

      render(<ProductOfferCard recommendation={microLoanRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('Micro Loan ($500-$2000)')).toBeInTheDocument();
      expect(screen.getByText('Requested amount exceeds qualification')).toBeInTheDocument();
      expect(screen.getByText('Build payment history')).toBeInTheDocument();
    });

    it('renders DEBT_CONSOLIDATION product correctly', () => {
      const mockOnAccept = vi.fn();
      const debtConsolidationRecommendation: ProductRecommendation = {
        productType: RetentionProductType.DEBT_CONSOLIDATION,
        productName: 'Debt Consolidation Counseling',
        productIcon: 'Scale',
        qualificationGap: 'Debt-to-income ratio too high',
        timelineMonths: 18,
        timelineLabel: '12-24 months',
        keyTerms: ['Free credit counseling', 'Debt management plan', 'Lower interest rates'],
        gapMetrics: { current: 48, target: 36, label: 'DTI Percentage' },
      };

      render(<ProductOfferCard recommendation={debtConsolidationRecommendation} onAccept={mockOnAccept} />);

      expect(screen.getByText('Debt Consolidation Counseling')).toBeInTheDocument();
      expect(screen.getByText('Debt-to-income ratio too high')).toBeInTheDocument();
      expect(screen.getByText('Free credit counseling')).toBeInTheDocument();
    });
  });
});
