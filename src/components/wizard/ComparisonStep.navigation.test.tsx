import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComparisonStep } from './ComparisonStep';
import { ApplicantInputs, EngineResult, DecisionStatus } from '../../engine/types';

/**
 * Task 6.3: Navigation Controls Verification
 * Requirements: 14.5 - Step 4: Side-by-Side Comparison View
 * 
 * Verifies that ComparisonStep implements the required navigation controls
 * with proper button hierarchy:
 * - Primary: "Use [term] months" button (applies alternative)
 * - Secondary: "Keep original" button and "Edit details" link
 */

describe('ComparisonStep - Navigation Controls (Req 14.5)', () => {
  const originalInputs: ApplicantInputs = {
    monthlyIncome: 5000,
    monthlyDebt: 500,
    creditScore: 650,
    loanAmount: 10000,
    termMonths: 24,
  };

  const originalEstimate: EngineResult = {
    decision: 'COUNTER_OFFER' as DecisionStatus,
    apr: 12.5,
    estimatedPayment: 471.03,
    postLoanDTI: 0.1942,
    reasonCodes: [],
  };

  const alternativeInputs: ApplicantInputs = {
    ...originalInputs,
    termMonths: 36,
  };

  const alternativeEstimate: EngineResult = {
    decision: 'APPROVED' as DecisionStatus,
    apr: 12.5,
    estimatedPayment: 332.14,
    postLoanDTI: 0.1664,
    reasonCodes: [],
  };

  const mockHandlers = {
    onSelectAlternative: vi.fn(),
    onKeepOriginal: vi.fn(),
    onEditDetails: vi.fn(),
    onBack: vi.fn(),
  };

  it('should render primary action button with alternative term in label', () => {
    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternativeInputs}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    // Primary button should use alternative term in label
    const primaryButton = screen.getByRole('button', { name: /use 36 months/i });
    expect(primaryButton).toBeInTheDocument();
    
    // Primary button should have indigo background (brand color)
    expect(primaryButton).toHaveClass('bg-indigo-600');
    expect(primaryButton).toHaveClass('font-semibold');
  });

  it('should render "Keep original" secondary button', () => {
    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternativeInputs}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    // Secondary "Keep original" button
    const keepButton = screen.getByRole('button', { name: /keep original/i });
    expect(keepButton).toBeInTheDocument();
    
    // Should use secondary button styling (white background, border)
    expect(keepButton).toHaveClass('bg-white');
    expect(keepButton).toHaveClass('border-2');
    expect(keepButton).toHaveClass('border-slate-300');
  });

  it('should render "Edit details" secondary link', () => {
    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternativeInputs}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    // Secondary "Edit details" text link
    const editButton = screen.getByRole('button', { name: /edit details/i });
    expect(editButton).toBeInTheDocument();
    
    // Should use text link styling (no prominent background)
    expect(editButton).toHaveClass('text-slate-600');
    expect(editButton).not.toHaveClass('bg-indigo-600');
  });

  it('should call onSelectAlternative when primary button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternativeInputs}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    const primaryButton = screen.getByRole('button', { name: /use 36 months/i });
    await user.click(primaryButton);

    expect(mockHandlers.onSelectAlternative).toHaveBeenCalledTimes(1);
  });

  it('should call onKeepOriginal when "Keep original" is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternativeInputs}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    const keepButton = screen.getByRole('button', { name: /keep original/i });
    await user.click(keepButton);

    expect(mockHandlers.onKeepOriginal).toHaveBeenCalledTimes(1);
  });

  it('should call onEditDetails when "Edit details" is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternativeInputs}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit details/i });
    await user.click(editButton);

    expect(mockHandlers.onEditDetails).toHaveBeenCalledTimes(1);
  });

  it('should render Back button for navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternativeInputs}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
    
    await user.click(backButton);
    expect(mockHandlers.onBack).toHaveBeenCalledTimes(1);
  });

  it('should maintain button hierarchy: primary > secondary > text link', () => {
    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternativeInputs}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    const primaryButton = screen.getByRole('button', { name: /use 36 months/i });
    const keepButton = screen.getByRole('button', { name: /keep original/i });
    const editButton = screen.getByRole('button', { name: /edit details/i });

    // Primary should have strongest visual weight
    expect(primaryButton).toHaveClass('bg-indigo-600');
    expect(primaryButton).toHaveClass('font-semibold');
    
    // Secondary should be less prominent
    expect(keepButton).toHaveClass('bg-white');
    expect(keepButton).toHaveClass('font-medium');
    
    // Text link should be least prominent
    expect(editButton).toHaveClass('text-sm');
    expect(editButton).not.toHaveClass('shadow');
  });

  it('should use dynamic term value in primary button label', () => {
    // Test with different term
    const alternative48Months = {
      ...alternativeInputs,
      termMonths: 48,
    };

    render(
      <ComparisonStep
        originalInputs={originalInputs}
        originalEstimate={originalEstimate}
        alternativeInputs={alternative48Months}
        alternativeEstimate={alternativeEstimate}
        {...mockHandlers}
      />
    );

    // Should show "Use 48 months" not hardcoded value
    const primaryButton = screen.getByRole('button', { name: /use 48 months/i });
    expect(primaryButton).toBeInTheDocument();
  });
});
