// src/components/ProgressTracker.test.tsx
/**
 * Comprehensive tests for ProgressTracker component
 * **Validates: Requirements 13.1-13.7**
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ProgressTracker } from './ProgressTracker';
import type { ActivePlan, ProgressState } from '../engine/types';
import { Decision, ReasonCode, RetentionProductType } from '../engine/types';

describe('ProgressTracker - Comprehensive Component Tests', () => {
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
        completed: false,
        completedAt: null,
      },
    ],
    updatedInputs: {
      monthlyIncome: 2800,
      monthlyDebt: 500,
      creditScore: 600,
      loanAmount: 7000,
      termMonths: 36,
    },
    lastUpdated: '2024-02-05T14:30:00Z',
  };

  describe('Header Section - Requirements 13.2', () => {
    it('renders product name correctly', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('Your Path to Yes Plan')).toBeInTheDocument();
      expect(screen.getByText('Secured Credit Builder Card')).toBeInTheDocument();
    });

    it('renders acceptance date in readable format', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText(/Started: Jan 15, 2024/)).toBeInTheDocument();
    });

    it('calculates and displays correct progress percentage', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // 2 of 3 milestones completed = 67%
      expect(screen.getByText('2 of 3 milestones completed')).toBeInTheDocument();
      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    it('renders progress bar with correct width', () => {
      const { container } = render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r.from-indigo-500');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '66.66666666666666%' });
    });

    it('renders product icon', () => {
      const { container } = render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const icon = container.querySelector('.text-indigo-600');
      expect(icon).toBeInTheDocument();
    });

    it('renders different product names for different product types', () => {
      const highYieldPlan = {
        ...mockActivePlan,
        productType: RetentionProductType.HIGH_YIELD_SAVINGS,
      };

      render(
        <ProgressTracker
          activePlan={highYieldPlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('High-Yield Savings Account')).toBeInTheDocument();
    });
  });

  describe('Metric Progress Cards - Requirements 13.2', () => {
    it('renders all four metric progress cards', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('Credit Score')).toBeInTheDocument();
      expect(screen.getByText('Debt-to-Income Ratio')).toBeInTheDocument();
      expect(screen.getByText('Monthly Income')).toBeInTheDocument();
      expect(screen.getByText('Monthly Debt')).toBeInTheDocument();
    });

    it('passes correct values to Credit Score card', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Current credit score from updatedInputs
      expect(screen.getByText(/600/)).toBeInTheDocument();
      // Target score
      expect(screen.getByText(/640/)).toBeInTheDocument();
    });

    it('passes correct values to Monthly Income card', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Current income from updatedInputs
      expect(screen.getByText(/2,800/)).toBeInTheDocument();
      // Target income
      expect(screen.getByText(/2,000/)).toBeInTheDocument();
    });

    it('uses updatedInputs when present', () => {
      const stateWithUpdatedInputs = {
        ...mockProgressState,
        updatedInputs: {
          monthlyIncome: 3200,
          monthlyDebt: 400,
          creditScore: 620,
          loanAmount: 7000,
          termMonths: 36,
        },
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={stateWithUpdatedInputs}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Should show updated values
      expect(screen.getByText(/620/)).toBeInTheDocument();
      expect(screen.getByText(/3,200/)).toBeInTheDocument();
    });

    it('falls back to initialInputs when updatedInputs is null', () => {
      const stateWithoutUpdatedInputs = {
        ...mockProgressState,
        updatedInputs: undefined,
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={stateWithoutUpdatedInputs}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Should show initial values
      expect(screen.getByText(/580/)).toBeInTheDocument();
      expect(screen.getByText(/2,800/)).toBeInTheDocument();
    });
  });

  describe('Milestone Checklist Integration - Requirements 13.3, 13.4', () => {
    it('renders MilestoneChecklist component with correct props', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('Milestone Timeline')).toBeInTheDocument();
      expect(screen.getByText('Open secured credit card account')).toBeInTheDocument();
      expect(screen.getByText('Make first on-time payment')).toBeInTheDocument();
      expect(screen.getByText('Complete 3 months of on-time payments')).toBeInTheDocument();
    });

    it('passes progressState.milestones to MilestoneChecklist', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText(/Jan 16, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 1, 2024/)).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('passes onMilestoneToggle handler to MilestoneChecklist', () => {
      const mockToggle = vi.fn();

      const { container } = render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={mockToggle}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const checkbox3 = container.querySelector('#m3') as HTMLInputElement;
      checkbox3.click();
      
      expect(mockToggle).toHaveBeenCalledWith('m3');
    });

    it('places MilestoneChecklist below metric cards grid', () => {
      const { container } = render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const metricsGrid = container.querySelector('.grid.grid-cols-1');
      expect(metricsGrid).toBeInTheDocument();
      expect(screen.getByText('Milestone Timeline')).toBeInTheDocument();
    });
  });

  describe('Button Handlers - Requirements 13.5, 13.7, 13.8', () => {
    it('renders Re-Evaluate button disabled when not all milestones are complete', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const reEvaluateButton = screen.getByRole('button', {
        name: /Re-Evaluate My Application/i,
      });
      expect(reEvaluateButton).toBeDisabled();
    });

    it('renders Re-Evaluate button enabled when all milestones are complete', () => {
      const allCompleteState = {
        ...mockProgressState,
        milestones: mockProgressState.milestones.map((m) => ({
          ...m,
          completed: true,
          completedAt: '2024-02-10T10:00:00Z',
        })),
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={allCompleteState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const reEvaluateButton = screen.getByRole('button', {
        name: /Re-Evaluate My Application/i,
      });
      expect(reEvaluateButton).not.toBeDisabled();
    });

    it('calls onReEvaluate with current inputs when Re-Evaluate button is clicked', async () => {
      const mockReEvaluate = vi.fn();
      const user = userEvent.setup();

      const allCompleteState = {
        ...mockProgressState,
        milestones: mockProgressState.milestones.map((m) => ({
          ...m,
          completed: true,
          completedAt: '2024-02-10T10:00:00Z',
        })),
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={allCompleteState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={mockReEvaluate}
          onStartOver={vi.fn()}
        />
      );

      const reEvaluateButton = screen.getByRole('button', {
        name: /Re-Evaluate My Application/i,
      });
      await user.click(reEvaluateButton);

      expect(mockReEvaluate).toHaveBeenCalledWith(mockProgressState.updatedInputs);
    });

    it('renders Start Over button', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /Start Over/i })).toBeInTheDocument();
    });

    it('calls onStartOver when Start Over button is clicked', async () => {
      const mockStartOver = vi.fn();
      const user = userEvent.setup();

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={mockStartOver}
        />
      );

      const startOverButton = screen.getByRole('button', { name: /Start Over/i });
      await user.click(startOverButton);

      expect(mockStartOver).toHaveBeenCalledOnce();
    });

    it('displays encouragement message when all milestones are complete', () => {
      const allCompleteState = {
        ...mockProgressState,
        milestones: mockProgressState.milestones.map((m) => ({
          ...m,
          completed: true,
          completedAt: '2024-02-10T10:00:00Z',
        })),
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={allCompleteState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText(/All milestones complete!/)).toBeInTheDocument();
      expect(screen.getByText(/Ready to re-evaluate your loan qualification/)).toBeInTheDocument();
    });

    it('does not display encouragement message when milestones are incomplete', () => {
      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.queryByText(/All milestones complete!/)).not.toBeInTheDocument();
    });
  });

  describe('Progress Calculation - Requirements 13.2', () => {
    it('calculates 0% progress when no milestones are complete', () => {
      const noCompleteState = {
        ...mockProgressState,
        milestones: mockProgressState.milestones.map((m) => ({
          ...m,
          completed: false,
          completedAt: null,
        })),
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={noCompleteState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('0 of 3 milestones completed')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('calculates 100% progress when all milestones are complete', () => {
      const allCompleteState = {
        ...mockProgressState,
        milestones: mockProgressState.milestones.map((m) => ({
          ...m,
          completed: true,
          completedAt: '2024-02-10T10:00:00Z',
        })),
      };

      const { container } = render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={allCompleteState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('3 of 3 milestones completed')).toBeInTheDocument();
      
      // Verify progress bar is at 100%
      const progressBar = container.querySelector('.bg-gradient-to-r.from-indigo-500');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('calculates partial progress correctly', () => {
      const oneCompleteState = {
        ...mockProgressState,
        milestones: [
          {
            milestoneId: 'm1',
            label: 'First milestone',
            completed: true,
            completedAt: '2024-01-16T12:00:00Z',
          },
          {
            milestoneId: 'm2',
            label: 'Second milestone',
            completed: false,
            completedAt: null,
          },
          {
            milestoneId: 'm3',
            label: 'Third milestone',
            completed: false,
            completedAt: null,
          },
        ],
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={oneCompleteState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('1 of 3 milestones completed')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty milestone list gracefully', () => {
      const emptyMilestoneState = {
        ...mockProgressState,
        milestones: [],
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={emptyMilestoneState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('0 of 0 milestones completed')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('Re-Evaluate button remains disabled with zero milestones', () => {
      const emptyMilestoneState = {
        ...mockProgressState,
        milestones: [],
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={emptyMilestoneState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const reEvaluateButton = screen.getByRole('button', {
        name: /Re-Evaluate My Application/i,
      });
      expect(reEvaluateButton).toBeDisabled();
    });

    it('handles single milestone case', () => {
      const singleMilestoneState = {
        ...mockProgressState,
        milestones: [
          {
            milestoneId: 'm1',
            label: 'Single milestone',
            completed: false,
            completedAt: null,
          },
        ],
      };

      render(
        <ProgressTracker
          activePlan={mockActivePlan}
          progressState={singleMilestoneState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('0 of 1 milestones completed')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles product types with different names', () => {
      const microLoanPlan = {
        ...mockActivePlan,
        productType: RetentionProductType.MICRO_LOAN,
      };

      render(
        <ProgressTracker
          activePlan={microLoanPlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('Micro-Loan Builder')).toBeInTheDocument();
    });

    it('handles debt consolidation product', () => {
      const debtConsolidationPlan = {
        ...mockActivePlan,
        productType: RetentionProductType.DEBT_CONSOLIDATION,
      };

      render(
        <ProgressTracker
          activePlan={debtConsolidationPlan}
          progressState={mockProgressState}
          benchmarkRate={11.5}
          onMilestoneToggle={vi.fn()}
          onReEvaluate={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByText('Debt Consolidation Plan')).toBeInTheDocument();
    });
  });
});
