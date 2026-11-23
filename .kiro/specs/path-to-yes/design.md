# Design Document

## Overview

Path to Yes is a fully client-side React 18 application that accepts five applicant financial inputs, runs a deterministic underwriting engine, and returns one of three decisions: `APPROVED`, `COUNTER_OFFER`, or `DECLINED`. When the decision is not `APPROVED`, a solver computes up to four concrete levers the applicant can apply with a single click to move toward approval. APR tiers are anchored to the FRED 24-month personal loan benchmark rate (`TERMCBPER24NS`), with a 3-second timeout and an `11.50%` offline fallback.

The application has no backend. All computation runs in the browser. The underwriting engine and solver are pure TypeScript functions in `src/engine/` with zero React imports, enabling full Vitest coverage without a DOM.

### Key Design Goals

- **Deterministic decisioning**: identical inputs always produce identical outputs.
- **Immediate feedback**: the Decision is recomputed within 100ms of any input change via synchronous in-memory pure functions.
- **Default Counter-Offer state**: default inputs land in `COUNTER_OFFER`, so the PathToYesChecklist is visible on first load without user interaction.
- **Frictionless "Apply This Fix"**: each Lever carries a complete payload so the click handler only needs to call `setState` - no recomputation at click time.
- **Full auditability**: every APR, payment, and DTI value is derivable from the inputs using documented formulas.

---

## Architecture

### High-Level Component and Data Flow

```
+----------------------------------------------------------+
|                        App.tsx                           |
|                                                          |
|  [useState] applicantInputs: ApplicantInputs             |
|  [useState] benchmarkRate: number (11.50 default)        |
|  [useState] rateSource: RateSource                       |
|  [useMemo]  engineResult: EngineResult                   |
|  [useMemo]  solverResult: SolverResult                   |
|                                                          |
|  On mount: FRED_Client.fetchBenchmarkRate()              |
|            -> updates benchmarkRate + rateSource         |
|            -> triggers engineResult + solverResult       |
|            recomputation via useMemo deps                |
|                                                          |
+----------+-------------------------------------------+---+
           |                                           |
           v                                           v
+----------+-----------+              +----------------+--------+
| ApplicantInputPanel  |              | DecisionBanner          |
| (sliders + inputs)   |              | (Approved / Counter /   |
|                      |              |  Declined states)       |
| onChange -> setState |              |                         |
+----------------------+              +---+---------------------+
                                          |
                              +-----------v-----------+
                              | PathToYesChecklist    |
                              | (Lever cards, hidden  |
                              |  when APPROVED)       |
                              +-----------+-----------+
                                          |
                              +-----------v-----------+
                              | AdverseActionModal    |
                              | (opened from Declined |
                              |  banner button)       |
                              +-----------------------+

+----------------------------------------------------------+
|                     RateBenchmarkBadge                   |
|          (Live / Cached / Offline indicator)             |
+----------------------------------------------------------+
```

### Data Flow Diagram

```
ApplicantInputs (state)
        |
        | (dependency)
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
  evaluateDecision(inputs, postLoanDTI, apr)
        |
        | returns EngineResult { decision, reasonCode?, apr, estimatedPayment, postLoanDTI }
        v
  [if COUNTER_OFFER or DECLINED]
  computeLevers(inputs, engineResult)
        |
        | returns SolverResult { levers: Lever[], emptyMessage? }
        v
  UI render:
    DecisionBanner     <-- EngineResult
    PathToYesChecklist <-- SolverResult.levers
    AdverseActionModal <-- EngineResult.reasonCode + SolverResult.levers
    RateBenchmarkBadge <-- rateSource
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
    index.ts          - re-exports all public engine functions
  services/
    fredClient.ts     - fetchBenchmarkRate(), cache helpers
  components/
    ApplicantInputPanel.tsx
    DecisionBanner.tsx
    PathToYesChecklist.tsx
    LeverCard.tsx
    AdverseActionModal.tsx
    RateBenchmarkBadge.tsx
  App.tsx
  main.tsx
```

### Component Hierarchy and Props

```
App
  RateBenchmarkBadge (rateSource, benchmarkRate)
  ApplicantInputPanel (inputs, onChange)
  DecisionBanner (engineResult, onOpenAdverseModal)
    [if DECLINED] -> button -> opens AdverseActionModal
  PathToYesChecklist (solverResult, onApplyFix)
    LeverCard[] (lever, onApplyFix)
  AdverseActionModal (open, engineResult, solverResult, onClose)
```

**ApplicantInputPanel props:**
```typescript
interface ApplicantInputPanelProps {
  inputs: ApplicantInputs;
  onChange: (updated: ApplicantInputs) => void;
}
```

**Preset interaction behavior:**

The preset button strip renders three buttons in the page header. Clicking a preset button calls `onChange` with the preset's `inputs` object, replacing all five `ApplicantInputs` fields atomically. The active preset is highlighted if the current `inputs` exactly match a preset's `inputs`; otherwise no preset is active (the user has customized from a preset or started fresh).

```typescript
// Preset button strip - rendered in App.tsx header, not inside ApplicantInputPanel
// Props passed down from App.tsx state

interface PresetButtonStripProps {
  presets: ApplicantPersonaPreset[];
  currentInputs: ApplicantInputs;
  onSelectPreset: (preset: ApplicantPersonaPreset) => void;
}
```

The active preset is determined by deep equality of all five input fields. Active state uses a visually distinct style (e.g., filled button vs. outline). Preset buttons display their `label` text and a small colored dot indicating the expected decision outcome: green for `APPROVED`, amber for `COUNTER_OFFER`, red for `DECLINED`.

App.tsx handler:
```typescript
const handleSelectPreset = (preset: ApplicantPersonaPreset): void => {
  setInputs(preset.inputs);
};
```

This replaces all five fields atomically via a single `setInputs` call, triggering one `useMemo` recomputation cycle rather than five sequential updates.

**DecisionBanner props:**
```typescript
interface DecisionBannerProps {
  engineResult: EngineResult | null;
  onOpenAdverseModal: () => void;
}
```

**PathToYesChecklist props:**
```typescript
interface PathToYesChecklistProps {
  solverResult: SolverResult | null;
  onApplyFix: (lever: Lever) => void;
}
```

**LeverCard props:**
```typescript
interface LeverCardProps {
  lever: Lever;
  onApplyFix: (lever: Lever) => void;
}
```

**AdverseActionModal props:**
```typescript
interface AdverseActionModalProps {
  open: boolean;
  engineResult: EngineResult | null;
  solverResult: SolverResult | null;
  onClose: () => void;
}
```

**RateBenchmarkBadge props:**
```typescript
interface RateBenchmarkBadgeProps {
  source: RateSource;
  benchmarkRate: number;
  referenceLabel: string;
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
// src/App.tsx (state shape and logic sketch)

const [inputs, setInputs] = useState<ApplicantInputs>(DEFAULT_INPUTS);
const [benchmarkRate, setBenchmarkRate] = useState<number>(OFFLINE_BENCHMARK);
const [rateSource, setRateSource] = useState<RateSource>(RateSource.OFFLINE);
const [rateLabel, setRateLabel] = useState<string>(OFFLINE_LABEL);
const [adverseModalOpen, setAdverseModalOpen] = useState<boolean>(false);

// FRED fetch on mount - does not block first render
useEffect(() => {
  const apiKey = import.meta.env.VITE_FRED_API_KEY ?? '';
  fetchBenchmarkRate(apiKey).then(result => {
    setBenchmarkRate(result.value);
    setRateSource(result.source);
    setRateLabel(result.referenceLabel);
  });
}, []);

// engineResult recomputes synchronously on any input or rate change
const engineResult = useMemo<EngineOutput>(() => {
  return evaluateDecision(inputs, benchmarkRate);
}, [inputs, benchmarkRate]);

// solverResult recomputes only when needed
const solverResult = useMemo<SolverResult | null>(() => {
  if ('kind' in engineResult) return null;
  if (engineResult.decision === Decision.APPROVED) return null;
  return computeLevers(inputs, benchmarkRate);
}, [inputs, benchmarkRate, engineResult]);

// Apply Fix handler: merges lever mutatedInputs into current inputs
const handleApplyFix = (lever: Lever): void => {
  setInputs(prev => ({ ...prev, ...lever.mutatedInputs }));
};
```

**Why `useMemo` satisfies the 100ms requirement**: Both `evaluateDecision` and `computeLevers` are pure in-memory functions with no I/O. For typical input ranges (5 inputs, up to 4 levers each iterating at most ~230 $100 steps for `computeReduceAmountLever`), execution time is under 1ms in modern V8. The 100ms budget is comfortably met.

---

## Wireframes

### Desktop Two-Column Layout

```
+------------------------------------------------------------------+
|  PATH TO YES                      [Offline Benchmark - 11.50%]  |
|  [Prime Borrower]  [Near-Prime High DTI]  [Credit-Thin]  (presets)|
+------------------------------------------------------------------+
|                             |                                    |
|  LEFT COLUMN (inputs)       |  RIGHT COLUMN (live results)       |
|                             |                                    |
|  APPLICANT PROFILE          |  +------------------------------+  |
|  +----------------------+   |  |  [!] COUNTER-OFFER           |  |
|  |  Monthly Income      |   |  |  Debt-to-income is slightly  |  |
|  |  [$3,500___________] |   |  |  above our standard.         |  |
|  |                      |   |  |  Best option: Reduce loan    |  |
|  |  Monthly Debt        |   |  |  to $X,XXX (Full Approval).  |  |
|  |  [$600_____________] |   |  |  APR 16.50% | $737/mo        |  |
|  |                      |   |  +------------------------------+  |
|  |  Credit Score        |   |                                    |
|  |  [650______________] |   |  PATH TO YES                       |
|  |                      |   |  +------------------------------+  |
|  |  Loan Amount         |   |  | Extend to 36 months           |  |
|  |  [$15,000__________] |   |  | DTI: 0.XXXX  |  $XXX/mo      |  |
|  |                      |   |  | [Moves to Counter-Offer]      |  |
|  |  Loan Term           |   |  | [Apply This Fix]              |  |
|  |  ( )12 (*)24 ( )36  |   |  +------------------------------+  |
|  |  ( )48 ( )60 months  |   |  | Reduce loan to $X,XXX         |  |
|  +----------------------+   |  | DTI: 0.XXXX  |  $XXX/mo      |  |
|                             |  | [Unlocks Full Approval]       |  |
|                             |  | [Apply This Fix]              |  |
|                             |  +------------------------------+  |
|                             |  | Reduce debt by $XXX/mo        |  |
|                             |  | DTI: 0.XXXX  |  $XXX/mo      |  |
|                             |  | [Unlocks Full Approval]       |  |
|                             |  | [Apply This Fix]              |  |
|                             |  +------------------------------+  |
|                             |                                    |
+------------------------------------------------------------------+
```

Layout notes:
- The two-column split uses a Tailwind `grid grid-cols-[400px_1fr]` or `flex` layout at `lg:` breakpoint; on mobile the columns stack vertically (inputs first, results below).
- The preset button strip sits in the page header below the app title, visible from both columns.
- The right column is scrollable independently if the checklist grows beyond viewport height.
- The `RateBenchmarkBadge` is pinned to the top-right of the header row.

### Main Simulator - Counter-Offer (Default State)

```
+------------------------------------------------------------------+
|  PATH TO YES                            [Cached Rate] [badge]    |
+------------------------------------------------------------------+
|                                                                  |
|  APPLICANT PROFILE                                               |
|  +------------------------------------------------------------+  |
|  |  Monthly Income   [$3,500 ___________________] $3,500      |  |
|  |  Monthly Debt     [$600 ____________________] $600         |  |
|  |  Credit Score     [650 ____________________]  650          |  |
|  |  Loan Amount      [$15,000 ________________]  $15,000      |  |
|  |  Loan Term        ( )12  ( )24  (*)36  ( )48  ( )60 mo    |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  [!] COUNTER-OFFER                                         |  |
|  |  Your debt-to-income ratio is slightly above our standard. |  |
|  |  Best alternative: Reduce loan to $X,XXX (Unlocks          |  |
|  |  Full Approval).                                           |  |
|  |  APR: 16.50%  |  Payment: $XXX/mo  |  DTI: 0.XXXX        |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  PATH TO YES                                                     |
|  +------------------------------------------------------------+  |
|  |  [*] Extend to 36 months   DTI: 0.XXX  Pmt: $XXX/mo       |  |
|  |      [Moves to Counter-Offer]      [Apply This Fix]        |  |
|  +------------------------------------------------------------+  |
|  |  [*] Reduce loan to $X,XXX  DTI: 0.XXX  Pmt: $XXX/mo      |  |
|  |      [Unlocks Full Approval]       [Apply This Fix]        |  |
|  +------------------------------------------------------------+  |
|  |  [*] Reduce monthly debt by $XXX   DTI: 0.XXX              |  |
|  |      [Unlocks Full Approval]       [Apply This Fix]        |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### Decision State - Approved

```
+------------------------------------------------------------------+
|  PATH TO YES                            [Live FRED Rate] [badge] |
+------------------------------------------------------------------+
|  [applicant inputs - same layout]                                |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  [checkmark] APPROVED                                      |  |
|  |  Congratulations - you qualify for this loan.              |  |
|  |  APR: 11.50%  |  Payment: $XXX/mo  |  Term: 36 months     |  |
|  +------------------------------------------------------------+  |
|  [PathToYesChecklist hidden]                                     |
+------------------------------------------------------------------+
```

### Decision State - Declined

```
+------------------------------------------------------------------+
|  PATH TO YES                            [Offline Benchmark]      |
+------------------------------------------------------------------+
|  [applicant inputs - same layout]                                |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  [X] DECLINED                                              |  |
|  |  Your application could not be approved at this time.      |  |
|  |  [View Decline Reasons]                                     |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  PATH TO YES                                                     |
|  [LeverCards if any exist]                                       |
|  - or -                                                          |
|  No feasible path to approval at current income and debt levels. |
+------------------------------------------------------------------+
```

### Adverse Action Modal

```
+-------------------------------------------------------+
|  WHY YOUR APPLICATION WAS DECLINED              [X]   |
+-------------------------------------------------------+
|                                                       |
|  Decline Reasons:                                     |
|  - Your credit score is below the minimum required    |
|    for this loan.                                     |
|  - Adding this loan would bring your total debt       |
|    payments above 45% of your income.                 |
|                                                       |
|  Steps to Improve Your Application:                   |
|                                                       |
|  1. Reduce loan to $X,XXX                             |
|     [Unlocks Full Approval]  [Apply This Fix]         |
|                                                       |
|  2. Reduce monthly debt by $XXX                       |
|     [Moves to Counter-Offer] [Apply This Fix]         |
|                                                       |
|                              [Close]                  |
+-------------------------------------------------------+
```

### RateBenchmarkBadge - All States

```
Live:    [ wifi icon  Live FRED Rate: 11.00%        ]
Cached:  [ clock icon Cached Rate: 11.00%            ]
Offline: [ cloud-off  Offline Benchmark - 11.50%     ]
         [            (Reference period: Nov 2023)   ]
```

### LeverCard with LeverOutcome Labels

```
+----------------------------------------------------------+
|  [arrow-up-right icon]  Extend to 48 months              |
|  Monthly payment: $XXX  |  DTI: 0.XXXX                  |
|  +-------------------------------+  +------------------+ |
|  | Unlocks Full Approval         |  | Apply This Fix   | |
|  | (green badge)                 |  | (button)         | |
|  +-------------------------------+  +------------------+ |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  [scissors icon]  Reduce loan to $X,XXX                  |
|  Monthly payment: $XXX  |  DTI: 0.XXXX                  |
|  +-------------------------------+  +------------------+ |
|  | Moves to Counter-Offer        |  | Apply This Fix   | |
|  | (amber badge)                 |  | (button)         | |
|  +-------------------------------+  +------------------+ |
+----------------------------------------------------------+
```

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
