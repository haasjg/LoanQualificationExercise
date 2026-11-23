import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import App from '../App';
import { LoanWizard } from './wizard/LoanWizard';
import { getInitialMilestones } from '../engine/milestones';
import { RetentionProductType, Decision, ReasonCode } from '../engine/types';
import type { ActivePlan, ProgressState } from '../engine/types';

/**
 * Task 16.3: product acceptance wiring and App view switch.
 * **Validates: Requirements 15.3**
 */
const inputs = {
  monthlyIncome: 3000,
  monthlyDebt: 500,
  creditScore: 580,
  loanAmount: 10000,
  termMonths: 36,
};

const plan: ActivePlan = {
  productType: RetentionProductType.SECURED_CREDIT_BUILDER,
  acceptedAt: '2024-01-15T10:00:00.000Z',
  initialInputs: inputs,
  initialEngineResult: {
    decision: Decision.DECLINED,
    reasonCodes: [ReasonCode.CREDIT_SCORE_TOO_LOW],
    apr: null,
    estimatedPayment: 0,
    postLoanDTI: 0,
  } as unknown as ActivePlan['initialEngineResult'],
};

const progress: ProgressState = {
  milestones: getInitialMilestones(plan.productType),
  updatedInputs: inputs,
  lastUpdated: plan.acceptedAt,
};

describe('product acceptance and App view switch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the wizard when no active plan exists', () => {
    render(<App />);
    expect(screen.queryByText(/Your Path to Yes Plan/i)).not.toBeInTheDocument();
  });

  it('renders ProgressTracker on mount when an active plan exists', () => {
    localStorage.setItem('pathToYesActivePlan', JSON.stringify(plan));
    localStorage.setItem('pathToYesProgressState', JSON.stringify(progress));
    render(<App />);
    expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
  });

  it('persists milestone toggles', async () => {
    localStorage.setItem('pathToYesActivePlan', JSON.stringify(plan));
    localStorage.setItem('pathToYesProgressState', JSON.stringify(progress));
    render(<App />);
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    const saved = JSON.parse(localStorage.getItem('pathToYesProgressState')!);
    expect(saved.milestones[0].completed).toBe(true);
  });

  it('Start Over clears storage and returns to the wizard', async () => {
    localStorage.setItem('pathToYesActivePlan', JSON.stringify(plan));
    localStorage.setItem('pathToYesProgressState', JSON.stringify(progress));
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start Over/i }));
    expect(screen.queryByText(/Your Path to Yes Plan/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('pathToYesActivePlan')).toBeNull();
    expect(localStorage.getItem('pathToYesProgressState')).toBeNull();
  });

  it('accepting a product saves the plan and calls onPlanAccepted', async () => {
    let accepted: ActivePlan | null = null;
    render(<LoanWizard onPlanAccepted={(p) => { accepted = p; }} />);
    // Step 1 -> 2 -> 3 using default values, then set a low credit score
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    const score = await screen.findByLabelText(/credit score/i);
    fireEvent.change(score, { target: { value: '580' } });
    await userEvent.click(screen.getByRole('button', { name: /continue|see|estimate/i }));
    const accept = await screen.findAllByRole('button', { name: /Accept & Start Plan/i });
    await userEvent.click(accept[0]);
    expect(accepted).not.toBeNull();
    expect(JSON.parse(localStorage.getItem('pathToYesActivePlan')!).productType).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('pathToYesProgressState')!).milestones.length).toBeGreaterThan(0);
  });
});
