# Deterministic Underwriting & Solver Rules

## Input Parameters & Bounds
- **Monthly Gross Income:** $1,500 to $25,000 (step: $100)
- **Monthly Debt Obligations:** $0 to $15,000 (step: $50)
- **Estimated Credit Score:** 500 to 850 (step: 5)
- **Requested Loan Amount:** $2,000 to $25,000 (step: $500)
- **Loan Term (Months):** 12, 24, 36, 48, or 60

## Base APR Tiers (Anchored to FRED Benchmark)
Let `B` = current FRED 24-month personal loan benchmark rate (default fallback: `11.50%` if API is offline or unconfigured).
- **Prime (720+):** `B - 1.50%` (floor: `6.99%`)
- **Near-Prime (660-719):** `B + 1.50%`
- **Subprime / Credit-Thin (600-659):** `B + 5.00%`
- **High Risk (<600):** Ineligible for standard unsecured approval (triggers decline + secured/builder path).

## Decisioning Thresholds
Calculate estimated monthly loan payment `P` using standard amortization:
`P = L * [r(1 + r)^n] / [(1 + r)^n - 1]`, where `r = (APR / 100) / 12` and `n = termMonths`.
Calculate **Post-Loan Debt-to-Income (DTI)**:
`postLoanDTI = (monthlyDebt + P) / monthlyIncome`.

1. **APPROVED:**
   - Credit Score >= 640
   - Monthly Gross Income >= $2,000
   - `postLoanDTI <= 0.36` (36%)
2. **COUNTER-OFFER:**
   - Credit Score >= 600
   - Monthly Gross Income >= $1,800
   - `postLoanDTI > 0.36` AND `postLoanDTI <= 0.45` (45%), OR loan amount exceeds max tier cap ($15,000 cap for scores 600-659).
3. **DECLINED:**
   - Credit Score < 600, OR Monthly Gross Income < $1,800, OR `postLoanDTI > 0.45`.

## "Path to Yes" Solver Requirements
Whenever status is `COUNTER-OFFER` or `DECLINED`, compute up to 3 concrete, mathematically verified levers ranked from lowest to highest out-of-pocket cash required:
1. **Extend Loan Term ($0 Cash):** Test longer available terms (up to 60 months) to see if lowering monthly payment `P` brings `postLoanDTI <= 0.36`.
2. **Reduce Requested Loan Amount ($0 Cash):** Solve for the exact maximum loan amount `L_max` (rounded down to nearest $100) that achieves `postLoanDTI <= 0.36` at the current term and APR.
3. **Pay Down Monthly Debt Obligations:** Calculate the exact monthly debt reduction `D_reduce` required so that `(monthlyDebt - D_reduce + P) / monthlyIncome <= 0.36`.
4. **Credit Score Milestone (If Score < 640):** State the exact score target (`640` for standard approval, `660` for near-prime pricing) and estimated monthly payment savings.

Every actionable lever must include a structured payload so the UI can render a one-click **"Apply This Fix"** button that updates the simulator state immediately.