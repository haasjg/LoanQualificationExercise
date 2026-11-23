# Implementation Plan: Path to Yes

## Overview

Path to Yes is a React 18 client-side application that evaluates applicant financial inputs, runs a deterministic underwriting engine, and returns one of three decisions: APPROVED, COUNTER_OFFER, or DECLINED. When the decision is not APPROVED, a solver computes up to four concrete levers the applicant can apply with a single click to move toward approval.

This implementation plan follows a requirements-first workflow. The engine modules (types, apr, amortization, underwriting, solver) are pure TypeScript with zero React imports, enabling full Vitest coverage. The service module (fredClient) handles FRED API integration with timeout, caching, and offline fallback. Component modules implement the React UI.

---

## Tasks

- [x] 1. Set up project scaffolding and core infrastructure
  - Initialize Vite + React 18 + TypeScript strict project
  - Install dependencies: Tailwind CSS v3/v4, lucide-react, Vitest, @testing-library/react, @testing-library/jest-dom, fast-check
  - Configure Tailwind CSS and postcss.config.js
  - Configure Vitest with `environment: 'node'` and `globals: true`
  - Set up src directory structure: `src/engine/`, `src/services/`, `src/components/`
  - Create `src/main.tsx` with React 18 hydration
  - Create `src/App.tsx` with basic layout structure
  - _Requirements: 1, 6, 7, 8, 9, 10.1, 10.2_

- [x] 2. Create engine types and constants
  - [x] 2.1 Create `src/engine/types.ts` with all enums
    - Create `Decision` enum: APPROVED, COUNTER_OFFER, DECLINED
    - Create `ReasonCode` enum: HIGH_RISK_SCORE, INSUFFICIENT_INCOME, EXCESSIVE_DEBT, HIGH_DTI, LOAN_CAP_EXCEEDED, INVALID_TERM, INVALID_INPUT
    - Create `LeverType` enum: EXTEND_TERM, REDUCE_AMOUNT, PAY_DOWN_DEBT, CREDIT_SCORE_MILESTONE
    - Create `LeverOutcome` enum: APPROVED, COUNTER_OFFER
    - Create `RateSource` enum: LIVE, CACHED, OFFLINE
    - _Requirements: 4.5, 5.5, 5.6, 5.7, 7.9_

  - [x] 2.2 Define ApplicantInputs interface and default values
    - Create `ApplicantInputs` interface with monthlyIncome, monthlyDebt, creditScore, loanAmount, termMonths
    - Define `DEFAULT_INPUTS` with values that land in COUNTER_OFFER range at benchmark 11.50%
    - Define `VALID_TERM_MONTHS` array constant: [12, 24, 36, 48, 60]
    - _Requirements: 1.1-1.5, 1.9_

  - [x] 2.3 Define ApplicantPersonaPreset interface and presets
    - Create `ApplicantPersonaPreset` interface with label, description, inputs, expectedDecision
    - Create `PERSONA_PRESETS` array with three presets:
      - Prime Borrower (APPROVED): income=8000, debt=500, score=750, loan=12000, term=36
      - Near-Prime High DTI (COUNTER_OFFER): income=3500, debt=600, score=650, loan=15000, term=24
      - Credit-Thin (DECLINED): income=2800, debt=200, score=570, loan=7000, term=36
    - Verify each preset produces expected decision at offline benchmark 11.50%
    - _Requirements: 7.9, 10.1_

  - [x] 2.4 Define engine result types
    - Create `EngineResult` interface with decision, reasonCode, apr, estimatedPayment, postLoanDTI, benchmarkRate
    - Create `EngineError` interface with kind, invalidFields, message
    - Create `EngineOutput` union type: EngineResult | EngineError
    - Create `ValidationError` interface with kind, field, message
    - Create `ValidationResult` union type: { valid: true } | { valid: false; errors: ValidationError[] }
    - _Requirements: 4.9, 10.1_

  - [x] 2.5 Define lever and solver result types
    - Create `ExtendTermPayload`, `ReduceAmountPayload`, `PayDownDebtPayload`, `CreditScoreMilestonePayload` interfaces
    - Create `LeverPayload` union type
    - Create `Lever` interface with leverType, payload, mutatedInputs, resultingPostLoanDTI, resultingEstimatedPayment, leverOutcome, displayLabel
    - Create `SolverResult` interface with levers and optional emptyMessage
    - Create `BenchmarkRateResult` interface with value, source, referenceLabel, fetchedAt
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 7.1_

  - [x] 2.6 Define FRED client types
    - Create `FredObservation` and `FredApiResponse` interfaces
    - Create `SessionCacheEntry` interface
    - _Requirements: 7.1, 7.3_

  - [x] 2.7 Write property test for types and defaults
    - **Property 11: Input range finiteness**
    - Verify DEFAULT_INPUTS values produce finite numbers in engine functions
    - **Validates: Requirements 9.5**

- [x] 3. Implement engine: apr.ts
  - [x] 3.1 Implement computeAPR function
    - Implement tier logic for creditScore >= 720, >= 660, >= 600, < 600
    - Apply floor of 6.99% to all tiers
    - Round to 2 decimal places using Math.round(value * 100) / 100
    - Return null for creditScore < 600 (ineligible)
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Implement APR computation tests
    - Test all tier boundaries: score=599, 600, 659, 660, 719, 720
    - Test APR floor: benchmarkRate=0.00% should produce apr=6.99%
    - Test 2-decimal precision for various combinations
    - _Requirements: 2.2, 2.4, 10.3_

  - [x] 3.3 Write property tests for APR computation
    - **Property 2: APR floor invariant**
    - For all benchmarkRate in [0, 30] and creditScore in [600, 850], APR >= 6.99
    - **Validates: Requirements 2.2, 2.4**

    - **Property 3: APR round-trip precision**
    - For all eligible creditScore and benchmarkRate, computed APR equals Math.round(apr * 100) / 100
    - **Validates: Requirements 2.2**

- [x] 4. Implement engine: amortization.ts
  - [x] 4.1 Implement roundHalfUp helper function
    - Round to specified decimal places using Math.round(value + Number.EPSILON)
    - Handle floating-point precision edge cases
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.2 Implement computeEstimatedPayment function
    - Standard amortization formula: L * [r(1+r)^n] / [(1+r)^n - 1]
    - Handle zero-APR case: payment = loanAmount / termMonths
    - Round result to 2 decimal places using roundHalfUp
    - Precondition: loanAmount > 0, termMonths > 0 (guaranteed by caller)
    - _Requirements: 3.1, 3.2_

  - [x] 4.3 Implement computePostLoanDTI function
    - Formula: (monthlyDebt + estimatedPayment) / monthlyIncome
    - Round to 4 decimal places using roundHalfUp
    - Precondition: monthlyIncome > 0 (guaranteed by caller)
    - _Requirements: 3.3_

  - [x] 4.4 Implement amortization tests
    - Test standard amortization with known values
    - Test zero-APR case: payment = loanAmount / termMonths
    - Test DTI calculation boundaries
    - Verify finite output for valid inputs
    - _Requirements: 3.1-3.6, 9.5_

  - [x] 4.5 Write property tests for amortization
    - **Property 4: Amortization formula correctness**
    - For all loanAmount > 0, termMonths in valid set, apr >= 0, payment is finite positive and >= loanAmount / termMonths
    - **Validates: Requirements 3.1, 3.5, 9.5**

    - **Property 5: DTI monotonicity with income**
    - For fixed monthlyDebt and estimatedPayment, DTI(i1) > DTI(i2) when i1 < i2
    - **Validates: Requirements 3.3**

- [x] 5. Implement engine: underwriting.ts
  - [x] 5.1 Implement validateInputs function
    - Validate monthlyIncome is finite non-negative
    - Validate monthlyDebt is finite non-negative
    - Validate creditScore is finite positive
    - Validate loanAmount is finite positive multiple of 500 in [2000, 25000]
    - Validate termMonths is finite positive
    - Validate benchmarkRate is finite non-negative
    - Return array of all validation errors
    - _Requirements: 1.4, 4.8, 9.2_

  - [x] 5.2 Implement evaluateDecision function
    - Validate inputs first
    - Check loanAmount === 0 or termMonths === 0 -> EngineError INVALID_INPUT
    - Compute APR using computeAPR
    - Priority 1: APR === null (creditScore < 600) -> DECLINED HIGH_RISK_SCORE
    - Check monthlyIncome === 0 -> DECLINED INSUFFICIENT_INCOME
    - Compute estimatedPayment and postLoanDTI
    - Priority 2: monthlyIncome < 1800 -> DECLINED INSUFFICIENT_INCOME
    - Priority 3: monthlyDebt >= monthlyIncome -> DECLINED EXCESSIVE_DEBT
    - Priority 4: postLoanDTI > 0.45 -> DECLINED HIGH_DTI
    - Priority 5: score 600-659, DTI <= 0.36, loan > 15000 -> COUNTER_OFFER LOAN_CAP_EXCEEDED
    - Priority 6: DTI in (0.36, 0.45] -> COUNTER_OFFER
    - Priority 7: remaining cases -> APPROVED
    - _Requirements: 4.5, 4.6, 4.7, 4.8_

  - [x] 5.3 Implement decision boundary tests (Req 10.3)
    - Credit score boundaries: 599, 600, 639, 640, 659, 660, 719, 720
    - Income boundaries: 1799, 1800, 1999, 2000
    - DTI boundaries: 0.3599, 0.36, 0.3601, 0.4499, 0.45, 0.4501
    - Each boundary value has at least one dedicated test case
    - _Requirements: 10.3_

  - [x] 5.4 Write property test for decisioning priority order
    - **Property 6: Decisioning priority order**
    - For any inputs with creditScore < 600, evaluateDecision returns DECLINED HIGH_RISK_SCORE
    - **Validates: Requirements 4.5, 4.6**

- [x] 6. Implement engine: solver.ts
  - [x] 6.1 Implement computeLevers orchestrator
    - Call each lever-computation function
    - Filter out null results
    - If no levers remain, return emptyMessage
    - _Requirements: 5.1, 5.10_

  - [x] 6.2 Implement computeExtendTermLever
    - Check termMonths >= 60 -> return null
    - Test candidate terms {36, 48, 60} > current term
    - Find shortest term achieving DTI <= 0.36 (APPROVED) or <= 0.45 (COUNTER_OFFER)
    - Verify leverOutcome by running evaluateDecision with mutated inputs
    - Omit if verification returns DECLINED
    - _Requirements: 5.2_

  - [x] 6.3 Implement computeReduceAmountLever
    - Binary search downward from loanAmount - 100 in $100 increments
    - First pass: find max amount with DTI <= 0.36 (APPROVED)
    - Second pass: find max amount with DTI <= 0.45 (COUNTER_OFFER)
    - Require amount >= 2000
    - Verify leverOutcome
    - _Requirements: 5.3_

  - [x] 6.4 Implement computePayDownDebtLever
    - Check monthlyDebt === 0 -> return null
    - Solve algebraically: D_reduce = monthlyDebt + payment - 0.36 * income
    - If D_reduce <= monthlyDebt -> leverOutcome APPROVED
    - Else check if full elimination gives DTI <= 0.45 -> leverOutcome COUNTER_OFFER
    - Cap D_reduce at monthlyDebt for COUNTER_OFFER
    - Verify leverOutcome
    - _Requirements: 5.4, 9.4_

  - [x] 6.5 Implement computeCreditScoreMilestoneLever
    - Check creditScore >= 640 -> return null
    - Find lowest milestone above creditScore from {600, 640, 660, 720}
    - Compute current and target APR
    - Compute monthly payment reduction
    - Run evaluateDecision with target score to determine leverOutcome
    - Omit if resulting decision is DECLINED
    - _Requirements: 5.5_

  - [x] 6.6 Implement solver tests
    - Test each lever with full DTI satisfaction (APPROVED outcome)
    - Test each lever with partial DTI satisfaction (COUNTER_OFFER outcome)
    - Test each lever inapplicability (null result)
    - _Requirements: 10.6_

  - [x] 6.7 Write property tests for lever outcome verification
    - **Property 7: Lever outcome verification**
    - For any lever returned by computeLevers, running evaluateDecision with mutatedInputs produces Decision matching leverOutcome
    - **Validates: Requirements 5.7, 10.7**

    - **Property 8: Lever list non-decline guarantee**
    - For any lever in the returned list, applying it never produces DECLINED decision
    - **Validates: Requirements 5.7**

    - **Property 9: Pay-down debt algebraic correctness**
    - For Lever 3, resulting postLoanDTI <= 0.36 (APPROVED) or <= 0.45 (COUNTER_OFFER)
    - **Validates: Requirements 5.4**

- [x] 7. Implement engine: index.ts
  - [x] 7.1 Export all engine functions
    - Export computeAPR from apr.ts
    - Export computeEstimatedPayment, computePostLoanDTI, roundHalfUp from amortization.ts
    - Export validateInputs, evaluateDecision from underwriting.ts
    - Export computeLevers, all lever-computation functions from solver.ts
    - Export all types and constants from types.ts
    - _Requirements: 10.1, 10.2_

- [x] 8. Implement services: fredClient.ts
  - [x] 8.1 Implement fetchBenchmarkRate function
    - Check apiKey empty -> return offline result
    - Check sessionStorage cache -> return cached value if valid
    - Fetch FRED API with AbortController 3s timeout
    - Parse response and validate observation value
    - Store valid response in sessionStorage
    - Catch all errors -> return offline result
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 8.2 Implement cache helpers
    - readCachedRate: parse sessionStorage, validate value
    - offlineResult: return offline benchmark with reference label
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 8.3 Implement FRED client tests
    - Test with valid API key and successful fetch
    - Test with valid API key and cache hit
    - Test with missing API key -> offline fallback
    - Test with timeout -> offline fallback
    - Test with non-2xx response -> offline fallback
    - Test with invalid observation value -> offline fallback
    - Verify sessionStorage write on successful fetch
    - Verify cache preservation on error
    - _Requirements: 7.5, 7.11, 10.5_

  - [x] 8.4 Write property test for RateBenchmarkBadge rendering
    - **Property 10: RateBenchmarkBadge renders for all source states**
    - For all RateSource values (LIVE, CACHED, OFFLINE), RateBenchmarkBadge renders without exception
    - **Validates: Requirements 7.9**

- [x] 9. Implement components: RateBenchmarkBadge.tsx
  - [x] 9.1 Implement RateBenchmarkBadge component
    - Display different content based on RateSource
    - LIVE: wifi icon + "Live FRED Rate"
    - CACHED: clock icon + "Cached Rate"
    - OFFLINE: cloud-off icon + "Offline Benchmark" with reference label
    - Display benchmarkRate in all cases
    - _Requirements: 7.6, 7.7, 7.8, 7.9_

- [x] 10. Implement components: ApplicantInputPanel.tsx
  - [x] 10.1 Implement slider and input controls
    - MonthlyIncome: slider $1,800-$25,000, step $100, numeric input
    - MonthlyDebt: slider $0-$15,000, step $50, numeric input
    - CreditScore: slider 500-850, step 5, numeric input
    - LoanAmount: dropdown or numeric input with $500 increments
    - TermMonths: radio buttons or select for {12, 24, 36, 48, 60}
    - _Requirements: 1.1-1.5_

  - [x] 10.2 Implement onChange handler
    - Update single field while preserving others
    - Call props.onChange with new ApplicantInputs
    - _Requirements: 1.6_

- [x] 11. Implement components: DecisionBanner.tsx
  - [x] 11.1 Implement decision states
    - APPROVED: checkmark, APR, estimatedPayment, termMonths
    - COUNTER_OFFER: amber status, reason code, best alternative terms
    - DECLINED: X icon, decline summary, "View Decline Reasons" button
    - Loading state: skeleton while computing
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [x] 11.2 Implement adverse action trigger
    - Trigger props.onOpenAdverseModal on "View Decline Reasons" click
    - Only show button when Decision is DECLINED
    - _Requirements: 8.3, 8.5_

  - [x] 11.3 Write component tests
    - Test all three decision render states
    - Test loading state
    - Test error display for EngineError
    - _Requirements: 8.7_

- [x] 12. Implement components: PathToYesChecklist.tsx
  - [x] 12.1 Implement checklist rendering
    - Render header: "PATH TO YES"
    - Map over solverResult.levers
    - Render LeverCard for each lever
    - Show empty state message when levers is empty
    - _Requirements: 6.6_

  - [x] 12.2 Implement hidden state for APPROVED
    - Return null when solverResult is null or levers is empty
    - When Decision is APPROVED, the entire checklist should be hidden
    - _Requirements: 6.6_

  - [x] 12.3 Write component tests
    - Test rendering with levers
    - Test empty state rendering
    - Test hidden state for APPROVED decision
    - _Requirements: 6.6_

- [x] 13. Implement components: LeverCard.tsx
  - [x] 13.1 Implement card layout
    - Display lever description (displayLabel)
    - Show resulting DTI and estimatedPayment
    - Display leverOutcome label with visual distinction
    - Provide "Apply This Fix" button
    - _Requirements: 6.5_

  - [x] 13.2 Implement leverOutcome labels
    - APPROVED outcome: "Unlocks Full Approval" (green badge)
    - COUNTER_OFFER outcome: "Moves to Counter-Offer" (amber badge)
    - _Requirements: 6.5_

  - [x] 13.3 Implement click handler
    - Call props.onApplyFix(lever) on button click
    - _Requirements: 6.1, 6.2_

- [x] 14. Implement components: AdverseActionModal.tsx
  - [x] 14.1 Implement modal structure
    - Modal overlay and close button
    - Title: "WHY YOUR APPLICATION WAS DECLINED"
    - Reason codes display (plain English, no codes)
    - Levers section: display solverResult.levers
    - _Requirements: 8.4, 8.5_

  - [x] 14.2 Implement reason code mapping
    - HIGH_RISK_SCORE: "Your credit score is below the minimum required for this loan"
    - INSUFFICIENT_INCOME: "Your income does not meet the minimum threshold"
    - EXCESSIVE_DEBT: "Your existing debt obligations exceed your monthly income"
    - HIGH_DTI: "Adding this loan would bring your total debt payments above 45% of your income"
    - LOAN_CAP_EXCEEDED: "The requested amount exceeds the $15,000 limit for your credit tier"
    - _Requirements: 8.4_

  - [x] 14.3 Write component tests
    - Test modal rendering with all reason codes
    - Test lever display in modal
    - Test close button behavior
    - _Requirements: 8.4, 8.5_

- [x] 15. Implement App.tsx state and logic
  - [x] 15.1 Implement state management
    - useState for inputs, benchmarkRate, rateSource, rateLabel
    - useState for adverseModalOpen
    - useState for current decision (optional optimization)
    - _Requirements: 1.6, 6.2, 7.10_

  - [x] 15.2 Implement FRED fetch on mount
    - useEffect to fetch benchmark rate on initial render
    - Does NOT block initial render (initial rate is offline fallback)
    - Updates state when fetch completes or fails
    - Triggers useMemo recomputation via deps
    - _Requirements: 7.10, 7.11_

  - [x] 15.3 Implement engine and solver recomputation
    - useMemo for engineResult with deps: inputs, benchmarkRate
    - useMemo for solverResult with deps: inputs, benchmarkRate, engineResult
    - SolverResult is null when Decision is APPROVED or engineError
    - _Requirements: 1.6, 6.2_

  - [x] 15.4 Implement preset button handler
    - handleSelectPreset(preset) calls setInputs(preset.inputs)
    - Replaces all five fields atomically
    - Triggers single useMemo recomputation
    - _Requirements: 1.9_

  - [x] 15.5 Implement apply-fix handler
    - handleApplyFix(lever) merges mutatedInputs into inputs
    - setInputs(prev => ({ ...prev, ...lever.mutatedInputs }))
    - Triggers engine and solver recomputation via useMemo
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 15.6 Write component integration tests
    - Test preset button updates state correctly
    - Test apply-fix handler updates inputs and triggers recomputation
    - Test FRED fetch does not block initial render
    - _Requirements: 1.6, 6.2, 7.11_

- [x] 16. Wire components together in App.tsx
  - [x] 16.1 Implement layout structure
    - Header with title and RateBenchmarkBadge
    - Preset button strip
    - Two-column layout (inputs left, results right)
    - DecisionBanner
    - PathToYesChecklist (conditionally hidden)
    - AdverseActionModal (controlled by adverseModalOpen)
    - _Requirements: 1.6, 6.6, 8.1, 8.3_

  - [x] 16.2 Implement responsive design
    - Mobile: stack inputs and results vertically
    - Desktop: two-column layout
    - Use Tailwind breakpoints
    - _Requirements: 1.6_

  - [x] 16.3 Write end-to-end tests
    - Test complete workflow: inputs -> decision -> levers
    - Test apply-fix flow
    - Test preset switching
    - _Requirements: 1.6, 6.2, 7.11_

- [x] 17. Checkpoint - Ensure all tests pass
  - Run all tests, verify requirements coverage, verify edge cases handled.

- [x] 18. Verification and cleanup
  - [x] 18.1 Run all tests
    - Engine unit tests: verify boundary coverage
    - Engine property tests: verify 100+ iterations pass
    - Component tests: verify rendering and interaction
    - FRED client tests: verify all fallback scenarios
    - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 18.2 Verify 100ms requirement
    - Profile evaluateDecision performance
    - Profile computeLevers performance
    - Confirm execution time < 100ms for all valid inputs
    - _Requirements: 1.6_

  - [x] 18.3 Verify edge cases
    - Test all boundary inputs from Requirement 9
    - Verify no NaN, Infinity, or null outputs
    - Verify no division-by-zero errors
    - _Requirements: 9.1-9.6_

  - [x] 18.4 Run property tests for all properties
    - Property 1: Determinism
    - Property 2: APR floor >= 6.99%
    - Property 3: APR 2-decimal precision
    - Property 4: Amortization correctness
    - Property 5: DTI monotonicity with income
    - Property 6: Decisioning priority order
    - Property 7: Lever outcome verification
    - Property 8: Lever list non-decline guarantee
    - Property 9: Pay-down debt algebraic correctness
    - Property 10: RateBenchmarkBadge rendering
    - Property 11: Input range finiteness
    - **Validates: All design properties**

  - [x] 18.5 Verify requirements coverage
    - Map each requirement to implementation task
    - Confirm all acceptance criteria have corresponding tests
    - _Requirements: 1-10_

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 2, "tasks": ["2.7"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["3.3"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["4.2"] },
    { "id": 8, "tasks": ["4.3"] },
    { "id": 9, "tasks": ["4.4"] },
    { "id": 10, "tasks": ["4.5"] },
    { "id": 11, "tasks": ["5.1"] },
    { "id": 12, "tasks": ["5.2"] },
    { "id": 13, "tasks": ["5.3"] },
    { "id": 14, "tasks": ["5.4"] },
    { "id": 15, "tasks": ["6.1"] },
    { "id": 16, "tasks": ["6.2"] },
    { "id": 17, "tasks": ["6.3"] },
    { "id": 18, "tasks": ["6.4"] },
    { "id": 19, "tasks": ["6.5"] },
    { "id": 20, "tasks": ["6.6"] },
    { "id": 21, "tasks": ["6.7"] },
    { "id": 22, "tasks": ["7.1"] },
    { "id": 23, "tasks": ["8.1"] },
    { "id": 24, "tasks": ["8.2"] },
    { "id": 25, "tasks": ["8.3"] },
    { "id": 26, "tasks": ["8.4"] },
    { "id": 27, "tasks": ["9.1"] },
    { "id": 28, "tasks": ["10.1"] },
    { "id": 29, "tasks": ["10.2"] },
    { "id": 30, "tasks": ["11.1"] },
    { "id": 31, "tasks": ["11.2"] },
    { "id": 32, "tasks": ["11.3"] },
    { "id": 33, "tasks": ["12.1", "12.2"] },
    { "id": 34, "tasks": ["12.3"] },
    { "id": 35, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 36, "tasks": ["14.1", "14.2"] },
    { "id": 37, "tasks": ["14.3"] },
    { "id": 38, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5"] },
    { "id": 39, "tasks": ["15.6"] },
    { "id": 40, "tasks": ["16.1", "16.2"] },
    { "id": 41, "tasks": ["16.3"] },
    { "id": 42, "tasks": ["17"] },
    { "id": 43, "tasks": ["18.1", "18.2", "18.3"] },
    { "id": 44, "tasks": ["18.4", "18.5"] }
  ]
}
```

---

## Notes

- All engine modules are pure TypeScript with zero React imports. Test in Vitest Node environment.
- All service modules are pure TypeScript with minimal side effects. Test with mock fetch.
- Component tests use `@testing-library/react` with `jsdom` environment.
- Property-based tests use **fast-check** library. Each property test runs minimum 100 iterations.
- Tests are tagged with comments referencing design properties: `// Feature: path-to-yes, Property X: <description>`
- The 100ms requirement for Decision recomputation is met via synchronous pure function execution (no I/O in engine/solver).
- FRED fetch runs asynchronously and does not block initial render. Initial decision uses offline fallback.
- "Apply This Fix" handler performs simple state merge (no recomputation at click time).
- Preset buttons replace all inputs atomically via single `setInputs` call to avoid multiple recomputations.
- All boundary tests from Requirement 10.3 are implemented as dedicated unit tests.
- Lever outcome verification tests from Requirement 10.7 assert that `evaluateDecision` with mutated inputs produces Decision matching `leverOutcome`.