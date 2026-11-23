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
