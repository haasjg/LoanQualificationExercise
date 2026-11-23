# Requirements Document

## Introduction

Path to Yes is an embeddable pre-qualification and credit-decisioning simulator for community banks and credit unions. It accepts applicant financial inputs, runs a deterministic underwriting engine against configurable DTI and credit-tier rules, and returns one of three decisions: Approved, Counter-Offer, or Declined. When a decision is Counter-Offer or Declined, the solver computes up to four concrete, mathematically verifiable levers that the applicant can apply with a single click to unlock approval. APR tiers are anchored dynamically to the FRED 24-month personal loan benchmark rate (TERMCBPER24NS), with a graceful offline fallback to 11.50%.

The primary end users are near-prime and credit-thin borrowers seeking transparent, actionable feedback. The purchasing audience is digital banking product teams (e.g., Nymbus) that need auditable underwriting logic and a conversion tool that transforms declines into nurtured leads.

---

## Glossary

- **Simulator**: The full client-side React application that accepts applicant inputs and renders a decision.
- **Underwriting_Engine**: The pure TypeScript module in `src/engine/` that evaluates inputs and produces a Decision.
- **Decision**: One of three enumerated outcomes: `APPROVED`, `COUNTER_OFFER`, or `DECLINED`.
- **Solver**: The pure TypeScript module in `src/engine/` that computes Path to Yes levers for non-approved decisions.
- **Lever**: A single, concrete, mathematically verified action an applicant can take to move toward approval.
- **APR**: Annual Percentage Rate applied to a loan, expressed as a percentage (e.g., 11.50).
- **FRED_Client**: The TypeScript module in `src/services/` that fetches the TERMCBPER24NS series from the FRED API.
- **Benchmark_Rate**: The FRED TERMCBPER24NS value used to compute APR tiers. Falls back to 11.50% when unavailable.
- **postLoanDTI**: Post-loan Debt-to-Income ratio: `(monthlyDebt + estimatedPayment) / monthlyIncome`.
- **estimatedPayment**: Monthly loan payment computed via standard amortization: `L * [r(1+r)^n] / [(1+r)^n - 1]`, where `r = (APR / 100) / 12` and `n = termMonths`.
- **L_max**: The maximum loan amount, rounded down to the nearest $100, that produces a `postLoanDTI <= 0.36` (approval threshold) or `postLoanDTI <= 0.45` (counter-offer threshold) at the current term and APR. The solver first seeks the approval threshold; if no value >= $2,000 satisfies it, the solver seeks the counter-offer threshold.
- **D_reduce**: The minimum monthly debt reduction required so that `(monthlyDebt - D_reduce + estimatedPayment) / monthlyIncome <= 0.36` at the current loan amount, term, and APR. If reducing all monthly debt (`D_reduce = monthlyDebt`) still leaves `postLoanDTI > 0.36` but `<= 0.45`, the lever is returned with `leverOutcome: COUNTER_OFFER` and `D_reduce` capped at `monthlyDebt`.
- **ApplicantInputs**: The set of five fields supplied by the user: `monthlyIncome`, `monthlyDebt`, `creditScore`, `loanAmount`, `termMonths`.
- **AdverseActionModal**: The UI component that presents a plain-English adverse action summary when a Decision is `DECLINED`.
- **RateBenchmarkBadge**: The UI component that indicates whether the active APR is sourced from a live FRED fetch, a cached value, or the offline baseline.
- **PathToYesChecklist**: The UI component that renders Lever cards with "Apply This Fix" buttons.
- **DecisionBanner**: The UI component that renders the Decision outcome with status color and summary text.
- **LeverOutcome**: The projected Decision that results from applying a single Lever in isolation to the current ApplicantInputs, without any other changes. One of `APPROVED` or `COUNTER_OFFER`.
- **ProductMapper**: The pure TypeScript module in `src/engine/` that maps decline reason codes to retention product recommendations.
- **RetentionProduct**: One of four product types offered to declined applicants: `SECURED_CREDIT_BUILDER`, `HIGH_YIELD_SAVINGS`, `MICRO_LOAN`, `DEBT_CONSOLIDATION`.
- **ProductRecommendation**: A structured payload describing a single retention product offer, including product type, qualification gap, timeline estimate, key terms, and accept action.
- **ConversionView**: The UI component that replaces the DecisionBanner for DECLINED decisions, displaying decline reasons with exact numbers and 1-3 product offer cards.
- **ProgressTracker**: The UI component that displays the Personal Progress Tracker Dashboard for users with an active Path to Yes plan.
- **ActivePlan**: The localStorage-persisted record of a user's accepted retention product, including product type, acceptance timestamp, and initial applicant inputs.
- **ProgressState**: The localStorage-persisted record of milestone completion, updated financial inputs, and last update timestamp for an active Path to Yes plan.
- **Milestone**: A single step in a product-specific checklist (e.g., "Make first on-time payment"), with completion status and optional completion date.

---

## Requirements

### Requirement 1: Applicant Input Sandbox

**User Story:** As a near-prime borrower, I want to adjust my financial inputs using sliders and form controls, so that I can explore how changes to my profile affect my loan eligibility in real time.

#### Acceptance Criteria

1. THE Simulator SHALL accept a `monthlyIncome` value in the range $1,800 to $25,000 in increments of $100.
2. THE Simulator SHALL accept a `monthlyDebt` value in the range $0 to $15,000 in increments of $50.
3. THE Simulator SHALL accept a `creditScore` value in the range 500 to 850 in increments of 5.
4. THE Simulator SHALL accept a `loanAmount` value in the range $2,000 to $25,000 in increments of $500. IF a `loanAmount` value is submitted that is not aligned to a $500 increment from $2,000 (i.e., not in the set {2000, 2500, 3000, ..., 25000}), THEN THE Underwriting_Engine SHALL return an error indicating the value is invalid and SHALL NOT return a Decision.
5. THE Simulator SHALL accept a `termMonths` value from the discrete set {12, 24, 36, 48, 60}.
6. WHEN any ApplicantInputs field changes, THE Simulator SHALL recompute the Decision within 100ms of the input event, measured from the moment the field value changes to the moment the updated Decision result is available.
7. IF `monthlyDebt` is greater than or equal to `monthlyIncome` at the time of any ApplicantInputs field change, THEN THE Underwriting_Engine SHALL return a `DECLINED` Decision with an `EXCESSIVE_DEBT` reason code.
8. IF `monthlyIncome` is below $1,800 at the time of any ApplicantInputs field change, THEN THE Underwriting_Engine SHALL return a `DECLINED` Decision with an `INSUFFICIENT_INCOME` reason code.
9. WHEN the Simulator first renders, THE Simulator SHALL initialize ApplicantInputs to the following default values: `monthlyIncome` = $5,000, `monthlyDebt` = $500, `creditScore` = 650, `loanAmount` = $10,000, `termMonths` = 36. These defaults SHALL place the initial Decision in the `COUNTER_OFFER` range, so the Path to Yes checklist is visible immediately without user interaction.

---

### Requirement 2: APR Tier Computation

**User Story:** As a bank product team, I want APR tiers to be anchored to the current FRED benchmark rate, so that the simulator reflects market conditions and remains auditable.

#### Acceptance Criteria

1. WHEN the FRED_Client returns a valid `Benchmark_Rate`, THE Underwriting_Engine SHALL compute APR using the following tier rules, rounding the result to two decimal places and applying a floor of 6.99% to all tiers:
   - `creditScore >= 720`: APR = max(Benchmark_Rate - 1.50, 6.99)
   - `660 <= creditScore <= 719`: APR = max(Benchmark_Rate + 1.50, 6.99)
   - `600 <= creditScore <= 659`: APR = max(Benchmark_Rate + 5.00, 6.99)
   - `creditScore < 600`: APR tier is ineligible; the Underwriting_Engine SHALL return a `DECLINED` Decision with a `HIGH_RISK_SCORE` reason code.
2. THE Underwriting_Engine SHALL express all computed APR values rounded to exactly two decimal places.
3. IF the FRED_Client does not return a valid `Benchmark_Rate` within 3 seconds, or returns an API failure or missing key response, THEN THE Underwriting_Engine SHALL use 11.50% as the `Benchmark_Rate` for all APR tier computations.
4. THE Underwriting_Engine SHALL produce a finite, non-negative APR value for all valid credit scores when the `Benchmark_Rate` is in the range [0.00%, 30.00%].

---

### Requirement 3: Amortization and DTI Calculation

**User Story:** As a bank product team, I want the payment and DTI calculations to follow standard amortization formulas exactly, so that the simulator output is auditable and matches what a human underwriter would compute.

#### Acceptance Criteria

1. WHEN ApplicantInputs are provided, THE Underwriting_Engine SHALL compute `estimatedPayment` using the formula `loanAmount * [r(1+r)^n] / [(1+r)^n - 1]`, where `r = (APR / 100) / 12` and `n = termMonths`, rounding the result to the nearest cent (2 decimal places) using half-up rounding.
2. IF the computed `r` equals 0 (APR is 0%) AND `termMonths` is greater than 0, THEN THE Underwriting_Engine SHALL compute `estimatedPayment` as `loanAmount / termMonths`, rounded to the nearest cent (2 decimal places) using half-up rounding.
3. WHEN `estimatedPayment` is computed, THE Underwriting_Engine SHALL compute `postLoanDTI` as `(monthlyDebt + estimatedPayment) / monthlyIncome`, rounded to 4 decimal places using half-up rounding.
4. IF `monthlyIncome` is 0 during DTI computation, THEN THE Underwriting_Engine SHALL return a `DECLINED` Decision with an `INSUFFICIENT_INCOME` reason code rather than producing a division-by-zero error.
5. IF ApplicantInputs are valid, THEN THE Underwriting_Engine SHALL produce an `estimatedPayment` value that is a finite number greater than 0.
6. IF `termMonths` is 0, THEN THE Underwriting_Engine SHALL return a `DECLINED` Decision with an `INVALID_TERM` reason code rather than producing a division-by-zero error.

---

### Requirement 4: Deterministic Decisioning

**User Story:** As a bank product team, I want the decisioning engine to produce a consistent, auditable outcome for every set of inputs, so that the same applicant profile always receives the same decision.

#### Acceptance Criteria

1. IF `creditScore >= 660` AND `monthlyIncome >= 2000` AND `postLoanDTI <= 0.36` AND `loanAmount <= 25000`, THEN THE Underwriting_Engine SHALL return an `APPROVED` Decision.
2. IF `creditScore >= 600` AND `creditScore <= 659` AND `monthlyIncome >= 2000` AND `postLoanDTI <= 0.36` AND `loanAmount <= 15000`, THEN THE Underwriting_Engine SHALL return an `APPROVED` Decision.
3. IF `creditScore >= 600` AND `creditScore <= 659` AND `monthlyIncome >= 1800` AND `postLoanDTI <= 0.36` AND `loanAmount > 15000`, THEN THE Underwriting_Engine SHALL return a `COUNTER_OFFER` Decision with a `LOAN_CAP_EXCEEDED` reason code. Note: a 600–659 score applicant with both `postLoanDTI > 0.36` AND `loanAmount > 15000` is evaluated by the DTI check (step 5 of the priority order) before the loan cap check (step 4), so they receive a DTI-based `COUNTER_OFFER` or `DECLINED`, not `LOAN_CAP_EXCEEDED`.
4. IF `creditScore >= 600` AND `monthlyIncome >= 1800` AND `postLoanDTI > 0.36` AND `postLoanDTI <= 0.45`, THEN THE Underwriting_Engine SHALL return a `COUNTER_OFFER` Decision.
5. IF `creditScore < 600` OR `monthlyIncome < 1800` OR `monthlyDebt >= monthlyIncome` OR `postLoanDTI > 0.45`, THEN THE Underwriting_Engine SHALL return a `DECLINED` Decision with the first matching reason code from this set: `HIGH_RISK_SCORE` (score < 600), `INSUFFICIENT_INCOME` (monthlyIncome < 1800), `EXCESSIVE_DEBT` (monthlyDebt >= monthlyIncome), `HIGH_DTI` (postLoanDTI > 0.45).
6. THE Underwriting_Engine SHALL evaluate decisioning conditions in this priority order: (1) ineligible credit score (`< 600`) → `HIGH_RISK_SCORE`, (2) insufficient income (`< 1800`) → `INSUFFICIENT_INCOME`, (3) excessive debt (`monthlyDebt >= monthlyIncome`) → `EXCESSIVE_DEBT`, (4) DTI exceeds 0.45 → `HIGH_DTI`, (5) loan cap exceeded (`loanAmount > 15000` AND `creditScore` in 600–659 AND `postLoanDTI <= 0.36`) → `LOAN_CAP_EXCEEDED`, (6) DTI in counter-offer range (0.36–0.45) → `COUNTER_OFFER`, (7) approved. The first matching condition determines the Decision.
7. THE Underwriting_Engine SHALL compute `postLoanDTI` as `(totalMonthlyDebtObligations + proposedMonthlyLoanPayment) / monthlyIncome`, where `proposedMonthlyLoanPayment` is derived from `loanAmount`, `loanTermMonths`, and `annualInterestRate`.
8. IF any required input field (`creditScore`, `monthlyIncome`, `loanAmount`, `loanTermMonths`, `annualInterestRate`) is absent or not a positive number, OR IF `totalMonthlyDebtObligations` is absent or is a negative number, THEN THE Underwriting_Engine SHALL return an error indicating which field is invalid and SHALL NOT return a Decision.
9. THE Underwriting_Engine SHALL return exactly one Decision value from the set {`APPROVED`, `COUNTER_OFFER`, `DECLINED`} for every complete, valid ApplicantInput.

---

### Requirement 5: Path to Yes Solver

**User Story:** As a near-prime borrower who receives a Counter-Offer or Declined decision, I want to see specific, mathematically verified steps I can take to reach approval, so that I know exactly what to change rather than bouncing to a competitor.

#### Acceptance Criteria

1. WHEN the Decision is `COUNTER_OFFER` or `DECLINED`, THE Solver SHALL compute and return an ordered list of up to four Levers, where each Lever's `estimatedPayment` is calculated using the standard amortization formula: `payment = P * (r(1+r)^n) / ((1+r)^n - 1)`, where `P` is principal, `r = (APR / 100) / 12` is the monthly interest rate, and `n` is `termMonths`.
2. IF the current `termMonths` is less than 60, THEN THE Solver SHALL compute Lever 1 (Extend Term) as follows: first, test each value in {36, 48, 60} months greater than the current `termMonths` for `postLoanDTI <= 0.36` and return the shortest such term with `leverOutcome: APPROVED`; IF no such term exists but a term achieves `postLoanDTI <= 0.45`, return the shortest such term with `leverOutcome: COUNTER_OFFER`; IF no term in the candidate set achieves `postLoanDTI <= 0.45`, or IF the current `termMonths` is already 60, THEN THE Solver SHALL omit Lever 1.
3. THE Solver SHALL compute Lever 2 (Reduce Loan Amount) as follows: first, solve for `L_max_approved`: the largest multiple of $100 at which `postLoanDTI <= 0.36` using the current `termMonths` and APR, with `leverOutcome: APPROVED`; IF `L_max_approved` is at least $2,000, return this Lever; ELSE solve for `L_max_counter`: the largest multiple of $100 at which `postLoanDTI <= 0.45`, with `leverOutcome: COUNTER_OFFER`; IF `L_max_counter` is at least $2,000, return this Lever; IF neither threshold yields a value >= $2,000, THE Solver SHALL omit this Lever.
4. THE Solver SHALL compute Lever 3 (Pay Down Debt) as follows: solve for `D_reduce`: the minimum monthly debt reduction such that `(monthlyDebt - D_reduce + estimatedPayment) / monthlyIncome <= 0.36`, with `leverOutcome: APPROVED`; IF `monthlyDebt` is 0, THE Solver SHALL omit this Lever; IF reducing all monthly debt (`D_reduce = monthlyDebt`) still leaves `postLoanDTI > 0.36` but `<= 0.45`, THE Solver SHALL return this Lever with `D_reduce` capped at `monthlyDebt` and `leverOutcome: COUNTER_OFFER`; IF even full debt elimination leaves `postLoanDTI > 0.45`, THE Solver SHALL omit this Lever.
5. IF `creditScore < 640`, THEN THE Solver SHALL compute Lever 4 (Credit Score Milestone) by identifying the lowest score threshold above `creditScore` from the set {600, 640, 660, 720}, stating the exact target score, the resulting APR tier change, and the monthly payment reduction computed as the difference between `estimatedPayment` at the current APR and `estimatedPayment` at the APR corresponding to the target score tier, using the current `termMonths` and requested loan amount. The Solver SHALL compute `leverOutcome` for Lever 4 by running the Underwriting_Engine with the target score (and the APR tier corresponding to that score) substituted into ApplicantInputs, keeping all other inputs unchanged. IF the resulting Decision is `DECLINED`, THE Solver SHALL omit Lever 4. IF `creditScore >= 640`, THE Solver SHALL omit Lever 4.
6. THE Solver SHALL rank returned Levers in ascending order by estimated out-of-pocket cash required: Extend Term ($0) first, Reduce Amount ($0) second, Pay Down Debt (variable) third, Credit Score Milestone (variable) fourth.
7. EACH Lever SHALL include a `leverOutcome` field in its structured payload, computed by running the Underwriting_Engine against the ApplicantInputs that would result from applying that Lever in isolation. The `leverOutcome` SHALL be one of `APPROVED` or `COUNTER_OFFER`; a Lever that produces a `DECLINED` outcome in isolation SHALL be omitted from the Lever list.
8. EACH Lever SHALL include a structured payload specifying: the Lever type identifier, the mutated `ApplicantInputs` fields and their new values (e.g., `termMonths`, `loanAmount`, `monthlyDebt`, or `creditScore`), the resulting `postLoanDTI` and `estimatedPayment` at those new values, and the `leverOutcome` field, sufficient for the "Apply This Fix" button to update `ApplicantInputs` in the Simulator without additional computation.
9. WHEN the Decision is `COUNTER_OFFER` or `DECLINED` and at least one Lever is not omitted, THE Solver SHALL return a non-empty Lever list.
10. IF all four Levers are omitted for a given applicant profile, THEN THE Solver SHALL return an empty Lever list accompanied by a message indicating that no mathematically feasible path to approval exists at the current income and debt levels.

---

### Requirement 6: "Apply This Fix" Interactivity

**User Story:** As a near-prime borrower reviewing Path to Yes levers, I want to apply a suggested fix with a single click, so that I can immediately see the updated decision without manually adjusting inputs.

#### Acceptance Criteria

1. WHEN a user clicks "Apply This Fix" on a Lever card, THE Simulator SHALL update only the ApplicantInputs fields specified in that Lever's payload to the values specified in that payload, leaving all other ApplicantInputs fields unchanged.
2. WHEN ApplicantInputs are updated via "Apply This Fix", THE Simulator SHALL recompute the Decision within 100ms of the click event.
3. WHEN ApplicantInputs are updated via "Apply This Fix", THE Simulator SHALL re-render the DecisionBanner within 100ms of the click event to reflect the recomputed Decision.
4. WHEN "Apply This Fix" updates ApplicantInputs, THE PathToYesChecklist SHALL re-evaluate and re-render within 100ms of the click event to reflect the Solver output derived from the updated inputs.
5. WHEN the PathToYesChecklist renders a Lever card, THE PathToYesChecklist SHALL display the `leverOutcome` for that Lever as a visually distinct label: "Unlocks Full Approval" when `leverOutcome` is `APPROVED`, and "Moves to Counter-Offer" when `leverOutcome` is `COUNTER_OFFER`.
6. WHEN a "Apply This Fix" action causes the recomputed Decision to be `APPROVED`, THE Simulator SHALL hide the PathToYesChecklist and display the DecisionBanner showing the approval result. This transition is specific to the "Apply This Fix" action; manual input changes that result in `APPROVED` are handled by the general Decision re-render behavior defined in Requirements 1 and 8.
7. IF a Lever's payload is malformed or THE Simulator cannot apply the fix, THEN THE Simulator SHALL leave all ApplicantInputs unchanged and display an error message indicating the fix could not be applied.

---

### Requirement 7: FRED API Integration and Fallback

**User Story:** As a bank product team, I want the simulator to fetch a live benchmark rate from FRED on load, so that APR tiers reflect current market conditions, while gracefully degrading when the API is unavailable.

#### Acceptance Criteria

1. WHEN the Simulator loads and `VITE_FRED_API_KEY` is set, THE FRED_Client SHALL fetch the TERMCBPER24NS series from the FRED API using a request timeout of 3 seconds enforced via `AbortController`. Note: `VITE_FRED_API_KEY` is a Vite environment variable and will be inlined into the compiled JavaScript bundle, making it visible in page source. The FRED TERMCBPER24NS series is public economic data; the key carries no financial or PII risk. For production deployments, bank operators SHOULD restrict the key by HTTP referrer in the FRED API dashboard to prevent unauthorized use from other domains.
2. WHEN the FRED_Client receives a successful response, THE FRED_Client SHALL extract the most recent observation value, store it in `sessionStorage` with an ISO 8601 timestamp, and return it as the Benchmark_Rate.
3. WHEN the FRED_Client finds a valid cached value in `sessionStorage` from the current browser session, THE FRED_Client SHALL return the cached value as the Benchmark_Rate without making a network request.
4. IF `VITE_FRED_API_KEY` is missing or is an empty string, THEN THE FRED_Client SHALL return 11.50% as the Benchmark_Rate without attempting a network request.
5. IF the FRED API request exceeds 3 seconds, returns a non-2xx HTTP status, or throws a network error, THEN THE FRED_Client SHALL return 11.50% as the Benchmark_Rate and SHALL NOT overwrite any existing valid `sessionStorage` cache entry.
6. WHEN the Benchmark_Rate is sourced from a live FRED fetch, THE RateBenchmarkBadge SHALL display "Live FRED Rate".
7. WHEN the Benchmark_Rate is sourced from the `sessionStorage` cache, THE RateBenchmarkBadge SHALL display "Cached Rate".
8. WHEN the Benchmark_Rate is the offline baseline (11.50%), THE RateBenchmarkBadge SHALL display "Offline Benchmark - 11.50% (reference period)" where "reference period" is the labeled date of the fallback value.
9. FOR ALL rate source states (live, cached, offline), THE RateBenchmarkBadge SHALL render without throwing an unhandled exception.
10. IF the most recent FRED observation value is not a finite number within the range 0.01% to 40.00%, THEN THE FRED_Client SHALL discard the response and return 11.50% as the Benchmark_Rate.
11. WHEN the Simulator first renders, THE Simulator SHALL use the fallback Benchmark_Rate (11.50%) for any Decision computation that occurs before the FRED_Client returns a result. THE Simulator SHALL NOT block initial render waiting for the FRED fetch, but SHALL update the Benchmark_Rate and recompute the Decision immediately when the fetch resolves or fails. The first Decision SHALL be computed using either a cached, live, or fallback rate — never an undefined value.

---

### Requirement 8: Decision Banner and Adverse Action Modal

**User Story:** As a near-prime borrower, I want to see a clear, plain-English summary of my decision and the specific reasons for a decline, so that I understand my situation without decoding financial jargon.

#### Acceptance Criteria

1. WHEN the Decision is `APPROVED`, THE DecisionBanner SHALL display the approval status, the computed APR as a percentage rounded to two decimal places, the `estimatedPayment` in dollars rounded to two decimal places per month, and the loan term in months.
2. WHEN the Decision is `COUNTER_OFFER`, THE DecisionBanner SHALL display the counter-offer status, a plain-English reason for the counter-offer containing no internal code identifiers, and a summary of the most favorable alternative terms available, defined as: the Lever with `leverOutcome: APPROVED` that yields the highest loan amount; if no APPROVED-outcome Lever exists, the Lever with `leverOutcome: COUNTER_OFFER` that yields the lowest `estimatedPayment`; if no Levers exist, an instruction to adjust inputs manually.
3. WHEN the Decision is `DECLINED`, THE DecisionBanner SHALL display the declined status and provide a control to open the AdverseActionModal.
4. WHEN the AdverseActionModal is opened, THE AdverseActionModal SHALL display a plain-English explanation for each of the following reason codes when present, without using internal code identifiers: `HIGH_RISK_SCORE` ("Your credit score is below the minimum required for this loan"), `INSUFFICIENT_INCOME` ("Your income does not meet the minimum threshold"), `EXCESSIVE_DEBT` ("Your existing debt obligations exceed your monthly income"), `HIGH_DTI` ("Adding this loan would bring your total debt payments above 45% of your income"), `LOAN_CAP_EXCEEDED` ("The requested amount exceeds the $15,000 limit for your credit tier").
5. WHEN the AdverseActionModal is opened, THE AdverseActionModal SHALL display the Path to Yes levers returned by the Solver as next steps, with each lever showing the specific change required and its projected effect on the application.
6. THE DecisionBanner SHALL render a visually distinct loading state while the Decision is being computed, during which no Decision, APR, or payment values are displayed.
7. IF the Underwriting_Engine returns an unexpected exception, THEN THE DecisionBanner SHALL display a user-facing error message indicating that the calculation could not be completed, without exposing stack traces or internal error details.

---

### Requirement 9: Edge Case and Boundary Handling

**User Story:** As a bank product team, I want the simulator to handle all input boundary conditions gracefully, so that no user action produces a crash, NaN, Infinity, or an unhandled exception.

#### Acceptance Criteria

1. IF `monthlyIncome` equals 0 at any point during computation, THEN THE Underwriting_Engine SHALL return a `DECLINED` Decision with an `INSUFFICIENT_INCOME` reason code rather than propagating a division-by-zero error.
2. IF `loanAmount` equals 0 or `termMonths` equals 0, THEN THE Underwriting_Engine SHALL return a `DECLINED` Decision with an `INVALID_INPUT` reason code rather than propagating a division-by-zero error. This guard is evaluated before the zero-APR payment formula in AC2 of Requirement 3; the zero-APR formula (`estimatedPayment = loanAmount / termMonths`) is never applied when either `loanAmount` or `termMonths` is 0.
3. IF `termMonths` equals 12 and the Solver evaluates Lever 1 (Extend Term), THEN THE Solver SHALL test terms {36, 48, 60} as candidates, consistent with Requirement 5.2's candidate set.
4. IF the Solver computes a `D_reduce` value equal to `monthlyDebt` and `postLoanDTI` at that point is still greater than 0.36 but less than or equal to 0.45, THEN THE Solver SHALL return Lever 3 with `D_reduce` capped at `monthlyDebt` and `leverOutcome: COUNTER_OFFER`. IF `postLoanDTI` remains greater than 0.45 even after full debt elimination, THE Solver SHALL omit Lever 3.
5. FOR ALL inputs within the defined ranges, THE Underwriting_Engine SHALL produce output values that are finite numbers (not NaN, not Infinity, not null).
6. WHEN `monthlyDebt` equals 0 and the Solver evaluates Lever 3 (Pay Down Debt), THE Solver SHALL omit Lever 3 from the returned Lever list.

---

### Requirement 10: Testability of the Underwriting Engine

**User Story:** As a developer, I want the underwriting engine and solver to be fully covered by deterministic unit tests, so that any regression in decisioning logic is caught before deployment.

#### Acceptance Criteria

1. THE Underwriting_Engine SHALL be implemented as pure TypeScript functions in `src/engine/` with zero React imports, enabling execution in a Vitest environment without a browser DOM.
2. THE Solver SHALL be implemented as pure TypeScript functions in `src/engine/` with zero React imports.
3. FOR ALL Decision boundary conditions (score = 599, 600, 639, 640, 659, 660, 719, 720; income = 1799, 1800, 1999, 2000; postLoanDTI = 0.3599, 0.36, 0.3601, 0.4499, 0.45, 0.4501), THE Underwriting_Engine SHALL return the expected Decision as verified by Vitest unit tests, with each boundary value covered by at least one dedicated test case.
4. FOR ALL valid ApplicantInputs, THE Underwriting_Engine SHALL return the same Decision when called twice with identical inputs (determinism property).
5. THE FRED_Client SHALL expose a mockable interface so that Vitest tests can inject a fixed Benchmark_Rate without network calls.
6. FOR ALL Solver levers (Extend Term, Reduce Loan Amount, Pay Down Debt), THE Solver SHALL be verified by Vitest unit tests covering at minimum: a case where the lever fully satisfies the target DTI, a case where the lever partially satisfies the target DTI, and a case where the lever is inapplicable.
7. FOR ALL Levers returned by the Solver, THE Solver SHALL be verified by Vitest unit tests that assert the `leverOutcome` field equals the Decision produced by running the Underwriting_Engine with the Lever's payload applied, covering at minimum one case where `leverOutcome` is `APPROVED` and one case where `leverOutcome` is `COUNTER_OFFER`.

---

### Requirement 11: Decline-Reason-to-Product Mapping

**User Story:** As a declined applicant, I want to see specific financial products I qualify for today that directly address my denial reasons, so that I have a concrete path forward rather than a dead end.

#### Acceptance Criteria

1. WHEN the Decision is `DECLINED`, THE ProductMapper SHALL identify all matching decline reason codes from the EngineResult and map each to one or more retention products from the catalog: `SECURED_CREDIT_BUILDER`, `HIGH_YIELD_SAVINGS`, `MICRO_LOAN`, `DEBT_CONSOLIDATION`.
2. FOR each decline reason code, THE ProductMapper SHALL return exactly one product recommendation:
   - `HIGH_RISK_SCORE` (credit score < 600) -> `SECURED_CREDIT_BUILDER`
   - `INSUFFICIENT_INCOME` (monthly income < $1,800) -> `HIGH_YIELD_SAVINGS` with direct deposit onboarding
   - `EXCESSIVE_DEBT` (monthlyDebt >= monthlyIncome) -> `DEBT_CONSOLIDATION` with estimated new DTI
   - `HIGH_DTI` (postLoanDTI > 0.45) -> `DEBT_CONSOLIDATION` or `MICRO_LOAN` depending on requested amount
3. EACH product recommendation SHALL include: product type, qualification math showing exact gap closure (e.g., "Build credit from 570 to 640 in 6-9 months with on-time payments"), estimated timeline to re-qualification, and a one-click accept action.
4. THE ProductMapper SHALL compute estimated timeline to re-qualification for each product: `SECURED_CREDIT_BUILDER` (6-9 months for +70 score points), `HIGH_YIELD_SAVINGS` with direct deposit (3 months to show deposit history pattern), `MICRO_LOAN` (immediate approval at reduced amount), `DEBT_CONSOLIDATION` (immediate DTI improvement if consolidation reduces total payment).
5. WHEN multiple products are recommended, THE ProductMapper SHALL rank products by fastest timeline to main loan re-qualification, with ties broken by lowest out-of-pocket cash required.
6. THE ProductMapper SHALL be implemented as a pure TypeScript function in `src/engine/productMapper.ts` with zero React imports, accepting `EngineResult` and `ApplicantInputs` and returning a `ProductRecommendationResult`.

---

### Requirement 12: Interactive Path to Yes Offer Cards

**User Story:** As a declined applicant, I want to see why I was declined (with exact numbers) and 1-3 tailored product offers I qualify for today, so that I understand my situation and can take action immediately.

#### Acceptance Criteria

1. WHEN the Decision is `DECLINED`, THE ConversionView SHALL replace the standard decline banner with a constructive conversion screen displaying: (a) the specific metric that caused the decline with exact current and target values (e.g., "Your DTI is 48%, target is 36%"), (b) 1-3 product offer cards ranked by timeline to re-qualification, and (c) a prominent "Accept & Start Plan" button on each card.
2. EACH product offer card SHALL display: product name and type, visual icon representing the product category, qualification gap explanation (e.g., "Builds credit history with secured deposit"), exact timeline estimate (e.g., "6-9 months to re-qualify"), key product terms (e.g., "$200 minimum deposit, 0% APR builder card"), and a single-action CTA button ("Accept & Start Plan").
3. WHEN a user clicks "Accept & Start Plan" on a product offer card, THE Simulator SHALL: (a) store the accepted product and timestamp in localStorage under key `pathToYesActivePlan`, (b) transition to the Personal Progress Tracker Dashboard, and (c) initialize milestone checklist state tied to the accepted product.
4. THE ConversionView SHALL display a summary of why each specific metric failed: for `HIGH_DTI`, show `(monthlyDebt + estimatedPayment) / monthlyIncome` with actual values; for `HIGH_RISK_SCORE`, show current credit score vs. minimum 600; for `INSUFFICIENT_INCOME`, show current monthly income vs. minimum $1,800; for `EXCESSIVE_DEBT`, show `monthlyDebt / monthlyIncome` ratio.
5. THE ConversionView SHALL be rendered in place of the DecisionBanner when Decision is `DECLINED` and SHALL NOT require opening a separate modal. The AdverseActionModal remains available as a secondary "View Full Details" option.
6. THE ConversionView SHALL include a "Return to Simulator" button that exits the conversion flow and returns to standard ApplicantInputPanel editing mode without accepting a product.

---

### Requirement 13: Personal Progress Tracker Dashboard

**User Story:** As an applicant who accepted a Path to Yes product, I want to track my progress toward re-qualification with a persistent dashboard showing current vs. target metrics, milestones, and estimated timeline, so that I stay motivated and know when to re-apply.

#### Acceptance Criteria

1. WHEN a user has an active Path to Yes plan stored in localStorage, THE ProgressTracker SHALL load the plan on application mount and display the Personal Progress Tracker Dashboard as the primary view, replacing the standard ApplicantInputPanel and DecisionBanner.
2. THE ProgressTracker SHALL display: (a) the accepted product name and icon, (b) a visual progress bar or radial chart showing overall completion percentage, (c) current vs. target values for each relevant qualification metric (e.g., "Credit Score: 570 / 640", "DTI: 48% / 36%"), (d) a step-by-step milestone checklist tied to the accepted product, (e) estimated time remaining to re-qualification, and (f) a "Re-Evaluate Eligibility" button that re-runs the underwriting engine with updated inputs.
3. THE ProgressTracker milestone checklist SHALL be product-specific: for `SECURED_CREDIT_BUILDER`, milestones include "Open secured card account", "Make first on-time payment", "Complete 3 months on-time payments", "Complete 6 months on-time payments"; for `HIGH_YIELD_SAVINGS`, milestones include "Open high-yield savings account", "Set up direct deposit", "Maintain direct deposit for 3 months"; for `MICRO_LOAN`, milestones include "Accept micro-loan offer", "Make first payment", "Complete loan term"; for `DEBT_CONSOLIDATION`, milestones include "Accept consolidation offer", "Close consolidated accounts", "Verify reduced DTI".
4. THE ProgressTracker SHALL provide simulated progress controls for demo purposes: each milestone in the checklist SHALL have a checkbox that the user can toggle to mark completion; WHEN a milestone is marked complete, THE ProgressTracker SHALL update overall completion percentage and recalculate estimated time remaining.
5. WHEN the user clicks "Re-Evaluate Eligibility", THE ProgressTracker SHALL: (a) prompt the user to update their current financial inputs (income, debt, credit score), (b) re-run evaluateDecision with the updated inputs, (c) display the new Decision result, and (d) if the new Decision is `APPROVED` or `COUNTER_OFFER`, celebrate the progress with a visual success state and prompt to continue with the main loan application.
6. THE ProgressTracker SHALL store all milestone completion state, updated financial inputs, and timestamp of last update in localStorage under key `pathToYesProgressState`, ensuring state survives page refreshes.
7. THE ProgressTracker SHALL provide a "Start Over" button that clears all localStorage state (`pathToYesActivePlan` and `pathToYesProgressState`) and returns the user to the standard simulator view with default inputs.
8. WHEN a user completes all milestones for their accepted product, THE ProgressTracker SHALL automatically enable the "Re-Evaluate Eligibility" button with a prominent visual indicator (e.g., pulsing animation, success badge) and display an encouragement message (e.g., "All milestones complete - Ready to re-apply!").
9. THE ProgressTracker SHALL display a visual timeline or Gantt-style chart showing: milestones already completed (with completion dates), current milestone in progress, and future milestones with estimated completion dates based on product timeline.
10. THE ProgressTracker dashboard SHALL be fully responsive and render correctly on mobile and desktop viewports, with milestone checklists and metric cards stacking vertically on small screens.

---

### Requirement 14: Borrower-Focused 5-Step Wizard Flow (UX Refinement)

**User Story:** As a near-prime borrower exploring loan options, I want a guided step-by-step flow that starts with my loan needs and presents clear comparisons without overwhelming me with technical details, so that I can confidently evaluate my options and understand trade-offs before committing.

#### Acceptance Criteria

1. WHEN the Simulator first loads and no active Path to Yes plan exists in localStorage, THE Simulator SHALL display Step 1 (Loan Amount Selection) as the initial screen, replacing the previous all-inputs-visible default state.

2. **Step 1: Loan Amount Selection**
   - THE Simulator SHALL display a clean entry screen with the heading "How much would you like to borrow?" in large, friendly typography on a warm off-white canvas (stone-50 or equivalent neutral background).
   - THE Simulator SHALL provide a loan amount slider or large number input accepting values from $2,000 to $25,000 in $500 increments, with the selected amount displayed prominently in large numerals (text-4xl or larger).
   - THE Simulator SHALL display term options (12, 24, 36, 48, 60 months) as radio buttons or pill toggles beneath the amount selector, with 36 months selected by default.
   - THE Simulator SHALL provide a "Continue" button as the primary full-width call-to-action in indigo (indigo-600), positioned at the bottom of the viewport on mobile.
   - THE Simulator SHALL provide a secondary "View example scenarios" link that opens a modal or overlay displaying 2-3 common borrowing scenarios with typical amounts and purposes (e.g., "Debt consolidation: $12,000", "Home improvement: $8,000"), without navigating away from Step 1.
   - THE Simulator SHALL NOT display credit score, income, debt, or any underwriting results on Step 1.

3. **Step 2: Financial Details Input**
   - WHEN the user clicks "Continue" on Step 1, THE Simulator SHALL transition to Step 2, displaying a single consolidated screen with three financial input fields: monthly income, monthly debt payments, and estimated credit score.
   - THE Simulator SHALL keep the chosen loan amount and term visible in a compact summary card at the top of Step 2, labeled "Your loan request".
   - THE Simulator SHALL format currency input fields with thousand separators and dollar signs (e.g., "$3,500" not "3500"), and SHALL provide inline help text beneath each field explaining what to include (e.g., "Include take-home pay from all jobs" for income).
   - THE Simulator SHALL display a "Back" button to return to Step 1 and a "Continue" button to proceed to Step 3.
   - THE Simulator SHALL validate that all three fields are non-empty and within acceptable ranges before enabling the "Continue" button, displaying inline validation messages for out-of-range values.

4. **Step 3: Estimate Display (Primary Decision Screen)**
   - WHEN the user clicks "Continue" on Step 2, THE Simulator SHALL run the underwriting engine and transition to Step 3, displaying the initial loan estimate.
   - THE Simulator SHALL lead with the estimated monthly payment in large, bold numerals (text-5xl or larger) at the top of the screen, using near-black typography (slate-900 or equivalent) on the warm off-white canvas.
   - THE Simulator SHALL display loan amount, term, and APR in a compact single-row summary directly beneath the payment number, using smaller type (text-base or text-sm) with minimal visual weight.
   - WHEN the Decision is `COUNTER_OFFER` or `DECLINED`, THE Simulator SHALL display a single quiet status label (small pill badge in amber-100 or rose-100 background) with one plain-language reason (e.g., "Debt-to-income slightly high" or "Credit score below minimum"), positioned near the compact summary row, NOT as a large banner.
   - WHEN the Decision is `APPROVED`, THE Simulator SHALL display a small success badge (emerald-100 background) with the text "Approved estimate" near the compact summary row.
   - THE Simulator SHALL compute the single most favorable alternative (the Lever with `leverOutcome: APPROVED` that yields the highest loan amount, or the Lever with `leverOutcome: COUNTER_OFFER` that yields the lowest monthly payment if no APPROVED lever exists) and display a single comparison CTA button (e.g., "Compare a 36-month term" or "See a lower payment option") as the primary action on Step 3.
   - THE Simulator SHALL NOT display multiple Lever cards or a checklist on Step 3; only the primary comparison CTA is shown.
   - THE Simulator SHALL display "Edit details" and "Start over" as secondary text links, NOT prominent buttons.
   - THE Simulator SHALL label the payment as a "Simulated estimate" in small footer text at the bottom of Step 3.

5. **Step 4: Side-by-Side Comparison View**
   - WHEN the user clicks the comparison CTA on Step 3, THE Simulator SHALL transition to Step 4, displaying a side-by-side comparison of "Your original estimate" and the suggested alternative in two compact columns (single column stack on mobile).
   - EACH comparison column SHALL display: loan amount (if different), term, monthly payment (prominent), APR, and total cost over the life of the loan (term × payment).
   - THE Simulator SHALL compute and display explicit trade-offs with dollar amounts: "Monthly savings: $XX" or "Pay $XXX more per month" AND "Total cost difference: $X,XXX less" or "$X,XXX more total interest" in a visually distinct trade-off summary row between or below the two columns.
   - THE Simulator SHALL display a primary action button "Use [term] months" (e.g., "Use 36 months") that applies the alternative and returns to Step 3 with the updated inputs, re-running the underwriting engine.
   - THE Simulator SHALL display "Keep original" and "Edit details" as secondary actions, allowing the user to return to Step 3 without changes or navigate back to Step 2.
   - THE Simulator SHALL provide an "Undo" button on Step 3 after a comparison has been applied, allowing the user to revert to the previous inputs and re-enter Step 4.

6. **Step 5: Summary (Post-Selection Confirmation)**
   - WHEN the user has applied a comparison alternative or when the Decision is `APPROVED` and the user clicks a "Continue to summary" action, THE Simulator SHALL transition to Step 5, displaying a final summary screen.
   - THE Simulator SHALL display the selected loan amount, term, estimated monthly payment, and APR in a clean vertical summary card.
   - THE Simulator SHALL display a "What changed" section showing which inputs were adjusted from the original request (e.g., "Extended term from 24 to 36 months to lower monthly payment").
   - THE Simulator SHALL label the entire summary as "Simulated estimate - not a final offer" in prominent disclaimer text.
   - THE Simulator SHALL provide a primary "Start your application" button (if `APPROVED` or `COUNTER_OFFER`) or "Explore other options" button (if `DECLINED`), plus secondary "Edit details" and "Start over" links.

7. **Visual Hierarchy and Design Standards**
   - THE Simulator SHALL use a warm off-white canvas (stone-50 or equivalent) as the primary background color throughout all wizard steps, NOT white or gray-50.
   - THE Simulator SHALL use near-black typography (slate-900 or equivalent) for all body text and headings, NOT gray-700 or lighter shades.
   - THE Simulator SHALL use indigo (indigo-600) for all primary call-to-action buttons, with hover state indigo-700.
   - THE Simulator SHALL reserve amber (amber-100 background, amber-800 text) for counter-offer status indicators and green (emerald-100 background, emerald-800 text) for approval indicators, using these colors only in small badges or pills, NOT in large banners.
   - THE Simulator SHALL display large aligned numerals (text-4xl or larger) for loan amount on Step 1 and monthly payment on Step 3, using consistent font weight (font-bold) and alignment (text-center or text-left depending on layout).
   - THE Simulator SHALL use short, plain-language headings (e.g., "How much would you like to borrow?" not "Applicant Profile"), with heading text no smaller than text-xl.
   - THE Simulator SHALL make all primary CTA buttons full-width on mobile viewports (below 640px), with min-height 48px for accessible tap targets.
   - THE Simulator SHALL remove nested borders, repeated icons, and duplicate values from all wizard screens; each piece of information SHALL appear exactly once per screen.
   - THE Simulator SHALL keep the FRED benchmark rate indicator in a collapsible "Rate details" accordion or small info icon tooltip, NOT displayed prominently in the header or decision screens.

8. **Navigation and State Management**
   - THE Simulator SHALL maintain wizard step state in React component state (not localStorage), resetting to Step 1 when the user clicks "Start over" or when the page is refreshed.
   - THE Simulator SHALL allow backward navigation from any step using a "Back" button, preserving previously entered inputs.
   - THE Simulator SHALL allow forward navigation only when the current step's required inputs are valid and complete.
   - THE Simulator SHALL allow the user to click "Edit details" from Step 3, 4, or 5 to return directly to Step 2, preserving all current inputs for editing.
   - THE Simulator SHALL track comparison history in component state to enable "Undo" functionality after applying an alternative from Step 4.

9. **Mobile-First Responsive Behavior**
   - THE Simulator SHALL render all wizard steps in a single-column layout on mobile viewports (below 640px), with full-width inputs, buttons, and content cards.
   - THE Simulator SHALL stack comparison columns vertically on mobile in Step 4, displaying "Your original estimate" above the suggested alternative.
   - THE Simulator SHALL ensure all tap targets (buttons, radio buttons, links) meet the minimum 44×44px accessible size on mobile.
   - THE Simulator SHALL use bottom-pinned primary action buttons on mobile (Step 1 "Continue", Step 3 comparison CTA, Step 4 "Use X months"), with adequate padding to avoid conflicts with browser chrome.
   - THE Simulator SHALL render the wizard in a centered max-width container (max-w-2xl or max-w-3xl) on desktop viewports, maintaining readability without excessive line length.

---

### Requirement 15: Restore Multiple Levers and Cross-Sell Opportunities

**User Story:** As a near-prime borrower who receives a Counter-Offer or Declined decision, I want to see ALL available path-to-approval options and relevant financial products I qualify for, so that I can make an informed choice rather than being shown only a single pre-selected alternative.

#### Acceptance Criteria

1. **Multiple Lever Display (Counter-Offer Enhancement)**
   - WHEN the Decision is `COUNTER_OFFER` and the Solver returns multiple Levers, THE Simulator SHALL display ALL applicable Levers on Step 3 as individual option cards, not just the single most favorable alternative.
   - EACH Lever option card SHALL display: Lever type and description (e.g., "Extend to 48 months"), resulting monthly payment in prominent numerals, resulting loan amount and term if changed, `leverOutcome` indicator ("Unlocks full approval" for `APPROVED`, "Moves to counter-offer" for `COUNTER_OFFER`), trade-off summary showing what changes (e.g., "+$1,200 total interest, -$62/month"), and a "Compare this option" button that navigates to Step 4 with that specific Lever pre-selected.
   - THE Simulator SHALL visually distinguish the most favorable Lever (highest loan amount for `APPROVED` outcome, or lowest payment for `COUNTER_OFFER` outcome) using a subtle highlight (e.g., indigo-50 background or indigo-300 border), positioned first in the list.
   - THE Simulator SHALL render Lever option cards in a vertical stack with space-y-4 or space-y-6 spacing on mobile, and MAY use a grid layout (grid-cols-2) on desktop viewports above 768px if space permits.
   - THE Simulator SHALL use the same warm, clean visual style as Requirement 14: stone-50 canvas, slate-900 text, white card backgrounds with slate-200 borders, indigo-600 CTA buttons.

2. **Lever Option Card Component Specification**
   - THE LeverOptionCard component SHALL accept props: `lever: Lever`, `isRecommended: boolean` (true for the most favorable option), `onCompare: (lever: Lever) => void` callback.
   - THE LeverOptionCard SHALL display the Lever description as a heading (text-lg font-semibold), the resulting monthly payment as prominent numerals (text-3xl or text-4xl font-bold), and the trade-off summary as secondary text (text-sm slate-600).
   - WHEN `isRecommended` is true, THE LeverOptionCard SHALL apply a visual highlight (border-2 border-indigo-300 or bg-indigo-50) and display a small "Recommended" badge (text-xs indigo-600).
   - THE LeverOptionCard SHALL render a full-width "Compare this option" button (bg-indigo-600 text-white rounded-md) that calls `onCompare(lever)` when clicked.
   - THE LeverOptionCard SHALL display `leverOutcome` as a small status badge (emerald-100 for `APPROVED`, amber-100 for `COUNTER_OFFER`) with appropriate text color (emerald-800, amber-800).

3. **Cross-Sell Integration for Declined Scenarios**
   - WHEN the Decision is `DECLINED`, THE Simulator SHALL transition to a Declined Results screen (Step 3 or a dedicated declined view) that displays: a plain-English explanation of why the application was declined with exact metric values (e.g., "Your debt-to-income ratio is 48%, our maximum is 45%"), 1-3 product recommendation cards from the ProductMapper ranked by timeline to re-qualification, and secondary actions ("Edit details", "Start over").
   - EACH product recommendation card SHALL display: product name and icon, qualification gap explanation (e.g., "Build credit history from 570 to 640"), estimated timeline to re-qualification (e.g., "6-9 months"), key product terms as bullet points (e.g., "$200 minimum deposit, 0% APR builder card"), and a primary CTA button ("Learn more" or "Start this plan") that opens a detailed product modal or transitions to the ProgressTracker flow.
   - THE Simulator SHALL use the ProductMapper to compute recommendations, calling `computeProductRecommendations(engineResult, inputs)` and rendering the returned `ProductRecommendation[]` array.
   - THE product recommendation cards SHALL use consistent visual styling with Lever option cards: white backgrounds, slate-200 borders, indigo-600 CTAs, text-lg headings, text-sm body text.

4. **ConversionView Integration**
   - THE ConversionView component (from Requirements 11 and 12) SHALL be integrated into the wizard flow as the primary declined state screen, replacing the previous simple declined banner.
   - WHEN the Decision is `DECLINED`, THE ConversionView SHALL be rendered on Step 3 (or as a dedicated Step 5 for declined users) instead of the standard EstimateStep layout.
   - THE ConversionView SHALL maintain the warm, approachable visual style from Requirement 14: stone-50 canvas, near-black typography (slate-900), indigo CTAs, and clean spacing (space-y-6 or space-y-8).
   - THE ConversionView SHALL display the decline reason detail (DeclineReasonDetail component) in a compact card at the top (NOT a large banner), using rose-50 background and rose-800 text for severity without overwhelming the page.
   - THE ConversionView SHALL render ProductOfferCard components (from Requirement 12) with updated styling to match the LeverOptionCard design: same card dimensions, same button styling, same typography scale.

5. **User Flow and Navigation**
   - WHEN a user clicks "Compare this option" on any Lever option card, THE Simulator SHALL navigate to Step 4 (ComparisonStep) with the selected Lever pre-loaded as the alternative, displaying the side-by-side comparison.
   - WHEN a user clicks "Use [term]" on Step 4, THE Simulator SHALL apply the selected Lever's mutated inputs and return to Step 3, re-computing the Decision and displaying updated Lever options if the Decision is still `COUNTER_OFFER`.
   - WHEN a user clicks "Learn more" or "Start this plan" on a product recommendation card, THE Simulator SHALL transition to the ProgressTracker flow (Requirement 13), storing the accepted product in localStorage and initializing milestone state.
   - THE Simulator SHALL allow users to explore multiple Levers sequentially: compare Lever A, return to Step 3, compare Lever B, return to Step 3, etc., without losing previously viewed comparison history.

6. **Empty State Handling**
   - WHEN the Decision is `COUNTER_OFFER` but the Solver returns an empty Lever list (all Levers omitted), THE Simulator SHALL display a message on Step 3 indicating "No automatic adjustments available - try editing your income or debt details" with a prominent "Edit details" button.
   - WHEN the Decision is `DECLINED` but the ProductMapper returns an empty recommendation list, THE Simulator SHALL display a constructive message (e.g., "We're unable to recommend alternative products at this time, but you can re-apply after improving your financial profile") with "Edit details" and "Start over" actions.

7. **Visual Hierarchy and Information Density**
   - THE Simulator SHALL maintain the clean, spacious layout principles from Requirement 14: large numerals for key values, single-column mobile layout, adequate whitespace (space-y-6 minimum between sections).
   - THE Simulator SHALL avoid overwhelming the user with too many options: display at most 4 Lever option cards on Step 3, and at most 3 product recommendation cards on the declined screen.
   - THE Simulator SHALL use progressive disclosure: display essential information (payment, term, outcome) in the card, with detailed trade-offs revealed on Step 4 comparison view.
   - THE Simulator SHALL ensure all Lever option cards and product recommendation cards use consistent card styling: rounded-lg borders, shadow-sm elevation, p-6 internal padding, border-slate-200.

8. **Testing and Validation**
   - THE Simulator SHALL be verified by unit tests covering: rendering all Levers when multiple exist, rendering the recommended Lever with highlight styling, handling empty Lever lists gracefully, navigating to Step 4 with the correct selected Lever.
   - THE ProductMapper SHALL be verified by unit tests covering: returning recommendations for each decline reason code, ranking recommendations by timeline, returning empty list when no products apply.
   - THE ConversionView integration SHALL be verified by integration tests covering: rendering DeclineReasonDetail with exact metric values, rendering 1-3 ProductOfferCard components, transitioning to ProgressTracker when a product is accepted.
