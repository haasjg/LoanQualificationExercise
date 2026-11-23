import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeclineReasonDetail from './DeclineReasonDetail';
import { Decision, ReasonCode, type EngineResult, type ApplicantInputs } from '../engine/types';

describe('DeclineReasonDetail', () => {
  const baseInputs: ApplicantInputs = {
    monthlyIncome: 3500,
    monthlyDebt: 600,
    creditScore: 650,
    loanAmount: 15000,
    termMonths: 24,
  };

  const baseResult: EngineResult = {
    decision: Decision.DECLINED,
    reasonCode: null,
    apr: 16.5,
    estimatedPayment: 737,
    postLoanDTI: 0.382,
    benchmarkRate: 11.5,
  };

  it('renders HIGH_DTI decline reason with exact numbers', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 20000,
      termMonths: 24,
    };

    const result: EngineResult = {
      ...baseResult,
      reasonCode: ReasonCode.HIGH_DTI,
      estimatedPayment: 1000,
      postLoanDTI: 0.457, // (600 + 1000) / 3500 = 0.457
    };

    render(<DeclineReasonDetail engineResult={result} inputs={inputs} />);

    expect(screen.getByText('Why Was I Declined?')).toBeInTheDocument();
    expect(screen.getByText(/Adding this loan would bring your total debt payments to \$1600\.00 per month/)).toBeInTheDocument();
    expect(screen.getByText(/\$600\.00 existing debt \+ \$1000\.00 loan payment/)).toBeInTheDocument();
    expect(screen.getByText(/which is 45\.7% of your \$3500\.00 monthly income/)).toBeInTheDocument();
    expect(screen.getByText(/We require this ratio to be 45% or less/)).toBeInTheDocument();
  });

  it('renders HIGH_RISK_SCORE decline reason with current score', () => {
    const inputs: ApplicantInputs = {
      ...baseInputs,
      creditScore: 570,
    };

    const result: EngineResult = {
      ...baseResult,
      reasonCode: ReasonCode.HIGH_RISK_SCORE,
    };

    render(<DeclineReasonDetail engineResult={result} inputs={inputs} />);

    expect(screen.getByText('Why Was I Declined?')).toBeInTheDocument();
    expect(screen.getByText(/Your current credit score of 570 is below our minimum requirement of 600/)).toBeInTheDocument();
  });

  it('renders INSUFFICIENT_INCOME decline reason with current income', () => {
    const inputs: ApplicantInputs = {
      ...baseInputs,
      monthlyIncome: 1500,
    };

    const result: EngineResult = {
      ...baseResult,
      reasonCode: ReasonCode.INSUFFICIENT_INCOME,
    };

    render(<DeclineReasonDetail engineResult={result} inputs={inputs} />);

    expect(screen.getByText('Why Was I Declined?')).toBeInTheDocument();
    expect(screen.getByText(/Your reported monthly income of \$1500\.00 does not meet our minimum threshold of \$1,800/)).toBeInTheDocument();
  });

  it('renders EXCESSIVE_DEBT decline reason with debt and income', () => {
    const inputs: ApplicantInputs = {
      ...baseInputs,
      monthlyIncome: 2000,
      monthlyDebt: 2000,
    };

    const result: EngineResult = {
      ...baseResult,
      reasonCode: ReasonCode.EXCESSIVE_DEBT,
    };

    render(<DeclineReasonDetail engineResult={result} inputs={inputs} />);

    expect(screen.getByText('Why Was I Declined?')).toBeInTheDocument();
    expect(screen.getByText(/Your existing monthly debt obligations of \$2000\.00 meet or exceed your monthly income of \$2000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/100\.0% ratio/)).toBeInTheDocument();
  });

  it('renders LOAN_CAP_EXCEEDED decline reason with requested amount', () => {
    const inputs: ApplicantInputs = {
      ...baseInputs,
      creditScore: 620,
      loanAmount: 20000,
    };

    const result: EngineResult = {
      ...baseResult,
      reasonCode: ReasonCode.LOAN_CAP_EXCEEDED,
    };

    render(<DeclineReasonDetail engineResult={result} inputs={inputs} />);

    expect(screen.getByText('Why Was I Declined?')).toBeInTheDocument();
    expect(screen.getByText(/For applicants with credit scores in the 600-659 range/)).toBeInTheDocument();
    expect(screen.getByText(/we cap unsecured loan amounts at \$15,000/)).toBeInTheDocument();
    expect(screen.getByText(/You requested \$20000\.00/)).toBeInTheDocument();
  });

  it('returns null when reasonCode is null', () => {
    const result: EngineResult = {
      ...baseResult,
      reasonCode: null,
    };

    const { container } = render(<DeclineReasonDetail engineResult={result} inputs={baseInputs} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders fallback message for unknown reason codes', () => {
    const result: EngineResult = {
      ...baseResult,
      reasonCode: ReasonCode.INVALID_TERM,
    };

    render(<DeclineReasonDetail engineResult={result} inputs={baseInputs} />);

    expect(screen.getByText('Why Was I Declined?')).toBeInTheDocument();
    expect(screen.getByText(/Your application does not meet our current lending criteria/)).toBeInTheDocument();
  });

  it('renders with correct styling classes', () => {
    const result: EngineResult = {
      ...baseResult,
      reasonCode: ReasonCode.HIGH_RISK_SCORE,
    };

    const { container } = render(<DeclineReasonDetail engineResult={result} inputs={baseInputs} />);
    
    const outerDiv = container.querySelector('.bg-stone-50');
    expect(outerDiv).toBeInTheDocument();
    expect(outerDiv).toHaveClass('border', 'border-stone-200', 'rounded-lg', 'p-6');
  });

  it('displays AlertCircle icon', () => {
    const result: EngineResult = {
      ...baseResult,
      reasonCode: ReasonCode.HIGH_RISK_SCORE,
    };

    const { container } = render(<DeclineReasonDetail engineResult={result} inputs={baseInputs} />);
    
    // Check for icon container with correct styling
    const iconContainer = container.querySelector('.bg-rose-100.rounded-full.p-2');
    expect(iconContainer).toBeInTheDocument();
  });
});
