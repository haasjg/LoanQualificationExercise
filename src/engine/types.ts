// src/engine/types.ts
// All shared TypeScript types and enums for the underwriting engine

// ============================================================================
// 2.1 Enums
// ============================================================================

export enum Decision {
  APPROVED = 'APPROVED',
  COUNTER_OFFER = 'COUNTER_OFFER',
  DECLINED = 'DECLINED',
}

export enum ReasonCode {
  HIGH_RISK_SCORE = 'HIGH_RISK_SCORE',
  INSUFFICIENT_INCOME = 'INSUFFICIENT_INCOME',
  EXCESSIVE_DEBT = 'EXCESSIVE_DEBT',
  HIGH_DTI = 'HIGH_DTI',
  LOAN_CAP_EXCEEDED = 'LOAN_CAP_EXCEEDED',
  INVALID_TERM = 'INVALID_TERM',
  INVALID_INPUT = 'INVALID_INPUT',
}

export enum LeverType {
  EXTEND_TERM = 'EXTEND_TERM',
  REDUCE_AMOUNT = 'REDUCE_AMOUNT',
  PAY_DOWN_DEBT = 'PAY_DOWN_DEBT',
  CREDIT_SCORE_MILESTONE = 'CREDIT_SCORE_MILESTONE',
}

export enum LeverOutcome {
  APPROVED = 'APPROVED',
  COUNTER_OFFER = 'COUNTER_OFFER',
}

export enum RateSource {
  LIVE = 'LIVE',
  CACHED = 'CACHED',
  OFFLINE = 'OFFLINE',
}

// ============================================================================
// 2.2 ApplicantInputs interface and defaults
// ============================================================================

export interface ApplicantInputs {
  monthlyIncome: number;   // $1,800 - $25,000, step $100
  monthlyDebt: number;     // $0 - $15,000, step $50
  creditScore: number;     // 500 - 850, step 5
  loanAmount: number;      // $2,000 - $25,000, step $500
  termMonths: number;      // 12 | 24 | 36 | 48 | 60
}

// At benchmark 11.50%: APR = 16.50% (600-659 tier).
// estimatedPayment = 15000 * (0.01375 * 1.01375^24) / (1.01375^24 - 1) = ~$737.
// postLoanDTI = (600 + 737) / 3500 = 0.382 -> COUNTER_OFFER (0.36 < DTI <= 0.45)
export const DEFAULT_INPUTS: ApplicantInputs = {
  monthlyIncome: 3500,
  monthlyDebt: 600,
  creditScore: 650,
  loanAmount: 15000,
  termMonths: 24,
};

export const VALID_TERM_MONTHS = [12, 24, 36, 48, 60] as const;

// ============================================================================
// 2.3 ApplicantPersonaPreset interface and presets
// ============================================================================

export interface ApplicantPersonaPreset {
  label: string;
  description: string;
  inputs: ApplicantInputs;
  expectedDecision: Decision;
}

// Verification notes for each preset are in comments.
// All verified at offline benchmark 11.50%

export const PERSONA_PRESETS: ApplicantPersonaPreset[] = [
  {
    label: 'Prime Borrower',
    description: 'High credit, low DTI - immediate approval',
    inputs: {
      monthlyIncome: 8000,
      monthlyDebt: 500,
      creditScore: 750,
      loanAmount: 12000,
      termMonths: 36,
    },
    expectedDecision: Decision.APPROVED,
    // Verification at benchmark 11.50%:
    // APR = max(11.50 - 1.50, 6.99) = 10.00%
    // r = (10.00 / 100) / 12 = 0.008333
    // payment = 12000 * (0.008333 * 1.008333^36) / (1.008333^36 - 1) = ~$387/mo
    // postLoanDTI = (500 + 387) / 8000 = 0.1109 -> APPROVED
  },
  {
    label: 'Near-Prime High DTI',
    description: 'Borderline DTI - shows Path to Yes checklist',
    inputs: {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 24,
    },
    expectedDecision: Decision.COUNTER_OFFER,
    // Verification at benchmark 11.50%:
    // APR = max(11.50 + 5.00, 6.99) = 16.50%
    // r = (16.50 / 100) / 12 = 0.013750
    // 1.013750^24 = 1.3883
    // payment = 15000 * (0.013750 * 1.3883) / (1.3883 - 1) = ~$737/mo
    // postLoanDTI = (600 + 737) / 3500 = 0.3820 -> COUNTER_OFFER (0.36 < DTI <= 0.45)
  },
  {
    label: 'Credit-Thin',
    description: 'Score below 600 - ineligible for standard unsecured loan',
    inputs: {
      monthlyIncome: 2800,
      monthlyDebt: 200,
      creditScore: 570,
      loanAmount: 7000,
      termMonths: 36,
    },
    expectedDecision: Decision.DECLINED,
    // Verification at benchmark 11.50%:
    // creditScore 570 < 600 -> HIGH_RISK_SCORE -> DECLINED immediately
    // Priority order step 1 fires before any DTI or income check.
  },
];

// ============================================================================
// 2.4 Engine result types
// ============================================================================

export interface EngineResult {
  decision: Decision;
  reasonCode: ReasonCode | null;
  apr: number;              // rounded to 2 decimal places
  estimatedPayment: number; // rounded to 2 decimal places (nearest cent)
  postLoanDTI: number;      // rounded to 4 decimal places
  benchmarkRate: number;    // the rate used for this computation
}

export interface EngineError {
  kind: 'ENGINE_ERROR';
  invalidFields: string[];
  message: string;
}

export type EngineOutput = EngineResult | EngineError;

export interface ValidationError {
  kind: 'VALIDATION_ERROR';
  field: string;
  message: string;
}

export type ValidationResult = { valid: true } | { valid: false; errors: ValidationError[] };

// ============================================================================
// 2.5 Lever and solver result types
// ============================================================================

export interface ExtendTermPayload {
  termMonths: number;
}

export interface ReduceAmountPayload {
  loanAmount: number;
}

export interface PayDownDebtPayload {
  monthlyDebt: number;
  dReduce: number;
}

export interface CreditScoreMilestonePayload {
  creditScore: number;
  targetApr: number;
  monthlyPaymentReduction: number;
}

export type LeverPayload =
  | ExtendTermPayload
  | ReduceAmountPayload
  | PayDownDebtPayload
  | CreditScoreMilestonePayload;

export interface Lever {
  leverType: LeverType;
  payload: LeverPayload;
  mutatedInputs: Partial<ApplicantInputs>;  // fields that change when lever is applied
  resultingPostLoanDTI: number;
  resultingEstimatedPayment: number;
  leverOutcome: LeverOutcome;
  displayLabel: string;                     // human-readable description
}

export interface SolverResult {
  levers: Lever[];
  emptyMessage: string | null;  // non-null only when levers is empty
}

export interface BenchmarkRateResult {
  value: number;
  source: RateSource;
  referenceLabel: string;  // e.g., "2024-01" or "Reference period: Nov 2023"
  fetchedAt: string | null; // ISO 8601 timestamp, null for offline
}

// ============================================================================
// 2.6 FRED client types
// ============================================================================

export interface FredObservation {
  date: string;
  value: string;
}

export interface FredApiResponse {
  observations: FredObservation[];
}

export interface SessionCacheEntry {
  value: number;
  fetchedAt: string;
  referenceLabel: string;
}
