# Design Document

## Overview

Path to Yes is a fully client-side React 18 application that guides borrowers through a 5-step wizard to explore loan options and compare alternatives. The wizard starts with loan amount selection, collects financial details, displays an initial estimate, enables side-by-side comparison of alternatives, and concludes with a summary. All computation runs in the browser via a deterministic underwriting engine in pure TypeScript. APR tiers are anchored to the FRED 24-month personal loan benchmark rate (`TERMCBPER24NS`), with a 3-second timeout and an `11.50%` offline fallback.

The application has no backend. The underwriting engine and solver are pure TypeScript functions in `src/engine/` with zero React imports, enabling full Vitest coverage without a DOM.

### Key Design Goals

- **Borrower-centric progressive disclosure**: wizard reveals complexity gradually, starting with loan needs (Step 1: amount/term) before collecting financial details (Step 2).
- **Comparison over prescription**: instead of "Apply This Fix" buttons that silently change inputs, the wizard presents side-by-side comparison (Step 4) with explicit trade-offs, letting borrowers choose.
- **Warm, accessible visual hierarchy**: warm off-white canvas (stone-50), near-black type (slate-900), indigo CTAs (indigo-600). Large aligned numerals (text-4xl+) for key values. Reserve amber/green for small status indicators only.
- **Mobile-first responsive**: full-width actions, bottom-pinned CTAs, 44px minimum tap targets, single-column stacking below 640px.
- **Deterministic decisioning**: identical inputs always produce identical outputs.
- **Immediate feedback**: the Decision is recomputed within 100ms of input changes via synchronous in-memory pure functions.
- **Full auditability**: every APR, payment, and DTI value is derivable from the inputs using documented formulas.

---

## Architecture

### High-Level Wizard Flow and Component Hierarchy

```
+----------------------------------------------------------+
|                        App.tsx                           |
|                                                          |
|  [useState] wizardStep: 1 | 2 | 3 | 4 | 5                |
|  [useState] loanRequest: { amount, term }                |
|  [useState] financialInputs: { income, debt, score }     |
|  [useState] benchmarkRate: number (11.50 default)        |
|  [useState] comparisonHistory: ComparisonState[]         |
|  [useMemo]  currentEstimate: EngineResult                |
|  [useMemo]  bestAlternative: Lever | null                |
|                                                          |
|  On mount: FRED_Client.fetchBenchmarkRate()              |
|            -> updates benchmarkRate                      |
|            -> does NOT trigger wizard step change        |
|                                                          |
+----------+-------------------------------------------+---+
           |
           v
    WizardRouter (switch on wizardStep)
           |
           +-- Step 1: LoanAmountStep
           |   |-- AmountSelector (slider/input)
           |   |-- TermSelector (radio pills)
           |   |-- ExampleScenariosModal (secondary link)
           |   +-- Continue button -> wizardStep = 2
           |
           +-- Step 2: FinancialDetailsStep
           |   |-- LoanRequestSummaryCard (compact, read-only)
           |   |-- IncomeInput (formatted currency)
           |   |-- DebtInput (formatted currency)
           |   |-- CreditScoreInput (slider)
           |   |-- Back button -> wizardStep = 1
           |   +-- Continue button -> wizardStep = 3
           |
           +-- Step 3: EstimateStep
           |   |-- Giant payment number (text-5xl)
           |   |-- Compact detail row (amount, term, APR)
           |   |-- Quiet status badge (amber/emerald pill)
           |   |-- Single comparison CTA button
           |   |-- "Edit details" link -> wizardStep = 2
           |   |-- "Start over" link -> wizardStep = 1, reset state
           |   +-- "Simulated estimate" footer text
           |
           +-- Step 4: ComparisonStep
           |   |-- Two-column comparison layout
           |   |   |-- OriginalEstimateColumn
           |   |   +-- AlternativeEstimateColumn
           |   |-- TradeOffSummaryRow (dollar amounts)
           |   |-- "Use [term] months" button -> apply, wizardStep = 3
           |   |-- "Keep original" button -> wizardStep = 3
           |   +-- "Edit details" link -> wizardStep = 2
           |
           +-- Step 5: SummaryStep
               |-- Selected loan summary card
               |-- "What changed" section
               |-- "Simulated estimate" disclaimer
               |-- "Start your application" CTA (if approved/counter)
               +-- "Edit details" / "Start over" links
```

### Data Flow Diagram (Wizard-Based)

```
Step 1: User selects amount + term
        |
        | stores in loanRequest state
        v
Step 2: User enters income, debt, score
        |
        | stores in financialInputs state
        v
Step 3: Merge loanRequest + financialInputs -> ApplicantInputs
        |
        v
  FRED_Client.fetchBenchmarkRate()   ---> sessionStorage cache
        |
        | returns BenchmarkRateResult { value, source }
        v
  computeAPR(creditScore, benchmarkRate)
        |
        | returns apr: number
        v
  computeEstimatedPayment(loanAmount, termMonths, apr)
        |
        | returns estimatedPayment: number
        v
  computePostLoanDTI(monthlyDebt, estimatedPayment, monthlyIncome)
        |
        | returns postLoanDTI: number
        v
  evaluateDecision(inputs, benchmarkRate)
        |
        | returns EngineResult { decision, reasonCode?, apr, estimatedPayment, postLoanDTI }
        v
  [if COUNTER_OFFER or DECLINED]
  computeLevers(inputs, engineResult)
        |
        | returns SolverResult { levers: Lever[] }
        v
  Select bestAlternative:
    - APPROVED-outcome lever with highest loan amount, OR
    - COUNTER_OFFER-outcome lever with lowest payment
        |
        v
  Display single comparison CTA on Step 3
        |
        +-- User clicks CTA -> Step 4: side-by-side comparison
        |
        +-- User clicks "Use [term]" -> apply alternative, return to Step 3
        |
        +-- User clicks "Continue to summary" -> Step 5
```

### Technology Choices

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite + TypeScript strict | Per steering; Vite gives fast HMR, strict TS catches boundary errors |
| Styling | Tailwind CSS v3/v4 | Per steering; utility classes keep components self-contained |
| Icons | lucide-react | Per steering; consistent, tree-shakeable icon set |
| Testing | Vitest | Per steering; runs pure TS without DOM, fast |
| State | useState / useMemo | Per steering; no Redux needed for single-screen app |
| External data | FRED API (TERMCBPER24NS) | Per requirements; AbortController 3s timeout, sessionStorage cache |

---

## Components and Interfaces

### Directory Structure

```
src/
  engine/
    types.ts          - All shared TypeScript types and enums
    apr.ts            - computeAPR()
    amortization.ts   - computeEstimatedPayment(), computePostLoanDTI()
    underwriting.ts   - evaluateDecision()
    solver.ts         - computeLevers() and lever sub-functions
    productMapper.ts  - computeProductRecommendations() for decline conversion
    milestones.ts     - getInitialMilestones() for progress tracker
    index.ts          - re-exports all public engine functions
  services/
    fredClient.ts     - fetchBenchmarkRate(), cache helpers
  components/
    wizard/
      LoanAmountStep.tsx
      FinancialDetailsStep.tsx
      EstimateStep.tsx           - displays all levers (Requirement 15)
      ComparisonStep.tsx
      SummaryStep.tsx
      ExampleScenariosModal.tsx
    LoanRequestSummaryCard.tsx
    EstimateDisplay.tsx
    ComparisonColumn.tsx
    TradeOffSummary.tsx
    QuietStatusBadge.tsx
    RateBenchmarkBadge.tsx
    LeverOptionCard.tsx           (NEW - Requirement 15)
    ConversionView.tsx            (integrated into wizard - Requirement 15)
    ProductOfferCard.tsx          (restyled for Requirement 15)
    ProgressTracker.tsx
    MilestoneChecklist.tsx
    MetricProgressCard.tsx
  App.tsx
  main.tsx
```

### Wizard Component Hierarchy and Props

```
App
  [if no activePlan in localStorage]
    WizardRouter (currentStep, loanRequest, financialInputs, onNavigate)
      [step 1] LoanAmountStep (loanRequest, onChange, onContinue)
                 AmountSelector (amount, onChange)
                 TermSelector (term, onChange)
                 ExampleScenariosModal (open, onClose)
      [step 2] FinancialDetailsStep (loanRequest, financialInputs, onChange, onBack, onContinue)
                 LoanRequestSummaryCard (loanRequest)
                 IncomeInput (value, onChange)
                 DebtInput (value, onChange)
                 CreditScoreInput (value, onChange)
      [step 3] EstimateStep (currentEstimate, allLevers, recommendedLever, onCompareLever, onEdit, onStartOver)
                 EstimateDisplay (estimate)
                 QuietStatusBadge (decision, reasonCode)
                 LeverOptionCard[] (lever, isRecommended, onCompare, applicantInputs)
                   [rendered for each lever in allLevers]
      [step 4] ComparisonStep (originalEstimate, alternativeEstimate, selectedLever, onUse, onKeep, onEdit)
                 ComparisonColumn (estimate, label)
                 TradeOffSummary (monthlySavings, totalCostDifference)
      [step 5] SummaryStep (selectedEstimate, changes, onStartApplication, onEdit, onStartOver)
                 SelectedLoanSummary (estimate)
                 WhatChangedSection (changes)

  [if declined and no active plan]
    ConversionView (engineResult, inputs, onAcceptProduct, onReturn)
      DeclineReasonDetail (engineResult, inputs)
      ProductOfferCard[] (recommendation, rank, onAccept)

  [if activePlan exists in localStorage]
    ProgressTracker (activePlan, progressState, benchmarkRate, onMilestoneToggle, onReEvaluate, onStartOver)
      MilestoneChecklist (milestones, onToggle)
      MetricProgressCard[] (label, current, target)

  RateBenchmarkBadge (source, benchmarkRate, referenceLabel)
    [rendered in collapsible "Rate details" accordion or info tooltip]
```

### Core Wizard State Types

```typescript
// src/engine/types.ts (additions for wizard)

export interface LoanRequest {
  amount: number;   // $2,000 - $25,000, step $500
  term: number;     // 12 | 24 | 36 | 48 | 60
}

export interface FinancialInputs {
  monthlyIncome: number;   // $1,800 - $25,000, step $100
  monthlyDebt: number;     // $0 - $15,000, step $50
  creditScore: number;     // 500 - 850, step 5
}

export interface ComparisonState {
  timestamp: number;
  originalInputs: ApplicantInputs;
  originalEstimate: EngineResult;
  alternativeInputs: ApplicantInputs;
  alternativeEstimate: EngineResult;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export const DEFAULT_LOAN_REQUEST: LoanRequest = {
  amount: 10000,
  term: 36,
};

export const DEFAULT_FINANCIAL_INPUTS: FinancialInputs = {
  monthlyIncome: 5000,
  monthlyDebt: 500,
  creditScore: 650,
};
```

**LoanAmountStep props:**
```typescript
interface LoanAmountStepProps {
  loanRequest: LoanRequest;
  onChange: (updated: LoanRequest) => void;
  onContinue: () => void;
}
```

**FinancialDetailsStep props:**
```typescript
interface FinancialDetailsStepProps {
  loanRequest: LoanRequest;
  financialInputs: FinancialInputs;
  onChange: (updated: FinancialInputs) => void;
  onBack: () => void;
  onContinue: () => void;
}
```

**EstimateStep props:**
```typescript
interface EstimateStepProps {
  currentEstimate: EngineResult;
  allLevers: Lever[];  // all applicable levers from solver
  recommendedLever: Lever | null;  // most favorable lever for highlighting
  onCompareLever: (lever: Lever) => void;  // navigate to Step 4 with selected lever
  onEdit: () => void;
  onStartOver: () => void;
  onContinue?: () => void;  // only shown if APPROVED
}
```

**ComparisonStep props:**
```typescript
interface ComparisonStepProps {
  originalEstimate: EngineResult;
  alternativeEstimate: EngineResult;
  selectedLever: Lever;  // the lever user chose to compare
  onUseAlternative: () => void;
  onKeepOriginal: () => void;
  onEdit: () => void;
}
```

**SummaryStep props:**
```typescript
interface SummaryStepProps {
  selectedEstimate: EngineResult;
  appliedInputs: ApplicantInputs;
  changes: ChangeDescription[];
  onStartApplication: () => void;
  onEdit: () => void;
  onStartOver: () => void;
}

interface ChangeDescription {
  field: string;
  oldValue: string | number;
  newValue: string | number;
  reason: string;  // e.g., "Extended term to lower monthly payment"
}
```

**EstimateDisplay props (reusable component for Steps 3, 4, 5):**
```typescript
interface EstimateDisplayProps {
  estimate: EngineResult;
  emphasizePayment?: boolean;  // true for Step 3, false for Step 4/5
  showStatusBadge?: boolean;   // true for Step 3, false for Step 4/5
  compact?: boolean;           // false for Step 3, true for Step 4
}
```

**ComparisonColumn props:**
```typescript
interface ComparisonColumnProps {
  estimate: EngineResult;
  label: string;  // "Your original estimate" or "36-month option"
  highlight?: boolean;  // true for the alternative column
}
```

**TradeOffSummary props:**
```typescript
interface TradeOffSummaryProps {
  originalEstimate: EngineResult;
  alternativeEstimate: EngineResult;
}
```

**QuietStatusBadge props:**
```typescript
interface QuietStatusBadgeProps {
  decision: Decision;
  reasonCode: ReasonCode | null;
}
```

**LeverOptionCard props (Requirement 15):**
```typescript
interface LeverOptionCardProps {
  lever: Lever;
  isRecommended: boolean;  // true for most favorable option
  onCompare: (lever: Lever) => void;
  applicantInputs: ApplicantInputs;  // needed to compute trade-offs
}
```

---

## Data Models

### Core Enums

```typescript
// src/engine/types.ts

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
```

### ApplicantInputs

```typescript
// src/engine/types.ts

export interface ApplicantInputs {
  monthlyIncome: number;   // $1,800 - $25,000, step $100
  monthlyDebt: number;     // $0 - $15,000, step $50
  creditScore: number;     // 500 - 850, step 5
  loanAmount: number;      // $2,000 - $25,000, step $500
  termMonths: number;      // 12 | 24 | 36 | 48 | 60
}

export const DEFAULT_INPUTS: ApplicantInputs = {
  monthlyIncome: 5000,
  monthlyDebt: 500,
  creditScore: 650,
  loanAmount: 10000,
  termMonths: 36,
};
// At benchmark 11.50%: APR = 16.50% (600-659 tier).
// estimatedPayment = 10000 * (0.01375 * 1.01375^36) / (1.01375^36 - 1) = ~$353.
// postLoanDTI = (500 + 353) / 5000 = 0.1706 -> APPROVED for score 650 and amount <= 15000.
// Wait: loanAmount=10000 <= 15000, score=650 in 600-659 range. DTI 0.17 <= 0.36. -> APPROVED.
// To land in COUNTER_OFFER, need DTI 0.36-0.45. With income=3500, debt=800, loan=12000, term=36:
// APR=16.50%, r=0.01375, payment=12000*...=~423. DTI=(800+423)/3500=0.3494 -> APPROVED.
// Adjust: income=2200, debt=400, loan=8000, term=24:
// APR=16.50%, r=0.01375, payment=8000*(0.01375*1.01375^24)/(1.01375^24-1).
// 1.01375^24=1.3883. payment=8000*(0.01375*1.3883)/(1.3883-1)=8000*(0.01909/0.3883)=8000*0.04916=393.
// DTI=(400+393)/2200=0.3604 -> COUNTER_OFFER (just above 0.36). Score 650, loan<=15000.
// Use income=2200, debt=400, loan=8000, term=24, creditScore=650 as defaults.
// Final defaults for COUNTER_OFFER landing: income=5000, debt=1200, loan=15000, term=36, score=650.
// APR=16.50%, r=0.01375, 1.01375^36=1.6396, payment=15000*(0.01375*1.6396)/(1.6396-1)
//   = 15000*(0.02254/0.6396) = 15000*0.03524 = 528.6.
// DTI = (1200+529)/5000 = 0.3458 -> APPROVED. Score 650, loan=15000 <=15000. -> APPROVED not COUNTER.
// Use income=3500, debt=600, loan=15000, term=24, score=650.
// payment: 1.01375^24=1.3883. 15000*(0.01375*1.3883)/(1.3883-1)=15000*(0.019089/0.3883)=15000*0.04915=737.
// DTI=(600+737)/3500=0.382 -> COUNTER_OFFER. Loan=15000 <=15000, score 650. -> COUNTER_OFFER via DTI. Good.
```

**Note on defaults**: The default values are set to `monthlyIncome: 3500, monthlyDebt: 600, loanAmount: 15000, termMonths: 24, creditScore: 650`. At the offline benchmark of 11.50%, this produces APR = 16.50% (600-659 tier), `estimatedPayment` ~$737, `postLoanDTI` ~0.382, which falls in the counter-offer range (0.36 < DTI <= 0.45). The PathToYesChecklist is therefore visible on first render without user interaction.

```typescript
export const DEFAULT_INPUTS: ApplicantInputs = {
  monthlyIncome: 3500,
  monthlyDebt: 600,
  creditScore: 650,
  loanAmount: 15000,
  termMonths: 24,
};
```

### Applicant Persona Presets

Three presets are defined as named constants in `src/engine/types.ts`. Each is mathematically verified to produce a deterministic Decision at the offline benchmark rate of 11.50%, enabling reviewers to experience all three decision states without manual slider interaction.

```typescript
// src/engine/types.ts

export interface ApplicantPersonaPreset {
  label: string;
  description: string;
  inputs: ApplicantInputs;
  expectedDecision: Decision;  // verified at benchmark 11.50%
}

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
```

### Engine Result Types

```typescript
// src/engine/types.ts

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
```

### Lever Types

```typescript
// src/engine/types.ts

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
```

### Solver Result Types

```typescript
// src/engine/types.ts

export interface SolverResult {
  levers: Lever[];
  emptyMessage: string | null;  // non-null only when levers is empty
}
```

### FRED Client Types

```typescript
// src/services/fredClient.ts

export interface BenchmarkRateResult {
  value: number;
  source: RateSource;
  referenceLabel: string;  // e.g., "2024-01" or "Reference period: Nov 2023"
  fetchedAt: string | null; // ISO 8601 timestamp, null for offline
}

interface FredObservation {
  date: string;
  value: string;
}

interface FredApiResponse {
  observations: FredObservation[];
}

interface SessionCacheEntry {
  value: number;
  fetchedAt: string;
  referenceLabel: string;
}
```

### Input Validation Types

```typescript
// src/engine/types.ts

export interface ValidationError {
  kind: 'VALIDATION_ERROR';
  field: string;
  message: string;
}

export type ValidationResult = { valid: true } | { valid: false; errors: ValidationError[] };
```

---

## Engine Design (Pure Functions)

All functions in `src/engine/` have zero React imports. All are pure (no side effects, no I/O). Every exported function carries an explicit return type.

### apr.ts

```typescript
// src/engine/apr.ts

import type { ApplicantInputs } from './types';
import { Decision, ReasonCode } from './types';

export const APR_FLOOR = 6.99;
export const OFFLINE_BENCHMARK = 11.50;
export const VALID_TERM_MONTHS = [12, 24, 36, 48, 60] as const;

/**
 * Compute the APR for a given credit score and benchmark rate.
 * Returns null (ineligible) for scores below 600.
 * Rounds result to 2 decimal places; applies floor of 6.99%.
 */
export function computeAPR(
  creditScore: number,
  benchmarkRate: number,
): number | null {
  if (creditScore >= 720) {
    return Math.max(
      Math.round((benchmarkRate - 1.5) * 100) / 100,
      APR_FLOOR,
    );
  }
  if (creditScore >= 660) {
    return Math.max(
      Math.round((benchmarkRate + 1.5) * 100) / 100,
      APR_FLOOR,
    );
  }
  if (creditScore >= 600) {
    return Math.max(
      Math.round((benchmarkRate + 5.0) * 100) / 100,
      APR_FLOOR,
    );
  }
  return null; // HIGH_RISK_SCORE: ineligible
}
```

### amortization.ts

```typescript
// src/engine/amortization.ts

/**
 * Standard amortization formula.
 * Handles zero-APR case (r = 0) by returning loanAmount / termMonths.
 * Rounds result to nearest cent using half-up rounding.
 * Precondition: loanAmount > 0, termMonths > 0.
 */
export function computeEstimatedPayment(
  loanAmount: number,
  termMonths: number,
  apr: number,
): number {
  const r = (apr / 100) / 12;
  if (r === 0) {
    return roundHalfUp(loanAmount / termMonths, 2);
  }
  const rn = Math.pow(1 + r, termMonths);
  const payment = loanAmount * (r * rn) / (rn - 1);
  return roundHalfUp(payment, 2);
}

/**
 * Post-loan DTI: (monthlyDebt + estimatedPayment) / monthlyIncome.
 * Rounds to 4 decimal places.
 * Precondition: monthlyIncome > 0 (caller is responsible for guard).
 */
export function computePostLoanDTI(
  monthlyDebt: number,
  estimatedPayment: number,
  monthlyIncome: number,
): number {
  return roundHalfUp((monthlyDebt + estimatedPayment) / monthlyIncome, 4);
}

/**
 * Half-up rounding to a given number of decimal places.
 * Uses Number.EPSILON offset to handle floating-point precision.
 */
export function roundHalfUp(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
```

### underwriting.ts

```typescript
// src/engine/underwriting.ts

import type { ApplicantInputs, EngineOutput, EngineResult, ValidationError } from './types';
import { Decision, ReasonCode } from './types';
import { computeAPR } from './apr';
import { computeEstimatedPayment, computePostLoanDTI } from './amortization';

export const INCOME_MINIMUM_APPROVAL = 2000;
export const INCOME_MINIMUM_COUNTER  = 1800;
export const DTI_APPROVED_THRESHOLD  = 0.36;
export const DTI_COUNTER_THRESHOLD   = 0.45;
export const LOAN_CAP_SUBPRIME       = 15000;

/**
 * Validate raw ApplicantInputs before engine evaluation.
 * Returns all invalid fields in a single pass.
 */
export function validateInputs(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Number.isFinite(inputs.monthlyIncome) || inputs.monthlyIncome < 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'monthlyIncome', message: 'monthlyIncome must be a non-negative finite number' });
  }
  if (!Number.isFinite(inputs.monthlyDebt) || inputs.monthlyDebt < 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'monthlyDebt', message: 'monthlyDebt must be a non-negative finite number' });
  }
  if (!Number.isFinite(inputs.creditScore) || inputs.creditScore <= 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'creditScore', message: 'creditScore must be a positive finite number' });
  }
  if (!Number.isFinite(inputs.loanAmount) || inputs.loanAmount <= 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'loanAmount', message: 'loanAmount must be a positive finite number' });
  }
  if (!Number.isFinite(inputs.termMonths) || inputs.termMonths <= 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'termMonths', message: 'termMonths must be a positive finite number' });
  }
  if (!Number.isFinite(benchmarkRate) || benchmarkRate < 0) {
    errors.push({ kind: 'VALIDATION_ERROR', field: 'benchmarkRate', message: 'benchmarkRate must be a non-negative finite number' });
  }
  // loanAmount must be a $500-aligned value from the set {2000, 2500, ..., 25000}
  if (errors.length === 0 && inputs.loanAmount >= 2000) {
    if ((inputs.loanAmount - 2000) % 500 !== 0 || inputs.loanAmount > 25000) {
      errors.push({ kind: 'VALIDATION_ERROR', field: 'loanAmount', message: 'loanAmount must be a multiple of $500 in [2000, 25000]' });
    }
  }

  return errors;
}

/**
 * Primary entry point for the underwriting engine.
 * Evaluates decisioning conditions in the priority order specified in Requirement 4.6.
 * Returns EngineResult or EngineError; never throws.
 */
export function evaluateDecision(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): EngineOutput {
  // --- Input validation ---
  if (inputs.loanAmount === 0 || inputs.termMonths === 0) {
    return { kind: 'ENGINE_ERROR', invalidFields: ['loanAmount', 'termMonths'], message: 'loanAmount and termMonths must be greater than 0' };
  }

  const validationErrors = validateInputs(inputs, benchmarkRate);
  if (validationErrors.length > 0) {
    return { kind: 'ENGINE_ERROR', invalidFields: validationErrors.map(e => e.field), message: validationErrors[0].message };
  }

  // --- Compute APR ---
  const apr = computeAPR(inputs.creditScore, benchmarkRate);

  // Priority 1: ineligible credit score
  if (apr === null) {
    return makeDeclined(Decision.DECLINED, ReasonCode.HIGH_RISK_SCORE, 0, 0, 0, benchmarkRate);
  }

  // Guard: income = 0 -> division by zero
  if (inputs.monthlyIncome === 0) {
    return makeDeclined(Decision.DECLINED, ReasonCode.INSUFFICIENT_INCOME, apr, 0, 0, benchmarkRate);
  }

  // --- Compute payment and DTI ---
  const estimatedPayment = computeEstimatedPayment(inputs.loanAmount, inputs.termMonths, apr);
  const postLoanDTI = computePostLoanDTI(inputs.monthlyDebt, estimatedPayment, inputs.monthlyIncome);

  // Priority 2: insufficient income
  if (inputs.monthlyIncome < INCOME_MINIMUM_COUNTER) {
    return makeDeclined(Decision.DECLINED, ReasonCode.INSUFFICIENT_INCOME, apr, estimatedPayment, postLoanDTI, benchmarkRate);
  }

  // Priority 3: excessive debt
  if (inputs.monthlyDebt >= inputs.monthlyIncome) {
    return makeDeclined(Decision.DECLINED, ReasonCode.EXCESSIVE_DEBT, apr, estimatedPayment, postLoanDTI, benchmarkRate);
  }

  // Priority 4: DTI > 0.45
  if (postLoanDTI > DTI_COUNTER_THRESHOLD) {
    return makeDeclined(Decision.DECLINED, ReasonCode.HIGH_DTI, apr, estimatedPayment, postLoanDTI, benchmarkRate);
  }

  // Priority 5: loan cap exceeded (600-659, DTI <= 0.36, loan > 15000)
  if (
    inputs.creditScore >= 600 &&
    inputs.creditScore <= 659 &&
    postLoanDTI <= DTI_APPROVED_THRESHOLD &&
    inputs.loanAmount > LOAN_CAP_SUBPRIME
  ) {
    return {
      decision: Decision.COUNTER_OFFER,
      reasonCode: ReasonCode.LOAN_CAP_EXCEEDED,
      apr,
      estimatedPayment,
      postLoanDTI,
      benchmarkRate,
    };
  }

  // Priority 6: DTI in counter-offer range
  if (postLoanDTI > DTI_APPROVED_THRESHOLD) {
    return {
      decision: Decision.COUNTER_OFFER,
      reasonCode: null,
      apr,
      estimatedPayment,
      postLoanDTI,
      benchmarkRate,
    };
  }

  // Priority 7: APPROVED
  // Additional guard: 600-659 score with income >= 2000, DTI <= 0.36, loan <= 15000
  if (inputs.creditScore >= 600 && inputs.creditScore <= 659 && inputs.monthlyIncome < INCOME_MINIMUM_APPROVAL) {
    return makeDeclined(Decision.DECLINED, ReasonCode.INSUFFICIENT_INCOME, apr, estimatedPayment, postLoanDTI, benchmarkRate);
  }

  if (inputs.monthlyIncome < INCOME_MINIMUM_APPROVAL) {
    return makeDeclined(Decision.DECLINED, ReasonCode.INSUFFICIENT_INCOME, apr, estimatedPayment, postLoanDTI, benchmarkRate);
  }

  return {
    decision: Decision.APPROVED,
    reasonCode: null,
    apr,
    estimatedPayment,
    postLoanDTI,
    benchmarkRate,
  };
}

function makeDeclined(
  decision: Decision.DECLINED,
  reasonCode: ReasonCode,
  apr: number,
  estimatedPayment: number,
  postLoanDTI: number,
  benchmarkRate: number,
): EngineResult {
  return { decision, reasonCode, apr, estimatedPayment, postLoanDTI, benchmarkRate };
}
```

### solver.ts

The solver is composed of four independent lever-computation functions plus a top-level orchestrator.

```typescript
// src/engine/solver.ts

import type { ApplicantInputs, Lever, SolverResult } from './types';
import { LeverType, LeverOutcome, Decision } from './types';
import { computeAPR } from './apr';
import { computeEstimatedPayment, computePostLoanDTI } from './amortization';
import { evaluateDecision } from './underwriting';
import { DTI_APPROVED_THRESHOLD, DTI_COUNTER_THRESHOLD } from './underwriting';

export function computeLevers(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): SolverResult {
  const levers: Lever[] = [];

  const lever1 = computeExtendTermLever(inputs, benchmarkRate);
  if (lever1) levers.push(lever1);

  const lever2 = computeReduceAmountLever(inputs, benchmarkRate);
  if (lever2) levers.push(lever2);

  const lever3 = computePayDownDebtLever(inputs, benchmarkRate);
  if (lever3) levers.push(lever3);

  const lever4 = computeCreditScoreMilestoneLever(inputs, benchmarkRate);
  if (lever4) levers.push(lever4);

  if (levers.length === 0) {
    return {
      levers: [],
      emptyMessage:
        'No mathematically feasible path to approval exists at the current income and debt levels.',
    };
  }

  return { levers, emptyMessage: null };
}

/**
 * Lever 1: Extend Term
 * Tests {36, 48, 60} months greater than the current termMonths.
 * Returns the shortest term achieving DTI <= 0.36 (APPROVED), or the
 * shortest achieving DTI <= 0.45 (COUNTER_OFFER) if no APPROVED exists.
 * Omitted if termMonths is already 60 or no candidate qualifies.
 */
export function computeExtendTermLever(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): Lever | null {
  if (inputs.termMonths >= 60) return null;

  const candidateTerms = ([36, 48, 60] as const).filter(t => t > inputs.termMonths);
  const apr = computeAPR(inputs.creditScore, benchmarkRate);
  if (apr === null) return null;

  let approvedCandidate: number | null = null;
  let counterCandidate: number | null = null;

  for (const term of candidateTerms) {
    const payment = computeEstimatedPayment(inputs.loanAmount, term, apr);
    const dti = computePostLoanDTI(inputs.monthlyDebt, payment, inputs.monthlyIncome);
    if (dti <= DTI_APPROVED_THRESHOLD && approvedCandidate === null) {
      approvedCandidate = term;
    }
    if (dti <= DTI_COUNTER_THRESHOLD && counterCandidate === null) {
      counterCandidate = term;
    }
  }

  const targetTerm = approvedCandidate ?? counterCandidate;
  if (targetTerm === null) return null;

  const leverOutcome = approvedCandidate !== null ? LeverOutcome.APPROVED : LeverOutcome.COUNTER_OFFER;
  const mutatedInputs: ApplicantInputs = { ...inputs, termMonths: targetTerm };
  const payment = computeEstimatedPayment(inputs.loanAmount, targetTerm, apr);
  const dti = computePostLoanDTI(inputs.monthlyDebt, payment, inputs.monthlyIncome);

  // Verify leverOutcome by running engine
  const verificationResult = evaluateDecision(mutatedInputs, benchmarkRate);
  if ('kind' in verificationResult) return null;
  if (verificationResult.decision === Decision.DECLINED) return null;

  return {
    leverType: LeverType.EXTEND_TERM,
    payload: { termMonths: targetTerm },
    mutatedInputs: { termMonths: targetTerm },
    resultingPostLoanDTI: dti,
    resultingEstimatedPayment: payment,
    leverOutcome,
    displayLabel: `Extend term to ${targetTerm} months`,
  };
}

/**
 * Lever 2: Reduce Loan Amount
 * Binary-search downward in $100 increments from (loanAmount - 100).
 * First pass: seek DTI <= 0.36 (APPROVED). Second pass: seek DTI <= 0.45 (COUNTER_OFFER).
 * Omitted if no value >= $2,000 satisfies either threshold.
 */
export function computeReduceAmountLever(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): Lever | null {
  const apr = computeAPR(inputs.creditScore, benchmarkRate);
  if (apr === null) return null;

  const findMaxAmount = (threshold: number): number | null => {
    for (let amount = inputs.loanAmount - 100; amount >= 2000; amount -= 100) {
      const payment = computeEstimatedPayment(amount, inputs.termMonths, apr);
      const dti = computePostLoanDTI(inputs.monthlyDebt, payment, inputs.monthlyIncome);
      if (dti <= threshold) return amount;
    }
    return null;
  };

  let targetAmount = findMaxAmount(DTI_APPROVED_THRESHOLD);
  let leverOutcome = LeverOutcome.APPROVED;

  if (targetAmount === null) {
    targetAmount = findMaxAmount(DTI_COUNTER_THRESHOLD);
    leverOutcome = LeverOutcome.COUNTER_OFFER;
  }

  if (targetAmount === null) return null;

  const mutatedInputs: ApplicantInputs = { ...inputs, loanAmount: targetAmount };
  const verificationResult = evaluateDecision(mutatedInputs, benchmarkRate);
  if ('kind' in verificationResult) return null;
  if (verificationResult.decision === Decision.DECLINED) return null;

  const payment = computeEstimatedPayment(targetAmount, inputs.termMonths, apr);
  const dti = computePostLoanDTI(inputs.monthlyDebt, payment, inputs.monthlyIncome);

  return {
    leverType: LeverType.REDUCE_AMOUNT,
    payload: { loanAmount: targetAmount },
    mutatedInputs: { loanAmount: targetAmount },
    resultingPostLoanDTI: dti,
    resultingEstimatedPayment: payment,
    leverOutcome,
    displayLabel: `Reduce loan to $${targetAmount.toLocaleString()}`,
  };
}

/**
 * Lever 3: Pay Down Debt
 * Solves for minimum D_reduce: (monthlyDebt - D_reduce + payment) / income <= 0.36.
 * Rearranged: D_reduce >= monthlyDebt + payment - 0.36 * income.
 * Falls back to COUNTER_OFFER if full debt elimination still leaves DTI <= 0.45.
 * Omitted if monthlyDebt is 0, or full elimination leaves DTI > 0.45.
 */
export function computePayDownDebtLever(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): Lever | null {
  if (inputs.monthlyDebt === 0) return null;

  const apr = computeAPR(inputs.creditScore, benchmarkRate);
  if (apr === null) return null;

  const payment = computeEstimatedPayment(inputs.loanAmount, inputs.termMonths, apr);

  // Solve algebraically: D_reduce = monthlyDebt + payment - 0.36 * monthlyIncome
  const dReduceApproved = inputs.monthlyDebt + payment - DTI_APPROVED_THRESHOLD * inputs.monthlyIncome;

  if (dReduceApproved <= 0) {
    // Current debt is already at or below approval threshold after payment
    return null;
  }

  let dReduce: number;
  let leverOutcome: LeverOutcome;

  if (dReduceApproved <= inputs.monthlyDebt) {
    dReduce = dReduceApproved;
    leverOutcome = LeverOutcome.APPROVED;
  } else {
    // Can't reach DTI <= 0.36 by zeroing debt; try counter-offer threshold
    const newDTI = computePostLoanDTI(0, payment, inputs.monthlyIncome);
    if (newDTI <= DTI_COUNTER_THRESHOLD) {
      dReduce = inputs.monthlyDebt;
      leverOutcome = LeverOutcome.COUNTER_OFFER;
    } else {
      return null;
    }
  }

  const newMonthlyDebt = inputs.monthlyDebt - dReduce;
  const mutatedInputs: ApplicantInputs = { ...inputs, monthlyDebt: newMonthlyDebt };
  const verificationResult = evaluateDecision(mutatedInputs, benchmarkRate);
  if ('kind' in verificationResult) return null;
  if (verificationResult.decision === Decision.DECLINED) return null;

  const resultingDTI = computePostLoanDTI(newMonthlyDebt, payment, inputs.monthlyIncome);

  return {
    leverType: LeverType.PAY_DOWN_DEBT,
    payload: { monthlyDebt: newMonthlyDebt, dReduce },
    mutatedInputs: { monthlyDebt: newMonthlyDebt },
    resultingPostLoanDTI: resultingDTI,
    resultingEstimatedPayment: payment,
    leverOutcome,
    displayLabel: `Reduce monthly debt by $${Math.ceil(dReduce).toLocaleString()}`,
  };
}

/**
 * Lever 4: Credit Score Milestone
 * Only computed when creditScore < 640.
 * Finds the lowest threshold above creditScore from {600, 640, 660, 720}.
 * Computes resulting APR, monthly payment reduction, and leverOutcome via engine run.
 * Omitted if the resulting Decision is DECLINED.
 */
export function computeCreditScoreMilestoneLever(
  inputs: ApplicantInputs,
  benchmarkRate: number,
): Lever | null {
  if (inputs.creditScore >= 640) return null;

  const milestones = [600, 640, 660, 720] as const;
  const targetScore = milestones.find(m => m > inputs.creditScore);
  if (targetScore === undefined) return null;

  const currentApr = computeAPR(inputs.creditScore, benchmarkRate);
  const targetApr = computeAPR(targetScore, benchmarkRate);
  if (targetApr === null) return null;

  const currentPayment = currentApr !== null
    ? computeEstimatedPayment(inputs.loanAmount, inputs.termMonths, currentApr)
    : 0;
  const targetPayment = computeEstimatedPayment(inputs.loanAmount, inputs.termMonths, targetApr);
  const monthlyPaymentReduction = currentApr !== null
    ? Math.max(0, currentPayment - targetPayment)
    : 0;

  const mutatedInputs: ApplicantInputs = { ...inputs, creditScore: targetScore };
  const verificationResult = evaluateDecision(mutatedInputs, benchmarkRate);
  if ('kind' in verificationResult) return null;
  if (verificationResult.decision === Decision.DECLINED) return null;

  const leverOutcome =
    verificationResult.decision === Decision.APPROVED
      ? LeverOutcome.APPROVED
      : LeverOutcome.COUNTER_OFFER;

  return {
    leverType: LeverType.CREDIT_SCORE_MILESTONE,
    payload: { creditScore: targetScore, targetApr, monthlyPaymentReduction },
    mutatedInputs: { creditScore: targetScore },
    resultingPostLoanDTI: verificationResult.postLoanDTI,
    resultingEstimatedPayment: targetPayment,
    leverOutcome,
    displayLabel: `Reach credit score ${targetScore} (APR drops to ${targetApr.toFixed(2)}%)`,
  };
}
```

---

## FRED Client Design

```typescript
// src/services/fredClient.ts

import type { BenchmarkRateResult } from './types';
import { RateSource } from '../engine/types';

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_SERIES_ID = 'TERMCBPER24NS';
const FRED_TIMEOUT_MS = 3000;
const OFFLINE_BENCHMARK = 11.50;
const OFFLINE_LABEL = 'Reference period: Nov 2023';
const SESSION_CACHE_KEY = 'path_to_yes_fred_rate';
const RATE_MIN = 0.01;
const RATE_MAX = 40.00;

/**
 * Returns a BenchmarkRateResult from live FRED, sessionStorage cache, or offline fallback.
 * Never throws. Never blocks the UI (caller awaits this after first render).
 */
export async function fetchBenchmarkRate(apiKey: string): Promise<BenchmarkRateResult> {
  if (!apiKey) {
    return offlineResult();
  }

  const cached = readCachedRate();
  if (cached !== null) {
    return { value: cached.value, source: RateSource.CACHED, referenceLabel: cached.referenceLabel, fetchedAt: cached.fetchedAt };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FRED_TIMEOUT_MS);

    const url = new URL(FRED_BASE_URL);
    url.searchParams.set('series_id', FRED_SERIES_ID);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return offlineResult();

    const data: FredApiResponse = await response.json();
    const observation = data.observations?.[0];
    if (!observation) return offlineResult();

    const value = parseFloat(observation.value);
    if (!Number.isFinite(value) || value < RATE_MIN || value > RATE_MAX) {
      return offlineResult();
    }

    const fetchedAt = new Date().toISOString();
    const entry: SessionCacheEntry = { value, fetchedAt, referenceLabel: observation.date };
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(entry));

    return { value, source: RateSource.LIVE, referenceLabel: observation.date, fetchedAt };
  } catch {
    return offlineResult();
  }
}

function readCachedRate(): SessionCacheEntry | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const entry: SessionCacheEntry = JSON.parse(raw);
    if (!Number.isFinite(entry.value) || entry.value < RATE_MIN || entry.value > RATE_MAX) return null;
    return entry;
  } catch {
    return null;
  }
}

function offlineResult(): BenchmarkRateResult {
  return {
    value: OFFLINE_BENCHMARK,
    source: RateSource.OFFLINE,
    referenceLabel: OFFLINE_LABEL,
    fetchedAt: null,
  };
}
```

---

## State Management (App.tsx)

```typescript
// src/App.tsx (state shape and logic sketch for wizard)

const [wizardStep, setWizardStep] = useState<WizardStep>(1);
const [loanRequest, setLoanRequest] = useState<LoanRequest>(DEFAULT_LOAN_REQUEST);
const [financialInputs, setFinancialInputs] = useState<FinancialInputs>(DEFAULT_FINANCIAL_INPUTS);
const [benchmarkRate, setBenchmarkRate] = useState<number>(OFFLINE_BENCHMARK);
const [rateSource, setRateSource] = useState<RateSource>(RateSource.OFFLINE);
const [rateLabel, setRateLabel] = useState<string>(OFFLINE_LABEL);
const [comparisonHistory, setComparisonHistory] = useState<ComparisonState[]>([]);

// FRED fetch on mount - does not block first render or trigger step change
useEffect(() => {
  const apiKey = import.meta.env.VITE_FRED_API_KEY ?? '';
  fetchBenchmarkRate(apiKey).then(result => {
    setBenchmarkRate(result.value);
    setRateSource(result.source);
    setRateLabel(result.referenceLabel);
  });
}, []);

// Merge wizard state into full ApplicantInputs for engine evaluation
const applicantInputs = useMemo<ApplicantInputs>(() => ({
  monthlyIncome: financialInputs.monthlyIncome,
  monthlyDebt: financialInputs.monthlyDebt,
  creditScore: financialInputs.creditScore,
  loanAmount: loanRequest.amount,
  termMonths: loanRequest.term,
}), [loanRequest, financialInputs]);

// currentEstimate recomputes synchronously when inputs or rate change
const currentEstimate = useMemo<EngineOutput>(() => {
  if (wizardStep < 3) return null;  // only compute after Step 2 complete
  return evaluateDecision(applicantInputs, benchmarkRate);
}, [wizardStep, applicantInputs, benchmarkRate]);

// solverResult recomputes only when needed
const solverResult = useMemo<SolverResult | null>(() => {
  if (!currentEstimate || 'kind' in currentEstimate) return null;
  if (currentEstimate.decision === Decision.APPROVED) return null;
  return computeLevers(applicantInputs, benchmarkRate);
}, [applicantInputs, benchmarkRate, currentEstimate]);

// allLevers: all applicable levers for display on Step 3
const allLevers = useMemo<Lever[]>(() => {
  if (!solverResult || solverResult.levers.length === 0) return [];
  return solverResult.levers;
}, [solverResult]);

// recommendedLever: pick the most favorable lever for highlighting
const recommendedLever = useMemo<Lever | null>(() => {
  if (allLevers.length === 0) return null;
  
  // Priority 1: APPROVED-outcome lever with highest loan amount
  const approvedLevers = allLevers.filter(l => l.leverOutcome === LeverOutcome.APPROVED);
  if (approvedLevers.length > 0) {
    return approvedLevers.reduce((best, current) => {
      const bestAmount = best.mutatedInputs.loanAmount ?? applicantInputs.loanAmount;
      const currentAmount = current.mutatedInputs.loanAmount ?? applicantInputs.loanAmount;
      return currentAmount > bestAmount ? current : best;
    });
  }
  
  // Priority 2: COUNTER_OFFER-outcome lever with lowest payment
  const counterLevers = allLevers.filter(l => l.leverOutcome === LeverOutcome.COUNTER_OFFER);
  if (counterLevers.length > 0) {
    return counterLevers.reduce((best, current) => 
      current.resultingEstimatedPayment < best.resultingEstimatedPayment ? current : best
    );
  }
  
  return null;
}, [allLevers, applicantInputs]);

// selectedLeverForComparison: tracks which lever user chose to compare
const [selectedLeverForComparison, setSelectedLeverForComparison] = useState<Lever | null>(null);

// Navigation handlers
const handleContinueFromStep1 = (): void => {
  setWizardStep(2);
};

const handleContinueFromStep2 = (): void => {
  setWizardStep(3);
};

const handleCompareLever = (lever: Lever): void => {
  // Store selected lever and navigate to comparison view
  setSelectedLeverForComparison(lever);
  
  // Store current state in comparison history for undo
  if ('kind' in currentEstimate) return;
  setComparisonHistory(prev => [...prev, {
    timestamp: Date.now(),
    originalInputs: applicantInputs,
    originalEstimate: currentEstimate,
    alternativeInputs: { ...applicantInputs, ...lever.mutatedInputs },
    alternativeEstimate: lever,  // placeholder; compute in Step 4
  }]);
  
  setWizardStep(4);
};

const handleUseAlternative = (lever: Lever): void => {
  // Apply mutated inputs from lever
  if (lever.mutatedInputs.loanAmount !== undefined) {
    setLoanRequest(prev => ({ ...prev, amount: lever.mutatedInputs.loanAmount! }));
  }
  if (lever.mutatedInputs.termMonths !== undefined) {
    setLoanRequest(prev => ({ ...prev, term: lever.mutatedInputs.termMonths! }));
  }
  if (lever.mutatedInputs.monthlyIncome !== undefined) {
    setFinancialInputs(prev => ({ ...prev, monthlyIncome: lever.mutatedInputs.monthlyIncome! }));
  }
  if (lever.mutatedInputs.monthlyDebt !== undefined) {
    setFinancialInputs(prev => ({ ...prev, monthlyDebt: lever.mutatedInputs.monthlyDebt! }));
  }
  if (lever.mutatedInputs.creditScore !== undefined) {
    setFinancialInputs(prev => ({ ...prev, creditScore: lever.mutatedInputs.creditScore! }));
  }
  
  setWizardStep(3);  // return to Step 3 with updated inputs
};

const handleKeepOriginal = (): void => {
  setWizardStep(3);  // return to Step 3 without changes
};

const handleEditDetails = (): void => {
  setWizardStep(2);  // return to Step 2, preserving all current inputs
};

const handleStartOver = (): void => {
  setWizardStep(1);
  setLoanRequest(DEFAULT_LOAN_REQUEST);
  setFinancialInputs(DEFAULT_FINANCIAL_INPUTS);
  setComparisonHistory([]);
};

const handleUndo = (): void => {
  if (comparisonHistory.length === 0) return;
  const previous = comparisonHistory[comparisonHistory.length - 1];
  
  // Restore previous inputs
  setLoanRequest({ amount: previous.originalInputs.loanAmount, term: previous.originalInputs.termMonths });
  setFinancialInputs({
    monthlyIncome: previous.originalInputs.monthlyIncome,
    monthlyDebt: previous.originalInputs.monthlyDebt,
    creditScore: previous.originalInputs.creditScore,
  });
  
  // Pop comparison history
  setComparisonHistory(prev => prev.slice(0, -1));
  
  setWizardStep(4);  // return to comparison view with original
};
```

**Why `useMemo` satisfies the 100ms requirement**: Both `evaluateDecision` and `computeLevers` are pure in-memory functions with no I/O. For typical input ranges (5 inputs, up to 4 levers each iterating at most ~230 $100 steps for `computeReduceAmountLever`), execution time is under 1ms in modern V8. The 100ms budget is comfortably met.

---

## Visual Design System (Requirement 14.7)

### Color Palette

**Primary Canvas and Typography:**
- Background: `stone-50` (warm off-white, NOT white or gray-50)
- Primary text: `slate-900` (near-black)
- Secondary text: `slate-700`
- Tertiary text / help: `slate-600`
- Muted text: `slate-500`

**Interactive Elements:**
- Primary CTA buttons: `indigo-600` background, `indigo-700` hover, white text
- Secondary buttons: white background, `slate-300` border, `slate-700` text
- Text links: `indigo-600`, underline on hover
- Focus rings: `ring-2 ring-indigo-500`

**Status Indicators (Small Badges/Pills Only):**
- Approval: `emerald-100` background, `emerald-800` text
- Counter-offer: `amber-100` background, `amber-800` text
- Declined: `rose-100` background, `rose-800` text
- Info: `blue-50` background, `blue-700` text

**Structural Elements:**
- Cards: white background, `slate-200` border
- Input borders: `slate-300`, `indigo-500` focus
- Dividers: `slate-200`

### Typography Scale

**Display (Key Numbers):**
- Monthly payment (Step 3): `text-7xl font-bold` (72px)
- Loan amount (Step 1): `text-6xl font-bold` (60px)
- Comparison payment: `text-4xl font-bold` (36px)

**Headings:**
- Page title: `text-3xl font-bold` (30px)
- Section heading: `text-2xl font-bold` (24px)
- Subsection: `text-xl font-semibold` (20px)
- Label: `text-sm font-medium` (14px)

**Body:**
- Base: `text-base` (16px)
- Small: `text-sm` (14px)
- Fine print: `text-xs` (12px)

### Spacing and Layout

**Vertical Rhythm:**
- Major section margin: `mb-8` or `mb-10` (32-40px)
- Section internal spacing: `space-y-6` (24px)
- Form field spacing: `space-y-4` (16px)
- Inline element spacing: `space-y-2` (8px)

**Container Widths:**
- Mobile: full-width with `px-4` padding
- Desktop wizard: `max-w-2xl` or `max-w-3xl` centered
- Comparison columns: `max-w-sm` per column

**Button Sizing:**
- Mobile primary CTA: `w-full min-h-12` (48px minimum height)
- Desktop primary CTA: `w-full` or `px-8 py-4`
- Secondary actions: `px-4 py-2`

### Component-Specific Patterns

**LeverOptionCard (Requirement 15):**
- Clean white card with slate-200 border and rounded-lg corners
- Padding: p-6
- Shadow: shadow-sm at rest
- Recommended lever: border-2 border-indigo-300 or bg-indigo-50 background
- Layout: vertical stack with space-y-4 internal spacing
  - Heading: Lever description (text-lg font-semibold slate-900)
  - Payment number: resulting monthly payment (text-3xl or text-4xl font-bold slate-900)
  - Outcome badge: small pill (emerald-100/amber-100 background, emerald-800/amber-800 text, text-xs font-semibold)
  - Trade-off summary: 2-3 lines of text-sm slate-600 explaining what changes
  - CTA button: full-width indigo-600 bg, text-white, rounded-md, px-4 py-3
- Recommended badge: small "Recommended" pill (text-xs indigo-600 bg-indigo-100) positioned top-right
- Mobile: full-width, stacked vertically with space-y-4
- Desktop: may use grid-cols-2 if screen width > 768px

**ProductOfferCard (Updated for Requirement 15):**
- Same card styling as LeverOptionCard for consistency
- Icon: lucide-react icon in colored circle (p-3 rounded-full bg-indigo-100 text-indigo-600)
- Product name: text-lg font-semibold slate-900
- Timeline badge: small pill (blue-100 background, blue-800 text) showing "6-9 months" or "Immediate"
- Key terms: bulleted list (text-sm slate-600, space-y-1)
- Qualification gap: text-sm slate-700, 2-3 lines explaining the path
- CTA button: same styling as LeverOptionCard ("Learn more" or "Start this plan")

**ConversionView (Updated for Requirement 15):**
- Integrated into wizard at Step 3 or dedicated declined view
- Top section: DeclineReasonDetail in compact rose-50 card (NOT large banner)
  - border-rose-200, rounded-lg, p-6
  - Heading: text-xl font-bold rose-900
  - Metric details: text-sm rose-700, showing exact current vs. target values
- Middle section: space-y-6 vertical stack of 1-3 ProductOfferCard components
- Bottom section: secondary actions (text-sm indigo-600 links for "Edit details", "Start over")
- Overall canvas: stone-50 background, maintains wizard spacing (space-y-8)

**Input Fields:**
- Currency inputs: prefix with "$", thousand separators, `border-slate-300`
- Number inputs: large font for amount display (`text-4xl` or larger)
- Sliders: `indigo-600` track fill, visible thumb with shadow
- Radio pills: `rounded-full`, `indigo-600` active background

**Buttons:**
- Primary: `rounded-md bg-indigo-600 text-white shadow-sm hover:shadow-md`
- Secondary: `rounded-md border-2 border-slate-300 bg-white hover:border-slate-400`
- Text links: `text-sm text-indigo-600 underline-offset-2 hover:underline`

**Status Badges:**
- Always pill shape: `rounded-full px-3 py-1.5`
- Icon prefix optional: check mark (approved), alert triangle (counter-offer)
- Font: `text-sm font-semibold`

**Cards:**
- Border: `border border-slate-200` or `border-2` for emphasis
- Background: `bg-white` or `bg-slate-50` for nested cards
- Shadow: `shadow-sm` at rest, `shadow-md` on hover (if interactive)
- Padding: `p-6` or `p-8` depending on content density

**Comparison Layouts:**
- Two columns on desktop: `grid grid-cols-2 gap-6`
- Single column on mobile: stacked, `space-y-4`
- Highlight alternative: `border-2 border-indigo-300` or subtle `bg-indigo-50`

### Accessibility Requirements

**Minimum Contrast:**
- Body text on stone-50: 4.5:1 (slate-900 meets WCAG AA)
- Small text on badges: 4.5:1 (emerald-800, amber-800, rose-800 all meet AA)
- Interactive elements: 3:1 (indigo-600 on white meets AA)

**Touch Targets:**
- All buttons, radio buttons, links: minimum 44×44px clickable area
- Mobile slider thumbs: minimum 44×44px
- Input fields: minimum 48px height

**Focus Indicators:**
- Visible `ring-2 ring-indigo-500` on all interactive elements
- Do not remove focus outlines
- Focus visible state matches hover state color

**Readable Line Length:**
- Body text: max 65-75 characters per line
- Wizard container: `max-w-2xl` or `max-w-3xl` to enforce readable width

### Anti-Patterns to Avoid

❌ White (`bg-white`) or gray-50 (`bg-gray-50`) as primary canvas (use `stone-50`)
❌ Large colored banners for status (use small pill badges)
❌ Nested borders (cards within bordered containers)
❌ Repeated icons or duplicate values on the same screen
❌ Gray-on-gray text below `slate-600` (insufficient contrast)
❌ Em dashes (`—`) in any UI copy (use hyphens or colons)
❌ Multiple competing CTAs on one screen (single primary CTA per step)
❌ Technical jargon in headings (e.g., "Applicant Profile" → "Tell us about your finances")

---

## Wireframes

### Wizard Flow Wireframes

#### Step 1: Loan Amount Selection (Entry Screen)

```
+------------------------------------------------------------------+
|                                                                  |
|                   [warm stone-50 background]                     |
|                                                                  |
|                                                                  |
|              How much would you like to borrow?                  |
|              [text-3xl font-bold slate-900]                      |
|                                                                  |
|                                                                  |
|                       $10,000                                    |
|                  [text-6xl font-bold slate-900]                  |
|                                                                  |
|            [========o=========================]                  |
|            $2,000                      $25,000                   |
|                                                                  |
|                                                                  |
|              Choose your loan term:                              |
|              [text-base slate-900]                               |
|                                                                  |
|   ( ) 12 mo  ( ) 24 mo  (*) 36 mo  ( ) 48 mo  ( ) 60 mo       |
|   [pill-shaped radio buttons, indigo-600 when active]           |
|                                                                  |
|                                                                  |
|                                                                  |
|   [View example scenarios]                                       |
|   [text-sm indigo-600 underline link]                           |
|                                                                  |
|                                                                  |
|   +----------------------------------------------------------+   |
|   |                      Continue                            |   |
|   |   [full-width button, indigo-600 bg, min-h-12]           |   |
|   +----------------------------------------------------------+   |
|                                                                  |
+------------------------------------------------------------------+
```

#### Step 2: Financial Details Input

```
+------------------------------------------------------------------+
|  [<- Back]                                           [stone-50]  |
+------------------------------------------------------------------+
|                                                                  |
|   Your loan request                                              |
|   +----------------------------------------------------------+   |
|   | $10,000 over 36 months                                   |   |
|   | [compact card, slate-100 bg, text-sm]                    |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   Tell us about your finances                                    |
|   [text-2xl font-bold slate-900]                                 |
|                                                                  |
|                                                                  |
|   Monthly income                                                 |
|   [text-sm font-medium slate-900]                                |
|   +----------------------------------------------------------+   |
|   | $                                                        |   |
|   | [formatted currency input, border-slate-300]             |   |
|   +----------------------------------------------------------+   |
|   Include take-home pay from all jobs                            |
|   [text-xs slate-600 italic]                                     |
|                                                                  |
|   Monthly debt payments                                          |
|   [text-sm font-medium slate-900]                                |
|   +----------------------------------------------------------+   |
|   | $                                                        |   |
|   | [formatted currency input, border-slate-300]             |   |
|   +----------------------------------------------------------+   |
|   Include credit cards, car loans, student loans                 |
|   [text-xs slate-600 italic]                                     |
|                                                                  |
|   Estimated credit score                                         |
|   [text-sm font-medium slate-900]                                |
|   [===========o=================]  650                           |
|   500                         850                                |
|   [slider with live value display]                               |
|                                                                  |
|                                                                  |
|   +----------------------------------------------------------+   |
|   |                      Continue                            |   |
|   |   [full-width button, indigo-600 bg]                     |   |
|   +----------------------------------------------------------+   |
|                                                                  |
+------------------------------------------------------------------+
```

#### Step 3: Estimate Display (Primary Decision Screen - Counter-Offer)

```
+------------------------------------------------------------------+
|  [Edit details]  [Start over]                        [stone-50]  |
+------------------------------------------------------------------+
|                                                                  |
|                     Your estimated                               |
|                   monthly payment                                |
|                 [text-xl slate-700]                              |
|                                                                  |
|                       $353                                       |
|                 [text-7xl font-bold slate-900]                   |
|                                                                  |
|   $10,000  |  36 months  |  16.50% APR                          |
|   [text-sm slate-600, single compact row]                        |
|                                                                  |
|   [ ⚠ Debt-to-income slightly high ]                            |
|   [small amber-100 pill badge, amber-800 text]                   |
|                                                                  |
|                                                                  |
|   Your options                                                   |
|   [text-lg font-semibold slate-900]                              |
|                                                                  |
|   +----------------------------------------------------------+   |
|   | Extend to 48 months            [Recommended]           |   |
|   | [border-2 border-indigo-300, bg-indigo-50]             |   |
|   |                                                          |   |
|   |      $291/mo                                             |   |
|   |   [text-4xl font-bold slate-900]                         |   |
|   |                                                          |   |
|   |   [ ✓ Unlocks full approval ]                           |   |
|   |   [emerald-100 badge, emerald-800 text]                  |   |
|   |                                                          |   |
|   |   Save $62/month, pay $1,260 more total interest         |   |
|   |   [text-sm slate-600]                                    |   |
|   |                                                          |   |
|   |   [Compare this option]                                  |   |
|   |   [full-width indigo-600 button]                         |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   +----------------------------------------------------------+   |
|   | Reduce loan to $8,500                                   |   |
|   | [border border-slate-200, bg-white]                     |   |
|   |                                                          |   |
|   |      $300/mo                                             |   |
|   |   [text-4xl font-bold slate-900]                         |   |
|   |                                                          |   |
|   |   [ ⚠ Moves to counter-offer ]                          |   |
|   |   [amber-100 badge, amber-800 text]                      |   |
|   |                                                          |   |
|   |   Borrow $1,500 less, pay $53 less per month             |   |
|   |   [text-sm slate-600]                                    |   |
|   |                                                          |   |
|   |   [Compare this option]                                  |   |
|   |   [full-width indigo-600 button]                         |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   +----------------------------------------------------------+   |
|   | Pay down monthly debt by $250                           |   |
|   | [border border-slate-200, bg-white]                     |   |
|   |                                                          |   |
|   |      $353/mo                                             |   |
|   |   [text-4xl font-bold slate-900]                         |   |
|   |                                                          |   |
|   |   [ ✓ Unlocks full approval ]                           |   |
|   |   [emerald-100 badge, emerald-800 text]                  |   |
|   |                                                          |   |
|   |   Requires $250/month debt paydown upfront               |   |
|   |   [text-sm slate-600]                                    |   |
|   |                                                          |   |
|   |   [Compare this option]                                  |   |
|   |   [full-width indigo-600 button]                         |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|                                                                  |
|   Simulated estimate - not a final offer                         |
|   [text-xs slate-500, center, bottom of viewport]                |
|                                                                  |
+------------------------------------------------------------------+
```

#### Step 3: Estimate Display (Approved)

```
+------------------------------------------------------------------+
|  [Edit details]  [Start over]                        [stone-50]  |
+------------------------------------------------------------------+
|                                                                  |
|                     Your estimated                               |
|                   monthly payment                                |
|                 [text-xl slate-700]                              |
|                                                                  |
|                       $322                                       |
|                 [text-7xl font-bold slate-900]                   |
|                                                                  |
|   $10,000  |  36 months  |  10.00% APR                          |
|   [text-sm slate-600, single compact row]                        |
|                                                                  |
|   [ ✓ Approved estimate ]                                       |
|   [small emerald-100 pill badge, emerald-800 text]               |
|                                                                  |
|                                                                  |
|   +----------------------------------------------------------+   |
|   |               Continue to summary                        |   |
|   |   [indigo-600 button, full-width]                        |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   Simulated estimate - not a final offer                         |
|   [text-xs slate-500, center]                                    |
|                                                                  |
+------------------------------------------------------------------+
```

#### Step 3: Declined View (ConversionView with Product Offers)

```
+------------------------------------------------------------------+
|  [Edit details]  [Start over]                        [stone-50]  |
+------------------------------------------------------------------+
|                                                                  |
|   We're unable to approve this loan                              |
|   [text-2xl font-bold slate-900]                                 |
|                                                                  |
|   +----------------------------------------------------------+   |
|   | Why this loan wasn't approved                            |   |
|   | [rose-50 bg, border-rose-200, rounded-lg, p-6]           |   |
|   |                                                          |   |
|   | Your debt-to-income ratio is 48%                        |   |
|   | Our maximum allowed is 45%                               |   |
|   | [text-sm rose-700]                                       |   |
|   |                                                          |   |
|   | Adding this loan would bring your total monthly debt     |   |
|   | to $1,650, which is too high for your $3,500 income.    |   |
|   | [text-sm rose-700]                                       |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   We have products you qualify for today                         |
|   [text-lg font-semibold slate-900]                              |
|                                                                  |
|   +----------------------------------------------------------+   |
|   | 🔒 Debt Consolidation Loan      [Immediate]            |   |
|   | [border border-slate-200, bg-white, p-6]                |   |
|   |                                                          |   |
|   | Consolidate existing debt to lower your DTI to 36%      |   |
|   | [text-sm slate-700]                                      |   |
|   |                                                          |   |
|   | • Consolidate up to $19,200 of existing debt            |   |
|   | • Fixed APR, no prepayment penalty                      |   |
|   | • New monthly payment: ~$480                            |   |
|   | [text-sm slate-600, bulleted list]                       |   |
|   |                                                          |   |
|   | Current DTI: 48%  →  Target: 36%                        |   |
|   | [text-sm slate-600]                                      |   |
|   |                                                          |   |
|   |   [Start this plan]                                      |   |
|   |   [full-width indigo-600 button]                         |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   +----------------------------------------------------------+   |
|   | 💳 Tier-2 Micro-Loan            [Immediate]             |   |
|   | [border border-slate-200, bg-white, p-6]                |   |
|   |                                                          |   |
|   | Approve smaller $3,500 loan that fits your budget        |   |
|   | [text-sm slate-700]                                      |   |
|   |                                                          |   |
|   | • Loan amount: $3,500                                    |   |
|   | • Term: 36 months                                        |   |
|   | • APR: 18.50% (Tier-2 pricing)                          |   |
|   | • Build credit for future larger loans                  |   |
|   | [text-sm slate-600, bulleted list]                       |   |
|   |                                                          |   |
|   | Requested: $10,000  →  Available: $3,500                |   |
|   | [text-sm slate-600]                                      |   |
|   |                                                          |   |
|   |   [Learn more]                                           |   |
|   |   [full-width indigo-600 button]                         |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|                                                                  |
+------------------------------------------------------------------+
```

#### Step 4: Comparison View (Side-by-Side)

```
+------------------------------------------------------------------+
|  [Edit details]  [Keep original]                     [stone-50]  |
+------------------------------------------------------------------+
|                                                                  |
|   Compare your options                                           |
|   [text-2xl font-bold slate-900]                                 |
|                                                                  |
|   +-------------------------+  +-----------------------------+   |
|   | Your original estimate  |  | 48-month option             |   |
|   |                         |  | [slate-200 border]          |   |
|   | $10,000 loan            |  | $10,000 loan                |   |
|   | 36 months               |  | 48 months                   |   |
|   |                         |  |                             |   |
|   |      $353/mo            |  |      $291/mo                |   |
|   |   [text-4xl bold]       |  |   [text-4xl bold indigo]    |   |
|   |                         |  |                             |   |
|   | 16.50% APR              |  | 16.50% APR                  |   |
|   | Total cost: $12,708     |  | Total cost: $13,968         |   |
|   | [text-sm slate-600]     |  | [text-sm slate-600]         |   |
|   +-------------------------+  +-----------------------------+   |
|                                                                  |
|   Trade-offs                                                     |
|   +----------------------------------------------------------+   |
|   |  Monthly savings: $62 less per month                     |   |
|   |  Total cost: $1,260 more in interest                     |   |
|   |  [amber-50 bg, amber-900 text, border-amber-200]         |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   +----------------------------------------------------------+   |
|   |               Use 48 months                              |   |
|   |   [indigo-600 button, full-width]                        |   |
|   +----------------------------------------------------------+   |
|                                                                  |
+------------------------------------------------------------------+
```

#### Step 5: Summary (Post-Selection)

```
+------------------------------------------------------------------+
|  [Edit details]  [Start over]                        [stone-50]  |
+------------------------------------------------------------------+
|                                                                  |
|   Your loan summary                                              |
|   [text-2xl font-bold slate-900]                                 |
|                                                                  |
|   +----------------------------------------------------------+   |
|   |  Loan amount          $10,000                            |   |
|   |  Loan term            48 months                          |   |
|   |  Estimated payment    $291/mo                            |   |
|   |  APR                  16.50%                             |   |
|   |  Total cost           $13,968                            |   |
|   |  [slate-100 bg card, text-base]                          |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   What changed                                                   |
|   +----------------------------------------------------------+   |
|   |  Extended term from 36 to 48 months to lower monthly     |   |
|   |  payment by $62.                                         |   |
|   |  [slate-50 bg, text-sm slate-700]                        |   |
|   +----------------------------------------------------------+   |
|                                                                  |
|   Simulated estimate - not a final offer                         |
|   [text-sm font-semibold slate-700, border-t pt-4]               |
|                                                                  |
|   +----------------------------------------------------------+   |
|   |            Start your application                        |   |
|   |   [indigo-600 button, full-width]                        |   |
|   +----------------------------------------------------------+   |
|                                                                  |
+------------------------------------------------------------------+
```

### Mobile Layout Notes

All wizard steps render in a single-column layout on mobile (below 640px):
- Full-width inputs and buttons
- Bottom-pinned primary CTA buttons with safe-area padding
- Comparison columns in Step 4 stack vertically (original above, alternative below)
- 44px minimum tap targets for all interactive elements
- Max-width container (max-w-2xl) centered on desktop

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system - essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Determinism

*For any* valid `ApplicantInputs` and `benchmarkRate`, calling `evaluateDecision` twice with identical arguments SHALL return an identical `EngineResult`.

**Validates: Requirements 10.4**

### Property 2: APR floor invariant

*For any* `creditScore` in [600, 850] and `benchmarkRate` in [0.00, 30.00], the APR computed by `computeAPR` SHALL be a finite number greater than or equal to 6.99.

**Validates: Requirements 2.2, 2.4**

### Property 3: APR round-trip precision

*For any* valid `benchmarkRate` and eligible `creditScore`, the APR returned by `computeAPR` SHALL equal `Math.round(rawApr * 100) / 100`, confirming exactly two decimal places are preserved.

**Validates: Requirements 2.2**

### Property 4: Amortization formula correctness

*For any* `loanAmount` > 0, `termMonths` in {12, 24, 36, 48, 60}, and `apr` >= 0, `computeEstimatedPayment` SHALL return a finite positive number, and the result SHALL satisfy `payment >= loanAmount / termMonths` (payment is always at least the zero-interest payment).

**Validates: Requirements 3.1, 3.5, 9.5**

### Property 5: DTI monotonicity with income

*For any* fixed `monthlyDebt`, `estimatedPayment`, and two income values `i1 < i2` (both > 0), `computePostLoanDTI` with `i1` SHALL return a value strictly greater than the result with `i2`.

**Validates: Requirements 3.3**

---

## Post-Denial Conversion & Progress Tracking Architecture

### High-Level Flow

```
Applicant Enters Inputs
        |
        v
  evaluateDecision(inputs)
        |
        +-- APPROVED or COUNTER_OFFER -> Standard DecisionBanner + PathToYesChecklist
        |
        +-- DECLINED -> ConversionView (replaces DecisionBanner)
                |
                v
        computeProductRecommendations(engineResult, inputs)
                |
                v
        Display 1-3 Product Offer Cards ranked by timeline
                |
                +-- User clicks "Accept & Start Plan"
                |   |
                |   v
                |   Store ActivePlan in localStorage -> Redirect to ProgressTracker
                |
                +-- User clicks "Return to Simulator" -> Stay in standard view
```

### localStorage Schema

```typescript
// Key: 'pathToYesActivePlan'
interface ActivePlan {
  productType: RetentionProductType;
  acceptedAt: string; // ISO 8601 timestamp
  initialInputs: ApplicantInputs;
  initialEngineResult: EngineResult;
}

// Key: 'pathToYesProgressState'
interface ProgressState {
  milestones: MilestoneStatus[];
  updatedInputs: ApplicantInputs | null;
  lastUpdated: string; // ISO 8601 timestamp
}

interface MilestoneStatus {
  milestoneId: string;
  label: string;
  completed: boolean;
  completedAt: string | null; // ISO 8601 timestamp
}
```

### New Engine Module: productMapper.ts

```typescript
// src/engine/productMapper.ts

import type { ApplicantInputs, EngineResult } from './types';
import { ReasonCode, Decision, RetentionProductType } from './types';

export interface ProductRecommendation {
  productType: RetentionProductType;
  productName: string;
  productIcon: string; // lucide-react icon name
  qualificationGap: string; // Plain-English gap explanation
  timelineMonths: number; // Estimated months to re-qualify
  timelineLabel: string; // e.g., "6-9 months to re-qualify"
  keyTerms: string[]; // Bullet list of key product terms
  gapMetrics: {
    currentValue: number | string;
    targetValue: number | string;
    metricLabel: string; // e.g., "Credit Score", "DTI Ratio"
  };
}

export interface ProductRecommendationResult {
  recommendations: ProductRecommendation[];
  emptyMessage: string | null; // Non-null if no products available
}

/**
 * Maps decline reason codes to retention product recommendations.
 * Returns 1-3 recommendations ranked by fastest timeline to re-qualification.
 */
export function computeProductRecommendations(
  engineResult: EngineResult,
  inputs: ApplicantInputs,
): ProductRecommendationResult {
  if (engineResult.decision !== Decision.DECLINED || !engineResult.reasonCode) {
    return { recommendations: [], emptyMessage: 'No product recommendations for non-declined decisions' };
  }

  const recommendations: ProductRecommendation[] = [];

  switch (engineResult.reasonCode) {
    case ReasonCode.HIGH_RISK_SCORE:
      recommendations.push(createSecuredCreditBuilderOffer(inputs));
      break;

    case ReasonCode.INSUFFICIENT_INCOME:
      recommendations.push(createHighYieldSavingsOffer(inputs));
      break;

    case ReasonCode.EXCESSIVE_DEBT:
    case ReasonCode.HIGH_DTI:
      recommendations.push(createDebtConsolidationOffer(inputs, engineResult));
      // Also offer micro-loan if requested amount was high
      if (inputs.loanAmount > 10000) {
        recommendations.push(createMicroLoanOffer(inputs, engineResult));
      }
      break;

    default:
      return { recommendations: [], emptyMessage: 'No retention products available for this decline reason' };
  }

  // Sort by timeline (fastest first), then by estimated cost (lowest first)
  recommendations.sort((a, b) => {
    if (a.timelineMonths !== b.timelineMonths) {
      return a.timelineMonths - b.timelineMonths;
    }
    // Tie-break by product type priority: micro-loan (immediate) > consolidation > savings > credit builder
    const priority: Record<RetentionProductType, number> = {
      [RetentionProductType.MICRO_LOAN]: 1,
      [RetentionProductType.DEBT_CONSOLIDATION]: 2,
      [RetentionProductType.HIGH_YIELD_SAVINGS]: 3,
      [RetentionProductType.SECURED_CREDIT_BUILDER]: 4,
    };
    return priority[a.productType] - priority[b.productType];
  });

  return { recommendations: recommendations.slice(0, 3), emptyMessage: null };
}

function createSecuredCreditBuilderOffer(inputs: ApplicantInputs): ProductRecommendation {
  const targetScore = 640;
  const scoreGap = targetScore - inputs.creditScore;
  const timelineMonths = Math.ceil(scoreGap / 10); // ~10 points per month with on-time payments

  return {
    productType: RetentionProductType.SECURED_CREDIT_BUILDER,
    productName: 'Secured Credit Builder Card',
    productIcon: 'shield-check',
    qualificationGap: `Build credit history from ${inputs.creditScore} to ${targetScore} with on-time payments`,
    timelineMonths,
    timelineLabel: `${timelineMonths}-${timelineMonths + 3} months to re-qualify`,
    keyTerms: [
      'Minimum $200 refundable security deposit',
      '0% APR on purchases',
      'Reports to all 3 credit bureaus',
      'Graduation to unsecured card after 6 months',
    ],
    gapMetrics: {
      currentValue: inputs.creditScore,
      targetValue: targetScore,
      metricLabel: 'Credit Score',
    },
  };
}

function createHighYieldSavingsOffer(inputs: ApplicantInputs): ProductRecommendation {
  const targetIncome = 1800;
  const incomeGap = targetIncome - inputs.monthlyIncome;

  return {
    productType: RetentionProductType.HIGH_YIELD_SAVINGS,
    productName: 'High-Yield Savings + Direct Deposit',
    productIcon: 'piggy-bank',
    qualificationGap: incomeGap > 0
      ? `Establish ${incomeGap > 500 ? 'supplemental income source' : 'direct deposit history'} to reach $${targetIncome.toLocaleString()}/mo minimum`
      : 'Establish 3-month direct deposit history to demonstrate income stability',
    timelineMonths: 3,
    timelineLabel: '3 months to re-qualify',
    keyTerms: [
      'No minimum balance requirement',
      '4.50% APY on all balances',
      'Set up direct deposit for bonus consideration',
      'Mobile app with budgeting tools',
    ],
    gapMetrics: {
      currentValue: `$${inputs.monthlyIncome.toLocaleString()}`,
      targetValue: `$${targetIncome.toLocaleString()}`,
      metricLabel: 'Monthly Income',
    },
  };
}

function createDebtConsolidationOffer(inputs: ApplicantInputs, engineResult: EngineResult): ProductRecommendation {
  // Estimate new DTI after consolidation: assume 20% reduction in monthly debt payment via lower APR + extended term
  const consolidatedDebt = inputs.monthlyDebt * 0.8;
  const newDTI = (consolidatedDebt + engineResult.estimatedPayment) / inputs.monthlyIncome;
  const targetDTI = 0.36;

  return {
    productType: RetentionProductType.DEBT_CONSOLIDATION,
    productName: 'Debt Consolidation Loan',
    productIcon: 'scale',
    qualificationGap: `Reduce monthly debt obligations from $${inputs.monthlyDebt.toLocaleString()} to ~$${Math.ceil(consolidatedDebt).toLocaleString()} to lower DTI`,
    timelineMonths: 0, // Immediate approval if consolidation brings DTI under threshold
    timelineLabel: 'Immediate re-qualification with consolidation',
    keyTerms: [
      `Consolidate up to $${(inputs.monthlyDebt * 12).toLocaleString()} of existing debt`,
      'Fixed APR, no prepayment penalty',
      'Estimated new monthly payment: ~$' + Math.ceil(consolidatedDebt).toLocaleString(),
      'Close consolidated accounts to prevent new balances',
    ],
    gapMetrics: {
      currentValue: `${(engineResult.postLoanDTI * 100).toFixed(1)}%`,
      targetValue: `${(targetDTI * 100).toFixed(0)}%`,
      metricLabel: 'Debt-to-Income Ratio',
    },
  };
}

function createMicroLoanOffer(inputs: ApplicantInputs, engineResult: EngineResult): ProductRecommendation {
  // Micro-loan: smaller amount that fits within DTI threshold
  const maxLoanAmount = Math.floor((0.36 * inputs.monthlyIncome - inputs.monthlyDebt) * inputs.termMonths);
  const cappedAmount = Math.max(2000, Math.min(5000, maxLoanAmount));

  return {
    productType: RetentionProductType.MICRO_LOAN,
    productName: 'Tier-2 Micro-Loan',
    productIcon: 'dollar-sign',
    qualificationGap: `Approve smaller loan amount ($${cappedAmount.toLocaleString()}) that fits within your budget`,
    timelineMonths: 0, // Immediate approval
    timelineLabel: 'Immediate approval',
    keyTerms: [
      `Loan amount: $${cappedAmount.toLocaleString()}`,
      `Term: ${inputs.termMonths} months`,
      'APR: ' + (engineResult.apr + 2.0).toFixed(2) + '% (Tier-2 pricing)',
      'Build credit history for future larger loans',
    ],
    gapMetrics: {
      currentValue: `$${inputs.loanAmount.toLocaleString()}`,
      targetValue: `$${cappedAmount.toLocaleString()}`,
      metricLabel: 'Requested Loan Amount',
    },
  };
}
```

### New Component: ConversionView.tsx

```typescript
// src/components/ConversionView.tsx

import type { EngineResult, ApplicantInputs, ProductRecommendation } from '../engine/types';
import { computeProductRecommendations } from '../engine/productMapper';
import { ProductOfferCard } from './ProductOfferCard';

interface ConversionViewProps {
  engineResult: EngineResult;
  inputs: ApplicantInputs;
  onAcceptProduct: (recommendation: ProductRecommendation) => void;
  onReturnToSimulator: () => void;
}

export function ConversionView({
  engineResult,
  inputs,
  onAcceptProduct,
  onReturnToSimulator,
}: ConversionViewProps): JSX.Element {
  const { recommendations, emptyMessage } = computeProductRecommendations(engineResult, inputs);

  return (
    <div className="space-y-8">
      {/* Decline Reason Summary with Exact Numbers */}
      <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-8">
        <h2 className="text-2xl font-bold text-rose-900 mb-4">Application Could Not Be Approved</h2>
        <DeclineReasonDetail engineResult={engineResult} inputs={inputs} />
      </div>

      {/* Product Offer Cards */}
      {recommendations.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">Build Your Path to Yes</h3>
          <p className="text-sm text-slate-600">
            We have {recommendations.length} product{recommendations.length > 1 ? 's' : ''} you qualify for today that will help you reach approval:
          </p>
          <div className="grid gap-6">
            {recommendations.map((rec, idx) => (
              <ProductOfferCard
                key={rec.productType}
                recommendation={rec}
                rank={idx + 1}
                onAccept={() => onAcceptProduct(rec)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-slate-700">{emptyMessage}</p>
        </div>
      )}

      <button
        onClick={onReturnToSimulator}
        className="w-full rounded-md border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        Return to Simulator
      </button>
    </div>
  );
}

function DeclineReasonDetail({ engineResult, inputs }: { engineResult: EngineResult; inputs: ApplicantInputs }): JSX.Element {
  const { reasonCode, postLoanDTI, estimatedPayment } = engineResult;

  switch (reasonCode) {
    case ReasonCode.HIGH_DTI:
      return (
        <div className="space-y-2">
          <p className="text-base text-rose-800">
            <strong>Your debt-to-income ratio is too high.</strong>
          </p>
          <p className="text-sm text-rose-700">
            Adding this loan would bring your total monthly debt payments to{' '}
            <strong>${(inputs.monthlyDebt + estimatedPayment).toLocaleString()}</strong>, which is{' '}
            <strong>{(postLoanDTI * 100).toFixed(1)}%</strong> of your ${inputs.monthlyIncome.toLocaleString()} monthly income.
          </p>
          <p className="text-sm text-rose-700">
            Our maximum allowed DTI is <strong>45%</strong>. You need to lower your total debt payments or increase income.
          </p>
        </div>
      );

    case ReasonCode.HIGH_RISK_SCORE:
      return (
        <div className="space-y-2">
          <p className="text-base text-rose-800">
            <strong>Your credit score does not meet our minimum requirement.</strong>
          </p>
          <p className="text-sm text-rose-700">
            Your current credit score is <strong>{inputs.creditScore}</strong>. Our minimum for standard unsecured loans is <strong>600</strong>.
          </p>
        </div>
      );

    case ReasonCode.INSUFFICIENT_INCOME:
      return (
        <div className="space-y-2">
          <p className="text-base text-rose-800">
            <strong>Your monthly income does not meet our minimum threshold.</strong>
          </p>
          <p className="text-sm text-rose-700">
            Your current monthly income is <strong>${inputs.monthlyIncome.toLocaleString()}</strong>. Our minimum is <strong>$1,800</strong>.
          </p>
        </div>
      );

    case ReasonCode.EXCESSIVE_DEBT:
      return (
        <div className="space-y-2">
          <p className="text-base text-rose-800">
            <strong>Your existing debt obligations exceed your monthly income.</strong>
          </p>
          <p className="text-sm text-rose-700">
            Your monthly debt payments (<strong>${inputs.monthlyDebt.toLocaleString()}</strong>) are equal to or greater than your monthly income (<strong>${inputs.monthlyIncome.toLocaleString()}</strong>).
          </p>
        </div>
      );

    default:
      return <p className="text-sm text-rose-700">We were unable to approve your application at this time.</p>;
  }
}
```

### New Component: ProgressTracker.tsx

```typescript
// src/components/ProgressTracker.tsx

import type { ActivePlan, ProgressState, ApplicantInputs } from '../engine/types';
import { evaluateDecision } from '../engine';
import { MilestoneChecklist } from './MilestoneChecklist';
import { MetricProgressCard } from './MetricProgressCard';

interface ProgressTrackerProps {
  activePlan: ActivePlan;
  progressState: ProgressState;
  benchmarkRate: number;
  onMilestoneToggle: (milestoneId: string) => void;
  onReEvaluate: (updatedInputs: ApplicantInputs) => void;
  onStartOver: () => void;
}

export function ProgressTracker({
  activePlan,
  progressState,
  benchmarkRate,
  onMilestoneToggle,
  onReEvaluate,
  onStartOver,
}: ProgressTrackerProps): JSX.Element {
  const completedCount = progressState.milestones.filter(m => m.completed).length;
  const totalCount = progressState.milestones.length;
  const completionPercentage = (completedCount / totalCount) * 100;
  const allMilestonesComplete = completedCount === totalCount;

  const currentInputs = progressState.updatedInputs ?? activePlan.initialInputs;
  const currentResult = evaluateDecision(currentInputs, benchmarkRate);

  return (
    <div className="space-y-8">
      {/* Header: Product Name + Progress Bar */}
      <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-8">
        <div className="flex items-center space-x-4 mb-4">
          <ProductIcon productType={activePlan.productType} />
          <div>
            <h2 className="text-2xl font-bold text-indigo-900">Your Path to Yes Plan</h2>
            <p className="text-sm text-indigo-700">{getProductName(activePlan.productType)}</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-indigo-700 mb-2">
            <span>{completedCount} of {totalCount} milestones complete</span>
            <span>{completionPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-indigo-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current vs. Target Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <MetricProgressCard
          label="Credit Score"
          current={currentInputs.creditScore}
          target={640}
          unit=""
          inverse={false}
        />
        <MetricProgressCard
          label="Debt-to-Income Ratio"
          current={('kind' in currentResult) ? 0 : currentResult.postLoanDTI * 100}
          target={36}
          unit="%"
          inverse={true}
        />
        <MetricProgressCard
          label="Monthly Income"
          current={currentInputs.monthlyIncome}
          target={2000}
          unit="$"
          inverse={false}
        />
        <MetricProgressCard
          label="Monthly Debt"
          current={currentInputs.monthlyDebt}
          target={currentInputs.monthlyIncome * 0.3}
          unit="$"
          inverse={true}
        />
      </div>

      {/* Milestone Checklist */}
      <MilestoneChecklist
        milestones={progressState.milestones}
        onToggle={onMilestoneToggle}
      />

      {/* Re-Evaluate Button */}
      <div className="space-y-4">
        {allMilestonesComplete && (
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-lg font-semibold text-emerald-900">
              All milestones complete - Ready to re-apply!
            </p>
          </div>
        )}
        
        <button
          onClick={() => {
            const updated = prompt('Update your inputs (or cancel to use current values)');
            // In real implementation, show a form modal to update inputs
            onReEvaluate(currentInputs);
          }}
          className={`w-full rounded-md px-6 py-4 text-base font-semibold text-white transition-shadow ${
            allMilestonesComplete
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-xl animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md'
          }`}
        >
          Re-Evaluate Eligibility
        </button>

        <button
          onClick={onStartOver}
          className="w-full rounded-md border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
```

### New Types

```typescript
// src/engine/types.ts (additions)

export enum RetentionProductType {
  SECURED_CREDIT_BUILDER = 'SECURED_CREDIT_BUILDER',
  HIGH_YIELD_SAVINGS = 'HIGH_YIELD_SAVINGS',
  MICRO_LOAN = 'MICRO_LOAN',
  DEBT_CONSOLIDATION = 'DEBT_CONSOLIDATION',
}

export interface ActivePlan {
  productType: RetentionProductType;
  acceptedAt: string; // ISO 8601
  initialInputs: ApplicantInputs;
  initialEngineResult: EngineResult;
}

export interface ProgressState {
  milestones: MilestoneStatus[];
  updatedInputs: ApplicantInputs | null;
  lastUpdated: string; // ISO 8601
}

export interface MilestoneStatus {
  milestoneId: string;
  label: string;
  completed: boolean;
  completedAt: string | null; // ISO 8601
}
```

### Milestone Catalog by Product Type

```typescript
// src/engine/milestones.ts

import { RetentionProductType, MilestoneStatus } from './types';

export function getInitialMilestones(productType: RetentionProductType): MilestoneStatus[] {
  switch (productType) {
    case RetentionProductType.SECURED_CREDIT_BUILDER:
      return [
        { milestoneId: 'scb-1', label: 'Open secured credit card account', completed: false, completedAt: null },
        { milestoneId: 'scb-2', label: 'Make first on-time payment', completed: false, completedAt: null },
        { milestoneId: 'scb-3', label: 'Complete 3 months of on-time payments', completed: false, completedAt: null },
        { milestoneId: 'scb-4', label: 'Complete 6 months of on-time payments', completed: false, completedAt: null },
        { milestoneId: 'scb-5', label: 'Request credit score update', completed: false, completedAt: null },
      ];

    case RetentionProductType.HIGH_YIELD_SAVINGS:
      return [
        { milestoneId: 'hys-1', label: 'Open high-yield savings account', completed: false, completedAt: null },
        { milestoneId: 'hys-2', label: 'Set up direct deposit', completed: false, completedAt: null },
        { milestoneId: 'hys-3', label: 'Maintain direct deposit for 3 months', completed: false, completedAt: null },
        { milestoneId: 'hys-4', label: 'Build emergency savings to $1,000+', completed: false, completedAt: null },
      ];

    case RetentionProductType.MICRO_LOAN:
      return [
        { milestoneId: 'ml-1', label: 'Accept micro-loan offer', completed: false, completedAt: null },
        { milestoneId: 'ml-2', label: 'Make first payment on time', completed: false, completedAt: null },
        { milestoneId: 'ml-3', label: 'Complete 50% of loan term', completed: false, completedAt: null },
        { milestoneId: 'ml-4', label: 'Complete full loan term', completed: false, completedAt: null },
      ];

    case RetentionProductType.DEBT_CONSOLIDATION:
      return [
        { milestoneId: 'dc-1', label: 'Accept debt consolidation offer', completed: false, completedAt: null },
        { milestoneId: 'dc-2', label: 'Close consolidated accounts', completed: false, completedAt: null },
        { milestoneId: 'dc-3', label: 'Verify reduced monthly debt payment', completed: false, completedAt: null },
        { milestoneId: 'dc-4', label: 'Maintain new lower debt level for 2 months', completed: false, completedAt: null },
      ];

    default:
      return [];
  }
}
```

---

### Property 6: Decisioning priority order

*For any* `ApplicantInputs` where `creditScore < 600`, `evaluateDecision` SHALL return `DECLINED` with `reasonCode: HIGH_RISK_SCORE`, regardless of all other field values, so long as `monthlyIncome > 0` and all inputs are otherwise valid.

**Validates: Requirements 4.5, 4.6**

### Property 7: Lever outcome verification

*For any* `Lever` returned by `computeLevers`, running `evaluateDecision` with `lever.mutatedInputs` merged into the original `ApplicantInputs` SHALL produce a `Decision` whose value matches `lever.leverOutcome` - that is, `APPROVED` maps to `Decision.APPROVED` and `COUNTER_OFFER` maps to `Decision.COUNTER_OFFER`.

**Validates: Requirements 5.7, 10.7**

### Property 8: Lever list non-decline guarantee

*For any* `Lever` in the list returned by `computeLevers`, applying that lever SHALL never produce a `DECLINED` decision. Every lever in the returned list SHALL have `leverOutcome` of `APPROVED` or `COUNTER_OFFER`.

**Validates: Requirements 5.7**

### Property 9: Pay-down debt algebraic correctness

*For any* valid `ApplicantInputs` where `monthlyDebt > 0` and Lever 3 is returned, the resulting `postLoanDTI` computed from `(monthlyDebt - dReduce + estimatedPayment) / monthlyIncome` SHALL be less than or equal to 0.36 (when `leverOutcome` is `APPROVED`) or less than or equal to 0.45 (when `leverOutcome` is `COUNTER_OFFER`).

**Validates: Requirements 5.4**

### Property 10: RateBenchmarkBadge renders for all source states

*For any* `RateSource` value in {`LIVE`, `CACHED`, `OFFLINE`}, the `RateBenchmarkBadge` component SHALL render without throwing an unhandled exception.

**Validates: Requirements 7.9**

### Property 11: Input range finiteness

*For any* `ApplicantInputs` within the defined input ranges and `benchmarkRate` in [0, 30], `evaluateDecision` SHALL return an `EngineResult` where `estimatedPayment`, `postLoanDTI`, and `apr` are all finite numbers (not `NaN`, not `Infinity`, not `null`).

**Validates: Requirements 9.5**

### Property 12: Best alternative selection determinism

*For any* `SolverResult` with non-empty `levers` list, the `bestAlternative` selection function SHALL return the same `Lever` when called twice with identical `SolverResult` and `ApplicantInputs` arguments (determinism property for wizard Step 3 CTA).

**Validates: Requirements 14.4**

### Property 13: Comparison trade-off accuracy

*For any* two `EngineResult` objects representing original and alternative estimates, the computed monthly savings SHALL equal `abs(originalEstimate.estimatedPayment - alternativeEstimate.estimatedPayment)` rounded to the nearest cent, and the total cost difference SHALL equal `abs((originalEstimate.estimatedPayment * originalInputs.termMonths) - (alternativeEstimate.estimatedPayment * alternativeInputs.termMonths))` rounded to the nearest cent.

**Validates: Requirements 14.5**

---

## Error Handling

### Engine Errors

The engine never throws. All failure modes return typed values:

| Scenario | Behavior |
|---|---|
| `monthlyIncome = 0` | Returns `DECLINED` with `INSUFFICIENT_INCOME` |
| `loanAmount = 0` or `termMonths = 0` | Returns `EngineError` with `INVALID_INPUT` |
| `creditScore < 600` | Returns `DECLINED` with `HIGH_RISK_SCORE` |
| `monthlyDebt >= monthlyIncome` | Returns `DECLINED` with `EXCESSIVE_DEBT` |
| `postLoanDTI > 0.45` | Returns `DECLINED` with `HIGH_DTI` |
| Missing required field | Returns `EngineError` listing invalid fields |
| Invalid `loanAmount` alignment | Returns `EngineError` |

### FRED Client Errors

| Scenario | Behavior |
|---|---|
| `VITE_FRED_API_KEY` missing | Returns offline result immediately, no fetch |
| Timeout (> 3s) | `AbortController` cancels, returns offline result |
| Non-2xx HTTP response | Returns offline result, preserves existing cache |
| Network error / CORS | Catch block returns offline result |
| Observation value out of [0.01, 40.00] | Discards response, returns offline result |
| Invalid JSON | Catch block returns offline result |
| `sessionStorage` unavailable (private browsing) | `readCachedRate` returns null, proceeds to fetch |

### UI Error Boundaries

- `DecisionBanner` checks for `EngineError` kind before rendering; shows user-facing error message without stack trace.
- `PathToYesChecklist` renders an empty state gracefully when `solverResult` is null or `levers` is empty.
- `AdverseActionModal` renders only mapped reason codes; unknown codes are silently omitted.
- `App.tsx` wraps the full tree in a React `ErrorBoundary` component that catches unexpected exceptions and shows a plain recovery message.

---

## Testing Strategy

### Framework and Configuration

Vitest is the sole test runner. All engine tests run in Node without a DOM. All component tests use `@testing-library/react` with `jsdom`.

```
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',           // for engine tests
    globals: true,
    coverage: { provider: 'v8' },
  },
});
```

Component tests use a separate config block with `environment: 'jsdom'`.

### Property-Based Testing

The project uses **fast-check** as the property-based testing library. Each property test runs a minimum of **100 iterations**. Tests are tagged with a comment referencing the design property:

```
// Feature: path-to-yes, Property 1: Determinism
```

Property tests live in `src/engine/__tests__/properties/`.

### Unit Tests (Requirement 10.3 - Boundary Coverage)

The following boundary values are each covered by at least one dedicated Vitest test case:

**Credit Score Boundaries (Req 10.3)**

| Score | Expected Decision |
|---|---|
| 599 | DECLINED (HIGH_RISK_SCORE) |
| 600 | APPROVED or COUNTER_OFFER (eligible) |
| 639 | APPROVED/COUNTER_OFFER (near-prime subprime threshold) |
| 640 | APPROVED (if other conditions met) |
| 659 | APPROVED (subprime, loan <= 15000) |
| 660 | APPROVED (near-prime, full eligibility) |
| 719 | APPROVED (near-prime) |
| 720 | APPROVED (prime) |

**Income Boundaries (Req 10.3)**

| Income | Expected |
|---|---|
| 1799 | DECLINED (INSUFFICIENT_INCOME) |
| 1800 | COUNTER_OFFER eligible (minimum) |
| 1999 | COUNTER_OFFER eligible |
| 2000 | APPROVED eligible (minimum for APPROVED) |

**DTI Boundaries (Req 10.3)**

| postLoanDTI | Expected |
|---|---|
| 0.3599 | APPROVED |
| 0.3600 | APPROVED |
| 0.3601 | COUNTER_OFFER |
| 0.4499 | COUNTER_OFFER |
| 0.4500 | COUNTER_OFFER |
| 0.4501 | DECLINED (HIGH_DTI) |

### Solver Tests (Requirement 10.6 and 10.7)

For each of Extend Term, Reduce Loan Amount, Pay Down Debt:
- One test where the lever fully satisfies DTI <= 0.36 (`leverOutcome: APPROVED`)
- One test where the lever partially satisfies (DTI 0.36-0.45) (`leverOutcome: COUNTER_OFFER`)
- One test where the lever is inapplicable (lever is null/omitted)

For leverOutcome verification (Req 10.7):
- One test asserting `leverOutcome === APPROVED` and engine confirms `Decision.APPROVED`
- One test asserting `leverOutcome === COUNTER_OFFER` and engine confirms `Decision.COUNTER_OFFER`

### FRED Client Tests (Requirement 10.5)

The `FRED_Client` exposes `fetchBenchmarkRate(apiKey: string)` as a pure async function that accepts an injected `fetch` override in tests:

```typescript
export async function fetchBenchmarkRate(
  apiKey: string,
  fetchOverride?: typeof fetch,
): Promise<BenchmarkRateResult>
```

Vitest tests inject a mock `fetch` returning controlled responses (success, timeout, non-2xx, invalid value) without network calls.

### Test File Layout

```
src/engine/__tests__/
  unit/
    apr.test.ts                 - computeAPR boundary tests
    amortization.test.ts        - payment formula, DTI formula, zero-APR case
    underwriting.test.ts        - all decisioning boundary conditions (Req 10.3)
    solver.test.ts              - all lever scenarios (Req 10.6, 10.7)
  properties/
    determinism.property.test.ts    - Property 1
    aprFloor.property.test.ts       - Properties 2, 3
    amortization.property.test.ts   - Properties 4, 5
    decisioning.property.test.ts    - Properties 6
    leverOutcome.property.test.ts   - Properties 7, 8, 9
    finiteness.property.test.ts     - Property 11
src/services/__tests__/
  fredClient.test.ts              - all fallback and cache scenarios (Req 10.5)
src/components/__tests__/
  RateBenchmarkBadge.test.tsx     - all three RateSource states (Property 10)
  DecisionBanner.test.tsx         - approved / counter / declined render states
  AdverseActionModal.test.tsx     - reason code display, lever display
  LeverCard.test.tsx              - leverOutcome label rendering
```
