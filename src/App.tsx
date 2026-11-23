import { useState } from 'react';
import { LoanWizard } from './components/wizard/LoanWizard';
import { ProgressTracker } from './components/ProgressTracker';
import type { ActivePlan, ProgressState } from './engine/types';
import {
  loadActivePlan,
  loadProgressState,
  clearActivePlan,
  clearProgressState,
  saveProgressState,
} from './utils/storage';
import { getInitialMilestones } from './engine/milestones';

const DEFAULT_BENCHMARK_RATE = 11.5;

interface PlanState {
  plan: ActivePlan;
  progress: ProgressState;
}

function loadPlanState(): PlanState | null {
  const plan = loadActivePlan();
  if (!plan) return null;
  const progress: ProgressState = loadProgressState() ?? {
    milestones: getInitialMilestones(plan.productType),
    updatedInputs: plan.initialInputs,
    lastUpdated: plan.acceptedAt,
  };
  return { plan, progress };
}

function App() {
  const [planState, setPlanState] = useState<PlanState | null>(loadPlanState);

  const handleMilestoneToggle = (milestoneId: string): void => {
    setPlanState((current) => {
      if (!current) return current;
      const now = new Date().toISOString();
      const progress: ProgressState = {
        ...current.progress,
        lastUpdated: now,
        milestones: current.progress.milestones.map((m) =>
          m.milestoneId === milestoneId
            ? { ...m, completed: !m.completed, completedAt: m.completed ? null : now }
            : m
        ),
      };
      saveProgressState(progress);
      return { ...current, progress };
    });
  };

  const exitPlan = (): void => {
    clearActivePlan();
    clearProgressState();
    setPlanState(null);
  };

  if (planState) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <ProgressTracker
            activePlan={planState.plan}
            progressState={planState.progress}
            benchmarkRate={DEFAULT_BENCHMARK_RATE}
            onMilestoneToggle={handleMilestoneToggle}
            onReEvaluate={exitPlan}
            onStartOver={exitPlan}
          />
        </div>
      </div>
    );
  }

  return (
    <LoanWizard
      onPlanAccepted={(plan, progress) => setPlanState({ plan, progress })}
    />
  );
}

export default App;
