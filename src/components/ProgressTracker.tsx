import React from 'react';
import type { ActivePlan, ProgressState, ApplicantInputs, RetentionProductType } from '../engine/types';
import { evaluateDecision } from '../engine';
import { MilestoneChecklist } from './MilestoneChecklist';
import { MetricProgressCard } from './MetricProgressCard';
import {
  CreditCard,
  PiggyBank,
  Coins,
  TrendingDown,
  LucideIcon,
} from 'lucide-react';

/**
 * Props for ProgressTracker component
 * **Validates: Requirements 13.1, 13.2, 13.3**
 */
export interface ProgressTrackerProps {
  activePlan: ActivePlan;
  progressState: ProgressState;
  benchmarkRate: number;
  onMilestoneToggle: (milestoneId: string) => void;
  onReEvaluate: (updatedInputs: ApplicantInputs) => void;
  onStartOver: () => void;
}

/**
 * Maps RetentionProductType to lucide-react icon component
 */
function getProductIcon(productType: RetentionProductType): LucideIcon {
  switch (productType) {
    case 'SECURED_CREDIT_BUILDER':
      return CreditCard;
    case 'HIGH_YIELD_SAVINGS':
      return PiggyBank;
    case 'MICRO_LOAN':
      return Coins;
    case 'DEBT_CONSOLIDATION':
      return TrendingDown;
    default:
      return CreditCard;
  }
}

/**
 * Maps RetentionProductType to human-readable name
 */
function getProductName(productType: RetentionProductType): string {
  switch (productType) {
    case 'SECURED_CREDIT_BUILDER':
      return 'Secured Credit Builder Card';
    case 'HIGH_YIELD_SAVINGS':
      return 'High-Yield Savings Account';
    case 'MICRO_LOAN':
      return 'Micro-Loan Builder';
    case 'DEBT_CONSOLIDATION':
      return 'Debt Consolidation Plan';
    default:
      return 'Financial Product';
  }
}

/**
 * Formats ISO 8601 timestamp to readable date string
 */
function formatAcceptedDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * ProgressTracker displays the applicant's progress toward loan qualification
 * after accepting a retention product. Shows header with progress bar, metric
 * progress cards, milestone checklist, and re-evaluate/start over actions.
 * 
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.7, 13.8**
 */
export function ProgressTracker({
  activePlan,
  progressState,
  benchmarkRate,
  onMilestoneToggle,
  onReEvaluate,
  onStartOver,
}: ProgressTrackerProps): React.ReactElement {
  // Calculate completion percentage
  const completedCount = progressState.milestones.filter((m) => m.completed).length;
  const totalCount = progressState.milestones.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allMilestonesComplete = completedCount === totalCount && totalCount > 0;

  // Use updatedInputs if present, else fallback to initialInputs
  const currentInputs = progressState.updatedInputs ?? activePlan.initialInputs;
  
  // Evaluate current decision with updated inputs
  const currentResult = evaluateDecision(currentInputs, benchmarkRate);
  
  // Extract current DTI (safe access for EngineError case)
  const currentDTI = 'kind' in currentResult ? 0 : currentResult.postLoanDTI * 100;

  const ProductIcon = getProductIcon(activePlan.productType);

  return (
    <div className="space-y-8">
      {/* Header: Product Name + Progress Bar */}
      {/* **Validates: Requirements 13.2** */}
      <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-8">
        <div className="mb-4 flex items-center space-x-4">
          <div className="rounded-md bg-indigo-100 p-2">
            <ProductIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-indigo-900">
              Your Path to Yes Plan
            </h2>
            <p className="text-sm text-indigo-700">
              {getProductName(activePlan.productType)}
            </p>
            <p className="text-xs text-indigo-600">
              Started: {formatAcceptedDate(activePlan.acceptedAt)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm text-indigo-700">
            <span>
              {completedCount} of {totalCount} milestones completed
            </span>
            <span>{completionPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-indigo-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric Progress Cards Grid */}
      {/* **Validates: Requirements 13.2** */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricProgressCard
          label="Credit Score"
          current={currentInputs.creditScore}
          target={640}
          unit="score"
          isInverse={false}
          min={500}
        />
        <MetricProgressCard
          label="Debt-to-Income Ratio"
          current={currentDTI}
          target={36}
          unit="percentage"
          isInverse={true}
          max={
            'kind' in activePlan.initialEngineResult
              ? 100
              : activePlan.initialEngineResult.postLoanDTI * 100
          }
        />
        <MetricProgressCard
          label="Monthly Income"
          current={currentInputs.monthlyIncome}
          target={2000}
          unit="currency"
          isInverse={false}
          min={0}
        />
        <MetricProgressCard
          label="Monthly Debt"
          current={currentInputs.monthlyDebt}
          target={currentInputs.monthlyIncome * 0.3}
          unit="currency"
          isInverse={true}
          max={activePlan.initialInputs.monthlyDebt}
        />
      </div>

      {/* Milestone Checklist */}
      {/* **Validates: Requirements 13.3, 13.4** */}
      <MilestoneChecklist
        milestones={progressState.milestones}
        onToggle={onMilestoneToggle}
      />

      {/* Re-Evaluate and Start Over Actions */}
      {/* **Validates: Requirements 13.5, 13.7, 13.8** */}
      <div className="space-y-4">
        {allMilestonesComplete && (
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-lg font-semibold text-emerald-900">
              🎉 All milestones complete!
            </p>
            <p className="text-sm text-emerald-700">
              Ready to re-evaluate your loan qualification
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <button
            onClick={() => onReEvaluate(currentInputs)}
            disabled={!allMilestonesComplete}
            className={`rounded-md px-6 py-3 text-base font-semibold shadow-sm transition-colors ${
              allMilestonesComplete
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-300 text-slate-500'
            }`}
          >
            Re-Evaluate My Application
          </button>

          <button
            onClick={onStartOver}
            className="rounded-md border-2 border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
