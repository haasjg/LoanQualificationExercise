import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoanRequestSummaryCard } from './LoanRequestSummaryCard';

describe('LoanRequestSummaryCard', () => {
  it('renders the label "Your loan request"', () => {
    render(<LoanRequestSummaryCard loanAmount={10000} termMonths={36} />);
    expect(screen.getByText('Your loan request')).toBeInTheDocument();
  });

  it('displays the loan amount formatted as currency', () => {
    render(<LoanRequestSummaryCard loanAmount={10000} termMonths={36} />);
    expect(screen.getByText('$10,000')).toBeInTheDocument();
  });

  it('displays the term in months', () => {
    render(<LoanRequestSummaryCard loanAmount={10000} termMonths={36} />);
    expect(screen.getByText(/for 36 months/)).toBeInTheDocument();
  });

  it('formats large amounts correctly', () => {
    render(<LoanRequestSummaryCard loanAmount={25000} termMonths={60} />);
    expect(screen.getByText('$25,000')).toBeInTheDocument();
    expect(screen.getByText(/for 60 months/)).toBeInTheDocument();
  });

  it('formats small amounts correctly', () => {
    render(<LoanRequestSummaryCard loanAmount={2000} termMonths={12} />);
    expect(screen.getByText('$2,000')).toBeInTheDocument();
    expect(screen.getByText(/for 12 months/)).toBeInTheDocument();
  });

  it('applies slate-100 background styling', () => {
    const { container } = render(<LoanRequestSummaryCard loanAmount={10000} termMonths={36} />);
    const card = container.querySelector('.bg-slate-100');
    expect(card).toBeInTheDocument();
  });

  it('renders as a compact card with appropriate styling', () => {
    const { container } = render(<LoanRequestSummaryCard loanAmount={10000} termMonths={36} />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-slate-100', 'rounded-md', 'p-4', 'border', 'border-slate-200');
  });
});
