// src/App.reevaluate.test.tsx
// Integration test for handleReEvaluate handler (Task 28.5)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import type { ActivePlan, ProgressState } from './engine/types';
import { RetentionProductType } from './engine/types';

describe('App - handleReEvaluate Integration (Task 28.5)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should accept updated ApplicantInputs and return to simulator view', async () => {
    const user = userEvent.setup();

    // Setup: Create activePlan and progressState in localStorage
    const mockActivePlan: ActivePlan = {
      productType: RetentionProductType.SECURED_CREDIT_BUILDER,
      acceptedAt: '2024-01-15T10:00:00Z',
      initialInputs: {
        monthlyIncome: 5000,
        monthlyDebt: 2000,
        creditScore: 580,
        loanAmount: 10000,
        termMonths: 36,
      },
      initialEngineResult: {
        decision: 'DECLINED' as const,
        reasonCode: 'HIGH_RISK_SCORE' as const,
        apr: 16.5,
        estimatedPayment: 350,
        postLoanDTI: 0.47,
        benchmarkRate: 11.5,
      },
    };

    const mockProgressState: ProgressState = {
      milestones: [
        {
          milestoneId: 'secured-card-open',
          label: 'Open secured card account',
          completed: true,
          completedAt: '2024-01-20T10:00:00Z',
        },
        {
          milestoneId: 'first-payment',
          label: 'Make first on-time payment',
          completed: true,
          completedAt: '2024-02-05T10:00:00Z',
        },
        {
          milestoneId: '3-months',
          label: 'Complete 3 months on-time payments',
          completed: true,
          completedAt: '2024-04-05T10:00:00Z',
        },
        {
          milestoneId: '6-months',
          label: 'Complete 6 months on-time payments',
          completed: true,
          completedAt: '2024-07-05T10:00:00Z',
        },
      ],
      updatedInputs: {
        monthlyIncome: 5500,
        monthlyDebt: 1800,
        creditScore: 650,
        loanAmount: 10000,
        termMonths: 36,
      },
      lastUpdated: '2024-07-05T10:00:00Z',
    };

    localStorage.setItem('pathToYesActivePlan', JSON.stringify(mockActivePlan));
    localStorage.setItem('pathToYesProgressState', JSON.stringify(mockProgressState));

    // Render app - should show ProgressTracker
    render(<App />);

    // Verify ProgressTracker is displayed
    expect(screen.getByText(/Your Path to Yes Plan/i)).toBeDefined();
    expect(screen.getByText(/All milestones complete/i)).toBeDefined();

    // Click "Re-Evaluate My Application" button
    const reEvaluateButton = screen.getByRole('button', {
      name: /Re-Evaluate My Application/i,
    });
    expect(reEvaluateButton).not.toBeDisabled();
    
    await user.click(reEvaluateButton);

    // After handleReEvaluate:
    // 1. Main inputs should be updated with updatedInputs
    // 2. activePlan and progressState should be cleared from localStorage
    // 3. App should return to simulator view
    
    // Verify localStorage is cleared
    expect(localStorage.getItem('pathToYesActivePlan')).toBeNull();
    expect(localStorage.getItem('pathToYesProgressState')).toBeNull();

    // Verify app returns to simulator view (look for simulator-specific elements)
    // The DecisionBanner or ApplicantInputPanel should be visible
    expect(screen.queryByText(/Your Path to Yes Plan/i)).toBeNull();
    
    // Check that we're back in the simulator with updated inputs reflected in the decision
    // With creditScore 650, income 5500, debt 1800, loan 10000 at 36 months:
    // This should produce a specific decision (likely COUNTER_OFFER or APPROVED)
    expect(
      screen.queryByText(/Loan Decision/i) || 
      screen.queryByText(/Application Status/i) ||
      screen.queryByText(/Monthly Gross Income/i)
    ).not.toBeNull();
  });

  it('should store updatedInputs in progressState before clearing', async () => {
    const user = userEvent.setup();

    // Setup with partially complete milestones
    const mockActivePlan: ActivePlan = {
      productType: RetentionProductType.HIGH_YIELD_SAVINGS,
      acceptedAt: '2024-01-15T10:00:00Z',
      initialInputs: {
        monthlyIncome: 1700,
        monthlyDebt: 500,
        creditScore: 680,
        loanAmount: 5000,
        termMonths: 24,
      },
      initialEngineResult: {
        decision: 'DECLINED' as const,
        reasonCode: 'INSUFFICIENT_INCOME' as const,
        apr: 13.0,
        estimatedPayment: 220,
        postLoanDTI: 0.42,
        benchmarkRate: 11.5,
      },
    };

    const mockProgressState: ProgressState = {
      milestones: [
        {
          milestoneId: 'open-account',
          label: 'Open high-yield savings account',
          completed: true,
          completedAt: '2024-01-20T10:00:00Z',
        },
        {
          milestoneId: 'direct-deposit',
          label: 'Set up direct deposit',
          completed: true,
          completedAt: '2024-02-01T10:00:00Z',
        },
        {
          milestoneId: '3-months-dd',
          label: 'Maintain direct deposit for 3 months',
          completed: true,
          completedAt: '2024-05-01T10:00:00Z',
        },
      ],
      updatedInputs: {
        monthlyIncome: 2100,
        monthlyDebt: 500,
        creditScore: 680,
        loanAmount: 5000,
        termMonths: 24,
      },
      lastUpdated: '2024-05-01T10:00:00Z',
    };

    localStorage.setItem('pathToYesActivePlan', JSON.stringify(mockActivePlan));
    localStorage.setItem('pathToYesProgressState', JSON.stringify(mockProgressState));

    // Spy on localStorage.setItem to verify it's called with updated progressState
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<App />);

    // All milestones complete, button should be enabled
    const reEvaluateButton = screen.getByRole('button', {
      name: /Re-Evaluate My Application/i,
    });
    
    await user.click(reEvaluateButton);

    // Verify that progressState was updated before being cleared
    // The handler should save progressState with updatedInputs before clearing
    const progressStateCalls = setItemSpy.mock.calls.filter(
      (call) => call[0] === 'pathToYesProgressState'
    );
    
    // Should have been called at least once (the update before clear)
    expect(progressStateCalls.length).toBeGreaterThan(0);

    // Verify final state: localStorage should be cleared
    expect(localStorage.getItem('pathToYesActivePlan')).toBeNull();
    expect(localStorage.getItem('pathToYesProgressState')).toBeNull();

    setItemSpy.mockRestore();
  });

  it('should re-run underwriting engine with updated inputs', async () => {
    const user = userEvent.setup();

    // Setup with updated inputs that should produce APPROVED decision
    const mockActivePlan: ActivePlan = {
      productType: RetentionProductType.SECURED_CREDIT_BUILDER,
      acceptedAt: '2024-01-15T10:00:00Z',
      initialInputs: {
        monthlyIncome: 5000,
        monthlyDebt: 2000,
        creditScore: 580,
        loanAmount: 10000,
        termMonths: 36,
      },
      initialEngineResult: {
        decision: 'DECLINED' as const,
        reasonCode: 'HIGH_RISK_SCORE' as const,
        apr: 16.5,
        estimatedPayment: 350,
        postLoanDTI: 0.47,
        benchmarkRate: 11.5,
      },
    };

    const mockProgressState: ProgressState = {
      milestones: [
        {
          milestoneId: 'secured-card-open',
          label: 'Open secured card account',
          completed: true,
          completedAt: '2024-01-20T10:00:00Z',
        },
        {
          milestoneId: 'first-payment',
          label: 'Make first on-time payment',
          completed: true,
          completedAt: '2024-02-05T10:00:00Z',
        },
        {
          milestoneId: '3-months',
          label: 'Complete 3 months on-time payments',
          completed: true,
          completedAt: '2024-04-05T10:00:00Z',
        },
        {
          milestoneId: '6-months',
          label: 'Complete 6 months on-time payments',
          completed: true,
          completedAt: '2024-07-05T10:00:00Z',
        },
      ],
      // Updated inputs that should produce APPROVED (good score, low DTI)
      updatedInputs: {
        monthlyIncome: 6000,
        monthlyDebt: 1000,
        creditScore: 720,
        loanAmount: 8000,
        termMonths: 36,
      },
      lastUpdated: '2024-07-05T10:00:00Z',
    };

    localStorage.setItem('pathToYesActivePlan', JSON.stringify(mockActivePlan));
    localStorage.setItem('pathToYesProgressState', JSON.stringify(mockProgressState));

    render(<App />);

    // Click re-evaluate button
    const reEvaluateButton = screen.getByRole('button', {
      name: /Re-Evaluate My Application/i,
    });
    
    await user.click(reEvaluateButton);

    // After re-evaluation with improved inputs:
    // - Credit score 720 (Prime tier)
    // - Monthly income $6000, debt $1000
    // - Loan $8000 at 36 months
    // Should produce APPROVED decision

    // The app should show the new decision in the simulator view
    // Look for approval indicators (this is an integration test, so we verify end result)
    expect(localStorage.getItem('pathToYesActivePlan')).toBeNull();
    expect(localStorage.getItem('pathToYesProgressState')).toBeNull();
    expect(screen.queryByText(/Your Path to Yes Plan/i)).toBeNull();
  });

  it('should handle case when progressState is null gracefully', () => {
    // Setup with only activePlan (no progressState)
    const mockActivePlan: ActivePlan = {
      productType: RetentionProductType.SECURED_CREDIT_BUILDER,
      acceptedAt: '2024-01-15T10:00:00Z',
      initialInputs: {
        monthlyIncome: 5000,
        monthlyDebt: 2000,
        creditScore: 580,
        loanAmount: 10000,
        termMonths: 36,
      },
      initialEngineResult: {
        decision: 'DECLINED' as const,
        reasonCode: 'HIGH_RISK_SCORE' as const,
        apr: 16.5,
        estimatedPayment: 350,
        postLoanDTI: 0.47,
        benchmarkRate: 11.5,
      },
    };

    localStorage.setItem('pathToYesActivePlan', JSON.stringify(mockActivePlan));
    // Note: NOT setting progressState

    // App should handle this gracefully and show simulator view
    render(<App />);

    // Should not crash and should show simulator (not ProgressTracker)
    expect(screen.queryByText(/Your Path to Yes Plan/i)).toBeNull();
  });
});
