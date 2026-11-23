// src/App.view-flow.integration.test.tsx
// Phase 2 Integration Tests for App.tsx
// Tests the complete flow: Simulator -> ConversionView -> ProgressTracker
// **Validates: Requirements 12.3, 13.1-13.8**

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { Decision, RetentionProductType } from './engine/types';
import { loadActivePlan, loadProgressState } from './utils/storage';

describe('App Phase 2 Integration Tests (Task 28.8)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Accept Product Flow (Req 12.3, 13.1)', () => {
    it('should transition from simulator to ConversionView to ProgressTracker when accepting product', async () => {
      const user = userEvent.setup();

      // Step 1: Start in Simulator view
      render(<App />);
      
      // Verify no activePlan exists yet
      expect(loadActivePlan()).toBeNull();
      expect(loadProgressState()).toBeNull();
      
      // Verify simulator elements are present
      expect(screen.getByText('Path to Yes')).toBeInTheDocument();
      
      // Step 2: Set inputs to trigger DECLINED decision
      // Use the Credit-Thin preset to trigger DECLINED (credit score < 600)
      const creditThinPreset = await screen.findByRole('button', { name: /Credit-Thin/i });
      await user.click(creditThinPreset);

      // Wait for ConversionView to appear
      const conversionHeading = await screen.findByText(/Application Could Not Be Approved/i);
      expect(conversionHeading).toBeInTheDocument();

      // Step 3: Accept a product offer
      const acceptButtons = screen.getAllByRole('button', { name: /Accept & Start Plan/i });
      expect(acceptButtons.length).toBeGreaterThan(0);
      
      await user.click(acceptButtons[0]);

      // Step 4: Verify transition to ProgressTracker
      await waitFor(() => {
        expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
        expect(screen.getByText(/milestones completed/i)).toBeInTheDocument();
      });

      // Step 5: Verify localStorage state
      const activePlan = loadActivePlan();
      const progressState = loadProgressState();
      
      expect(activePlan).not.toBeNull();
      expect(activePlan?.productType).toBe(RetentionProductType.SECURED_CREDIT_BUILDER);
      
      expect(progressState).not.toBeNull();
      expect(progressState?.milestones.length).toBeGreaterThan(0);
      expect(progressState?.milestones.every(m => !m.completed)).toBe(true);
    });

    it('should persist accepted product across page reload', async () => {
      const user = userEvent.setup();

      // Initial render
      const { unmount } = render(<App />);
      
      // Use the Credit-Thin preset to trigger DECLINED
      const creditThinPreset = await screen.findByRole('button', { name: /Credit-Thin/i });
      await user.click(creditThinPreset);

      await screen.findByText(/Application Could Not Be Approved/i);
      
      const acceptButtons = screen.getAllByRole('button', { name: /Accept & Start Plan/i });
      await user.click(acceptButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
      });

      // Verify localStorage before unmount
      const planBeforeUnmount = loadActivePlan();
      expect(planBeforeUnmount).not.toBeNull();

      // Simulate page reload by unmounting and re-rendering
      unmount();

      // Re-render app
      render(<App />);

      // Should still show ProgressTracker
      expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
      
      // localStorage should still have the plan
      const planAfterReload = loadActivePlan();
      expect(planAfterReload).toEqual(planBeforeUnmount);
    });
  });

  describe('Milestone Toggle Persistence (Req 13.4, 13.6)', () => {
    it('should toggle milestone completion and persist to localStorage', async () => {
      const user = userEvent.setup();

      // Setup ProgressTracker state
      const mockActivePlan = {
        productType: RetentionProductType.SECURED_CREDIT_BUILDER,
        acceptedAt: new Date().toISOString(),
        initialInputs: {
          monthlyIncome: 2800,
          monthlyDebt: 200,
          creditScore: 570,
          loanAmount: 7000,
          termMonths: 36,
        },
        initialEngineResult: {
          decision: Decision.DECLINED,
          reasonCode: null,
          apr: 16.50,
          estimatedPayment: 300,
          postLoanDTI: 0.40,
          benchmarkRate: 11.50,
        },
      };

      const mockProgressState = {
        milestones: [
          {
            milestoneId: 'scb-open',
            label: 'Open secured credit builder account',
            completed: false,
            completedAt: null,
          },
          {
            milestoneId: 'scb-first-payment',
            label: 'Make first on-time payment',
            completed: false,
            completedAt: null,
          },
        ],
        updatedInputs: mockActivePlan.initialInputs,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('pathToYesActivePlan', JSON.stringify(mockActivePlan));
      localStorage.setItem('pathToYesProgressState', JSON.stringify(mockProgressState));

      render(<App />);

      // Find and click first milestone checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
      
      await user.click(checkboxes[0]);

      // Verify milestone is marked as completed in localStorage
      await waitFor(() => {
        const updatedProgress = loadProgressState();
        expect(updatedProgress?.milestones[0].completed).toBe(true);
        expect(updatedProgress?.milestones[0].completedAt).not.toBeNull();
      });

      // Toggle back to incomplete
      await user.click(checkboxes[0]);

      await waitFor(() => {
        const updatedProgress = loadProgressState();
        expect(updatedProgress?.milestones[0].completed).toBe(false);
        expect(updatedProgress?.milestones[0].completedAt).toBeNull();
      });
    });

    it('should update completion percentage when milestones are toggled', async () => {
      const user = userEvent.setup();

      const mockActivePlan = {
        productType: RetentionProductType.SECURED_CREDIT_BUILDER,
        acceptedAt: new Date().toISOString(),
        initialInputs: {
          monthlyIncome: 2800,
          monthlyDebt: 200,
          creditScore: 570,
          loanAmount: 7000,
          termMonths: 36,
        },
        initialEngineResult: {
          decision: Decision.DECLINED,
          reasonCode: null,
          apr: 16.50,
          estimatedPayment: 300,
          postLoanDTI: 0.40,
          benchmarkRate: 11.50,
        },
      };

      const mockProgressState = {
        milestones: [
          { milestoneId: 'scb-open', label: 'Open account', completed: false, completedAt: null },
          { milestoneId: 'scb-first-payment', label: 'First payment', completed: false, completedAt: null },
          { milestoneId: 'scb-3-months', label: '3 months payments', completed: false, completedAt: null },
          { milestoneId: 'scb-6-months', label: '6 months payments', completed: false, completedAt: null },
        ],
        updatedInputs: mockActivePlan.initialInputs,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('pathToYesActivePlan', JSON.stringify(mockActivePlan));
      localStorage.setItem('pathToYesProgressState', JSON.stringify(mockProgressState));

      render(<App />);

      // Initial state: 0 of 4 milestones completed (0%)
      expect(screen.getByText(/0 of 4 milestones completed/i)).toBeInTheDocument();

      // Complete first milestone
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      // Should show 1 of 4 (25%)
      await waitFor(() => {
        expect(screen.getByText(/1 of 4 milestones completed/i)).toBeInTheDocument();
      });

      // Complete second milestone
      await user.click(checkboxes[1]);

      // Should show 2 of 4 (50%)
      await waitFor(() => {
        expect(screen.getByText(/2 of 4 milestones completed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Re-Evaluate Flow (Req 13.5, 13.7)', () => {
    it('should return to simulator with updated inputs after re-evaluation', async () => {
      const user = userEvent.setup();

      const mockActivePlan = {
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
          decision: Decision.DECLINED,
          reasonCode: null,
          apr: 16.50,
          estimatedPayment: 350,
          postLoanDTI: 0.47,
          benchmarkRate: 11.50,
        },
      };

      const mockProgressState = {
        milestones: [
          { milestoneId: 'scb-open', label: 'Open account', completed: true, completedAt: '2024-01-20T10:00:00Z' },
          { milestoneId: 'scb-first-payment', label: 'First payment', completed: true, completedAt: '2024-02-05T10:00:00Z' },
          { milestoneId: 'scb-3-months', label: '3 months', completed: true, completedAt: '2024-04-05T10:00:00Z' },
          { milestoneId: 'scb-6-months', label: '6 months', completed: true, completedAt: '2024-07-05T10:00:00Z' },
        ],
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

      // Verify ProgressTracker is displayed
      expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();

      // Click Re-Evaluate button
      const reEvaluateButton = screen.getByRole('button', { name: /Re-Evaluate My Application/i });
      await user.click(reEvaluateButton);

      // Verify localStorage is cleared
      await waitFor(() => {
        expect(loadActivePlan()).toBeNull();
        expect(loadProgressState()).toBeNull();
      });

      // Verify app returns to simulator view
      expect(screen.queryByText(/Your Path to Yes Plan/i)).not.toBeInTheDocument();
      
      // Verify updated inputs are reflected
      // With improved credit score (720), should show better decision
      await waitFor(() => {
        const numberInputs = screen.getAllByRole('spinbutton');
        expect(numberInputs.some(input => input.value === '6000')).toBe(true);
        expect(numberInputs.some(input => input.value === '1000')).toBe(true);
        expect(numberInputs.some(input => input.value === '720')).toBe(true);
      });
    });
  });

  describe('Start Over Flow (Req 13.7)', () => {
    it('should clear all state and return to default simulator', async () => {
      const user = userEvent.setup();

      const mockActivePlan = {
        productType: RetentionProductType.SECURED_CREDIT_BUILDER,
        acceptedAt: new Date().toISOString(),
        initialInputs: {
          monthlyIncome: 2800,
          monthlyDebt: 200,
          creditScore: 570,
          loanAmount: 7000,
          termMonths: 36,
        },
        initialEngineResult: {
          decision: Decision.DECLINED,
          reasonCode: null,
          apr: 16.50,
          estimatedPayment: 300,
          postLoanDTI: 0.40,
          benchmarkRate: 11.50,
        },
      };

      const mockProgressState = {
        milestones: [
          { milestoneId: 'scb-open', label: 'Open account', completed: true, completedAt: '2024-01-20T10:00:00Z' },
        ],
        updatedInputs: mockActivePlan.initialInputs,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('pathToYesActivePlan', JSON.stringify(mockActivePlan));
      localStorage.setItem('pathToYesProgressState', JSON.stringify(mockProgressState));

      render(<App />);

      // Click Start Over button
      const startOverButton = screen.getByRole('button', { name: /Start Over/i });
      await user.click(startOverButton);

      // Verify localStorage is cleared
      await waitFor(() => {
        expect(loadActivePlan()).toBeNull();
        expect(loadProgressState()).toBeNull();
      });

      // Verify app returns to default simulator state
      expect(screen.queryByText(/Your Path to Yes Plan/i)).not.toBeInTheDocument();
      
      // Verify default inputs are loaded
      await waitFor(() => {
        const numberInputs = screen.getAllByRole('spinbutton');
        expect(numberInputs.some(input => input.value === '3500')).toBe(true); // Default income
        expect(numberInputs.some(input => input.value === '600')).toBe(true);  // Default debt
        expect(numberInputs.some(input => input.value === '650')).toBe(true);  // Default credit score
      });
    });
  });

  describe('Return to Simulator Flow (Req 12.6)', () => {
    it('should allow interaction with simulator after viewing ConversionView', async () => {
      const user = userEvent.setup();

      render(<App />);

      // Use the Credit-Thin preset to trigger DECLINED
      const creditThinPreset = await screen.findByRole('button', { name: /Credit-Thin/i });
      await user.click(creditThinPreset);

      // Wait for ConversionView
      await screen.findByText(/Application Could Not Be Approved/i);

      // Verify "Return to Simulator" button exists
      const returnButton = screen.getByRole('button', { name: /Return to Simulator/i });
      expect(returnButton).toBeInTheDocument();

      // Click it (note: this doesn't change the view because decision is still DECLINED)
      await user.click(returnButton);

      // Verify no product was accepted
      expect(loadActivePlan()).toBeNull();
      expect(loadProgressState()).toBeNull();

      // The ConversionView remains visible because decision is still DECLINED
      // But we can verify simulator inputs are still accessible by changing to a different preset
      const primeBorrowerPreset = screen.getByRole('button', { name: /Prime Borrower/i });
      await user.click(primeBorrowerPreset);

      // After changing to Prime Borrower, decision should be APPROVED and ConversionView hidden
      await waitFor(() => {
        expect(screen.queryByText(/Application Could Not Be Approved/i)).not.toBeInTheDocument();
      });

      // Should show approval banner instead
      expect(screen.getByText(/Congratulations.*Approved/i)).toBeInTheDocument();
    });
  });

  describe('localStorage Persistence (Req 13.6)', () => {
    it('should persist ProgressTracker state across page reload', () => {
      // Setup state
      const mockActivePlan = {
        productType: RetentionProductType.SECURED_CREDIT_BUILDER,
        acceptedAt: new Date().toISOString(),
        initialInputs: {
          monthlyIncome: 2800,
          monthlyDebt: 200,
          creditScore: 570,
          loanAmount: 7000,
          termMonths: 36,
        },
        initialEngineResult: {
          decision: Decision.DECLINED,
          reasonCode: null,
          apr: 16.50,
          estimatedPayment: 300,
          postLoanDTI: 0.40,
          benchmarkRate: 11.50,
        },
      };

      const mockProgressState = {
        milestones: [
          { milestoneId: 'scb-open', label: 'Open account', completed: true, completedAt: '2024-01-20T10:00:00Z' },
          { milestoneId: 'scb-first-payment', label: 'First payment', completed: false, completedAt: null },
        ],
        updatedInputs: mockActivePlan.initialInputs,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('pathToYesActivePlan', JSON.stringify(mockActivePlan));
      localStorage.setItem('pathToYesProgressState', JSON.stringify(mockProgressState));

      // Initial render
      const { unmount } = render(<App />);
      
      // Verify ProgressTracker is shown
      expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/1 of 2 milestones completed/i)).toBeInTheDocument();

      // Unmount (simulate page close)
      unmount();

      // Re-render (simulate page reload)
      render(<App />);

      // Verify state persisted
      expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/1 of 2 milestones completed/i)).toBeInTheDocument();

      // Verify localStorage still has data
      const loadedPlan = loadActivePlan();
      const loadedProgress = loadProgressState();
      
      expect(loadedPlan).toEqual(mockActivePlan);
      expect(loadedProgress).toEqual(mockProgressState);
    });

    it('should handle corrupted localStorage gracefully', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('pathToYesActivePlan', 'invalid-json{]');
      localStorage.setItem('pathToYesProgressState', 'also-invalid');

      // Should not crash and should show simulator
      render(<App />);

      // Should show simulator view (not ProgressTracker)
      expect(screen.getByText('Path to Yes')).toBeInTheDocument();
      expect(screen.queryByText(/Your Path to Yes Plan/i)).not.toBeInTheDocument();
    });
  });
});
