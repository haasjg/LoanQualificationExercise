import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryStep } from './SummaryStep';
import { Decision } from '../../engine/types';

describe('SummaryStep - Requirement 14.6', () => {
  const mockApprovedResult = {
    decision: Decision.APPROVED,
    reasonCode: null,
    apr: 12.50,
    estimatedPayment: 291.00,
    postLoanDTI: 0.32,
    benchmarkRate: 11.50,
  };

  const mockCounterOfferResult = {
    decision: Decision.COUNTER_OFFER,
    reasonCode: null,
    apr: 16.50,
    estimatedPayment: 291.00,
    postLoanDTI: 0.42,
    benchmarkRate: 11.50,
  };

  it('should display selected loan amount, term, payment, APR, and total cost', () => {
    render(
      <SummaryStep
        engineResult={mockApprovedResult}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    // Check all required fields are displayed
    expect(screen.getByText('$10,000')).toBeInTheDocument();
    expect(screen.getByText('48 months')).toBeInTheDocument();
    expect(screen.getByText('$291.00/mo')).toBeInTheDocument();
    expect(screen.getByText('12.50%')).toBeInTheDocument();
    
    // Total cost = payment * months = 291 * 48 = 13,968
    expect(screen.getByText('$13,968.00')).toBeInTheDocument();
  });

  it('should display "What changed" section when term was adjusted', () => {
    render(
      <SummaryStep
        engineResult={mockApprovedResult}
        loanAmount={10000}
        termMonths={48}
        originalTerm={36}
        originalPayment={350.00}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    expect(screen.getByText('What changed')).toBeInTheDocument();
    expect(screen.getByText(/Extended term from 36 to 48 months/)).toBeInTheDocument();
    expect(screen.getByText(/by \$59\.00/)).toBeInTheDocument();
  });

  it('should NOT display "What changed" section when no changes were made', () => {
    render(
      <SummaryStep
        engineResult={mockApprovedResult}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    expect(screen.queryByText('What changed')).not.toBeInTheDocument();
  });

  it('should display prominent disclaimer "Simulated estimate - not a final offer"', () => {
    render(
      <SummaryStep
        engineResult={mockApprovedResult}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    const disclaimer = screen.getByText('Simulated estimate - not a final offer');
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveClass('text-sm', 'font-semibold', 'text-slate-700');
  });

  it('should display primary CTA "Start your application" for APPROVED decision', () => {
    render(
      <SummaryStep
        engineResult={mockApprovedResult}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: 'Start your application' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('w-full', 'bg-indigo-600');
  });

  it('should display primary CTA "Start your application" for COUNTER_OFFER decision', () => {
    render(
      <SummaryStep
        engineResult={mockCounterOfferResult}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: 'Start your application' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('w-full', 'bg-indigo-600');
  });

  it('should display secondary "Edit details" and "Start over" links', () => {
    render(
      <SummaryStep
        engineResult={mockApprovedResult}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Edit details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
  });

  it('should use clean slate-100 background for summary card', () => {
    const { container } = render(
      <SummaryStep
        engineResult={mockApprovedResult}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    const summaryCard = container.querySelector('.bg-slate-100');
    expect(summaryCard).toBeInTheDocument();
  });

  it('should display page heading "Your loan summary"', () => {
    render(
      <SummaryStep
        engineResult={mockApprovedResult}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    const heading = screen.getByText('Your loan summary');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-2xl', 'font-bold', 'text-slate-900');
  });

  it('should format currency values correctly with two decimal places', () => {
    render(
      <SummaryStep
        engineResult={{
          ...mockApprovedResult,
          estimatedPayment: 291.5, // Test rounding
        }}
        loanAmount={10000}
        termMonths={48}
        onStartOver={() => {}}
        onExploreAnother={() => {}}
      />
    );

    expect(screen.getByText('$291.50/mo')).toBeInTheDocument();
  });
});
