import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinancialDetailsStep } from './FinancialDetailsStep';

describe('FinancialDetailsStep - Validation (Task 4.3)', () => {
  const mockOnContinue = vi.fn();
  const mockOnBack = vi.fn();

  const defaultProps = {
    loanAmount: 10000,
    termMonths: 36,
    initialIncome: 5000,
    initialDebt: 500,
    initialCreditScore: 650,
    onContinue: mockOnContinue,
    onBack: mockOnBack,
  };

  beforeEach(() => {
    mockOnContinue.mockClear();
    mockOnBack.mockClear();
  });

  describe('Navigation controls', () => {
    it('renders Back button that navigates to Step 1', () => {
      render(<FinancialDetailsStep {...defaultProps} />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
      
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('renders Continue button (See my estimate)', () => {
      render(<FinancialDetailsStep {...defaultProps} />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).toBeInTheDocument();
    });

    it('enables Continue button when all fields are valid', () => {
      render(<FinancialDetailsStep {...defaultProps} />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('Income validation', () => {
    it('shows error when income is below minimum ($1,800)', async () => {
      render(<FinancialDetailsStep {...defaultProps} initialIncome={1000} />);
      
      const incomeInput = screen.getByLabelText(/monthly income/i);
      
      // Clear and enter invalid value
      fireEvent.change(incomeInput, { target: { value: '1000' } });
      
      await waitFor(() => {
        expect(screen.getByText(/minimum monthly income is \$1,800/i)).toBeInTheDocument();
      });
    });

    it('shows error when income exceeds maximum ($25,000)', async () => {
      render(<FinancialDetailsStep {...defaultProps} />);
      
      const incomeInput = screen.getByLabelText(/monthly income/i);
      fireEvent.change(incomeInput, { target: { value: '30000' } });
      
      await waitFor(() => {
        expect(screen.getByText(/maximum monthly income is \$25,000/i)).toBeInTheDocument();
      });
    });

    it('disables Continue button when income is invalid', () => {
      render(<FinancialDetailsStep {...defaultProps} initialIncome={1000} />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).toBeDisabled();
    });

    it('applies error styling to income input when invalid', () => {
      render(<FinancialDetailsStep {...defaultProps} initialIncome={1000} />);
      
      const incomeInput = screen.getByLabelText(/monthly income/i);
      expect(incomeInput).toHaveClass('border-rose-300', 'bg-rose-50');
    });
  });

  describe('Debt validation', () => {
    it('shows error when debt exceeds maximum ($15,000)', async () => {
      render(<FinancialDetailsStep {...defaultProps} />);
      
      const debtInput = screen.getByLabelText(/monthly debt payments/i);
      fireEvent.change(debtInput, { target: { value: '20000' } });
      
      await waitFor(() => {
        expect(screen.getByText(/maximum monthly debt is \$15,000/i)).toBeInTheDocument();
      });
    });

    it('accepts zero debt as valid', () => {
      render(<FinancialDetailsStep {...defaultProps} initialDebt={0} />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).not.toBeDisabled();
    });

    it('disables Continue button when debt is invalid', () => {
      render(<FinancialDetailsStep {...defaultProps} initialDebt={20000} />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).toBeDisabled();
    });

    it('applies error styling to debt input when invalid', () => {
      render(<FinancialDetailsStep {...defaultProps} initialDebt={20000} />);
      
      const debtInput = screen.getByLabelText(/monthly debt payments/i);
      expect(debtInput).toHaveClass('border-rose-300', 'bg-rose-50');
    });
  });

  describe('Credit score validation', () => {
    it('shows error when credit score is below minimum (500)', async () => {
      render(<FinancialDetailsStep {...defaultProps} initialCreditScore={450} />);
      
      // Credit score below min should show error
      await waitFor(() => {
        expect(screen.getByText(/minimum credit score is 500/i)).toBeInTheDocument();
      });
    });

    it('accepts credit score at boundary values (500 and 850)', () => {
      const { rerender } = render(<FinancialDetailsStep {...defaultProps} initialCreditScore={500} />);
      
      let continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).not.toBeDisabled();
      
      rerender(<FinancialDetailsStep {...defaultProps} initialCreditScore={850} />);
      continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).not.toBeDisabled();
    });

    it('disables Continue button when credit score is invalid', () => {
      render(<FinancialDetailsStep {...defaultProps} initialCreditScore={450} />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Form submission', () => {
    it('calls onContinue with valid values when form is submitted', () => {
      render(<FinancialDetailsStep {...defaultProps} />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      fireEvent.click(continueButton);
      
      expect(mockOnContinue).toHaveBeenCalledWith(5000, 500, 650);
    });

    it('does not call onContinue when form has validation errors', () => {
      render(<FinancialDetailsStep {...defaultProps} initialIncome={1000} />);
      
      const form = screen.getByRole('button', { name: /see my estimate/i }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(mockOnContinue).not.toHaveBeenCalled();
    });

    it('validates all fields on submit and shows all errors', () => {
      render(<FinancialDetailsStep 
        {...defaultProps} 
        initialIncome={1000}
        initialDebt={20000}
      />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      fireEvent.click(continueButton);
      
      expect(screen.getByText(/minimum monthly income is \$1,800/i)).toBeInTheDocument();
      expect(screen.getByText(/maximum monthly debt is \$15,000/i)).toBeInTheDocument();
      expect(mockOnContinue).not.toHaveBeenCalled();
    });
  });

  describe('Real-time validation feedback', () => {
    it('shows validation error immediately when income changes to invalid value', async () => {
      render(<FinancialDetailsStep {...defaultProps} />);
      
      const incomeInput = screen.getByLabelText(/monthly income/i);
      fireEvent.change(incomeInput, { target: { value: '1500' } });
      
      await waitFor(() => {
        expect(screen.getByText(/minimum monthly income is \$1,800/i)).toBeInTheDocument();
      });
    });

    it('clears validation error when income changes to valid value', async () => {
      render(<FinancialDetailsStep {...defaultProps} initialIncome={1000} />);
      
      // Initially shows error
      expect(screen.getByText(/minimum monthly income is \$1,800/i)).toBeInTheDocument();
      
      const incomeInput = screen.getByLabelText(/monthly income/i);
      fireEvent.change(incomeInput, { target: { value: '5000' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/minimum monthly income is \$1,800/i)).not.toBeInTheDocument();
      });
    });

    it('formats currency input with thousand separators', () => {
      render(<FinancialDetailsStep {...defaultProps} initialIncome={5000} />);
      
      const incomeInput = screen.getByLabelText(/monthly income/i) as HTMLInputElement;
      expect(incomeInput.value).toBe('5,000');
    });
  });

  describe('Accessibility', () => {
    it('marks inputs as invalid with aria-invalid when errors exist', () => {
      render(<FinancialDetailsStep {...defaultProps} initialIncome={1000} />);
      
      const incomeInput = screen.getByLabelText(/monthly income/i);
      expect(incomeInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error messages with inputs via aria-describedby', () => {
      render(<FinancialDetailsStep {...defaultProps} initialIncome={1000} />);
      
      const incomeInput = screen.getByLabelText(/monthly income/i);
      expect(incomeInput).toHaveAttribute('aria-describedby', 'income-error');
    });

    it('shows help text via aria-describedby when no errors', () => {
      render(<FinancialDetailsStep {...defaultProps} />);
      
      const incomeInput = screen.getByLabelText(/monthly income/i);
      expect(incomeInput).toHaveAttribute('aria-describedby', 'income-help');
    });
  });

  describe('Requirement 14.3 compliance', () => {
    it('validates that all three fields are non-empty', () => {
      render(<FinancialDetailsStep 
        {...defaultProps} 
        initialIncome={0}
      />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).toBeDisabled();
    });

    it('validates that all fields are within acceptable ranges', () => {
      render(<FinancialDetailsStep 
        {...defaultProps} 
        initialIncome={3500}
        initialDebt={800}
        initialCreditScore={720}
      />);
      
      const continueButton = screen.getByRole('button', { name: /see my estimate/i });
      expect(continueButton).not.toBeDisabled();
    });

    it('displays inline validation messages for out-of-range values', () => {
      render(<FinancialDetailsStep 
        {...defaultProps} 
        initialIncome={1500}
        initialDebt={18000}
      />);
      
      expect(screen.getByText(/minimum monthly income is \$1,800/i)).toBeInTheDocument();
      expect(screen.getByText(/maximum monthly debt is \$15,000/i)).toBeInTheDocument();
    });
  });
});
