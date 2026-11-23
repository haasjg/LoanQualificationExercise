// src/App.startover.test.tsx
/**
 * Integration test for handleStartOver handler (Task 28.6)
 * **Validates: Requirements 13.7**
 * 
 * This test verifies that handleStartOver correctly:
 * 1. Clears activePlan from localStorage
 * 2. Clears progressState from localStorage
 * 3. Resets activePlan state to null
 * 4. Resets progressState state to null
 * 5. Resets inputs to default values
 * 6. Returns to default simulator view
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from './App';
import { saveActivePlan, saveProgressState, loadActivePlan, loadProgressState } from './utils/storage';
import { Decision, ReasonCode, RetentionProductType, DEFAULT_INPUTS } from './engine/types';
import type { ActivePlan, ProgressState } from './engine/types';

describe('App - handleStartOver Integration (Task 28.6)', () => {
  const mockActivePlan: ActivePlan = {
    productType: RetentionProductType.SECURED_CREDIT_BUILDER,
    acceptedAt: '2024-01-15T10:00:00Z',
    initialInputs: {
      monthlyIncome: 2800,
      monthlyDebt: 500,
      creditScore: 580,
      loanAmount: 7000,
      termMonths: 36,
    },
    initialEngineResult: {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.HIGH_RISK_SCORE,
      apr: 0,
      estimatedPayment: 0,
      postLoanDTI: 0.5,
      benchmarkRate: 11.5,
    },
  };

  const mockProgressState: ProgressState = {
    milestones: [
      {
        milestoneId: 'm1',
        label: 'Open secured credit card account',
        completed: true,
        completedAt: '2024-01-16T12:00:00Z',
      },
      {
        milestoneId: 'm2',
        label: 'Make first on-time payment',
        completed: true,
        completedAt: '2024-02-01T09:00:00Z',
      },
      {
        milestoneId: 'm3',
        label: 'Complete 3 months of on-time payments',
        completed: true,
        completedAt: '2024-02-10T10:00:00Z',
      },
    ],
    updatedInputs: {
      monthlyIncome: 3200,
      monthlyDebt: 400,
      creditScore: 620,
      loanAmount: 7000,
      termMonths: 36,
    },
    lastUpdated: '2024-02-05T14:30:00Z',
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Mock fetch for FRED API to prevent network calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      } as Response)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears localStorage and resets to simulator view when Start Over is clicked', async () => {
    const user = userEvent.setup();

    // Setup: Persist activePlan and progressState to localStorage
    saveActivePlan(mockActivePlan);
    saveProgressState(mockProgressState);

    // Verify data is in localStorage
    expect(loadActivePlan()).not.toBeNull();
    expect(loadProgressState()).not.toBeNull();

    // Render App - should show ProgressTracker
    render(<App />);

    // Verify ProgressTracker is displayed
    await waitFor(() => {
      expect(screen.getByText('Your Path to Yes Plan')).toBeInTheDocument();
    });
    expect(screen.getByText('Secured Credit Builder Card')).toBeInTheDocument();

    // Click Start Over button
    const startOverButton = screen.getByRole('button', { name: /Start Over/i });
    await user.click(startOverButton);

    // Verify localStorage is cleared
    await waitFor(() => {
      expect(loadActivePlan()).toBeNull();
      expect(loadProgressState()).toBeNull();
    });

    // Verify simulator view is displayed (not ProgressTracker)
    await waitFor(() => {
      expect(screen.queryByText('Your Path to Yes Plan')).not.toBeInTheDocument();
      expect(screen.queryByText('Secured Credit Builder Card')).not.toBeInTheDocument();
    });

    // Verify Applicant Information panel is displayed (default simulator view)
    await waitFor(() => {
      expect(screen.getByText('Applicant Information')).toBeInTheDocument();
      expect(screen.getByText(/Monthly Gross Income/i)).toBeInTheDocument();
    });
  });

  it('resets inputs to DEFAULT_INPUTS after clicking Start Over', async () => {
    const user = userEvent.setup();

    // Setup: Persist activePlan and progressState
    saveActivePlan(mockActivePlan);
    saveProgressState(mockProgressState);

    // Render App
    render(<App />);

    // Wait for ProgressTracker to render
    await waitFor(() => {
      expect(screen.getByText('Your Path to Yes Plan')).toBeInTheDocument();
    });

    // Click Start Over
    const startOverButton = screen.getByRole('button', { name: /Start Over/i });
    await user.click(startOverButton);

    // Verify inputs are reset to defaults by checking the sliders exist with default values
    await waitFor(() => {
      // Find all range inputs (sliders)
      const sliders = screen.getAllByRole('slider') as HTMLInputElement[];
      
      // Monthly Income slider (first slider) should be at DEFAULT_INPUTS.monthlyIncome
      expect(sliders[0].value).toBe(String(DEFAULT_INPUTS.monthlyIncome));
      
      // Monthly Debt slider (second slider) should be at DEFAULT_INPUTS.monthlyDebt
      expect(sliders[1].value).toBe(String(DEFAULT_INPUTS.monthlyDebt));
      
      // Credit Score slider (third slider) should be at DEFAULT_INPUTS.creditScore
      expect(sliders[2].value).toBe(String(DEFAULT_INPUTS.creditScore));
    });
    
    // Verify select inputs (Loan Amount and Term) using combobox role
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects[0].value).toBe(String(DEFAULT_INPUTS.loanAmount));
    expect(selects[1].value).toBe(String(DEFAULT_INPUTS.termMonths));
  });

  it('shows DecisionBanner after Start Over with DEFAULT_INPUTS', async () => {
    const user = userEvent.setup();

    // Setup
    saveActivePlan(mockActivePlan);
    saveProgressState(mockProgressState);

    // Render
    render(<App />);

    // Wait for ProgressTracker
    await waitFor(() => {
      expect(screen.getByText('Your Path to Yes Plan')).toBeInTheDocument();
    });

    // Click Start Over
    const startOverButton = screen.getByRole('button', { name: /Start Over/i });
    await user.click(startOverButton);

    // Verify DecisionBanner is displayed
    // DEFAULT_INPUTS result in COUNTER_OFFER (see types.ts comment)
    await waitFor(() => {
      // Look for counter-offer message
      expect(screen.getByText(/We Can Work With You/i)).toBeInTheDocument();
    });
    
    // Verify simulator inputs are visible
    expect(screen.getByText('Applicant Information')).toBeInTheDocument();
  });

  it('allows user to interact with simulator after Start Over', async () => {
    const user = userEvent.setup();

    // Setup
    saveActivePlan(mockActivePlan);
    saveProgressState(mockProgressState);

    // Render
    render(<App />);

    // Wait for ProgressTracker
    await waitFor(() => {
      expect(screen.getByText('Your Path to Yes Plan')).toBeInTheDocument();
    });

    // Click Start Over
    const startOverButton = screen.getByRole('button', { name: /Start Over/i });
    await user.click(startOverButton);

    // Wait for simulator view
    await waitFor(() => {
      expect(screen.getByText(/Monthly Gross Income/i)).toBeInTheDocument();
    });

    // Try to adjust Monthly Income slider (first slider)
    const sliders = screen.getAllByRole('slider') as HTMLInputElement[];
    const incomeSlider = sliders[0];
    
    // Verify initial value
    expect(incomeSlider.value).toBe(String(DEFAULT_INPUTS.monthlyIncome));
    
    // Click on the slider to change its value (simulating user interaction)
    await user.click(incomeSlider);
    
    // The slider should still be functional and in the DOM
    expect(incomeSlider).toBeInTheDocument();
    expect(incomeSlider).not.toBeDisabled();
  });

  it('does not persist any state after Start Over', async () => {
    const user = userEvent.setup();

    // Setup
    saveActivePlan(mockActivePlan);
    saveProgressState(mockProgressState);

    // Render
    render(<App />);

    // Wait for ProgressTracker
    await waitFor(() => {
      expect(screen.getByText('Your Path to Yes Plan')).toBeInTheDocument();
    });

    // Click Start Over
    const startOverButton = screen.getByRole('button', { name: /Start Over/i });
    await user.click(startOverButton);

    // Verify localStorage is empty
    await waitFor(() => {
      expect(localStorage.length).toBe(0);
    });
  });
});
