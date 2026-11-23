import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoanAmountStep } from './LoanAmountStep';

describe('LoanAmountStep - Task 3.3 Requirements', () => {
  const mockOnContinue = vi.fn();
  const mockOnShowExamples = vi.fn();

  it('should render Continue button with full-width styling', () => {
    render(
      <LoanAmountStep
        initialAmount={10000}
        initialTerm={36}
        onContinue={mockOnContinue}
        onShowExamples={mockOnShowExamples}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeInTheDocument();
    
    // Verify button has w-full class (full-width)
    expect(continueButton.className).toContain('w-full');
    
    // Verify button has indigo-600 background
    expect(continueButton.className).toContain('bg-indigo-600');
    
    // Verify button has min-h-12 for mobile tap targets (requirement 14.2)
    expect(continueButton.className).toContain('min-h-12');
    
    // Verify button has proper padding
    expect(continueButton.className).toContain('py-4');
  });

  it('should render secondary "View example scenarios" text link', () => {
    render(
      <LoanAmountStep
        initialAmount={10000}
        initialTerm={36}
        onContinue={mockOnContinue}
        onShowExamples={mockOnShowExamples}
      />
    );

    const examplesLink = screen.getByRole('button', { name: /try an example scenario/i });
    expect(examplesLink).toBeInTheDocument();
    
    // Verify it's styled as a text link (not a button)
    expect(examplesLink.className).toContain('text-indigo-600');
  });

  it('should call onShowExamples when example scenarios link is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <LoanAmountStep
        initialAmount={10000}
        initialTerm={36}
        onContinue={mockOnContinue}
        onShowExamples={mockOnShowExamples}
      />
    );

    const examplesLink = screen.getByRole('button', { name: /try an example scenario/i });
    await user.click(examplesLink);
    
    expect(mockOnShowExamples).toHaveBeenCalledOnce();
  });

  it('should call onContinue with selected amount and term when Continue button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <LoanAmountStep
        initialAmount={10000}
        initialTerm={36}
        onContinue={mockOnContinue}
        onShowExamples={mockOnShowExamples}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);
    
    expect(mockOnContinue).toHaveBeenCalledWith(10000, 36);
  });

  it('should display loan amount in large numerals', () => {
    render(
      <LoanAmountStep
        initialAmount={15000}
        initialTerm={36}
        onContinue={mockOnContinue}
        onShowExamples={mockOnShowExamples}
      />
    );

    // Verify $15,000 is displayed in text-6xl (large numerals)
    const largeDisplay = screen.getAllByText('$15,000')[0];
    expect(largeDisplay).toBeInTheDocument();
    expect(largeDisplay.className).toContain('text-6xl');
  });

  it('should allow term selection via pill toggles', async () => {
    const user = userEvent.setup();
    
    render(
      <LoanAmountStep
        initialAmount={10000}
        initialTerm={36}
        onContinue={mockOnContinue}
        onShowExamples={mockOnShowExamples}
      />
    );

    // Find and click the 48 months button
    const term48Button = screen.getByRole('button', { name: /48 months/i });
    await user.click(term48Button);

    // Click continue and verify the new term is passed
    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);
    
    expect(mockOnContinue).toHaveBeenCalledWith(10000, 48);
  });
});
