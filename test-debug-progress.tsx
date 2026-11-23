import { RetentionProductType, Decision, ApplicantInputs, ActivePlan, ProgressState } from './src/engine/types';

const mockInputs: ApplicantInputs = {
  monthlyIncome: 2800,
  monthlyDebt: 200,
  creditScore: 570,
  loanAmount: 7000,
  termMonths: 36,
};

const mockActivePlan: ActivePlan = {
  productType: RetentionProductType.MICRO_LOAN,
  acceptedAt: '2024-01-15T10:30:00Z',
  initialInputs: mockInputs,
  initialEngineResult: {
    decision: Decision.DECLINED,
    reasonCode: null,
    apr: 16.5,
    estimatedPayment: 500,
    postLoanDTI: 0.25,
    benchmarkRate: 11.5,
  },
};

const progressState: ProgressState = {
  milestones: [
    { milestoneId: 'm1', label: 'Milestone 1', completed: false, completedAt: null },
  ],
  updatedInputs: mockInputs,
  lastUpdated: '2024-01-15T10:30:00Z',
};

console.log('MICRO_LOAN:', RetentionProductType.MICRO_LOAN);
